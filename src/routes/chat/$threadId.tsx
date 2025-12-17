import { Button } from "@/components/ui/button";
import {
	BLINK_ANIMATION_CSS,
	ChatHeader,
	ChatInputForm,
	useMessageActions,
} from "@/features/ai-chat";
import { ChatHistoryList } from "@/features/ai-chat/components/chat-history-list";
import { useChatActions } from "@/features/ai-chat/hooks/use-chat-actions";
import { useChatInitializationLogic } from "@/features/ai-chat/hooks/use-chat-initialization";
import { useChatScroll } from "@/features/ai-chat/hooks/use-chat-scroll";
import { useHybridChatMessages } from "@/features/ai-chat/hooks/use-hybrid-chat-messages";
import { useParsedMessages } from "@/features/ai-chat/hooks/use-parsed-messages";
import { useAuth } from "@clerk/tanstack-react-start";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowDown, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/chat/$threadId")({
	component: ChatThreadPage,
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

function ChatThreadPage() {
	const { threadId } = Route.useParams();
	const navigate = useNavigate();
	const { getToken } = useAuth();

	// 1. Thread Metadata (for title)
	const thread = useQuery(api.threads.get, {
		threadId: threadId as Id<"threads">,
	});

	// 2. Hybrid Core State
	const {
		uiMessages,
		conversationMessages,
		isLoading,
		stop,
		append,
		setMessages: setStreamingMessages,
		isTokenLoaded,
	} = useHybridChatMessages({ threadId });

	// 3. View Logic Extraction
	const parsedMessages = useParsedMessages(uiMessages, isLoading);

	// 4. UI Actions & State
	const { initialThinking, initialInput } = Route.useSearch();
	const [isThinkingEnabled, setIsThinkingEnabled] = useState(
		initialThinking ?? true,
	);

	// 5. Hooks: Actions, Scroll, Init
	const { handleSubmit, clearConversation } = useChatActions({
		threadId,
		isThinkingEnabled,
		append,
		setStreamingMessages,
		isLoading,
		getToken: () => getToken({ template: "convex" }),
	});

	const { scrollViewportRef, showScrollToBottom, pinToBottom } = useChatScroll(
		parsedMessages,
		isLoading,
	);

	useChatInitializationLogic({
		threadId,
		initialInput,
		clearInitialInput: () =>
			navigate({
				to: ".",
				params: { threadId },
				search: { initialInput: undefined },
				replace: true,
			}),
		append,
		isTokenLoaded,
		getToken: () => getToken({ template: "convex" }),
	});

	// Quick fix for the adapter:
	const adaptSendMessage = useCallback(
		(content: string) => append({ role: "user", content }),
		[append],
	);

	// Re-bind messageActions with correct methods
	const activeMessageActions = useMessageActions({
		messages: conversationMessages,
		setMessages: setStreamingMessages,
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
			<style>{BLINK_ANIMATION_CSS}</style>
			<ChatHeader
				hasMessages={uiMessages.length > 0}
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
