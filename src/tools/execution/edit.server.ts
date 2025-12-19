/**
 * Edit Tool Execution (Server-only)
 *
 * This function performs find-and-replace edits on the server.
 * It's called from the /api/tools/edit endpoint after client-side approval.
 */

import * as fs from "node:fs/promises";
import { resolveSafePath } from "../file-utils";
import type { EditInput, EditOutput } from "../definitions/edit";

/**
 * Escape special regex characters in a string
 */
function escapeRegex(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
	const afterLines = afterContent.split("\n").slice(contextStart, contextEnd + 1);

	return {
		before: beforeLines.join("\n"),
		after: afterLines.join("\n"),
	};
}

/**
 * Execute a single edit operation.
 * This is the server-side implementation called from the tool execution API.
 */
export async function executeEdit(input: EditInput): Promise<EditOutput> {
	const { oldText, newText, expectedReplacements = 1 } = input;
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
				error: `Could not find the specified text to replace. ` +
					`Make sure oldText matches exactly, including whitespace and indentation.`,
			};
		}

		if (occurrences !== expectedReplacements) {
			return {
				success: false,
				path: resolvedPath,
				replacementsCount: 0,
				error: `Found ${occurrences} occurrence(s) of the text, but expected ${expectedReplacements}. ` +
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
