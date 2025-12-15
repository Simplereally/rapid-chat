import type { UIMessage } from "@tanstack/ai-react";
import { type RefObject, useCallback, useLayoutEffect, useRef } from "react";
import type { ParsedMessage } from "../types";

export function useChatScroll(
	messages: UIMessage[] | ParsedMessage[],
	isLoading: boolean,
) {
	const scrollViewportRef = useRef<HTMLDivElement>(
		null,
	) as RefObject<HTMLDivElement>;

	// Scroll helper
	const scrollToBottom = useCallback(() => {
		if (scrollViewportRef.current) {
			scrollViewportRef.current.scrollTo({
				top: scrollViewportRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
	}, []);

	// Auto-scroll trigger
	// We need to detect when content actually grows/changes.
	// Using a string derivation of content is commonly used to detect "new tokens".
	const lastMessageContent =
		messages.length > 0 ? JSON.stringify(messages[messages.length - 1]) : "";

	useLayoutEffect(() => {
		void lastMessageContent;
		if (messages.length > 0 || isLoading) {
			scrollToBottom();
		}
	}, [messages.length, lastMessageContent, isLoading, scrollToBottom]);

	return { scrollViewportRef, scrollToBottom };
}
