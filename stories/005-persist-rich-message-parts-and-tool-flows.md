# Story 005: Persist rich message `parts` and enable tool/approval UX

## Background
The UI is already capable of rendering non-text message parts:
- `thinking` parts
- `tool-call` parts (indicator)

However, the “stored history” path rehydrates messages as text-only parts. After streaming finishes, any non-text parts are effectively lost from the canonical history.

TanStack AI also supports tool lifecycles (tool-call states, tool results, and approval flows) through message parts and helper methods on the chat client.

## User Story
As a user,
I want tool usage (calls, approvals, and results) to be visible and preserved in the conversation history,
so that I can understand what the assistant did and trust the outcome.

## Goals
- Persist the full `UIMessage.parts` structure (or a lossless equivalent) for each message.
- Enable UX for tool approvals and tool results when tools require explicit confirmation.
- Ensure the hybrid Convex + streaming approach keeps rich parts consistent between live streaming and stored history.

## Acceptance Criteria
- When the assistant calls a tool, the UI shows a stable “tool call” entry with meaningful status (e.g., awaiting input, input streaming, approval requested, etc.).
- If a tool requires approval, the UI presents approve/deny controls and continues correctly based on the user decision.
- Tool results are rendered and persisted so they remain visible after refresh/navigation.
- The conversation history loaded from persistence includes the same rich parts as observed during streaming.
- Text-only messages continue to work as they do today.

## Non-Goals
- Adding new tools beyond what already exists, except where needed to validate the flow.
- Designing complex “agent run” trace viewers.

## Notes / Considerations
- Current persistence stores assistant content as a single string and rebuilds UI messages with `{ type: "text", content: msg.content }`.
- To support rich parts, persistence needs to store `parts` (including tool-call and tool-result) in a serializable format.
- Tool approval and result submission are supported by TanStack AI via `addToolApprovalResponse` and `addToolResult`.

## File References
- Stored-history rehydration collapses to text-only parts: `src/features/ai-chat/hooks/use-hybrid-chat-messages.ts:58-62` and `src/features/ai-chat/hooks/use-hybrid-chat-messages.ts:74-78`
- UI already renders `thinking` parts: `src/features/ai-chat/components/chat-message.tsx:131-140`
- UI already renders `tool-call` indicator while output is undefined: `src/features/ai-chat/components/chat-message.tsx:141-161`
- Server defines available tools and passes them into `chat({ tools: ... })`: `src/routes/api/chat.ts:16-24` and `src/routes/api/chat.ts:108-116`
- `useChat` exposes tool flow helpers:
  - `addToolResult`: `node_modules/@tanstack/ai-react/src/use-chat.ts:129-140`
  - `addToolApprovalResponse`: `node_modules/@tanstack/ai-react/src/use-chat.ts:142-147`
- Tool call parts include approval metadata and state machine: `node_modules/@tanstack/ai-client/dist/esm/types.d.ts:6-37` and `node_modules/@tanstack/ai-client/dist/esm/types.d.ts:83-93`

