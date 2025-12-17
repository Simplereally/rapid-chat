# Story 001: Use `useChat.reload()` for “Regenerate response”

## Background
The chat UI provides a “regenerate” action for assistant messages.

Today, regeneration is implemented by truncating the local message list to before the assistant message and then re-sending the prior user message via an indirect “pending action” flow.

TanStack AI’s `useChat` hook includes a first-class `reload()` method intended to re-run the last assistant response without manually manipulating message arrays.

## User Story
As a user,
I want to regenerate the last assistant response with a single action,
so that I can quickly get an alternate answer without breaking conversation continuity.

## Goals
- Replace custom “truncate + resend” regeneration logic with `useChat.reload()` where appropriate.
- Ensure regeneration works correctly with the hybrid Convex + streaming model.

## Acceptance Criteria
- Clicking “Regenerate” on the latest assistant message triggers `reload()` and streams a replacement response.
- Regeneration does not duplicate the user message in the UI.
- Regeneration updates persisted assistant content in Convex consistently with the existing streaming persistence approach.
- “Regenerate” is disabled while `isLoading` is true.
- Errors during regeneration are surfaced to the user (or routed into the global chat error UI if implemented separately).

## Non-Goals
- Changing the overall persistence strategy (Convex as source of truth) beyond what is required to support regeneration.
- Implementing multi-branch history or versioning of regenerated answers.

## Notes / Considerations
- The current implementation can regenerate any assistant message by truncating to that index. `reload()` is designed for “reload last assistant message.” If you need older-message regeneration, keep the existing approach or introduce a server-side “replay from message N” API.
- The project currently adapts `append()` into a `sendMessage`-like function in the route layer; regeneration should follow the same API shape and avoid additional indirection.

## File References
- Current custom regeneration logic: `src/features/ai-chat/hooks/use-message-actions.ts:108-141`
- Route layer currently adapts send to `append`: `src/routes/chat/$threadId.tsx:96-106`
- `useChat` API surface includes `reload()`: `node_modules/@tanstack/ai-react/src/use-chat.ts:110-113`

