import type { Tool } from "@tanstack/ai";
import { z } from "zod";
import * as fs from "node:fs/promises";
import { resolveSafePath } from "./file-utils";

// =============================================================================
// MULTI-EDIT TOOL - Batch multiple edit operations on one file [Requires Permission]
// =============================================================================

const editOperationSchema = z.object({
	oldText: z
		.string()
		.describe(
			"The exact text to find and replace. " +
				"Must match exactly, including whitespace and indentation.",
		),
	newText: z
		.string()
		.describe("The replacement text for this edit."),
});

const multiEditInputSchema = z.object({
	path: z
		.string()
		.describe("The file path to edit. Must be an existing file."),
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

const multiEditOutputSchema = z.object({
	success: z.boolean().describe("Whether all edit operations succeeded"),
	path: z.string().describe("The file path that was edited"),
	appliedEdits: z
		.number()
		.optional()
		.describe("Number of edits successfully applied"),
	totalEdits: z
		.number()
		.optional()
		.describe("Total number of edits requested"),
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

type MultiEditInput = z.infer<typeof multiEditInputSchema>;
type MultiEditOutput = z.infer<typeof multiEditOutputSchema>;

/**
 * Execute multiple edit operations on a single file
 */
async function executeMultiEdit(input: MultiEditInput): Promise<MultiEditOutput> {
	const { edits, dryRun } = input;
	const resolvedPath = resolveSafePath(input.path);

	try {
		// Read the file
		let content = await fs.readFile(resolvedPath, "utf-8");
		const results: MultiEditOutput["results"] = [];
		let successCount = 0;

		// Process each edit in order
		for (let i = 0; i < edits.length; i++) {
			const edit = edits[i];
			const { oldText, newText } = edit;

			// Check if oldText exists in current content
			if (!content.includes(oldText)) {
				results.push({
					index: i,
					success: false,
					oldText: truncateForDisplay(oldText),
					message: `Could not find text to replace. ` +
						`Ensure it matches exactly, including whitespace.`,
				});
				
				// If an edit fails, abort the entire operation
				return {
					success: false,
					path: resolvedPath,
					appliedEdits: successCount,
					totalEdits: edits.length,
					dryRun,
					results,
					error: `Edit ${i + 1}/${edits.length} failed: oldText not found. ` +
						`No changes were made to the file.`,
				};
			}

			// Count occurrences
			const occurrences = content.split(oldText).length - 1;
			if (occurrences > 1) {
				results.push({
					index: i,
					success: false,
					oldText: truncateForDisplay(oldText),
					message: `Found ${occurrences} occurrences of oldText. ` +
						`Each oldText must be unique to avoid ambiguous replacements.`,
				});

				return {
					success: false,
					path: resolvedPath,
					appliedEdits: successCount,
					totalEdits: edits.length,
					dryRun,
					results,
					error: `Edit ${i + 1}/${edits.length} failed: ambiguous match (${occurrences} occurrences). ` +
						`No changes were made to the file.`,
				};
			}

			// Apply the edit to our working content
			content = content.replace(oldText, newText);
			successCount++;

			results.push({
				index: i,
				success: true,
				oldText: truncateForDisplay(oldText),
				message: `Successfully replaced`,
			});
		}

		// All edits validated successfully
		if (!dryRun) {
			// Write the final content back to file
			await fs.writeFile(resolvedPath, content, "utf-8");
		}

		return {
			success: true,
			path: resolvedPath,
			appliedEdits: successCount,
			totalEdits: edits.length,
			dryRun,
			results,
			message: dryRun
				? `Dry run: ${successCount}/${edits.length} edits would succeed`
				: `Successfully applied ${successCount}/${edits.length} edits to ${resolvedPath}`,
		};
	} catch (error) {
		return {
			success: false,
			path: resolvedPath,
			totalEdits: edits.length,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Truncate long strings for display in results
 */
function truncateForDisplay(text: string, maxLength = 50): string {
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength - 3) + "...";
}

/**
 * Multi-Edit Tool - Batch multiple edit operations on one file
 *
 * ⚠️ REQUIRES USER APPROVAL - This tool modifies files.
 *
 * Use this for making multiple edits to the same file in one operation.
 * Edits are applied in order and are atomic - if any edit fails,
 * no changes are made to the file.
 */
export const multiEditTool: Tool<
	typeof multiEditInputSchema,
	typeof multiEditOutputSchema,
	"multi_edit"
> = {
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
	execute: executeMultiEdit,
	needsApproval: true, // 🔒 DANGEROUS - requires user permission
};

// =============================================================================
// EXPORTS
// =============================================================================

export { multiEditInputSchema, multiEditOutputSchema };
export type { MultiEditInput, MultiEditOutput };
