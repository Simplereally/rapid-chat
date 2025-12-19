/**
 * AI Tools - Pattern B Refactor
 *
 * This module exports all available tools for use with TanStack AI.
 * Tools are organized into three categories:
 *
 * 1. DEFINITIONS - Tool specifications only (no execute) for server chat()
 *    Used when the server should NOT execute tools (client handles approval + execution)
 *
 * 2. CLIENT TOOLS - Browser-side tool implementations that call execution APIs
 *    Used by ChatClient for tools requiring approval
 *
 * 3. SAFE TOOLS - Complete tools with execute functions (auto-execute, no approval)
 *    Used for read-only operations that don't need user approval
 *
 * Pattern B Flow:
 * - Server: chat({ tools: [bashToolDef, ...safeTools] })  // definitions for approval-required
 * - Client: ChatClient({ tools: [bashToolClient, ...] })  // client handles execution
 */

// =============================================================================
// TOOL DEFINITIONS (for server chat() and type inference)
// =============================================================================

export {
	bashToolDef,
	bashInputSchema,
	bashOutputSchema,
	type BashInput,
	type BashOutput,
} from "./definitions/bash";

export {
	writeToolDef,
	writeInputSchema,
	writeOutputSchema,
	type WriteInput,
	type WriteOutput,
} from "./definitions/write";

export {
	editToolDef,
	editInputSchema,
	editOutputSchema,
	type EditInput,
	type EditOutput,
} from "./definitions/edit";

export {
	multiEditToolDef,
	multiEditInputSchema,
	multiEditOutputSchema,
	type MultiEditInput,
	type MultiEditOutput,
} from "./definitions/multi-edit";

// =============================================================================
// CLIENT TOOLS (for ChatClient registration - browser-side execution)
// =============================================================================

export { bashToolClient } from "./client/bash.client";
export { writeToolClient } from "./client/write.client";
export { editToolClient } from "./client/edit.client";
export { multiEditToolClient } from "./client/multi-edit.client";

// =============================================================================
// SAFE TOOLS (auto-execute, no approval needed)
// These keep the full Tool structure with execute function
// =============================================================================

// Read - Read files (text, images, PDFs)
export { readTool } from "./read";
export type { ReadInput, ReadOutput } from "./read";
export { readInputSchema, readOutputSchema } from "./read";

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

// Web Search - Search the web for information
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
import { globTool } from "./glob";
import { grepTool } from "./grep";
import { lsTool } from "./ls";
import { webSearchTool } from "./web-search";

import {
	bashToolDef,
	writeToolDef,
	editToolDef,
	multiEditToolDef,
} from "./definitions";

import {
	bashToolClient,
	writeToolClient,
	editToolClient,
	multiEditToolClient,
} from "./client";

/**
 * Safe tools that don't require user approval (read-only operations)
 * These have execute functions and auto-execute on the server
 */
export const safeTools = [
	readTool,
	globTool,
	grepTool,
	lsTool,
	webSearchTool,
] as const;

/**
 * Tool DEFINITIONS for approval-required tools
 * These have NO execute function - server emits tool-input-available chunks
 */
export const approvalToolDefs = [
	bashToolDef,
	writeToolDef,
	editToolDef,
	multiEditToolDef,
] as const;

/**
 * All tool definitions for server chat() call
 * Mix of safe tools (full Tool with execute) and definitions (no execute)
 */
export const allServerTools = [
	...safeTools,
	...approvalToolDefs,
] as const;

/**
 * Client tools for ChatClient registration
 * These are called by the client after user approval
 */
export const clientTools = [
	bashToolClient,
	writeToolClient,
	editToolClient,
	multiEditToolClient,
] as const;

export * from "./types";


// =============================================================================
// LEGACY EXPORTS (for backward compatibility during migration)
// These re-export the old tool structures - can be removed after full migration
// =============================================================================

// Legacy full tool exports - kept for backward compatibility
// These are the original tools with execute functions bundled
export { bashTool } from "./bash";
export { writeTool } from "./write";
export { editTool } from "./edit";
export { multiEditTool } from "./multi-edit";
