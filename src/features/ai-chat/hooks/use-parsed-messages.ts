import { useMemo, useRef } from "react";
import { parseThinkingContent } from "../lib/chat-utils";
import type { ChatUiMessage, ParsedMessage, ParsedPart } from "../types";

/**
 * Parse a single message into ParsedMessage format.
 * Extracted to allow caching of completed messages.
 */
function parseMessage(
	message: ChatUiMessage,
	isStreamingAssistant: boolean,
): ParsedMessage {
	if (message.role !== "assistant") {
		return {
			...message,
			parsedParts: (message.parts || []) as ParsedPart[],
			isStreamingAssistant: false,
		};
	}

	const rawParts = message.parts || [];
	let lastTextIndex = -1;
	for (let i = 0; i < rawParts.length; i++) {
		if ((rawParts[i] as { type?: string } | undefined)?.type === "text") {
			lastTextIndex = i;
		}
	}

	const parsedParts: ParsedPart[] = [];
	for (let i = 0; i < rawParts.length; i++) {
		const part = rawParts[i] as ParsedPart | { type?: string };
		if (part.type === "text") {
			if (i !== lastTextIndex) {
				continue;
			}
			const p = part as { content?: string; text?: string };
			const rawContent =
				typeof p.content === "string"
					? p.content
					: typeof p.text === "string"
						? p.text
						: "";
			const { thinking, content, isThinking } =
				parseThinkingContent(rawContent);
			const currentlyThinking = isStreamingAssistant && isThinking;
			parsedParts.push({
				type: "text",
				content: rawContent,
				parsedContent: content,
				thinkingContent: thinking,
				isThinking: currentlyThinking,
			});
			continue;
		}
		parsedParts.push(part as ParsedPart);
	}

	return { ...message, parsedParts, isStreamingAssistant };
}

/**
 * Get content fingerprint for change detection.
 * Much cheaper than comparing full objects.
 */
function getContentFingerprint(message: ChatUiMessage): string {
	const parts = message.parts || [];
	let totalLength = 0;
	for (const part of parts) {
		const p = part as { content?: string; text?: string };
		if (typeof p.content === "string") totalLength += p.content.length;
		if (typeof p.text === "string") totalLength += p.text.length;
	}
	return `${message.id}:${parts.length}:${totalLength}`;
}

export function useParsedMessages(
	displayMessages: ChatUiMessage[],
	isLoading: boolean,
) {
	// Cache for parsed messages to avoid re-parsing completed messages
	// Key: message fingerprint, Value: parsed message
	const cacheRef = useRef<Map<string, ParsedMessage>>(new Map());

	const parsedMessages: ParsedMessage[] = useMemo(() => {
		const cache = cacheRef.current;
		const result: ParsedMessage[] = [];

		let lastAssistantId: string | null = null;
		for (let i = displayMessages.length - 1; i >= 0; i--) {
			if (displayMessages[i]?.role === "assistant") {
				lastAssistantId = displayMessages[i].id;
				break;
			}
		}

		for (let i = 0; i < displayMessages.length; i++) {
			const message = displayMessages[i];
			const isStreamingAssistant =
				isLoading &&
				message.role === "assistant" &&
				message.id === lastAssistantId;

			// For streaming messages, always re-parse (content is changing)
			if (isStreamingAssistant) {
				result.push(parseMessage(message, true));
				continue;
			}

			// For completed messages, use cache if available
			const fingerprint = getContentFingerprint(message);
			const cached = cache.get(fingerprint);

			if (cached && cached.id === message.id) {
				result.push(cached);
			} else {
				const parsed = parseMessage(message, false);
				cache.set(fingerprint, parsed);
				result.push(parsed);
			}
		}

		// Cleanup old cache entries to prevent memory leaks
		// Keep only entries for current messages
		const currentIds = new Set(displayMessages.map((m) => m.id));
		for (const [key, value] of cache.entries()) {
			if (!currentIds.has(value.id)) {
				cache.delete(key);
			}
		}

		return result;
	}, [displayMessages, isLoading]);

	return parsedMessages;
}
