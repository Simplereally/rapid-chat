import type { UIMessage } from "@tanstack/ai-react";

/**
 * Extended message part with parsed thinking content.
 */
export interface ParsedTextPart {
	type: "text";
	content: string;
	parsedContent: string;
	thinkingContent: string;
	isThinking: boolean;
}

export interface ParsedThinkingPart {
	type: "thinking";
	content: string;
}

export type ParsedPart =
	| ParsedTextPart
	| ParsedThinkingPart
	| UIMessage["parts"][number];

export type ChatMessageRole = "user" | "assistant" | "error";

export interface ChatUiMessage extends Omit<UIMessage, "role"> {
	role: ChatMessageRole;
}

/**
 * Message with parsed parts for rendering.
 */
export interface ParsedMessage extends Omit<ChatUiMessage, "parts"> {
	parsedParts: ParsedPart[];
	isStreamingAssistant: boolean;
}
