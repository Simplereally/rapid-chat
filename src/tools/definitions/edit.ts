/**
 * Edit Tool Definition
 *
 * Tool DEFINITION only - no execute function.
 * This is used by both server (chat API) and client.
 * Actual execution happens via /api/tools/edit endpoint.
 */

import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

// =============================================================================
// SCHEMAS
// =============================================================================

export const editInputSchema = z.object({
	path: z
		.string()
		.describe("The file path to edit. Must be an existing file."),
	oldText: z
		.string()
		.describe(
			"The exact text to find and replace. " +
				"Must match exactly, including whitespace and indentation. " +
				"This should be unique within the file to avoid ambiguous replacements.",
		),
	newText: z
		.string()
		.describe(
			"The replacement text. " +
				"This will replace the oldText exactly where it's found.",
		),
	expectedReplacements: z
		.number()
		.optional()
		.default(1)
		.describe(
			"Expected number of replacements. Defaults to 1. " +
				"If the actual count doesn't match, the operation will fail " +
				"to prevent unintended changes.",
		),
});

export const editOutputSchema = z.object({
	success: z.boolean().describe("Whether the edit operation succeeded"),
	path: z.string().describe("The file path that was edited"),
	replacementsCount: z
		.number()
		.optional()
		.describe("Number of replacements made"),
	message: z.string().optional().describe("Human-readable result message"),
	diff: z
		.object({
			before: z.string().describe("Content before the edit (context)"),
			after: z.string().describe("Content after the edit (context)"),
		})
		.optional()
		.describe("Shows the change with surrounding context"),
	error: z.string().optional().describe("Error message if edit failed"),
});

export type EditInput = z.infer<typeof editInputSchema>;
export type EditOutput = z.infer<typeof editOutputSchema>;

// =============================================================================
// TOOL DEFINITION (no execute - for Pattern B)
// =============================================================================

/**
 * Edit tool DEFINITION only.
 * ⚠️ REQUIRES USER APPROVAL - This tool modifies files.
 *
 * Use this for making a single, targeted edit to a file.
 * For multiple edits in the same file, use multi_edit instead.
 *
 * When passed to chat(), the server will NOT execute this tool.
 * Instead, it emits a tool-input-available chunk for client-side handling.
 */
export const editToolDef = toolDefinition({
	name: "edit",
	description:
		"Make a single find-and-replace edit in a file. " +
		"⚠️ This tool modifies files and requires user approval. " +
		"Provide the exact text to find (oldText) and its replacement (newText). " +
		"The oldText must match exactly, including whitespace and indentation. " +
		"For multiple edits in the same file, use 'multi_edit' instead. " +
		"For creating new files or complete overwrites, use 'write' instead.",
	inputSchema: editInputSchema,
	outputSchema: editOutputSchema,
	needsApproval: true, // Approval handled by ChatClient
});
