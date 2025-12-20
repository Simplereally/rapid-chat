/**
 * Write Tool Definition
 *
 * Tool DEFINITION only - no execute function.
 * This is used by both server (chat API) and client.
 * Actual execution happens via /api/tools/write endpoint.
 */

import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

// =============================================================================
// SCHEMAS
// =============================================================================

export const writeInputSchema = z.object({
	path: z
		.string()
		.describe(
			"The target file path to write to. " +
				"Parent directories will be created if they don't exist.",
		),
	content: z
		.string()
		.describe(
			"The content to write to the file. " +
				"This will completely replace any existing file content.",
		),
	encoding: z
		.enum(["utf-8", "base64", "ascii"])
		.optional()
		.default("utf-8")
		.describe(
			"Encoding for writing file contents. " +
				"Use 'base64' for binary content. Defaults to 'utf-8'.",
		),
	createDirectories: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			"If true (default), parent directories will be created if they don't exist.",
		),
});

export const writeOutputSchema = z.object({
	success: z.boolean().describe("Whether the write operation succeeded"),
	path: z.string().describe("The resolved file path"),
	bytesWritten: z
		.number()
		.optional()
		.describe("Number of bytes written to the file"),
	created: z
		.boolean()
		.optional()
		.describe("True if this was a new file, false if it was overwritten"),
	message: z.string().optional().describe("Human-readable success message"),
	error: z.string().optional().describe("Error message if write failed"),
});

export type WriteInput = z.infer<typeof writeInputSchema>;
export type WriteOutput = z.infer<typeof writeOutputSchema>;

// =============================================================================
// TOOL DEFINITION (no execute - for Pattern B)
// =============================================================================

/**
 * Write tool DEFINITION only.
 * ⚠️ REQUIRES USER APPROVAL - This tool modifies the filesystem.
 *
 * When passed to chat(), the server will NOT execute this tool.
 * Instead, it emits a tool-input-available chunk for client-side handling.
 */
export const writeToolDef = toolDefinition({
	name: "write",
	description:
		"Create a new file or overwrite an existing file with the provided content. " +
		"⚠️ This tool modifies the filesystem and requires user approval. " +
		"Parent directories are created automatically. " +
		"For surgical edits to existing files, prefer the 'edit' or 'multi_edit' tools instead.",
	inputSchema: writeInputSchema,
	outputSchema: writeOutputSchema,
	needsApproval: true, // Approval handled by ChatClient
});
