# Story 002: Surface chat errors inline and persist them

## Background

The streaming connection currently uses `onError` to log failures to the console. The UI does not surface the `error` state returned by `useChat`, and any error feedback is ephemeral (or missing) rather than part of the conversation history.

TanStack AI exposes an `error` value alongside `isLoading`. This should drive a ChatGPT-style inline error entry in the chat history, rendered with shadcn components and persisted in Convex so that users can see when and why a request failed even after navigating away and back.

## User Story

As a user,
I want errors to appear in the same stream as my messages and AI replies,
so that I can see when something went wrong, understand why, and decide whether to retry.

## Goals

- Surface actionable errors (auth, network, server, validation) as inline entries in the chat history, not just console logs.
- Make error entries visually distinct from both user and assistant bubbles, while staying minimal and consistent with shadcn styling.
- Persist error events in Convex so that revisiting a thread shows the historical error state in context.

## Acceptance Criteria

- When a stream fails (for example due to network, auth, or server errors), the chat history shows a left-aligned, inline error entry in the message column with a short, human-readable summary and a clear retry affordance.
- Error entries are stored in Convex alongside the rest of the thread history and are rehydrated back into the UI when a thread is reopened; users can still see where an error occurred after a refresh or navigation.
- Starting a new request or receiving a successful stream clears any transient “global” error state, but previously persisted error entries remain in the history as part of the conversation timeline.
- If toast notifications are used, they are supplemental only; the canonical representation of an error is the inline chat entry, and errors are not duplicated in a way that feels noisy (no double banners/toasts for a single failure).

## Non-Goals

- Implementing an application-wide observability or analytics pipeline beyond what is needed for inline errors.
- Introducing full localization of error messages; concise, understandable English copy is sufficient.

## Notes / Considerations

- `useChat` maintains an internal `error` state and exposes `onError`; these should be the primary sources for detecting failures and triggering creation of inline error entries.
- The current hybrid approach uses Convex as the source of truth when not loading; error entries need a persistence shape that survives the switch from streaming state to stored history without disappearing or being duplicated.
- Error entries should use shadcn primitives (for example an `Alert`-like pattern) and existing design tokens to keep the visual treatment minimal, consistent, and clearly distinct from assistant responses.

## File References

- Current streaming error handler logs only: `src/features/ai-chat/hooks/use-hybrid-chat-messages.ts:48-50`
- Chat history rendering (place to introduce inline error entries): `src/features/ai-chat/components/chat-history-list.tsx:1-74` and `src/features/ai-chat/components/chat-message.tsx:1-199`
- Convex schema and persistence for messages: `convex/schema.ts:1-36` and `convex/messages.ts:1-84`
- `useChat` maintains and returns `error`: `node_modules/@tanstack/ai-react/src/use-chat.ts:17-18` and `node_modules/@tanstack/ai-react/src/use-chat.ts:149-161`
- `UseChatReturn` includes `error`: `node_modules/@tanstack/ai-react/src/types.ts:84-88`

