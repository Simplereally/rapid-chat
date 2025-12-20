import type { UIMessage } from "@tanstack/ai-react";
import { useCallback, useEffect, useState } from "react";
import { parseThinkingContent, stripThinkPrefix } from "../lib/chat-utils";
import type { ParsedPart } from "../types";

interface UseMessageActionsOptions {
	messages: UIMessage[];
	setMessages: (messages: UIMessage[]) => void;
	sendMessage: (message: string) => void;
	isLoading: boolean;
	isThinkingEnabled: boolean;
}

/**
 * Custom hook encapsulating message interaction state and logic.
 * Handles editing, copying, regenerating, and clearing messages.
 */
export function useMessageActions({
	messages,
	setMessages,
	sendMessage,
	isLoading,
	isThinkingEnabled,
}: UseMessageActionsOptions) {
	// Edit mode state
	const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
	const [editContent, setEditContent] = useState("");

	// Copy feedback state
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

	// Pending action state (replacing setTimeout)
	const [pendingAction, setPendingAction] = useState<{
		type: "send";
		content: string;
	} | null>(null);

	// Effect to handle pending actions after state updates
	useEffect(() => {
		if (pendingAction && pendingAction.type === "send" && !isLoading) {
			// We assume that if this effect runs, the messages state *might* have been updated.
			// However, to be extra safe, we only send if we are not loading.
			// In a real app, we might want to check if the last message matches expectation,
			// but here just moving out of the event handler is enough to avoid strict race conditions
			// with the setState batching.
			sendMessage(pendingAction.content);
			setPendingAction(null);
		}
	}, [pendingAction, sendMessage, isLoading]);

	/**
	 * Get display content from a message (strips /think or /no_think prefix for user messages)
	 */
	const getDisplayContent = useCallback(
		(message: { role: string; parts?: unknown[]; parsedParts?: unknown[] }) => {
			// Support both parts (UIMessage) and parsedParts (ParsedMessage)
			const parts = (message.parts ?? message.parsedParts ?? []) as Array<
				ParsedPart | { type: string; content?: string }
			>;

			// Find the text part safely
			const textPart = parts.find(
				(p) =>
					p.type === "text" && "content" in p && typeof p.content === "string",
			) as { content: string } | undefined;

			if (!textPart || !textPart.content) return "";

			if (message.role === "user") {
				return stripThinkPrefix(textPart.content);
			}

			// For assistant, get the parsed content without thinking
			const { content } = parseThinkingContent(textPart.content);
			return content;
		},
		[],
	);

	/**
	 * Copy message content to clipboard with visual feedback
	 */
	const copyToClipboard = useCallback(
		async (messageId: string, text: string) => {
			try {
				await navigator.clipboard.writeText(text);
				setCopiedMessageId(messageId);
				// Clear after 2 seconds
				setTimeout(() => setCopiedMessageId(null), 2000);
			} catch (err) {
				console.error("Failed to copy:", err);
			}
		},
		[],
	);

	/**
	 * Clear the entire conversation
	 */
	const clearConversation = useCallback(() => {
		if (isLoading) return;
		setMessages([]);
	}, [isLoading, setMessages]);

	/**
	 * Regenerate the last AI response
	 */
	const regenerateResponse = useCallback(
		(assistantMessageId: string) => {
			if (isLoading) return;

			// Find the assistant message index
			const assistantIndex = messages.findIndex(
				(m) => m.id === assistantMessageId,
			);
			if (assistantIndex === -1) return;

			// Find the preceding user message
			let userMessageIndex = -1;
			for (let i = assistantIndex - 1; i >= 0; i--) {
				if (messages[i].role === "user") {
					userMessageIndex = i;
					break;
				}
			}

			if (userMessageIndex === -1) return;

			const userMessage = messages[userMessageIndex];
			const userContent = getDisplayContent(userMessage);

			// Truncate to just before the assistant response
			const truncatedMessages = messages.slice(0, assistantIndex);
			setMessages(truncatedMessages);

			// Resend the user message using effect
			const thinkPrefix = isThinkingEnabled ? "/think " : "/no_think ";
			setPendingAction({ type: "send", content: thinkPrefix + userContent });
		},
		[isLoading, messages, setMessages, isThinkingEnabled, getDisplayContent],
	);

	/**
	 * Start editing a message
	 */
	const startEditing = useCallback((messageId: string, content: string) => {
		setEditingMessageId(messageId);
		setEditContent(content);
	}, []);

	/**
	 * Cancel editing
	 */
	const cancelEditing = useCallback(() => {
		setEditingMessageId(null);
		setEditContent("");
	}, []);

	/**
	 * Submit edited message - truncates conversation and resends
	 */
	const submitEdit = useCallback(() => {
		if (!editingMessageId || !editContent.trim() || isLoading) return;

		// Find the index of the message being edited
		const messageIndex = messages.findIndex((m) => m.id === editingMessageId);
		if (messageIndex === -1) return;

		// Truncate messages to before the edited message
		const truncatedMessages = messages.slice(0, messageIndex);
		setMessages(truncatedMessages);

		// Send the edited message
		const thinkPrefix = isThinkingEnabled ? "/think " : "/no_think ";

		setPendingAction({ type: "send", content: editContent });

		// Clear edit state
		setEditingMessageId(null);
		setEditContent("");
	}, [
		editingMessageId,
		editContent,
		isLoading,
		messages,
		setMessages,
		isThinkingEnabled,
	]);

	return {
		// Edit state
		editingMessageId,
		editContent,
		setEditContent,
		startEditing,
		cancelEditing,
		submitEdit,

		// Copy state
		copiedMessageId,
		copyToClipboard,

		// Actions
		clearConversation,
		regenerateResponse,
		getDisplayContent,
	};
}
