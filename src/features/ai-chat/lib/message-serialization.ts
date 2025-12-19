/**
 * Message Part Serialization for Convex Persistence
 *
 * This module handles serializing UIMessage parts (including tool calls) to a
 * string format for storage in Convex, and deserializing them back when loading.
 *
 * Format: [JSON array of serialized parts]
 *
 * This approach:
 * - Preserves all part information including tool calls with their outputs
 * - Enables tool call indicators to show completion state after page reload
 * - Supports text, thinking, and tool-call part types
 */

import type { ToolCallState } from "@tanstack/ai-client";

/**
 * Serializable representation of a tool call part for Convex storage.
 * Matches TanStack AI's ToolCallPart structure.
 */
export interface SerializedToolCallPart {
	type: "tool-call";
	id: string;
	name: string;
	arguments: string;
	state: ToolCallState;
	output?: unknown;
	approval?: {
		id: string;
		needsApproval: boolean;
		approved?: boolean;
	};
}

/**
 * Serializable representation of a tool result part for Convex storage.
 * Server-executed tools create these instead of setting output on ToolCallPart.
 */
export interface SerializedToolResultPart {
	type: "tool-result";
	toolCallId: string;
	content: string;
	state?: string;
}

/**
 * Serializable representation of a thinking part.
 */
export interface SerializedThinkingPart {
	type: "thinking";
	content: string;
}

/**
 * Serializable representation of a text part.
 */
export interface SerializedTextPart {
	type: "text";
	content: string;
}

/**
 * Union of all serializable part types.
 */
export type SerializedPart =
	| SerializedTextPart
	| SerializedToolCallPart
	| SerializedToolResultPart
	| SerializedThinkingPart;

/**
 * Serialize message parts for Convex storage.
 * Converts all parts to a JSON string representation.
 */
export function serializeMessageParts(
	parts: Array<{ type: string; content?: string; [key: string]: unknown }>,
): string {
	const serializedParts: SerializedPart[] = parts.map((part) => {
		if (part.type === "text") {
			return {
				type: "text" as const,
				content: (part.content as string) ?? "",
			};
		}
		if (part.type === "thinking") {
			return {
				type: "thinking" as const,
				content: (part.content as string) ?? "",
			};
		}
		if (part.type === "tool-call") {
			const toolPart = part as {
				type: string;
				id: string;
				name: string;
				arguments: string;
				state: ToolCallState;
				output?: unknown;
				approval?: {
					id: string;
					needsApproval: boolean;
					approved?: boolean;
				};
			};
			return {
				type: "tool-call" as const,
				id: toolPart.id,
				name: toolPart.name,
				arguments: toolPart.arguments,
				state: toolPart.state,
				output: toolPart.output,
				approval: toolPart.approval,
			};
		}
		if (part.type === "tool-result") {
			// Server-executed tools create a separate tool-result part
			const resultPart = part as {
				type: string;
				toolCallId: string;
				content?: string;
				state?: string;
			};
			return {
				type: "tool-result" as const,
				toolCallId: resultPart.toolCallId,
				content: resultPart.content ?? "",
				state: resultPart.state,
			};
		}
		// Fallback for unknown part types - treat as empty text
		return {
			type: "text" as const,
			content: "",
		};
	});

	return JSON.stringify(serializedParts);
}

/**
 * Deserialize message content from Convex back to parts array.
 * Handles both old format (plain text) and new format (JSON array of parts).
 */
export function deserializeMessageParts(
	content: string,
): Array<{ type: string; content?: string; [key: string]: unknown }> {
	// Try to parse as JSON first (new format)
	try {
		const parsed = JSON.parse(content);

		// Check if it's an array (new format)
		if (Array.isArray(parsed)) {
			return parsed.map((part: SerializedPart) => {
				if (part.type === "tool-call") {
					return {
						type: "tool-call",
						id: part.id,
						name: part.name,
						arguments: part.arguments,
						state: part.state,
						output: part.output,
						approval: part.approval,
					};
				}
				if (part.type === "tool-result") {
					return {
						type: "tool-result",
						toolCallId: part.toolCallId,
						content: part.content,
						state: part.state,
					};
				}
				if (part.type === "thinking") {
					return {
						type: "thinking",
						content: part.content,
					};
				}
				// Text part
				return {
					type: "text",
					content: (part as SerializedTextPart).content,
				};
			});
		}
	} catch {
		// Not JSON - it's the old plain text format
	}

	// Old format - just text content, return as single text part
	return [{ type: "text", content }];
}

/**
 * Extract plain text content from message parts (for backward compatibility).
 * Used when you need just the text content without tool calls.
 */
export function extractTextContent(
	parts: Array<{ type: string; content?: string; [key: string]: unknown }>,
): string {
	return parts
		.filter((part) => part.type === "text" || part.type === "thinking")
		.map((part) => {
			if (part.type === "thinking") {
				return `<think>${part.content}</think>`;
			}
			return part.content ?? "";
		})
		.join("");
}
