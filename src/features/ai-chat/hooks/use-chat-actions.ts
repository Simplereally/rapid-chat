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

	// Track if we've already triggered title generation for this thread
	const titleGeneratedRef = useRef(false);

	const handleSubmit = async (chatInput: string) => {
		if (!chatInput.trim() || isLoading) return;

		const thinkPrefix = isThinkingEnabled ? "/think " : "/no_think ";
		const fullContent = thinkPrefix + chatInput;

		// 1. Save User Message to Convex (Persistence)
		const { isFirstMessage, messageId } = await addMessage({
			threadId: threadId as Id<"threads">,
			role: "user",
			content: fullContent,
		});

		// 2. Trigger AI title generation if this is the first message
		// Fire-and-forget: don't await, don't block the chat
		if (isFirstMessage && !titleGeneratedRef.current) {
			titleGeneratedRef.current = true;
			getToken().then((token) => {
				if (token) {
					triggerTitleGeneration(threadId, fullContent, token);
				}
			});
		}

		// 3. Trigger Stream
		await append({
			id: messageId,
			role: "user",
			parts: [{ type: "text", content: fullContent }],
		});
	};

	const clearConversation = useCallback(async () => {
		if (isLoading) return;
		await clearThreadMessages({ threadId: threadId as Id<"threads"> });
		setStreamingMessages([]);
		// Reset title generation flag when conversation is cleared
		titleGeneratedRef.current = false;
	}, [isLoading, clearThreadMessages, threadId, setStreamingMessages]);

	return {
		handleSubmit,
		clearConversation,
	};
}
