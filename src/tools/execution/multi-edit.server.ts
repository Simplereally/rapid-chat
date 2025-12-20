/**
 * Multi-Edit Tool Execution (Server-only)
 *
 * This function performs batch edit operations on the server.
 * It's called from the /api/tools/multi-edit endpoint after client-side approval.
 */

import * as fs from "node:fs/promises";
import type {
	MultiEditInput,
	MultiEditOutput,
} from "../definitions/multi-edit";
import { resolveSafePath } from "../file-utils";

/**
 * Truncate long strings for display in results
 */
function truncateForDisplay(text: string, maxLength = 50): string {
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength - 3) + "...";
}

/**
 * Execute multiple edit operations on a single file.
 * This is the server-side implementation called from the tool execution API.
 * Operations are atomic - if any edit fails, no changes are made.
 */
export async function executeMultiEdit(
	input: MultiEditInput,
): Promise<MultiEditOutput> {
	const { edits, dryRun = false } = input;
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
					message:
						`Could not find text to replace. ` +
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
					error:
						`Edit ${i + 1}/${edits.length} failed: oldText not found. ` +
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
					message:
						`Found ${occurrences} occurrences of oldText. ` +
						`Each oldText must be unique to avoid ambiguous replacements.`,
				});

				return {
					success: false,
					path: resolvedPath,
					appliedEdits: successCount,
					totalEdits: edits.length,
					dryRun,
					results,
					error:
						`Edit ${i + 1}/${edits.length} failed: ambiguous match (${occurrences} occurrences). ` +
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
