/**
 * Multi-Edit Tool Definition
 *
 * Tool DEFINITION only - no execute function.
 * This is used by both server (chat API) and client.
 * Actual execution happens via /api/tools/multi-edit endpoint.
 */

import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

// =============================================================================
// SCHEMAS
// =============================================================================

const editOperationSchema = z.object({
	oldText: z
		.string()
		.describe(
			"The exact text to find and replace. " +
				"Must match exactly, including whitespace and indentation.",
		),
	newText: z.string().describe("The replacement text for this edit."),
});

export const multiEditInputSchema = z.object({
	path: z.string().describe("The file path to edit. Must be an existing file."),
	edits: z
		.array(editOperationSchema)
		.min(1)
		.describe(
			"Array of edit operations to perform. " +
				"Each edit specifies oldText to find and newText to replace it with. " +
				"Edits are applied in order, so later edits see the result of earlier ones.",
		),
	dryRun: z
		.boolean()
		.optional()
		.default(false)
		.describe(
			"If true, validates all edits without actually modifying the file. " +
				"Useful for checking if edits will succeed before applying them.",
		),
});

export const multiEditOutputSchema = z.object({
	success: z.boolean().describe("Whether all edit operations succeeded"),
	path: z.string().describe("The file path that was edited"),
	appliedEdits: z
		.number()
		.optional()
		.describe("Number of edits successfully applied"),
	totalEdits: z.number().optional().describe("Total number of edits requested"),
	dryRun: z
		.boolean()
		.optional()
		.describe("Whether this was a dry run (no actual changes made)"),
	results: z
		.array(
			z.object({
				index: z.number().describe("Edit index (0-based)"),
				success: z.boolean().describe("Whether this edit succeeded"),
				oldText: z.string().describe("The text that was replaced"),
				message: z.string().optional().describe("Result message for this edit"),
			}),
		)
		.optional()
		.describe("Individual results for each edit operation"),
	message: z.string().optional().describe("Overall result message"),
	error: z.string().optional().describe("Error message if operation failed"),
});

export type MultiEditInput = z.infer<typeof multiEditInputSchema>;
export type MultiEditOutput = z.infer<typeof multiEditOutputSchema>;

// =============================================================================
// TOOL DEFINITION (no execute - for Pattern B)
// =============================================================================

/**
 * Multi-Edit tool DEFINITION only.
 * ⚠️ REQUIRES USER APPROVAL - This tool modifies files.
 *
 * Use this for making multiple edits to the same file in one operation.
 * Edits are applied in order and are atomic - if any edit fails,
 * no changes are made to the file.
 *
 * When passed to chat(), the server will NOT execute this tool.
 * Instead, it emits a tool-input-available chunk for client-side handling.
 */
export const multiEditToolDef = toolDefinition({
	name: "multi_edit",
	description:
		"Make multiple find-and-replace edits in a single file. " +
		"⚠️ This tool modifies files and requires user approval. " +
		"Provide an array of edits, each with oldText and newText. " +
		"Edits are applied in order (later edits see results of earlier ones). " +
		"Operation is atomic: if any edit fails, no changes are made. " +
		"Use dryRun=true to validate edits without modifying the file. " +
		"For single edits, use 'edit'. For new files, use 'write'.",
	inputSchema: multiEditInputSchema,
	outputSchema: multiEditOutputSchema,
	needsApproval: true, // Approval handled by ChatClient
});
