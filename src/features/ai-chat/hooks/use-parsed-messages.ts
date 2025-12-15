import type { UIMessage } from "@tanstack/ai-react";
import { useMemo } from "react";
import { parseThinkingContent } from "../lib/chat-utils";
import type { ParsedMessage, ParsedPart } from "../types";

export function useParsedMessages(
	displayMessages: UIMessage[],
	isLoading: boolean,
) {
	const parsedMessages: ParsedMessage[] = useMemo(() => {
		return displayMessages.map((message, messageIndex) => {
			const isLastMessage = messageIndex === displayMessages.length - 1;
			const isStreamingAssistant =
				isLoading && message.role === "assistant" && isLastMessage;

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
					const { thinking, content, isThinking } = parseThinkingContent(
						rawContent,
					);
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
		});
	}, [displayMessages, isLoading]);

	return parsedMessages;
}
