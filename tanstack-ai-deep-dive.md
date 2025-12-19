# TanStack AI Implementation Deep Dive & Refactoring Guide

## Document Purpose

This document provides a comprehensive analysis of our TanStack AI implementation and a detailed refactoring guide to achieve **canonical, idiomatic usage** of the TanStack AI tool approval flow.

**Problem Statement:** Our current implementation requires sending two message arrays (`messages` + `uiMessages`) via a custom connection adapter to make tool approvals work. This is a workaround for an architectural limitation in TanStack AI's HTTP-based tool approval flow.

**Goal:** Refactor to the canonical **Pattern B: Client-Only Tool Execution** which eliminates the custom adapter workaround entirely.

---

## Part 1: Root Cause Analysis

### The Architectural Gap

TanStack AI has two message types that don't perfectly align:

| Type | Used By | Structure |
|------|---------|-----------|
| `UIMessage` | `ChatClient`, `StreamProcessor`, React UI | Has `parts[]` array with tool call state, approval metadata |
| `ModelMessage` | `chat()` function, LLM adapters | Has `content`, `toolCalls[]`, NO `parts` property |

### The Critical Code Path

When `ChatClient.streamResponse()` sends a request (line 296 in `chat-client.ts`):

```typescript
const modelMessages = this.processor.toModelMessages(); // UIMessage → ModelMessage (LOSES parts!)

const stream = this.connection.connect(
  modelMessages,  // <-- These are ModelMessages, NOT UIMessages
  bodyWithConversationId,
  this.abortController.signal,
);
```

The server's `collectClientState()` function (`chat.ts` lines 509-541) searches for approval responses:

```typescript
private collectClientState(): { approvals: Map<string, boolean>; ... } {
  for (const message of this.messages) {
    // todo remove any and fix this  <-- THEY ACKNOWLEDGE THE GAP
    if (message.role === 'assistant' && (message as any).parts) {
      const parts = (message as any).parts;
      for (const part of parts) {
        if (part.type === 'tool-call' && part.state === 'approval-responded') {
          approvals.set(part.approval.id, part.approval.approved);
        }
      }
    }
  }
}
```

**The Problem:** `ModelMessage` has no `parts` property, so `collectClientState()` never finds approval responses sent over HTTP.

### Our Current Workaround

1. **Custom Connection Adapter** (`src/lib/custom-connection.ts`)
   - `fetchServerSentEventsWithParts()` that passes raw messages with parts intact

2. **Dual Message Payload** (`src/stores/chat-client-store.ts` lines 148-157)
   - Sends both standard `messages` AND `uiMessages` with parts

3. **Server-Side Merging** (`src/routes/api/chat.ts` lines 180-234)
   - Extracts parts from `uiMessages` and attaches them to `ModelMessages`

**This works, but is fragile and non-canonical.**

---

## Part 2: The Canonical Solution - Pattern B

### Overview

TanStack AI's `toolDefinition()` API supports three usage modes:

```typescript
const myTool = toolDefinition({ name: '...', inputSchema: ..., needsApproval: true });

// 1. Use as definition only (no execute function in server chat())
chat({ tools: [myTool] });  // Server just tells LLM about the tool

// 2. Create server implementation
const myToolServer = myTool.server(async (args) => { ... });

// 3. Create client implementation
const myToolClient = myTool.client(async (args) => { ... });
```

**Pattern B** uses option 1 + 3: The server sends tool definitions without execute functions, and the client receives `tool-input-available` chunks and executes tools locally (calling an execution API for server-side operations).

### Why Pattern B Works

| Step | Server (chat API) | Client (ChatClient) |
|------|-------------------|---------------------|
| 1 | LLM calls tool | - |
| 2 | No `execute` function → emit `tool-input-available` | Receives chunk |
| 3 | - | Client tool has `needsApproval: true` → show approval UI |
| 4 | - | User approves |
| 5 | - | Client tool's `execute()` calls `/api/execute/{tool}` |
| 6 | Tool execution API runs | Receives result |
| 7 | - | `addToolResult()` updates UIMessage |
| 8 | Continues with tool result | `continueFlow()` sends result |

**Key Insight:** The approval state never needs to cross the HTTP boundary - it lives entirely client-side in `UIMessage.parts`.

---

## Part 3: Refactoring Plan

### Files to Modify

| File | Change |
|------|--------|
| `src/tools/*.ts` | Split into definitions + execution functions |
| `src/tools/index.ts` | Export definitions and execution functions separately |
| `src/routes/api/chat.ts` | Use definitions only, remove UIMessage merging logic |
| `src/routes/api/tools/*.ts` | **NEW** - Tool execution APIs |
| `src/lib/custom-connection.ts` | **DELETE** - No longer needed |
| `src/stores/chat-client-store.ts` | Use standard adapter, add client tools |
| `src/features/ai-chat/hooks/use-tool-approvals.ts` | Keep as-is (still works) |

### Step 1: Restructure Tool Definitions

**Before (current - e.g., `src/tools/bash.ts`):**
```typescript
export const bashTool: Tool<...> = {
  name: "bash",
  inputSchema: bashInputSchema,
  outputSchema: bashOutputSchema,
  execute: executeBash,        // <-- Execute is bundled with definition
  needsApproval: true,
};
```

**After (new structure):**

Create `src/tools/definitions/bash.ts`:
```typescript
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

export const bashInputSchema = z.object({
  command: z.string().describe("The shell command to execute"),
  cwd: z.string().optional().describe("Working directory"),
  timeout: z.number().optional().default(30000).describe("Timeout in ms"),
});

export const bashOutputSchema = z.object({
  success: z.boolean(),
  exitCode: z.number().nullable(),
  stdout: z.string(),
  stderr: z.string(),
  timedOut: z.boolean(),
  executionTime: z.number(),
});

export type BashInput = z.infer<typeof bashInputSchema>;
export type BashOutput = z.infer<typeof bashOutputSchema>;

/**
 * Bash tool DEFINITION only - no execute function
 * This is used by both server (chat API) and client
 */
export const bashToolDef = toolDefinition({
  name: "bash",
  description: `Execute a shell command on the local system.

Use this tool to:
- Run build/test commands (npm, bun, cargo, etc.)
- Inspect system state (ls, cat, head, tail, wc, etc.)
- Execute scripts
- Install dependencies (requires approval)

IMPORTANT:
- Always requires user approval before execution
- Default timeout is 30 seconds`,
  inputSchema: bashInputSchema,
  outputSchema: bashOutputSchema,
  needsApproval: true,  // Approval handled by ChatClient
});
```

Create `src/tools/execution/bash.server.ts` (server-only, for execution API):
```typescript
import { spawn } from "node:child_process";
import type { BashInput, BashOutput } from "../definitions/bash";

export async function executeBash(input: BashInput): Promise<BashOutput> {
  const { command, cwd, timeout = 30000 } = input;
  const startTime = Date.now();

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let killed = false;

    const process = spawn("bash", ["-c", command], {
      cwd: cwd || undefined,
      env: { ...globalThis.process?.env, PAGER: "cat", NO_COLOR: "1" },
      shell: false,
    });

    const timeoutId = setTimeout(() => {
      timedOut = true;
      killed = true;
      process.kill("SIGTERM");
      setTimeout(() => {
        if (!process.killed) process.kill("SIGKILL");
      }, 2000);
    }, timeout);

    process.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
      if (stdout.length > 1_000_000) {
        stdout = stdout.slice(0, 500_000) + "\n...[truncated]...\n" + stdout.slice(-500_000);
      }
    });

    process.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
      if (stderr.length > 100_000) {
        stderr = stderr.slice(0, 50_000) + "\n...[truncated]...\n" + stderr.slice(-50_000);
      }
    });

    process.on("close", (code: number | null) => {
      clearTimeout(timeoutId);
      resolve({
        success: code === 0 && !timedOut,
        exitCode: killed ? null : code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        timedOut,
        executionTime: Date.now() - startTime,
      });
    });

    process.on("error", (error: Error) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        exitCode: null,
        stdout: "",
        stderr: `Failed to execute command: ${error.message}`,
        timedOut: false,
        executionTime: Date.now() - startTime,
      });
    });
  });
}
```

Create `src/tools/client/bash.client.ts` (client-side tool with execution API call):
```typescript
import { bashToolDef, type BashInput, type BashOutput } from "../definitions/bash";

/**
 * Client-side bash tool that calls the execution API after approval
 */
export const bashToolClient = bashToolDef.client(async (args: BashInput): Promise<BashOutput> => {
  const response = await fetch("/api/tools/bash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    return {
      success: false,
      exitCode: null,
      stdout: "",
      stderr: `API error: ${response.status} ${response.statusText}`,
      timedOut: false,
      executionTime: 0,
    };
  }

  return response.json();
});
```

### Step 2: Create Tool Execution APIs

Create `src/routes/api/tools/bash.ts`:
```typescript
import { createFileRoute } from "@tanstack/react-router";
import { executeBash } from "@/tools/execution/bash.server";
import { bashInputSchema } from "@/tools/definitions/bash";
import { z } from "zod";

export const Route = createFileRoute("/api/tools/bash")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json();
          const parsed = bashInputSchema.safeParse(json);

          if (!parsed.success) {
            return Response.json(
              { error: "Invalid input", details: parsed.error.errors },
              { status: 400 }
            );
          }

          const result = await executeBash(parsed.data);
          return Response.json(result);
        } catch (error) {
          console.error("[Bash Execution Error]", error);
          return Response.json(
            { error: "Internal server error" },
            { status: 500 }
          );
        }
      },
    },
  },
});
```

Create similar files for:
- `src/routes/api/tools/write.ts`
- `src/routes/api/tools/edit.ts`
- `src/routes/api/tools/multi-edit.ts`

### Step 3: Update Chat API

Modify `src/routes/api/chat.ts`:

**Before:**
```typescript
import { bashTool, writeTool, editTool, ... } from "@/tools";

const availableTools = [
  grepTool,   // No approval needed
  globTool,   // No approval needed
  bashTool,   // Has .execute(), needsApproval: true (BROKEN over HTTP)
  writeTool,  // Same issue
  // ...
];

// Complex UIMessage merging logic...
```

**After:**
```typescript
import { 
  bashToolDef, 
  writeToolDef, 
  editToolDef,
  // ... definitions only
} from "@/tools/definitions";
import { grepTool, globTool, lsTool, readTool, webSearchTool } from "@/tools";

// Tools that need approval: DEFINITIONS ONLY (no .server())
// Tools without approval: Can keep full Tool with .execute()
const availableTools = [
  // Safe tools (auto-execute on server)
  grepTool,
  globTool,
  lsTool,
  readTool,
  webSearchTool,

  // Approval-required tools: DEFINITIONS ONLY
  bashToolDef,      // Client will execute via /api/tools/bash
  writeToolDef,     // Client will execute via /api/tools/write
  editToolDef,      // Client will execute via /api/tools/edit
  multiEditToolDef, // Client will execute via /api/tools/multi-edit
];

// DELETE the entire UIMessage merging logic (lines 93-234 approx)
// The chat now just processes messages normally:

const { messages } = await request.json();  // Single messages array

const stream = chat({
  adapter: ollama({ baseUrl: env.OLLAMA_BASE_URL }),
  messages: messages.filter(m => m.role !== "system"),
  model: env.OLLAMA_MODEL,
  systemPrompts: [BASE_SYSTEM_PROMPT, ...clientSystemPrompts],
  tools: availableTools,
  agentLoopStrategy,
});

return toStreamResponse(stream);
```

### Step 4: Update Chat Client Store

Modify `src/stores/chat-client-store.ts`:

**Before:**
```typescript
import { fetchServerSentEventsWithParts } from "@/lib/custom-connection";

const client = new ChatClient({
  connection: fetchServerSentEventsWithParts(
    () => apiEndpoint,
    async () => ({
      headers,
      body: { uiMessages: uiMessages },  // WORKAROUND
    }),
  ),
  // No tools registered
});
```

**After:**
```typescript
import { fetchServerSentEvents } from "@tanstack/ai-client";  // Standard adapter!
import { 
  bashToolClient, 
  writeToolClient, 
  editToolClient, 
  multiEditToolClient 
} from "@/tools/client";

const client = new ChatClient({
  connection: fetchServerSentEvents(
    () => apiEndpoint,
    async () => ({ headers }),  // Simple - no uiMessages workaround!
  ),
  // Register client tools for approval + execution
  tools: [
    bashToolClient,
    writeToolClient,
    editToolClient,
    multiEditToolClient,
  ],
  onMessagesChange: (...),
  onFinish: (...),
  // ...
});
```

### Step 5: Delete Custom Connection Adapter

**Delete:** `src/lib/custom-connection.ts`

This file is no longer needed. The standard `fetchServerSentEvents` from `@tanstack/ai-client` works correctly because:
1. Approval-required tools don't execute on the server (no `execute` function)
2. Server sends `tool-input-available` chunks
3. Client handles approval and execution entirely locally
4. No `parts` need to cross the HTTP boundary

### Step 6: Update Index Exports

Modify `src/tools/index.ts`:
```typescript
// =============================================================================
// TOOL DEFINITIONS (for server chat() and type inference)
// =============================================================================
export { bashToolDef, bashInputSchema, bashOutputSchema, type BashInput, type BashOutput } from "./definitions/bash";
export { writeToolDef, writeInputSchema, writeOutputSchema, type WriteInput, type WriteOutput } from "./definitions/write";
export { editToolDef, editInputSchema, editOutputSchema, type EditInput, type EditOutput } from "./definitions/edit";
export { multiEditToolDef, multiEditInputSchema, multiEditOutputSchema } from "./definitions/multi-edit";

// =============================================================================
// CLIENT TOOLS (for ChatClient registration)
// =============================================================================
export { bashToolClient } from "./client/bash.client";
export { writeToolClient } from "./client/write.client";
export { editToolClient } from "./client/edit.client";
export { multiEditToolClient } from "./client/multi-edit.client";

// =============================================================================
// SAFE TOOLS (auto-execute, no approval needed)
// These keep the full Tool structure with execute
// =============================================================================
export { readTool } from "./read";
export { grepTool } from "./grep";
export { globTool } from "./glob";
export { lsTool } from "./ls";
export { webSearchTool } from "./web-search";
```

---

## Part 4: Flow Diagram - After Refactor

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                PATTERN B FLOW                                 │
└──────────────────────────────────────────────────────────────────────────────┘

User: "run ls -la"
        │
        ▼
┌─────────────────┐
│  ChatClient     │ sendMessage("run ls -la")
│  (Browser)      │
└────────┬────────┘
         │
         │ POST /api/chat { messages: [...] }
         ▼
┌─────────────────┐
│  Server         │ chat({ tools: [bashToolDef] })  // NO execute function
│  chat()         │
└────────┬────────┘
         │ LLM returns tool_call for "bash"
         │ Server has no execute → emits chunk
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Chunk: { type: "tool-input-available", toolName: "bash", ... } │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  StreamProcessor│ Receives chunk, finds bashToolClient
│  (Client)       │ bashToolClient.needsApproval = true
└────────┬────────┘
         │ Emits onApprovalRequest event
         ▼
┌─────────────────┐
│  UI             │ Shows ToolApprovalDialog
│                 │ User clicks "Approve"
└────────┬────────┘
         │ chatClient.addToolApprovalResponse({ approved: true })
         ▼
┌─────────────────┐
│  ChatClient     │ Sees tool approved, calls bashToolClient.execute()
│                 │
└────────┬────────┘
         │ bashToolClient.execute() does:
         │   fetch("/api/tools/bash", { body: args })
         ▼
┌─────────────────┐
│  /api/tools/bash│ executeBash(args) → runs command
│  (Server)       │ Returns { stdout, stderr, ... }
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ChatClient     │ addToolResult(toolCallId, result)
│                 │ continueFlow() sends new request
└────────┬────────┘
         │
         │ POST /api/chat { messages: [..., toolResult] }
         ▼
┌─────────────────┐
│  Server         │ LLM sees tool result, generates response
│  chat()         │
└────────┬────────┘
         │
         ▼
    Stream response to user
```

---

## Part 5: Testing Checklist

After completing the refactor, verify:

### Happy Path
- [ ] Send message that triggers safe tool (grep, ls) → auto-executes
- [ ] Send message that triggers approval tool (bash) → shows approval dialog
- [ ] Approve tool → executes, result appears, LLM continues
- [ ] Deny tool → tool marked as denied, LLM handles gracefully

### Edge Cases
- [ ] Multiple tool calls in one response (some need approval, some don't)
- [ ] Parallel tool calls with mixed approval states
- [ ] Tool execution API error → proper error handling in UI
- [ ] Reload/refresh during approval → state persists correctly
- [ ] Cancel stream during tool approval → clean state

### Regression Tests
- [ ] Conversation history loads correctly
- [ ] Multi-conversation switching works
- [ ] Cross-tab sync still functions
- [ ] Message serialization/deserialization intact

---

## Part 6: Files Summary

### New Files to Create
```
src/tools/
├── definitions/
│   ├── bash.ts        # bashToolDef + schemas
│   ├── write.ts       # writeToolDef + schemas
│   ├── edit.ts        # editToolDef + schemas
│   └── multi-edit.ts  # multiEditToolDef + schemas
├── execution/
│   ├── bash.server.ts    # executeBash function
│   ├── write.server.ts   # executeWrite function
│   ├── edit.server.ts    # executeEdit function
│   └── multi-edit.server.ts
├── client/
│   ├── bash.client.ts    # bashToolClient
│   ├── write.client.ts   # writeToolClient
│   ├── edit.client.ts    # editToolClient
│   └── multi-edit.client.ts

src/routes/api/tools/
├── bash.ts     # POST handler for bash execution
├── write.ts    # POST handler for write execution
├── edit.ts     # POST handler for edit execution
└── multi-edit.ts
```

### Files to Modify
```
src/tools/index.ts            # New structure, export definitions + clients
src/routes/api/chat.ts        # Use definitions only, remove UIMessage hack
src/stores/chat-client-store.ts  # Use standard adapter, register client tools
```

### Files to Delete
```
src/lib/custom-connection.ts  # No longer needed
```

---

## Part 7: Migration Notes

### Breaking Changes
1. **Tool imports change** - Code importing `bashTool` directly needs to import `bashToolDef` or `bashToolClient` depending on usage context

2. **ChatClient initialization** - Must register client tools for approval-required operations

3. **API surface** - New `/api/tools/{name}` endpoints added

### Backward Compatibility
- Existing conversation history will continue to work
- Safe tools (grep, glob, ls, read, webSearch) are unchanged
- UI components don't need changes (same `useToolApprovals` hook)

### Performance Implications
- Slightly more HTTP requests (one for chat, one for tool execution)
- But cleaner architecture, no complex message merging
- Tool execution can be parallelized more easily in the future

---

## Conclusion

This refactor eliminates the fragile workaround of sending `uiMessages` alongside `messages`. The canonical Pattern B approach:

1. **Separates concerns** - Server handles LLM, client handles approval + execution
2. **Uses documented APIs** - `toolDefinition()`, `.client()`, standard adapters
3. **Is future-proof** - Doesn't rely on `(message as any).parts` hack in TanStack AI
4. **Simplifies the codebase** - Removes custom adapter, removes message merging logic

The key insight is that **approval state doesn't need to cross the HTTP boundary** when the client is responsible for both approval and execution.
