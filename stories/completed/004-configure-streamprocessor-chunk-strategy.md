# Story 004: Smooth streaming UX with chunking + pinned scroll (ChatGPT-like)

## Background

Streaming updates can emit very frequent text updates.

Today the chat view auto-scrolls to the bottom on essentially every streaming update (using a lightweight “fingerprint” of the last message to avoid `JSON.stringify`). This can create render + scroll churn and also makes it hard to read earlier parts of a response while the tail is still streaming.

A more desirable UX (similar to ChatGPT) is:

- If the user is reading earlier content (not “pinned” to the bottom), streaming should not move what they are currently looking at.
- If new content arrives off-screen, show a small “jump to bottom” indicator (e.g. a down arrow) near the input.
- If the user clicks the indicator (or is already at the bottom), the view becomes “pinned” and stays anchored to the bottom while streaming.

TanStack AI exposes stream processing configuration through `streamProcessor`, including a `chunkStrategy` to control how and when text updates are emitted to the UI.

## User Story

As a user,
I want the chat UI to remain smooth during long streaming responses,
so that scrolling and typing stay responsive.

## Goals

- Keep the viewport stable while the user reads during streaming.
- Provide an explicit “jump to latest” affordance when new content is off-screen.
- Reduce React render frequency during streaming without sacrificing perceived responsiveness.
- Align streaming UI updates with an intentional chunking policy.

## Acceptance Criteria

- When the user is not at (or near) the bottom, streaming updates do not change their scroll position.
- When the user is at (or near) the bottom, streaming stays pinned to the bottom without visible jitter.
- A “jump to bottom” indicator appears when new content arrives off-screen while the user is not pinned.
- Clicking the indicator scrolls to the bottom and pins the viewport there until the user scrolls away.
- Streaming responses update the UI in larger, more stable increments (e.g., word/sentence boundary or throttled cadence).
- The “stop” action remains responsive and stops generation promptly.
- Message content correctness is preserved (no missing or duplicated tokens).

## Non-Goals

- Pixel-perfect reproduction of ChatGPT’s UI.
- Adding `useChat.onChunk` / `onFinish` instrumentation or any per-chunk UI state outside the built-in message stream updates.
- Rewriting the chat UI rendering architecture.
- Introducing virtualization unless necessary.

## Notes / Considerations

- Chunking and scrolling solve different problems: chunking reduces update frequency; pinned-scroll ensures reading stability. Both may be needed.
- The current fingerprint-driven auto-scroll is likely the wrong default behavior for “read while streaming”. It can become simpler once pinned-scroll logic exists.
- Story 003 owns `useChat.onChunk` usage for one-shot lifecycle transitions; this story should not use `onChunk` to throttle or reshape text emission frequency.
- Make the chunking policy configurable so it can be tuned without deep refactors.
- The “jump to bottom” affordance should be keyboard accessible and not conflict with input focus.

## File References

- Current auto-scroll (fingerprint-driven): `src/features/ai-chat/hooks/use-chat-scroll.ts:1-55`
- Chat view composition (history + input): `src/routes/chat/$threadId.tsx:67-171`
- Scroll container (Shadcn `ScrollArea`): `src/features/ai-chat/components/chat-history-list.tsx:1-74`
- `useChat` usage (place to configure `streamProcessor`): `src/features/ai-chat/hooks/use-hybrid-chat-messages.ts:24-51`
- `streamProcessor.chunkStrategy` (library option): `node_modules/@tanstack/ai-client/dist/esm/types.d.ts:147-156`
- `useChat` passes `streamProcessor` into ChatClient (library wiring): `node_modules/@tanstack/ai-react/src/use-chat.ts:57-58`
