import * as fs from "node:fs/promises";
import type { Tool } from "@tanstack/ai";
import { z } from "zod";
import { resolveSafePath } from "./file-utils";

// =============================================================================
// EDIT TOOL - Single find-and-replace in a file [Requires Permission]
// =============================================================================

const editInputSchema = z.object({
	path: z.string().describe("The file path to edit. Must be an existing file."),
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

const editOutputSchema = z.object({
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

type EditInput = z.infer<typeof editInputSchema>;
type EditOutput = z.infer<typeof editOutputSchema>;

/**
 * Get context lines around a match for diff display
 */
function getContextualDiff(
	content: string,
	oldText: string,
	newText: string,
	contextLines = 3,
): { before: string; after: string } {
	const lines = content.split("\n");
	const matchIndex = content.indexOf(oldText);

	if (matchIndex === -1) {
		return { before: "", after: "" };
	}

	// Find line number of match start
	const beforeMatch = content.substring(0, matchIndex);
	const matchStartLine = beforeMatch.split("\n").length - 1;

	// Find line number of match end
	const matchEndLine = matchStartLine + oldText.split("\n").length - 1;

	// Get context range
	const contextStart = Math.max(0, matchStartLine - contextLines);
	const contextEnd = Math.min(lines.length - 1, matchEndLine + contextLines);

	const beforeLines = lines.slice(contextStart, contextEnd + 1);
	const afterContent = content.replace(oldText, newText);
	const afterLines = afterContent
		.split("\n")
		.slice(contextStart, contextEnd + 1);

	return {
		before: beforeLines.join("\n"),
		after: afterLines.join("\n"),
	};
}

/**
 * Execute single edit operation
 */
async function executeEdit(input: EditInput): Promise<EditOutput> {
	const { oldText, newText, expectedReplacements } = input;
	const resolvedPath = resolveSafePath(input.path);

	try {
		// Read the file
		const content = await fs.readFile(resolvedPath, "utf-8");

		// Count occurrences of oldText
		const regex = new RegExp(escapeRegex(oldText), "g");
		const matches = content.match(regex);
		const occurrences = matches?.length ?? 0;

		// Validate expected replacements
		if (occurrences === 0) {
			return {
				success: false,
				path: resolvedPath,
				replacementsCount: 0,
				error:
					`Could not find the specified text to replace. ` +
					`Make sure oldText matches exactly, including whitespace and indentation.`,
			};
		}

		if (occurrences !== expectedReplacements) {
			return {
				success: false,
				path: resolvedPath,
				replacementsCount: 0,
				error:
					`Found ${occurrences} occurrence(s) of the text, but expected ${expectedReplacements}. ` +
					`To prevent unintended changes, the edit was not applied. ` +
					`Either make oldText more specific or update expectedReplacements.`,
			};
		}

		// Get diff before making changes
		const diff = getContextualDiff(content, oldText, newText);

		// Perform the replacement
		const newContent = content.split(oldText).join(newText);

		// Write back to file
		await fs.writeFile(resolvedPath, newContent, "utf-8");

		return {
			success: true,
			path: resolvedPath,
			replacementsCount: occurrences,
			message: `Successfully replaced ${occurrences} occurrence(s) in ${resolvedPath}`,
			diff,
		};
	} catch (error) {
		return {
			success: false,
			path: resolvedPath,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Edit Tool - Single find-and-replace operation
 *
 * ⚠️ REQUIRES USER APPROVAL - This tool modifies files.
 *
 * Use this for making a single, targeted edit to a file.
 * For multiple edits in the same file, use multi_edit instead.
 */
export const editTool: Tool<
	typeof editInputSchema,
	typeof editOutputSchema,
	"edit"
> = {
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
	execute: executeEdit,
	needsApproval: true, // 🔒 DANGEROUS - requires user permission
};

// =============================================================================
// EXPORTS
// =============================================================================

export { editInputSchema, editOutputSchema };
export type { EditInput, EditOutput };
