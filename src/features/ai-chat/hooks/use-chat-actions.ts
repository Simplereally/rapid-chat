import type { UIMessage } from "@tanstack/ai-react";
import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface UseChatActionsProps {
	threadId: string;
	isThinkingEnabled: boolean;
	setChatInput: (val: string) => void;
	append: (message: {
		role: "user";
		content: string;
	}) => Promise<string | null | undefined | void>;
	setStreamingMessages: (messages: UIMessage[]) => void;
	isLoading: boolean;
}

export function useChatActions({
	threadId,
	isThinkingEnabled,
	setChatInput,
	append,
	setStreamingMessages,
	isLoading,
}: UseChatActionsProps) {
	const addMessage = useMutation(api.messages.add);
	const clearThreadMessages = useMutation(api.messages.clearThread);

	const handleSubmit = async (e: React.FormEvent, chatInput: string) => {
		e.preventDefault();
		if (!chatInput.trim() || isLoading) return;

		const thinkPrefix = isThinkingEnabled ? "/think " : "/no_think ";
		const fullContent = thinkPrefix + chatInput;

		// 1. Save User Message to Convex (Persistence)
		// We do this concurrently.
		addMessage({
			threadId: threadId as Id<"threads">,
			role: "user",
			content: fullContent,
		});

		// 2. Trigger Stream
		await append({
			role: "user",
			content: fullContent,
		});

		setChatInput("");
	};

	const clearConversation = useCallback(async () => {
		if (isLoading) return;
		await clearThreadMessages({ threadId: threadId as Id<"threads"> });
		setStreamingMessages([]);
	}, [isLoading, clearThreadMessages, threadId, setStreamingMessages]);

	return {
		handleSubmit,
		clearConversation,
	};
}
