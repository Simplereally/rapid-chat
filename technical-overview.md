# Technical Overview

> A comprehensive guide to the data flow and architecture of the chat application.

Any additions to this document should be informational but succinct.

## Architecture Summary

This is a **TanStack Start** application using:
- **Frontend**: React + Zustand (state) + TanStack Router
- **Backend**: TanStack AI + Ollama (LLM)
- **Database**: Convex (real-time sync)
- **Auth**: Clerk + Convex integration

---

## Message Lifecycle

```
User Input → Frontend → API Route → LLM → Stream Response → Persist to Convex
     ↓           ↓           ↓         ↓           ↓              ↓
  ChatInput → ChatClient → chat() → Ollama → StreamProcessor → messages.add
```

### 1. User Sends Message

**Entry Point**: `src/features/ai-chat/hooks/use-chat-actions.ts`

```typescript
handleSubmit(chatInput) → {
  1. persistUserMessage(content)     // Fire-and-forget to Convex
  2. startChatRequest(config)        // Triggers streaming
}
```

### 2. Zustand Store Manages Streaming

**File**: `src/stores/chat-client-store.ts`

The `useChatClientStore` is the **single source of truth** for active streaming sessions.

```typescript
interface ChatClientState {
  client: ChatClient | null;     // TanStack AI client instance
  messages: UIMessage[];         // Current streaming messages
  isLoading: boolean;
  streamingStatus: "streaming" | "completed";
}
```

**Key Method**: `startChatRequest(config)`
1. Creates/reuses `ChatClient` for the thread
2. Loads `conversationHistory` from Convex into ChatClient
3. Calls `client.sendMessage(content)`
4. Callbacks sync state back to Zustand

### 3. API Receives Request

**File**: `src/routes/api/chat.ts`

```typescript
POST /api/chat?threadId={id}
Body: { messages: ModelMessage[], uiMessages?: UIMessage[] }
```

`uiMessages` contains full UIMessage format with `parts` (for tool approval state).

The `chat()` function from `@tanstack/ai`:
- Connects to Ollama adapter
- Processes tool calls in an **agent loop**
- Streams response chunks back

### 4. Tool Execution (Agent Loop)

**Server-side** (`@tanstack/ai`):
```
LLM Request → Tool Call Response → Execute Tool → Add Result → Loop Back
```

**Flow**:
1. LLM returns `finishReason: "tool_calls"`
2. `ChatEngine.processToolCalls()` executes server tools
3. Tool result added to messages
4. Loop continues until `finishReason: "stop"`

**Tools requiring approval** pause the loop and emit `approval-requested` chunks.

**Tool Approval Flow**:
1. Server emits `approval-requested` chunk with approval ID
2. Client updates `UIMessage.parts` with approval metadata
3. User approves → `part.state` set to `approval-responded`
4. Client sends new request with `uiMessages` in body (containing approval state)
5. Server merges `parts` onto `ModelMessages` for `collectClientState()`
6. Server's `ChatEngine` finds approval, executes tool, continues loop

### 5. Client Receives Stream

**File**: `node_modules/@tanstack/ai-client/src/chat-client.ts`

`ChatClient` uses `StreamProcessor` to:
- Accumulate text content
- Track tool call states
- Emit `onMessagesChange` callbacks

These callbacks update Zustand, which triggers React re-renders.

### 6. Persistence to Convex

**After stream completes** (`onFinish` callback):

```typescript
// Serialize parts (including tool calls) to JSON string
const content = serializeMessageParts(message.parts);

// Persist to Convex
await addMessage({ threadId, role: "assistant", content });

// Clear ephemeral streaming state
nukeStreamingState(threadId);
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/routes/chat/$threadId.tsx` | Chat page component, merges Convex + streaming messages |
| `src/stores/chat-client-store.ts` | Zustand store managing ChatClient instances |
| `src/features/ai-chat/hooks/use-chat-actions.ts` | Submit handler, persistence logic |
| `src/features/ai-chat/lib/message-serialization.ts` | Serialize/deserialize tool calls for Convex |
| `src/routes/api/chat.ts` | API route, calls `chat()` with Ollama |
| `src/lib/custom-connection.ts` | Custom SSE adapter preserving UIMessages for approval flow |
| `src/tools/` | Tool definitions (ls, read, write, bash, etc.) |
| `convex/messages.ts` | Convex mutations/queries for messages |

---

## Message Format

### UIMessage (TanStack AI Client)

```typescript
interface UIMessage {
  id: string;
  role: "user" | "assistant";
  parts: Array<TextPart | ToolCallPart | ToolResultPart | ThinkingPart>;
  createdAt: Date;
}
```

### Convex Message (Persisted)

```typescript
{
  _id: Id<"messages">;
  threadId: Id<"threads">;
  role: "user" | "assistant";
  content: string;  // Plain text OR serialized JSON array of parts
  createdAt: number;
}
```

### Serialization

**Assistant messages** are stored as JSON:
```json
[{"type":"text","content":"..."}, {"type":"tool-call","id":"...","name":"ls",...}]
```

Use `deserializeMessageParts()` to restore full `UIMessage.parts` structure.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌───────────────────────┐    ┌─────────────────────┐   │
│  │ ChatInputForm│───▶│ useChatActions        │───▶│ useChatClientStore  │   │
│  └──────────────┘    │ - persistUserMessage  │    │ - startChatRequest  │   │
│                      │ - handleSubmit        │    │ - ChatClient mgmt   │   │
│                      └───────────────────────┘    └──────────┬──────────┘   │
│                                                              │              │
│  ┌──────────────┐    ┌───────────────────────┐              │              │
│  │ ChatHistory  │◀───│ displayMessages       │◀─────────────┘              │
│  │ List         │    │ (Convex + Streaming)  │    onMessagesChange         │
│  └──────────────┘    └───────────────────────┘                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP POST /api/chat
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌───────────────────┐    ┌──────────────────────┐  │
│  │ routes/api/chat  │───▶│ chat() @tanstack  │───▶│ ChatEngine           │  │
│  │ - validate body  │    │ - agent loop      │    │ - streamModelResponse│  │
│  │ - auth check     │    │ - tool execution  │    │ - processToolCalls   │  │
│  └──────────────────┘    └───────────────────┘    └──────────┬───────────┘  │
│                                                              │              │
│                                                              ▼              │
│                                                  ┌──────────────────────┐   │
│                                                  │ Ollama Adapter       │   │
│                                                  │ - chatStream()       │   │
│                                                  └──────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ SSE StreamChunks
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PERSISTENCE                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌───────────────────┐    ┌──────────────────────┐  │
│  │ onFinish()       │───▶│ serializeMessage  │───▶│ convex/messages.add  │  │
│  │ callback         │    │ Parts()           │    │                      │  │
│  └──────────────────┘    └───────────────────┘    └──────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tool System

### Tool Categories

| Category | Tools | Approval Required |
|----------|-------|-------------------|
| Search/Discovery | `grep`, `glob`, `ls` | No |
| File I/O | `read` | No |
| File I/O | `write`, `edit`, `multi_edit` | **Yes** |
| Shell | `bash` | **Yes** |
| External | `web_search` | No |

### Tool Execution Flow

**Server Tools** (have `execute` function):
```
LLM → tool_call chunk → executeToolCalls() → tool_result chunk → LLM
```

**Client Tools** (no `execute`, or needs approval):
```
LLM → tool_call chunk → approval-requested chunk → Client responds → continue
```

**Approval State Transport**:
- `ChatClient.addToolApprovalResponse()` updates `UIMessage.parts` with `approval-responded` state
- Custom connection adapter (`fetchServerSentEventsWithParts`) includes `uiMessages` in request body
- Server merges `parts` from `uiMessages` onto `ModelMessages`
- `ChatEngine.collectClientState()` extracts approvals from `message.parts`

---

## State Management

### Zustand Store (`chat-client-store.ts`)

```typescript
clients: Map<threadId, ChatClientState>
```

- **Ephemeral**: Only holds active/recent streaming sessions
- **Cleaned up** after Convex persistence via `nukeStreamingState()`
- **Cross-tab sync** via BroadcastChannel API

### Convex (Source of Truth)

- `threads` table: Thread metadata, title, timestamps
- `messages` table: All persisted messages

### Message Merging (`$threadId.tsx`)

```typescript
displayMessages = useMemo(() => {
  // Convert Convex messages to UI format
  // Add streaming assistant messages not yet in Convex
  return [...persistedMessages, ...newStreamingAssistantMessages];
}, [convexMessages, streamingMessages]);
```

---

## Common Pitfalls

### 1. Conversation History Loss

**Symptom**: LLM forgets context after tool execution.

**Cause**: History not properly deserialized when loading into ChatClient.

**Fix**: Use `deserializeMessageParts()` for assistant messages when calling `setMessagesManually()`.

### 2. Duplicate Messages

**Symptom**: User messages appear twice.

**Cause**: Both ChatClient and Convex add the message.

**Fix**: Only include assistant (streaming) messages from Zustand; user messages always from Convex.

### 3. Stale ChatClient

**Symptom**: Old context used for new messages.

**Cause**: ChatClient reused without loading updated Convex history.

**Fix**: Always call `setMessagesManually()` with latest `conversationHistory` before `sendMessage()`.

---

## Environment Variables

```bash
OLLAMA_BASE_URL=http://localhost:11434  # Ollama API
OLLAMA_MODEL=qwen3:8b                   # Model name
VITE_CONVEX_URL=https://...             # Convex deployment URL
```

---

## Testing Tool Flows

1. **Simple message**: No tools → direct response
2. **Read-only tool**: `ls`, `grep` → auto-execute, loop continues
3. **Approval tool**: `bash`, `write` → pauses for approval
4. **Multi-iteration**: Tool result triggers another tool call

---

## Key TanStack AI Concepts

### ChatClient (`@tanstack/ai-client`)

Client-side orchestrator:
- Manages `StreamProcessor` for message state
- Connects to server via custom `fetchServerSentEventsWithParts` adapter
- Handles tool approval flows

**Note**: Standard `fetchServerSentEvents` converts UIMessages to ModelMessages, losing `parts`. The custom adapter passes `uiMessages` in the body to preserve approval state.

### chat() (`@tanstack/ai`)

Server-side streaming function:
- Creates `ChatEngine` for agent loop
- Executes tools via `ToolCallManager`
- Respects `agentLoopStrategy` for iteration limits

### StreamProcessor

Internal state machine:
- Accumulates text, thinking content
- Tracks tool call lifecycle: `awaiting-input` → `input-streaming` → `input-complete`
- Converts UIMessages ↔ ModelMessages

---
