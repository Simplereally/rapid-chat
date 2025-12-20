import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Tool } from "@tanstack/ai";
import { z } from "zod";

// =============================================================================
// GREP TOOL - Search file contents by regex
// =============================================================================

const grepInputSchema = z.object({
	query: z
		.string()
		.describe(
			"The search pattern to find within file contents. " +
				"Supports plain text or regex patterns.",
		),
	searchPath: z
		.string()
		.optional()
		.default(".")
		.describe(
			"The directory or file path to search. " +
				"Defaults to current directory. Searches recursively.",
		),
	isRegex: z
		.boolean()
		.optional()
		.default(false)
		.describe(
			"If true, treats query as a regular expression. " +
				"If false (default), treats it as a literal string.",
		),
	caseInsensitive: z
		.boolean()
		.optional()
		.default(true)
		.describe("If true (default), performs case-insensitive search."),
	includePatterns: z
		.array(z.string())
		.optional()
		.describe(
			"Glob patterns to filter which files to search. " +
				"Example: ['*.ts', '*.tsx'] to only search TypeScript files.",
		),
	excludePatterns: z
		.array(z.string())
		.optional()
		.describe(
			"Glob patterns to exclude from search. " +
				"Example: ['node_modules/**', '*.min.js'].",
		),
	maxResults: z
		.number()
		.optional()
		.default(50)
		.describe("Maximum matches to return. Defaults to 50."),
	contextLines: z
		.number()
		.optional()
		.default(0)
		.describe(
			"Lines of context before and after each match. " +
				"0 (default) returns only matching lines.",
		),
});

const grepOutputSchema = z.object({
	success: z.boolean().describe("Whether the search completed successfully"),
	query: z.string().describe("The search query that was executed"),
	totalMatches: z.number().describe("Total number of matches found"),
	truncated: z.boolean().describe("Whether results were truncated"),
	matches: z
		.array(
			z.object({
				file: z.string().describe("Relative path to the file"),
				line: z.number().describe("Line number of the match (1-indexed)"),
				content: z.string().describe("The content of the matching line"),
				context: z
					.object({
						before: z.array(z.string()).optional(),
						after: z.array(z.string()).optional(),
					})
					.optional()
					.describe("Context lines if contextLines > 0"),
			}),
		)
		.describe("List of matches found"),
	error: z.string().optional().describe("Error message if search failed"),
});

type GrepInput = z.infer<typeof grepInputSchema>;
type GrepOutput = z.infer<typeof grepOutputSchema>;

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
 * Binary file extensions to skip
 */
const BINARY_EXTENSIONS = new Set([
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
	".ico",
	".svg",
	".woff",
	".woff2",
	".ttf",
	".eot",
	".pdf",
	".zip",
	".tar",
	".gz",
	".mp3",
	".mp4",
	".wav",
	".webm",
	".exe",
	".dll",
	".so",
	".dylib",
]);

/**
 * Sandbox configuration
 */
const ALLOWED_BASE_PATHS = [process.cwd()];

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

function escapeRegex(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

interface SearchOptions {
	maxResults: number;
	contextLines: number;
	includes?: string[];
	excludes: string[];
}

/**
 * Recursively search a directory for matches
 */
async function searchDirectory(
	dirPath: string,
	basePath: string,
	pattern: RegExp,
	matches: GrepOutput["matches"],
	options: SearchOptions,
	updateCount: (count: number) => void,
): Promise<void> {
	if (matches.length >= options.maxResults) return;

	try {
		const entries = await fs.readdir(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			if (matches.length >= options.maxResults) break;

			const fullPath = path.join(dirPath, entry.name);
			const relativePath = path.relative(basePath, fullPath);

			// Check excludes
			if (matchesGlob(relativePath, options.excludes)) continue;

			if (entry.isDirectory()) {
				await searchDirectory(
					fullPath,
					basePath,
					pattern,
					matches,
					options,
					updateCount,
				);
			} else if (entry.isFile()) {
				// Check includes (if specified)
				if (options.includes?.length) {
					if (!matchesGlob(relativePath, options.includes)) continue;
				}

				// Skip binary files
				const ext = path.extname(entry.name).toLowerCase();
				if (BINARY_EXTENSIONS.has(ext)) continue;

				await searchFile(
					fullPath,
					relativePath,
					pattern,
					matches,
					options,
					updateCount,
				);
			}
		}
	} catch {
		// Skip directories we can't read
	}
}

/**
 * Search a single file for matches
 */
async function searchFile(
	filePath: string,
	relativePath: string,
	pattern: RegExp,
	matches: GrepOutput["matches"],
	options: SearchOptions,
	updateCount: (count: number) => void,
): Promise<void> {
	try {
		const content = await fs.readFile(filePath, "utf-8");
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			if (matches.length >= options.maxResults) break;

			const line = lines[i];
			pattern.lastIndex = 0;

			if (pattern.test(line)) {
				updateCount(matches.length + 1);

				const match: GrepOutput["matches"][0] = {
					file: relativePath,
					line: i + 1,
					content: line.trim(),
				};

				if (options.contextLines > 0) {
					const beforeStart = Math.max(0, i - options.contextLines);
					const afterEnd = Math.min(lines.length - 1, i + options.contextLines);

					match.context = {
						before: lines.slice(beforeStart, i).map((l) => l.trim()),
						after: lines.slice(i + 1, afterEnd + 1).map((l) => l.trim()),
					};
				}

				matches.push(match);
			}
		}
	} catch {
		// Skip files we can't read
	}
}

/**
 * Execute grep search
 */
async function executeGrep(input: GrepInput): Promise<GrepOutput> {
	const {
		query,
		searchPath,
		isRegex,
		caseInsensitive,
		includePatterns,
		excludePatterns,
		maxResults,
		contextLines,
	} = input;

	const resolvedPath = resolveSafePath(searchPath ?? ".");
	const allExcludes = [...DEFAULT_EXCLUDES, ...(excludePatterns ?? [])];
	const matches: GrepOutput["matches"] = [];
	let totalMatches = 0;

	try {
		const flags = caseInsensitive ? "gi" : "g";
		const pattern = isRegex
			? new RegExp(query, flags)
			: new RegExp(escapeRegex(query), flags);

		await searchDirectory(
			resolvedPath,
			resolvedPath,
			pattern,
			matches,
			{
				maxResults: maxResults ?? 50,
				contextLines: contextLines ?? 0,
				includes: includePatterns,
				excludes: allExcludes,
			},
			(count) => {
				totalMatches = count;
			},
		);

		return {
			success: true,
			query,
			totalMatches,
			truncated: totalMatches > (maxResults ?? 50),
			matches,
		};
	} catch (error) {
		return {
			success: false,
			query,
			totalMatches: 0,
			truncated: false,
			matches: [],
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Grep Tool - Search for text patterns within files
 *
 * Safe read-only operation - no approval required.
 * Use this to find specific content before reading or editing files.
 */
export const grepTool: Tool<
	typeof grepInputSchema,
	typeof grepOutputSchema,
	"grep"
> = {
	name: "grep",
	description:
		"Search for text patterns or code within files. " +
		"Use this to find specific strings, function names, imports, or any text pattern. " +
		"Returns matching lines with file paths and line numbers. " +
		"Supports regex patterns and case-insensitive search. " +
		"PREFER this over reading entire files when looking for specific content. " +
		"Common use cases: finding function definitions, tracking imports, locating errors.",
	inputSchema: grepInputSchema,
	outputSchema: grepOutputSchema,
	execute: executeGrep,
	needsApproval: false, // ✅ Safe - read-only
};

// =============================================================================
// EXPORTS
// =============================================================================

export { grepInputSchema, grepOutputSchema };
export type { GrepInput, GrepOutput };
