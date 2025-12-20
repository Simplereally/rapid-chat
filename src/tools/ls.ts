import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Tool } from "@tanstack/ai";
import { z } from "zod";
import { resolveSafePath } from "./file-utils";

// =============================================================================
// LS TOOL - List directory contents
// =============================================================================

const lsInputSchema = z.object({
	path: z
		.string()
		.describe(
			"The directory path to list. Use '.' for current directory. " +
				"Must be a directory, not a file.",
		),
	showHidden: z
		.boolean()
		.optional()
		.default(false)
		.describe(
			"If true, include hidden files (those starting with '.'). " +
				"Defaults to false.",
		),
	includeDetails: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			"If true (default), include file size, type, and modification time. " +
				"Set to false for a simpler name-only listing.",
		),
});

const lsOutputSchema = z.object({
	success: z.boolean().describe("Whether the listing succeeded"),
	path: z.string().describe("The resolved directory path"),
	totalItems: z
		.number()
		.optional()
		.describe("Total number of items in directory"),
	entries: z
		.array(
			z.object({
				name: z.string().describe("File or directory name"),
				type: z
					.enum(["file", "directory", "symlink", "unknown"])
					.describe("Type of entry"),
				size: z.number().optional().describe("Size in bytes (for files)"),
				modifiedAt: z.string().optional().describe("Last modification time"),
			}),
		)
		.optional()
		.describe("List of directory entries"),
	error: z.string().optional().describe("Error message if listing failed"),
});

type LsInput = z.infer<typeof lsInputSchema>;
type LsOutput = z.infer<typeof lsOutputSchema>;

/**
 * Execute directory listing
 */
async function executeLs(input: LsInput): Promise<LsOutput> {
	const { showHidden, includeDetails } = input;
	const resolvedPath = resolveSafePath(input.path);

	try {
		// Verify it's a directory
		const stats = await fs.stat(resolvedPath);
		if (!stats.isDirectory()) {
			return {
				success: false,
				path: resolvedPath,
				error: `Path is not a directory: ${resolvedPath}. Use 'read' tool for files.`,
			};
		}

		// Read directory entries
		const dirEntries = await fs.readdir(resolvedPath, { withFileTypes: true });

		// Filter hidden files if needed
		const filteredEntries = showHidden
			? dirEntries
			: dirEntries.filter((entry) => !entry.name.startsWith("."));

		// Build entry list
		const entries: LsOutput["entries"] = [];

		for (const entry of filteredEntries) {
			const entryPath = path.join(resolvedPath, entry.name);
			const entryType = entry.isFile()
				? "file"
				: entry.isDirectory()
					? "directory"
					: entry.isSymbolicLink()
						? "symlink"
						: "unknown";

			const item: (typeof entries)[0] = {
				name: entry.name,
				type: entryType,
			};

			// Add details if requested
			if (includeDetails && entry.isFile()) {
				try {
					const entryStats = await fs.stat(entryPath);
					item.size = entryStats.size;
					item.modifiedAt = entryStats.mtime.toISOString();
				} catch {
					// Skip stats if we can't read them
				}
			}

			entries.push(item);
		}

		// Sort: directories first, then files, alphabetically
		entries.sort((a, b) => {
			if (a.type === "directory" && b.type !== "directory") return -1;
			if (a.type !== "directory" && b.type === "directory") return 1;
			return a.name.localeCompare(b.name);
		});

		return {
			success: true,
			path: resolvedPath,
			totalItems: entries.length,
			entries,
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
 * LS Tool - List directory contents
 *
 * Safe read-only operation - no approval required.
 * Use this to explore directory structure.
 * For finding files by pattern, prefer 'glob' instead.
 */
export const lsTool: Tool<typeof lsInputSchema, typeof lsOutputSchema, "ls"> = {
	name: "ls",
	description:
		"List the contents of a directory. " +
		"Returns files and subdirectories with optional details (size, type, modified time). " +
		"Use this to explore directory structure. " +
		"For finding files by pattern across multiple directories, use 'glob' instead.",
	inputSchema: lsInputSchema,
	outputSchema: lsOutputSchema,
	execute: executeLs,
	needsApproval: false, // ✅ Safe - read-only
};

// =============================================================================
// EXPORTS
// =============================================================================

export { lsInputSchema, lsOutputSchema };
export type { LsInput, LsOutput };
