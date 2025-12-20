/**
 * AI Tool Shared Types
 *
 * Tool names and other common types that are safe for both client and server.
 */

export const TOOL_NAMES = [
	"grep",
	"glob",
	"ls",
	"read",
	"web_search",
	"bash",
	"write",
	"edit",
	"multi_edit",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];
