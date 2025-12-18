import type { UIMessage } from "@tanstack/ai-react";
import { useMutation } from "convex/react";
import { useCallback, useRef } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { triggerTitleGeneration } from "../lib/title-generation";

interface UseChatActionsProps {
	threadId: string;
	isThinkingEnabled: boolean;
	append: (
		message: { role: "user"; content: string } | UIMessage,
	) => Promise<void>;
	setStreamingMessages: (messages: UIMessage[]) => void;
	isLoading: boolean;
	getToken: () => Promise<string | null>;
}

/**
 * Chat action handlers with fire-and-forget persistence.
 * All Convex mutations are non-blocking to ensure rapid UI response.
 */
export function useChatActions({
	threadId,
	isThinkingEnabled,
	append,
	setStreamingMessages,
	isLoading,
	getToken,
}: UseChatActionsProps) {
	const addMessage = useMutation(api.messages.add);
	const clearThreadMessages = useMutation(api.messages.clearThread);

	// Track title generation to prevent duplicates
	const hasTitleBeenGenerated = useRef(false);

	/**
	 * Fire-and-forget user message persistence.
	 * Returns immediately - UI doesn't wait for Convex.
	 */
	const persistUserMessage = (content: string): void => {
		addMessage({
			threadId: threadId as Id<"threads">,
			role: "user",
			content,
		})
			.then(({ isFirstMessage }) => {
				// Trigger title generation for first message (fire-and-forget)
				if (isFirstMessage && !hasTitleBeenGenerated.current) {
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
			});
	};

	const handleSubmit = async (chatInput: string): Promise<void> => {
		if (!chatInput.trim() || isLoading) return;

		const thinkPrefix = isThinkingEnabled ? "/think " : "/no_think ";
		const fullContent = thinkPrefix + chatInput;

		// 1. Fire-and-forget persistence - don't block the UI
		persistUserMessage(fullContent);

		// 2. Immediately trigger the stream (TanStack AI generates the message ID)
		await append({ role: "user", content: fullContent });
	};

	const clearConversation = useCallback(async (): Promise<void> => {
		if (isLoading) return;

		// Clear UI immediately for responsive feedback
		setStreamingMessages([]);

		// Fire-and-forget database cleanup
		clearThreadMessages({ threadId: threadId as Id<"threads"> }).catch(
			(err) => {
				console.error("Failed to clear thread messages:", err);
			},
		);

		// Reset title generation flag
		hasTitleBeenGenerated.current = false;
	}, [isLoading, clearThreadMessages, threadId, setStreamingMessages]);

	return {
		handleSubmit,
		clearConversation,
	};
}
