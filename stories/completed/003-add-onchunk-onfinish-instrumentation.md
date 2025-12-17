# Story 003: Show a subtle “Generating…” indicator before streaming content

## Background

The chat uses streaming responses via TanStack AI and SSE. The UI is driven by `messages` updates during streaming.

When a stream starts, there is a brief period where the assistant message exists but has no visible content yet. Today we only show a cursor/typing indicator.

For better feedback, show a subtle “Generating…” indicator in the same style as the web search tool-call indicator.

In this codebase, streaming persistence is already handled server-side:

- `src/routes/api/chat.ts` updates the assistant message in Convex on a 1s interval during streaming, and awaits a final update at the end (`src/routes/api/chat.ts:106-158`).

That means we should not write to Convex from the client during streaming.

## User Story

As a product engineer,
I want to show a “Generating…” status immediately after sending a message,
so that users get instant feedback before the assistant’s first visible content arrives.

## Goals

- Improve perceived responsiveness at stream start.
- Keep the indicator styling consistent with existing tool-call indicators.

## Acceptance Criteria

- While an assistant stream is active and the assistant message has no parts yet, the UI shows “Generating…”.
- The “Generating…” indicator uses the same text style as the web search tool-call indicator.
- The indicator disappears as soon as the assistant has visible parts (text/thinking/tool-call).
- The indicator does not trigger persistence writes.

## Non-Goals

- Building a full analytics dashboard.
- Adding new third-party telemetry vendors without broader platform alignment.
- Moving streaming persistence to the client.
- Writing to Convex on every chunk.
- Changing how frequently the UI receives streamed text updates.

## Notes / Considerations

- Prefer existing signals for UI state:
  - `isLoading` from `useChat` already indicates whether a stream is in progress.
  - The streamed assistant message is created before parts arrive.

## File References

- Tool-call indicator styling: `src/features/ai-chat/components/tool-call-indicator.tsx:13-24`
- Assistant message rendering (place to show “Generating…”): `src/features/ai-chat/components/chat-message.tsx:89-168`
- Current `useChat` configuration only uses `onError`: `src/features/ai-chat/hooks/use-hybrid-chat-messages.ts:34-51`
- Server-side streaming persistence (throttled + final await): `src/routes/api/chat.ts:106-158`
