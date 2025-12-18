/**
 * AI Tools - Claude Code Aligned
 *
 * This module exports all available tools for use with TanStack AI.
 * Tools are named and structured to align with Claude Code conventions.
 *
 * Tool Categories:
 *
 * Direct file IO:
 * - read: Read files (text, images, PDFs)
 * - write: Create or overwrite files [Requires Permission]
 * - edit: Single find-and-replace in a file [Requires Permission]
 * - multi_edit: Batch multiple Edit operations [Requires Permission]
 *
 * Search / Discovery:
 * - glob: Find files by pattern
 * - grep: Search file contents by regex
 * - ls: List directory contents
 *
 * Shell / Terminal:
 * - bash: Execute shell commands [Requires Permission]
 *
 * External:
 * - web_search: Search the web for information
 *
 * Permission Strategy:
 * - Read-only tools: `needsApproval: false` - auto-execute
 * - Write/destructive tools: `needsApproval: true` - require user permission
 */

// =============================================================================
// DIRECT FILE IO
// =============================================================================

// Read - Read files (text, images, PDFs)
export { readTool } from "./read";
export type { ReadInput, ReadOutput } from "./read";
export { readInputSchema, readOutputSchema } from "./read";

// Write - Create or overwrite files [Requires Permission]
export { writeTool } from "./write";
export type { WriteInput, WriteOutput } from "./write";
export { writeInputSchema, writeOutputSchema } from "./write";

// Edit - Single find-and-replace [Requires Permission]
export { editTool } from "./edit";
export type { EditInput, EditOutput } from "./edit";
export { editInputSchema, editOutputSchema } from "./edit";

// MultiEdit - Batch edit operations [Requires Permission]
export { multiEditTool } from "./multi-edit";
export type { MultiEditInput, MultiEditOutput } from "./multi-edit";
export { multiEditInputSchema, multiEditOutputSchema } from "./multi-edit";

// =============================================================================
// SEARCH / DISCOVERY
// =============================================================================

// Glob - Find files by pattern
export { globTool } from "./glob";
export type { GlobInput, GlobOutput } from "./glob";
export { globInputSchema, globOutputSchema } from "./glob";

// Grep - Search file contents by regex
export { grepTool } from "./grep";
export type { GrepInput, GrepOutput } from "./grep";
export { grepInputSchema, grepOutputSchema } from "./grep";

// LS - List directory contents
export { lsTool } from "./ls";
export type { LsInput, LsOutput } from "./ls";
export { lsInputSchema, lsOutputSchema } from "./ls";

// =============================================================================
// SHELL / TERMINAL
// =============================================================================

// Bash - Execute shell commands [Requires Permission]
export { bashTool } from "./bash";
export type { BashInput, BashOutput } from "./bash";
export { bashInputSchema, bashOutputSchema } from "./bash";

// =============================================================================
// EXTERNAL
// =============================================================================

// Web Search
export { webSearchTool } from "./web-search";
export type { WebSearchInput, WebSearchOutput } from "./web-search";

// =============================================================================
// UTILITIES
// =============================================================================

export { resolveSafePath } from "./file-utils";

// =============================================================================
// TOOL COLLECTIONS
// =============================================================================

import { readTool } from "./read";
import { writeTool } from "./write";
import { editTool } from "./edit";
import { multiEditTool } from "./multi-edit";
import { globTool } from "./glob";
import { grepTool } from "./grep";
import { lsTool } from "./ls";
import { bashTool } from "./bash";
import { webSearchTool } from "./web-search";

/**
 * All file-IO tools aligned with Claude Code conventions
 */
export const fileIOTools = {
	// Direct file IO
	read: readTool,
	write: writeTool,
	edit: editTool,
	multiEdit: multiEditTool,
	// Search / Discovery
	glob: globTool,
	grep: grepTool,
	ls: lsTool,
} as const;

/**
 * Array of all file-IO tools for easy spreading into tool configs
 */
export const fileIOToolsArray = [
	readTool,
	writeTool,
	editTool,
	multiEditTool,
	globTool,
	grepTool,
	lsTool,
] as const;

/**
 * Shell/Terminal tools
 */
export const shellTools = {
	bash: bashTool,
} as const;

/**
 * All tools including web search and shell
 */
export const allTools = {
	...fileIOTools,
	...shellTools,
	webSearch: webSearchTool,
} as const;

/**
 * Array of all tools
 */
export const allToolsArray = [
	...fileIOToolsArray,
	bashTool,
	webSearchTool,
] as const;

/**
 * Type-safe union of all available tool names
 */
export type ToolName = (typeof allToolsArray)[number]["name"];

/**
 * Safe tools that don't require user approval (read-only operations)
 */
export const safeTools = [
	readTool,
	globTool,
	grepTool,
	lsTool,
	webSearchTool,
] as const;

/**
 * Dangerous tools that require user approval (write/execute operations)
 */
export const dangerousTools = [
	writeTool,
	editTool,
	multiEditTool,
	bashTool,
] as const;
