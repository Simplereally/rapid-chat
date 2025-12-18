# Story 005: Concurrent Multi-Chat Streaming with Zustand Global Store

## Background

Currently, when a user sends a message in one chat thread and navigates to another thread (via the sidebar or new chat button), the active stream is immediately terminated. This happens because TanStack AI's `useChat` hook creates a `ChatClient` instance within the React component lifecycle, and the cleanup effect calls `client.stop()` on unmount.

This behavior is by design for single-chat-per-page applications, but it prevents the desired workflow where users can:
1. Fire off a message in Thread A
2. Navigate to Thread B and send another message
3. Navigate to Thread C and send another message
4. Return to Thread A and see the completed (or still streaming) response

ChatGPT supports this exact workflow - the AI continues generating in the background even when the user navigates away, and the response is available when they return.

## Technical Investigation Summary

### Current Architecture (Problem)

```
Route: /chat/thread-1
    └── ChatPage component
            └── useChat({ threadId: "thread-1" })
                    └── ChatClient (created in useMemo)
                            └── SSE Connection to /api/chat

When navigating to /chat/thread-2:
1. ChatPage for thread-1 unmounts
2. useChat cleanup effect runs
3. If isLoading → client.stop() is called
4. SSE connection is aborted
5. Stream is lost ❌
```

**Root cause in TanStack AI's useChat (lines 52-58):**
```javascript
useEffect(() => {
  return () => {
    if (isLoading) {
      client.stop();  // ← Kills the stream on component unmount
    }
  };
}, [client, isLoading]);
```

### Key Insight: SPA Navigation vs Page Refresh

- **Page refresh**: Browser kills everything - requires infrastructure changes to solve
- **SPA route navigation**: React components unmount/remount, but JavaScript runtime persists

This means we CAN maintain active streams during SPA navigation by moving `ChatClient` instances outside of React's component lifecycle.

### Proposed Architecture (Solution)

```
                    ┌─────────────────────────────────┐
                    │   ChatClientStore (Zustand)     │
                    │   ─────────────────────────     │
                    │   Map<threadId, ChatClientState>│
                    │                                 │
                    │   thread-1: { client, status }  │  ← Stream continues!
                    │   thread-2: { client, status }  │  ← Stream continues!
                    │   thread-3: { client, status }  │
                    └─────────────▲───────────────────┘
                                  │
                    ┌─────────────┴───────────────────┐
                    │                                 │
        ┌───────────┴────────────┐    ┌──────────────┴──────────────┐
        │  useChatStore(thread-1)│    │   useChatStore(thread-2)    │
        │  (subscribes to store) │    │   (subscribes to store)     │
        └────────────────────────┘    └─────────────────────────────┘
```

**Key differences:**
1. `ChatClient` instances live in a **global Zustand store** (outside React lifecycle)
2. Components **subscribe** to a ChatClient rather than owning it
3. Navigating away **doesn't stop** the stream - only explicit user action does
4. Navigating back **reconnects** to the existing ChatClient and its current state
5. Cross-tab sync via BroadcastChannel still works for real-time updates in other tabs

## User Story

As a power user,
I want to send messages to multiple chat threads concurrently,
so that I can fire off several queries and check their responses as they complete, maximizing my productivity.

## Goals

- Allow users to navigate between chat threads while AI responses are actively streaming
- Maintain streaming connections in the background during SPA navigation
- Display the current streaming state when returning to a thread (whether complete or still streaming)
- Support concurrent streams across multiple threads simultaneously
- Integrate with existing cross-tab BroadcastChannel synchronization

## Acceptance Criteria

1. **Stream Persistence**: When a user sends a message in Thread A and navigates to Thread B, the AI response for Thread A continues generating in the background.

2. **State Restoration**: When the user navigates back to Thread A, they see:
   - If streaming is complete: The full AI response
   - If still streaming: The partial response continuing to stream in real-time

3. **Concurrent Streams**: The user can have multiple threads actively streaming AI responses simultaneously.

4. **Sidebar Streaming Indicator**: Threads with active streams show a spinner icon in the sidebar, visible regardless of which thread the user is currently viewing.

5. **Sidebar Unread Indicator**: When a stream completes while the user is viewing a different thread, the spinner morphs into a green checkmark icon indicating an unread response.

6. **Read State Clearing**: When the user navigates to a thread with the green checkmark, the icon disappears (response is now "read").

7. **Stop Functionality**: The user can still stop a stream via explicit action (stop button), not by navigating away.

8. **Cleanup on Completion**: When a stream completes, the ChatClient is removed from Zustand (data is in Convex).

9. **Cross-Tab Sync**: The existing BroadcastChannel sync continues to work - streams initiated in one tab are visible in other tabs viewing the same thread.

## Non-Goals

- **Page refresh resilience**: Refreshing the browser will still terminate active streams (requires infrastructure changes)
- **Cross-device sync**: Streams are only maintained within the same browser session
- **Offline support**: No offline queuing or persistence of pending messages

## Technical Implementation Notes

### Why Zustand?

1. **Outside React lifecycle**: Zustand stores persist across route changes
2. **Selective subscriptions**: Components only re-render for their specific thread's state
3. **Simple API**: Minimal boilerplate compared to Context + useReducer
4. **DevTools integration**: Easy debugging of concurrent stream states
5. **TypeScript-first**: Excellent type inference

### Store Structure

```typescript
interface ChatClientState {
  client: ChatClient;
  messages: UIMessage[];
  isLoading: boolean;
  error: Error | undefined;
  lastActivity: number;
}

interface ChatStore {
  clients: Map<string, ChatClientState>;
  
  // Actions
  getOrCreateClient: (threadId: string, options: ChatClientOptions) => ChatClientState;
  sendMessage: (threadId: string, content: string) => Promise<void>;
  stopStream: (threadId: string) => void;
  clearClient: (threadId: string) => void;
  
  // Subscriptions
  subscribeToThread: (threadId: string, callback: (state: ChatClientState) => void) => () => void;
}
```

### Integration with Existing Hooks

The existing `useChat` hook will be refactored to:
1. Get or create a client from the Zustand store
2. Subscribe to state changes for the current thread
3. NOT create a new ChatClient on mount
4. NOT stop the client on unmount

```typescript
export function useChat({ threadId }: UseChatProps) {
  const { getOrCreateClient, sendMessage, stopStream } = useChatStore();
  
  // Get or create client for this thread
  const clientState = useChatStore(
    useCallback((state) => state.clients.get(threadId), [threadId])
  );
  
  // ... rest of hook logic
  
  // NO cleanup effect that stops the client!
}
```

### Memory Management Strategy

Simple lifecycle-based cleanup (no arbitrary timeouts):

1. **Stream completes** → `onFinish` callback fires → Message persists to Convex → ChatClient removed from Zustand
2. **User stops stream** → Same as above, cleanup after stop
3. **Thread deleted** → ChatClient (if any) is removed immediately
4. **Page unload** → All clients cleaned up naturally (JavaScript runtime ends)

**Why no timeout?** Most AI responses complete in seconds to a few minutes. Once complete, the data is in Convex - we don't need the ChatClient in memory anymore. The Zustand store only holds **actively streaming** clients.

## File References

- Current useChat implementation: `src/features/ai-chat/hooks/use-chat.ts`
- BroadcastChannel hook: `src/features/ai-chat/hooks/use-broadcast-channel.ts`
- TanStack AI useChat (to understand internals): `node_modules/@tanstack/ai-react/dist/esm/use-chat.js`
- TanStack AI ChatClient: `node_modules/@tanstack/ai-client/dist/esm/chat-client.js`
- Chat route: `src/routes/chat/$threadId.tsx`
- Convex message persistence: `convex/messages.ts`

## Dependencies

- `zustand` - Global state management (needs to be added if not present)
- Existing: `@tanstack/ai-react`, `@tanstack/ai-client`, Convex

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Race conditions with Convex hydration | Use atomic state updates in Zustand; hydration only on initial mount |
| Complexity increase in chat logic | Clear separation: Zustand owns active clients, hooks provide React integration |
| Breaking existing functionality | Comprehensive testing before/after migration |
| Many concurrent streams (API limits) | Ollama runs locally - no external rate limits; user self-regulates naturally |

## Testing Scenarios

1. **Background Streaming**: Send message in Thread A → Navigate to Thread B → Return to Thread A → Response should be visible
2. **Concurrent Streams**: Send messages in 3 threads simultaneously → All should complete
3. **Stop Button**: Stop button works while viewing thread
4. **Cross-Tab Sync**: BroadcastChannel still works (Tab B sees Tab A's stream)
5. **Thread Deletion**: Thread deletion cleans up client from Zustand
6. **Sidebar Spinner**: While streaming, sidebar shows spinner on that thread row
7. **Spinner to Tick**: Stream completes while viewing different thread → spinner becomes green tick
8. **Tick Clears on View**: Click thread with green tick → tick disappears
9. **No Tick if Viewing**: Stream completes while viewing that thread → no tick shown (already read)

## Sidebar Status Indicators

The conversation list in the sidebar will display visual indicators for thread status:

### Streaming State (Spinner)
- **When**: AI is actively generating a response (stream in progress)
- **Visual**: Animated spinner icon overlaid on the thread row
- **Behavior**: Visible regardless of which thread the user is currently viewing
- **Purpose**: User can see at a glance which threads are "thinking"

### Completion State (Green Tick)
- **When**: Stream completes while user is NOT viewing that thread
- **Visual**: Spinner morphs/fades into a green checkmark icon
- **Behavior**: Acts as an "unread response" indicator
- **Purpose**: User knows there's a new AI response they haven't seen yet

### Read State (No Icon)
- **When**: User navigates to a thread that had the green tick
- **Visual**: Green tick disappears
- **Behavior**: Clears the unread indicator
- **Purpose**: Normal state, no pending notifications

### State Flow Diagram

```
Thread in sidebar:
    │
    ├── User sends message (from this or another tab)
    │       │
    │       ▼
    │   [🔄 Spinner]  ← "AI is thinking"
    │       │
    │       ├── User is viewing this thread
    │       │       │
    │       │       ▼
    │       │   Stream completes → (no icon, read immediately)
    │       │
    │       └── User is viewing a DIFFERENT thread
    │               │
    │               ▼
    │           Stream completes → [✓ Green Tick] ← "Unread response"
    │               │
    │               ▼
    │           User clicks thread → (no icon, marked as read)
    │
    └── Idle state: (no icon)
```

### Implementation Notes

- Status state should be stored in Zustand alongside the ChatClient
- Unread state should persist in localStorage (survives page refresh)
- Consider persisting unread state to Convex if cross-device sync is desired (future enhancement)
