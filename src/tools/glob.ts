import type { Tool } from "@tanstack/ai";
import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";

// =============================================================================
// GLOB TOOL - Find files by pattern
// =============================================================================

const globInputSchema = z.object({
	pattern: z
		.string()
		.describe(
			"The glob pattern to match file/directory names. " +
				"Supports patterns like '*.ts', 'test-*', '**/*.tsx'. " +
				"Use '*' for any characters, '?' for single character, " +
				"'**' for recursive directory matching.",
		),
	searchPath: z
		.string()
		.optional()
		.default(".")
		.describe(
			"The directory to search within. Defaults to current directory. " +
				"Searches recursively by default.",
		),
	type: z
		.enum(["file", "directory", "any"])
		.optional()
		.default("any")
		.describe(
			"Filter by type: 'file' for files only, 'directory' for folders only, " +
				"'any' (default) for both.",
		),
	maxDepth: z
		.number()
		.optional()
		.describe(
			"Maximum directory depth to search. " +
				"1 = immediate children only. Leave empty for unlimited depth.",
		),
	excludePatterns: z
		.array(z.string())
		.optional()
		.describe(
			"Glob patterns to exclude. " +
				"Example: ['node_modules/**', '.git/**']. " +
				"Common directories are excluded by default.",
		),
	maxResults: z
		.number()
		.optional()
		.default(50)
		.describe("Maximum results to return. Defaults to 50."),
	includeSize: z
		.boolean()
		.optional()
		.default(false)
		.describe("If true, include file sizes in results."),
});

const globOutputSchema = z.object({
	success: z.boolean().describe("Whether the search completed successfully"),
	pattern: z.string().describe("The pattern that was searched"),
	totalFound: z.number().describe("Total number of matches found"),
	truncated: z
		.boolean()
		.describe("Whether results were truncated due to maxResults"),
	results: z
		.array(
			z.object({
				path: z.string().describe("Relative path from search directory"),
				name: z.string().describe("File or directory name"),
				type: z
					.enum(["file", "directory"])
					.describe("Whether this is a file or directory"),
				size: z.number().optional().describe("File size in bytes"),
				modifiedAt: z.string().optional().describe("Last modification time"),
			}),
		)
		.describe("List of matching files/directories"),
	error: z.string().optional().describe("Error message if search failed"),
});

type GlobInput = z.infer<typeof globInputSchema>;
type GlobOutput = z.infer<typeof globOutputSchema>;

/**
 * Default patterns to exclude from search
 */
const DEFAULT_EXCLUDES = [
	"node_modules/**",
	".git/**",
	"dist/**",
	"build/**",
	".next/**",
	"*.min.js",
	"*.min.css",
	"*.map",
	"package-lock.json",
	"bun.lockb",
	"yarn.lock",
	"pnpm-lock.yaml",
];

/**
 * Sandbox configuration for allowed paths
 */
const ALLOWED_BASE_PATHS = [process.cwd()];

/**
 * Resolve and validate a path
 */
function resolveSafePath(inputPath: string): string {
	const absolutePath = path.resolve(process.cwd(), inputPath);
	const isAllowed = ALLOWED_BASE_PATHS.some((base) =>
		absolutePath.startsWith(path.resolve(base)),
	);

	if (!isAllowed) {
		throw new Error(
			`Access denied: Path "${inputPath}" is outside allowed workspace.`,
		);
	}

	return absolutePath;
}

/**
 * Simple glob matching (supports * and **)
 */
function matchesGlob(filePath: string, patterns: string[]): boolean {
	for (const pattern of patterns) {
		const regexPattern = pattern
			.replace(/\*\*/g, "<<<DOUBLESTAR>>>")
			.replace(/\*/g, "[^/]*")
			.replace(/<<<DOUBLESTAR>>>/g, ".*")
			.replace(/\?/g, ".");

		const regex = new RegExp(`^${regexPattern}$`, "i");
		if (regex.test(filePath)) {
			return true;
		}
	}
	return false;
}

interface FindOptions {
	type: "file" | "directory" | "any";
	maxDepth?: number;
	maxResults: number;
	excludes: string[];
	includeSize: boolean;
}

/**
 * Recursively find files/directories matching pattern
 */
async function findInDirectory(
	dirPath: string,
	basePath: string,
	pattern: string,
	results: GlobOutput["results"],
	options: FindOptions,
	currentDepth: number,
	updateCount: (count: number) => void,
): Promise<void> {
	if (results.length >= options.maxResults) return;
	if (options.maxDepth !== undefined && currentDepth > options.maxDepth) return;

	try {
		const entries = await fs.readdir(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			if (results.length >= options.maxResults) break;

			const fullPath = path.join(dirPath, entry.name);
			const relativePath = path.relative(basePath, fullPath);

			// Check excludes
			if (matchesGlob(relativePath, options.excludes)) continue;

			const isFile = entry.isFile();
			const isDirectory = entry.isDirectory();

			// Check if name matches pattern
			if (matchesGlob(entry.name, [pattern]) || matchesGlob(relativePath, [pattern])) {
				// Check type filter
				const typeMatches =
					options.type === "any" ||
					(options.type === "file" && isFile) ||
					(options.type === "directory" && isDirectory);

				if (typeMatches) {
					updateCount(results.length + 1);

					const result: GlobOutput["results"][0] = {
						path: relativePath,
						name: entry.name,
						type: isDirectory ? "directory" : "file",
					};

					// Get additional info if requested
					if (options.includeSize && isFile) {
						try {
							const stats = await fs.stat(fullPath);
							result.size = stats.size;
							result.modifiedAt = stats.mtime.toISOString();
						} catch {
							// Skip if we can't stat
						}
					}

					results.push(result);
				}
			}

			// Recurse into directories
			if (isDirectory) {
				await findInDirectory(
					fullPath,
					basePath,
					pattern,
					results,
					options,
					currentDepth + 1,
					updateCount,
				);
			}
		}
	} catch {
		// Skip directories we can't read
	}
}

/**
 * Execute glob search
 */
async function executeGlob(input: GlobInput): Promise<GlobOutput> {
	const {
		pattern,
		searchPath,
		type,
		maxDepth,
		excludePatterns,
		maxResults,
		includeSize,
	} = input;

	const resolvedPath = resolveSafePath(searchPath ?? ".");
	const allExcludes = [...DEFAULT_EXCLUDES, ...(excludePatterns ?? [])];
	const results: GlobOutput["results"] = [];
	let totalFound = 0;

	try {
		await findInDirectory(
			resolvedPath,
			resolvedPath,
			pattern,
			results,
			{
				type: type ?? "any",
				maxDepth,
				maxResults: maxResults ?? 50,
				excludes: allExcludes,
				includeSize: includeSize ?? false,
			},
			0,
			(count) => {
				totalFound = count;
			},
		);

		return {
			success: true,
			pattern,
			totalFound,
			truncated: totalFound > (maxResults ?? 50),
			results,
		};
	} catch (error) {
		return {
			success: false,
			pattern,
			totalFound: 0,
			truncated: false,
			results: [],
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Glob Tool - Find files and directories by pattern
 *
 * Safe read-only operation - no approval required.
 * Use this to locate files before reading or editing them.
 */
export const globTool: Tool<typeof globInputSchema, typeof globOutputSchema, "glob"> = {
	name: "glob",
	description:
		"Find files and directories by glob pattern. " +
		"Use this to locate files when you know part of the filename. " +
		"Supports patterns like '*.ts', 'test-*.tsx', '**/package.json'. " +
		"PREFER this when searching by filename, use 'grep' for content search. " +
		"Common use cases: finding config files, locating components, discovering tests.",
	inputSchema: globInputSchema,
	outputSchema: globOutputSchema,
	execute: executeGlob,
	needsApproval: false, // ✅ Safe - read-only
};

// =============================================================================
// EXPORTS
// =============================================================================

export { globInputSchema, globOutputSchema };
export type { GlobInput, GlobOutput };
