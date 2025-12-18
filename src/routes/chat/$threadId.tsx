import { Button } from "@/components/ui/button";
import {
	ChatHeader,
	ChatInputForm,
	useMessageActions,
} from "@/features/ai-chat";
import { ChatHistoryList } from "@/features/ai-chat/components/chat-history-list";
import { useChat } from "@/features/ai-chat/hooks/use-chat";
import { useChatActions } from "@/features/ai-chat/hooks/use-chat-actions";
import { useChatInitializationLogic } from "@/features/ai-chat/hooks/use-chat-initialization";
import { useChatScroll } from "@/features/ai-chat/hooks/use-chat-scroll";
import { useParsedMessages } from "@/features/ai-chat/hooks/use-parsed-messages";
import { useChatClientStore } from "@/stores/chat-client-store";
import { useAuth } from "@clerk/tanstack-react-start";
import type { UIMessage } from "@tanstack/ai-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowDown, Loader2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/chat/$threadId")({
	component: ChatThreadPage,
	pendingComponent: ChatThreadPending,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			initialInput:
				typeof search.initialInput === "string"
					? search.initialInput
					: undefined,
			initialThinking:
				typeof search.initialThinking === "boolean"
					? search.initialThinking
					: undefined,
		};
	},
});

// Pending skeleton shown during navigation (after pendingMs delay)
function ChatThreadPending() {
	return (
		<div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl mx-auto">
			{/* Header skeleton */}
			<div className="flex items-center justify-between p-4 border-b">
				<div className="h-5 w-32 bg-muted animate-pulse rounded" />
			</div>
			{/* Message area skeleton */}
			<div className="flex-1 flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
			{/* Input skeleton */}
			<div className="shrink-0 border-t border-border bg-background px-4 pt-2 pb-4">
				<div className="h-20 bg-muted animate-pulse rounded-lg" />
			</div>
		</div>
	);
}

function ChatThreadPage() {
	const { threadId } = Route.useParams();
	const navigate = useNavigate();
	const auth = useAuth();

	// 1. Thread Metadata (for title)
	const thread = useQuery(api.threads.get, {
		threadId: threadId as Id<"threads">,
	});

	// 2. Load existing messages from Convex
	const convexMessages = useQuery(api.messages.list, {
		threadId: threadId as Id<"threads">,
	});

	// 3. Get streaming state from Zustand (ephemeral)
	// Use a stable empty array reference to prevent infinite re-renders
	const EMPTY_MESSAGES: UIMessage[] = useRef<UIMessage[]>([]).current;
	const streamingMessages = useChatClientStore(
		(state) => state.clients.get(threadId)?.messages ?? EMPTY_MESSAGES,
	);

	// 4. TanStack AI Chat State
	const { isLoading, stop, append, isTokenLoaded } = useChat({
		threadId,
	});

	// 5. Merge Convex (persisted) + Zustand (streaming) messages for display
	// User messages: Only from Convex (single source of truth)
	// Assistant messages: From streaming state during active stream, then from Convex after persistence
	const displayMessages = useMemo(() => {
		if (!convexMessages) return streamingMessages;

		// Convert Convex messages to UI format
		const persistedMessages = convexMessages.map((msg) => ({
			id: msg._id,
			role: msg.role as "user" | "assistant",
			parts: [{ type: "text" as const, content: msg.content }],
			createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
		}));

		// If no streaming messages, return persisted only
		if (streamingMessages.length === 0) {
			return persistedMessages;
		}

		// Only include ASSISTANT messages from streaming state that aren't in Convex yet
		// This prevents duplicate user messages since ChatClient.sendMessage() adds one internally
		// and we also persist to Convex
		const newStreamingAssistantMessages = streamingMessages.filter(
			(streamMsg) =>
				streamMsg.role === "assistant" &&
				!persistedMessages.some((convexMsg) => convexMsg.id === streamMsg.id),
		);

		// Merge: Convex messages + new streaming assistant messages
		return [...persistedMessages, ...newStreamingAssistantMessages];
	}, [convexMessages, streamingMessages]);

	// 6. View Logic Extraction
	const parsedMessages = useParsedMessages(displayMessages, isLoading);

	// 7. UI Actions & State
	const { initialThinking, initialInput } = Route.useSearch();
	const [isThinkingEnabled, setIsThinkingEnabled] = useState(
		initialThinking ?? true,
	);

	// 8. Hooks: Actions, Scroll, Init
	const { handleSubmit, clearConversation } = useChatActions({
		threadId,
		isThinkingEnabled,
		isLoading,
		getToken: () => auth.getToken({ template: "convex" }),
	});

	const { scrollViewportRef, showScrollToBottom, pinToBottom } = useChatScroll(
		parsedMessages,
		isLoading,
	);

	useChatInitializationLogic({
		threadId,
		initialInput,
		clearInitialInput: () => {
			navigate({
				to: ".",
				params: { threadId },
				search: { initialInput: undefined },
				replace: true,
			});
		},
		append,
		isTokenLoaded,
		getToken: () => auth.getToken({ template: "convex" }),
	});

	// Adapter for message actions
	const adaptSendMessage = useCallback(
		(content: string) => {
			append({ role: "user", content }).catch((err) => {
				console.error("Failed to send message:", err);
			});
		},
		[append],
	);

	// Set messages helper for message actions (regenerate, edit)
	const setMessages = useCallback(
		(messages: UIMessage[]) => {
			useChatClientStore.getState().setMessages(threadId, messages);
		},
		[threadId],
	);

	// Re-bind messageActions with correct methods
	const activeMessageActions = useMessageActions({
		messages: displayMessages,
		setMessages,
		sendMessage: adaptSendMessage,
		isLoading,
		isThinkingEnabled,
	});

	// Handle Not Found/Loading
	if (thread === null) {
		return (
			<div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-4rem)] p-4">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">Conversation not found</h2>
					<button
						type="button"
						onClick={() => navigate({ to: "/chat" })}
						className="text-primary hover:underline"
					>
						Start a new chat
					</button>
				</div>
			</div>
		);
	}

	if (thread === undefined) {
		return (
			<div className="flex items-center justify-center h-full min-h-[calc(100vh-4rem)]">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl mx-auto">
			<ChatHeader
				hasMessages={displayMessages.length > 0}
				isLoading={isLoading}
				onClear={clearConversation}
				title={thread?.title ?? "Chat"}
			/>

			<ChatHistoryList
				messages={parsedMessages}
				scrollRef={scrollViewportRef}
				isLoading={isLoading}
				// Spread the actions
				editingMessageId={activeMessageActions.editingMessageId}
				editContent={activeMessageActions.editContent}
				setEditContent={activeMessageActions.setEditContent}
				startEditing={activeMessageActions.startEditing}
				cancelEditing={activeMessageActions.cancelEditing}
				submitEdit={activeMessageActions.submitEdit}
				copiedMessageId={activeMessageActions.copiedMessageId}
				copyToClipboard={activeMessageActions.copyToClipboard}
				regenerateResponse={activeMessageActions.regenerateResponse}
				getDisplayContent={activeMessageActions.getDisplayContent}
			/>

			<div className="relative shrink-0 border-t border-border bg-background px-4 pt-2 pb-4">
				{showScrollToBottom && (
					<Button
						type="button"
						variant="secondary"
						size="icon"
						className="absolute right-4 -top-4 shadow-sm"
						onClick={pinToBottom}
					>
						<ArrowDown className="h-4 w-4" />
						<span className="sr-only">Jump to bottom</span>
					</Button>
				)}
				<ChatInputForm
					onSubmit={handleSubmit}
					onStop={stop}
					isLoading={isLoading || !isTokenLoaded}
					isThinkingEnabled={isThinkingEnabled}
					onThinkingToggle={() => setIsThinkingEnabled(!isThinkingEnabled)}
				/>
			</div>
		</div>
	);
}
