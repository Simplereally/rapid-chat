# Deep Dive Findings: How TanStack AI Is Meant to Be Used

After reviewing all the relevant source files, here's what I've discovered about the **intended architecture**:

---

## 1. The Three Packages and Their Roles

| Package | Purpose | Key Exports |
|---------|---------|-------------|
| **`@tanstack/ai`** | Core engine (server or universal) | `chat()`, `toolDefinition()`, `StreamProcessor`, message converters |
| **`@tanstack/ai-client`** | Browser orchestration | `ChatClient`, `ConnectionAdapter`, `fetchServerSentEvents()`, `stream()` |
| **`@tanstack/ai-react`** | React bindings | `useChat()` hook (wraps `ChatClient`) |

---

## 2. The Two Intended Patterns

Looking at the code, TanStack AI was designed for **two distinct patterns**:

### Pattern A: Server Functions (Same Process)

```typescript
// Use stream() adapter - NO HTTP serialization
// UIMessages pass through directly, including parts with approval state
import { useChat } from '@tanstack/ai-react'
import { stream } from '@tanstack/ai-client'

const { sendMessage, addToolApprovalResponse } = useChat({
  connection: stream(async (messages) => {
    // This runs in the SAME process (TanStack Start server function)
    // UIMessages are passed directly - no serialization!
    return chat({
      adapter: ollama(),
      model: 'llama3',
      messages, // Full UIMessage[] with parts!
      tools: [bashTool],
    })
  }),
  tools: [bashTool.client()],  // Client tools for UI
})
```

In this pattern:
- **No HTTP boundary** - messages pass directly through
- **UIMessage.parts preserved** - approval state never lost
- **`collectClientState()` works** - finds approvals in `message.parts`

### Pattern B: Client Tools Only (Execution on Client)

```typescript
// For HTTP-based deployments, use CLIENT tools
import { useChat } from '@tanstack/ai-react'
import { toolDefinition } from '@tanstack/ai'

// Define tool once
const bashTool = toolDefinition({
  name: 'bash',
  description: 'Execute a shell command',
  inputSchema: z.object({ command: z.string() }),
  needsApproval: true,  // UI shows approval prompt
})

// Client: Tool executes in browser, calls execution API
const { sendMessage, messages } = useChat({
  connection: fetchServerSentEvents('/api/chat'),
  tools: [
    bashTool.client(async (args) => {
      // This runs CLIENT-SIDE after approval
      const result = await fetch('/api/execute-bash', {
        method: 'POST',
        body: JSON.stringify(args),
      })
      return result.json()
    }),
  ],
})

// Server: Only sends tool definition (no execute)
app.post('/api/chat', (req) => {
  return chat({
    tools: [bashTool],  // Just the definition, no execute!
    // ...
  })
})
```

In this pattern:
- **HTTP transport** - but the server never executes approval-required tools
- **Server sends `tool-input-available` chunk** (not `approval-requested`)
- **Client's `StreamProcessor.onToolCall` fires** - executes the client tool
- **Approval handled entirely client-side** - using `needsApproval` on the client tool

---

## 3. The Evidence: `executeToolCalls()` Logic

Looking at `tool-calls.ts` lines 302-363:

```typescript
// CASE 1: Client-side tool (no execute function)
if (!tool.execute) {
  if (tool.needsApproval) {
    // Need approval first
    needsApproval.push({ ... })  // Emits approval-requested
  } else {
    // Request client execution
    needsClientExecution.push({ ... })  // Emits tool-input-available
  }
}
```

This shows two distinct flows:
1. **Server tool with approval** (`tool.execute` exists + `needsApproval`): Server pauses, waits for approval, then executes server-side
2. **Client tool with approval** (no `tool.execute` + `needsApproval`): Server sends approval request, but **client handles execution**

Your `bash` tool currently falls into case 1 (server tool with approval), but the HTTP transport breaks the approval flow.

---

## 4. The `ChatClient` + `useChat()` Lifecycle

From `use-chat.ts`:

```typescript
const client = useMemo(() => {
  return new ChatClient({
    connection: optionsRef.current.connection,
    id: clientId,
    initialMessages: messagesToUse,
    tools: optionsRef.current.tools,  // CLIENT tools for execution
    // ...
  })
}, [clientId])  // Recreated when clientId changes!
```

**Key insight**: The client is recreated when `clientId` changes. This is why you had multi-agent issues - navigating to a new thread changes the ID, which recreates the client and loses state.

---

## 5. Your Original Assumption About `useChat`

You mentioned:
> "in our early iterations we originally used that, but assumed that was the cause of us not being able to have a multi agent experience"

**Your assumption was partially correct, but for the wrong reason:**

- `useChat` creates a **single ChatClient per hook instance**
- When you navigate to another route, the component unmounts, and a new `useChat` creates a new `ChatClient`
- This is **by design** - each chat conversation should have its own `ChatClient` instance

**The issue wasn't `useChat` itself, it was**:
- Component unmounting/remounting loses the ephemeral streaming state
- The solution you built (Zustand store with `ChatClient` per thread) is actually **the correct pattern** for multi-conversation support

---

## 6. What Would Be Idiomatic

Based on my analysis, here are the **truly idiomatic patterns**:

### Option 1: TanStack Start Server Functions + `stream()` Adapter

This is the **golden path** and would eliminate our band-aid:

```typescript
// src/lib/chat-server.ts (server function)
import { createServerFn } from '@tanstack/start'
import { chat } from '@tanstack/ai'

export const chatStream = createServerFn()
  .handler(async (messages, context) => {
    return chat({
      adapter: ollama(),
      model: 'qwen3:8b',
      messages,  // UIMessages with parts - approval state preserved!
      tools: [bashTool, writeTool],
    })
  })

// src/hooks/use-multi-chat.ts (client)
import { useChat } from '@tanstack/ai-react'
import { stream } from '@tanstack/ai-client'
import { chatStream } from '@/lib/chat-server'

export function useMultiChat(threadId: string) {
  return useChat({
    id: threadId,
    connection: stream((messages) => chatStream({ messages })),
    tools: [bashTool.client(), writeTool.client()],
  })
}
```

### Option 2: Client-Only Tool Execution

Convert approval-required tools to pure client tools:

```typescript
// Tool definition (shared)
const bashTool = toolDefinition({
  name: 'bash',
  description: 'Execute a shell command',
  inputSchema: z.object({ command: z.string() }),
  needsApproval: true,
})

// Server: No execute function - just sends tool definition
chat({
  tools: [bashTool],  // No .server() call!
  // ...
})

// Client: Executes via API after approval
useChat({
  tools: [
    bashTool.client(async (args) => {
      const result = await fetch('/api/tools/bash', {
        method: 'POST',
        body: JSON.stringify(args),
      })
      return result.json()
    }),
  ],
})
```

This way:
- Server emits `tool-input-available` (not `approval-requested`)
- Client shows approval UI (from `needsApproval: true`)
- Client calls execution API, gets result
- Client returns result to `ChatClient`
- `ChatClient` auto-continues the stream

---

## 7. Summary: Your Band-Aid vs Idiomatic Usage

| Aspect | Your Current Implementation | Idiomatic Pattern A (Server Functions) | Idiomatic Pattern B (Client Tools) |
|--------|-----------------------------|-----------------------------------------|-------------------------------------|
| **Tool execution** | Server-side with HTTP transport | Server-side, same process | Client-side via execution API |
| **Approval flow** | Band-aid: send `uiMessages` + merge parts | Native: `stream()` preserves parts | Native: `needsApproval` on client tool |
| **Multi-conversation** | Zustand store managing ChatClients | Multiple `useChat` instances | Multiple `useChat` instances |
| **Complexity** | High (custom adapter, merging logic) | Low (native support) | Medium (separate execution API) |
| **Portability** | Fragile (depends on TanStack AI internals) | Solid (documented pattern) | Solid (documented pattern) |

---

## 8. Recommendation

Your Zustand-based multi-conversation architecture is **good and worth keeping**. The issue is specifically the approval flow over HTTP.

**Recommended path forward:**

1. **Short-term**: Keep the band-aid fix if it works and ship
2. **Long-term**: Migrate to **TanStack Start server functions with `stream()` adapter**
   - This gives you same-process communication
   - UIMessages with parts pass through directly
   - Approval flow works natively
   - Your Zustand store can still manage multiple ChatClients

The `// todo remove any and fix this` comment in `collectClientState()` suggests TanStack AI's maintainers know this is a gap. The server function + `stream()` pattern appears to be their intended solution.
