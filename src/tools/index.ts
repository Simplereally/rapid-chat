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
	type BashInput,
	type BashOutput,
	bashInputSchema,
	bashOutputSchema,
	bashToolDef,
} from "./definitions/bash";
export {
	type EditInput,
	type EditOutput,
	editInputSchema,
	editOutputSchema,
	editToolDef,
} from "./definitions/edit";
export {
	type MultiEditInput,
	type MultiEditOutput,
	multiEditInputSchema,
	multiEditOutputSchema,
	multiEditToolDef,
} from "./definitions/multi-edit";
export {
	type WriteInput,
	type WriteOutput,
	writeInputSchema,
	writeOutputSchema,
	writeToolDef,
} from "./definitions/write";

// =============================================================================
// CLIENT TOOLS (for ChatClient registration - browser-side execution)
// =============================================================================

export { bashToolClient } from "./client/bash.client";
export { editToolClient } from "./client/edit.client";
export { multiEditToolClient } from "./client/multi-edit.client";
export { writeToolClient } from "./client/write.client";

// =============================================================================
// SAFE TOOLS (auto-execute, no approval needed)
// These keep the full Tool structure with execute function
// =============================================================================

export type { GlobInput, GlobOutput } from "./glob";
// Glob - Find files by pattern
export { globInputSchema, globOutputSchema, globTool } from "./glob";
export type { GrepInput, GrepOutput } from "./grep";
// Grep - Search file contents by regex
export { grepInputSchema, grepOutputSchema, grepTool } from "./grep";
export type { LsInput, LsOutput } from "./ls";
// LS - List directory contents
export { lsInputSchema, lsOutputSchema, lsTool } from "./ls";
export type { ReadInput, ReadOutput } from "./read";
// Read - Read files (text, images, PDFs)
export { readInputSchema, readOutputSchema, readTool } from "./read";
export type { WebSearchInput, WebSearchOutput } from "./web-search";
// Web Search - Search the web for information
export { webSearchTool } from "./web-search";

// =============================================================================
// UTILITIES
// =============================================================================

export { resolveSafePath } from "./file-utils";

// =============================================================================
// TOOL COLLECTIONS
// =============================================================================

import {
	bashToolClient,
	editToolClient,
	multiEditToolClient,
	writeToolClient,
} from "./client";
import {
	bashToolDef,
	editToolDef,
	multiEditToolDef,
	writeToolDef,
} from "./definitions";
import { globTool } from "./glob";
import { grepTool } from "./grep";
import { lsTool } from "./ls";
import { readTool } from "./read";
import { webSearchTool } from "./web-search";

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
export const allServerTools = [...safeTools, ...approvalToolDefs] as const;

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
export { editTool } from "./edit";
export { multiEditTool } from "./multi-edit";
export { writeTool } from "./write";
