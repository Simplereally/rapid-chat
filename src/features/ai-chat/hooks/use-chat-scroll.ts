import type { UIMessage } from "@tanstack/ai-react";
import { type RefObject, useCallback, useLayoutEffect, useRef } from "react";
import type { ParsedMessage } from "../types";

/**
 * Get a lightweight fingerprint of the last message for scroll detection.
 * Avoids JSON.stringify which is expensive during rapid streaming.
 */
function getLastMessageFingerprint(messages: UIMessage[] | ParsedMessage[]): string {
	if (messages.length === 0) return "";
	const last = messages[messages.length - 1];
	// Use id + parts count + approximate content length for change detection
	// This is much cheaper than JSON.stringify during streaming
	// Handle both UIMessage (parts) and ParsedMessage (parsedParts)
	const parts = (last as UIMessage).parts || (last as ParsedMessage).parsedParts || [];
	let contentLength = 0;
	for (const part of parts) {
		const p = part as { content?: string; text?: string; parsedContent?: string };
		if (typeof p.content === "string") contentLength += p.content.length;
		if (typeof p.text === "string") contentLength += p.text.length;
		if (typeof p.parsedContent === "string") contentLength += p.parsedContent.length;
	}
	return `${last.id}:${parts.length}:${contentLength}`;
}

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

	// Auto-scroll trigger using lightweight fingerprint
	const lastMessageFingerprint = getLastMessageFingerprint(messages);

	useLayoutEffect(() => {
		void lastMessageFingerprint;
		if (messages.length > 0 || isLoading) {
			scrollToBottom();
		}
	}, [messages.length, lastMessageFingerprint, isLoading, scrollToBottom]);

	return { scrollViewportRef, scrollToBottom };
}

