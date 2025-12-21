import type { ReactNode } from "react";
import type { UIMessage } from "@tanstack/ai-react";

// ===================================
// Tool Display Types
// ===================================

/**
 * A single detail row for tool display (e.g., "Command: ls -la" or "Path: /src/file.ts")
 */
export interface ToolDetail {
	label: string;
	value: string;
	isCode?: boolean;
}

/**
 * Complete display information for a tool approval card.
 * Contains all UI-relevant data for rendering the approval interface.
 */
export interface ToolDisplayInfo {
	icon: ReactNode;
	title: string;
	description: string;
	details: ToolDetail[];
	variant: "warning" | "danger";
}

// ===================================
// Message Types
// ===================================

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
