import type { UIMessage } from "@tanstack/ai-react";
import { useMutation } from "convex/react";
import { useCallback, useRef } from "react";
import { useChatClientStore } from "@/stores/chat-client-store";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { triggerTitleGeneration } from "../lib/title-generation";

interface UseChatActionsProps {
	threadId: string;
	isThinkingEnabled: boolean;
	isLoading: boolean;
	getToken: () => Promise<string | null>;
	/** Persisted messages from Convex for conversation context */
	convexMessages?: Array<{ _id: string; role: string; content: string }> | null;
}

/**
 * Chat action handlers with fire-and-forget persistence.
 * All Convex mutations are non-blocking to ensure rapid UI response.
 */
export function useChatActions({
	threadId,
	isThinkingEnabled,
	isLoading,
	getToken,
	convexMessages,
}: UseChatActionsProps) {
	const addMessage = useMutation(api.messages.add);
	const clearThreadMessages = useMutation(api.messages.clearThread);

	// Track title generation to prevent duplicates
	const hasTitleBeenGenerated = useRef(false);

	/**
	 * User message persistence with Convex's built-in retry.
	 * Convex automatically handles retries and optimistic updates.
	 */
	const persistUserMessage = (content: string): void => {
		addMessage({
			threadId: threadId as Id<"threads">,
			role: "user",
			content,
		})
			.then((result) => {
				// Trigger title generation for first message
				if (result.isFirstMessage && !hasTitleBeenGenerated.current) {
					hasTitleBeenGenerated.current = true;
					getToken().then((token) => {
						if (token) {
							triggerTitleGeneration(threadId, content, token);
						}
					});
				}
			})
			.catch((err) => {
				console.error("Failed to persist user message:", err);
				// Convex will retry automatically
			});
	};

	const handleSubmit = (chatInput: string): void => {
		if (!chatInput.trim() || isLoading) return;

		const thinkPrefix = isThinkingEnabled ? "/think " : "/no_think ";
		const fullContent = chatInput;

		// Get token first - we need this synchronously, but getToken is async
		// Use a self-invoking async function to handle this
		(async () => {
			const token = await getToken();
			if (!token) {
				console.error("Authentication required");
				return;
			}

			// Configure persistence callback for assistant response
			const persistAssistantMessage = async (message: UIMessage) => {
				// Build content with <think> tags preserved so parseThinkingContent can re-extract them
				// when loading from Convex. Without this, thinking and text content merge together.
				const content = message.parts
					.filter((part) => part.type === "text" || part.type === "thinking")
					.map((part) => {
						if (part.type === "thinking") {
							// Wrap thinking content in <think> tags so it can be parsed later
							return `<think>${part.content}</think>`;
						}
						return part.content;
					})
					.join("");

				// Convex handles retries automatically
				await addMessage({
					threadId: threadId as Id<"threads">,
					role: "assistant",
					content,
				});

				// After successful Convex persistence, nuke the streaming state
				useChatClientStore.getState().nukeStreamingState(threadId);
			};

			// Persist user message immediately before starting stream
			persistUserMessage(fullContent);

			// Fire and forget - startChatRequest manages stream lifecycle via callbacks
			useChatClientStore.getState().startChatRequest({
				threadId,
				content: fullContent,
				apiEndpoint: `/api/chat?threadId=${threadId}`,
				getAuthHeaders: async () => ({
					Authorization: `Bearer ${token}`,
				}),
				// Pass conversation history so the LLM has full context
				conversationHistory: convexMessages?.map((msg) => ({
					id: msg._id,
					role: msg.role as "user" | "assistant",
					content: msg.content,
				})),
				onFinish: persistAssistantMessage,
				onError: (error) => {
					console.error("Stream error:", error);
				},
			});
		})();
	};

	const clearConversation = useCallback(async (): Promise<void> => {
		if (isLoading) return;

		// Clear Zustand streaming state immediately for responsive feedback
		useChatClientStore.getState().setMessages(threadId, []);

		// Fire-and-forget database cleanup
		clearThreadMessages({ threadId: threadId as Id<"threads"> }).catch(
			(err) => {
				console.error("Failed to clear thread messages:", err);
			},
		);

		// Reset title generation flag
		hasTitleBeenGenerated.current = false;
	}, [isLoading, clearThreadMessages, threadId]);

	return {
		handleSubmit,
		clearConversation,
	};
}
