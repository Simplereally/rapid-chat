import type { Tool } from "@tanstack/ai";
import { z } from "zod";
import * as fs from "node:fs/promises";
import { resolveSafePath } from "./file-utils";

// =============================================================================
// READ TOOL - Read files (text, images, PDFs)
// =============================================================================

const readInputSchema = z.object({
	path: z
		.string()
		.describe(
			"The absolute or relative file path to read. " +
				"For security, paths are sandboxed to the allowed workspace.",
		),
	encoding: z
		.enum(["utf-8", "base64", "ascii"])
		.optional()
		.default("utf-8")
		.describe(
			"Encoding for reading file contents. " +
				"Use 'base64' for binary files (images, PDFs). Defaults to 'utf-8'.",
		),
	startLine: z
		.number()
		.optional()
		.describe(
			"Optional starting line number (1-indexed) to read from. " +
				"Useful for reading specific sections of large files.",
		),
	endLine: z
		.number()
		.optional()
		.describe(
			"Optional ending line number (1-indexed, inclusive) to read to. " +
				"If not specified with startLine, reads to end of file.",
		),
	maxLines: z
		.number()
		.optional()
		.describe(
			"Maximum number of lines to read. " +
				"Useful for previewing large files. If not specified, reads entire file.",
		),
});

const readOutputSchema = z.object({
	success: z.boolean().describe("Whether the read operation succeeded"),
	path: z.string().describe("The resolved file path"),
	content: z.string().optional().describe("The file contents"),
	mimeType: z
		.string()
		.optional()
		.describe("Detected MIME type for binary files"),
	lineCount: z.number().optional().describe("Total number of lines in file"),
	truncated: z
		.boolean()
		.optional()
		.describe("Whether the output was truncated due to line limits"),
	readRange: z
		.object({
			startLine: z.number(),
			endLine: z.number(),
		})
		.optional()
		.describe("The actual line range that was read"),
	error: z.string().optional().describe("Error message if read failed"),
});

type ReadInput = z.infer<typeof readInputSchema>;
type ReadOutput = z.infer<typeof readOutputSchema>;

/**
 * Common binary file extensions and their MIME types
 */
const BINARY_MIME_TYPES: Record<string, string> = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".webp": "image/webp",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".pdf": "application/pdf",
	".zip": "application/zip",
	".mp3": "audio/mpeg",
	".mp4": "video/mp4",
	".webm": "video/webm",
};

/**
 * Execute file read operation
 */
async function executeRead(input: ReadInput): Promise<ReadOutput> {
	const { encoding, startLine, endLine, maxLines } = input;
	const resolvedPath = resolveSafePath(input.path);

	try {
		// Check if file exists
		const stats = await fs.stat(resolvedPath);
		if (!stats.isFile()) {
			return {
				success: false,
				path: resolvedPath,
				error: `Path is not a file: ${resolvedPath}`,
			};
		}

		// Detect if binary file
		const ext = resolvedPath.toLowerCase().match(/\.[^.]+$/)?.[0] || "";
		const mimeType = BINARY_MIME_TYPES[ext];

		// For binary files, always use base64
		const effectiveEncoding = mimeType ? "base64" : encoding;
		const content = await fs.readFile(resolvedPath, effectiveEncoding);

		// For binary files, return with MIME type
		if (mimeType) {
			return {
				success: true,
				path: resolvedPath,
				content: content as string,
				mimeType,
			};
		}

		// For text files, handle line-based reading
		const lines = (content as string).split("\n");
		const totalLines = lines.length;

		// Calculate line range
		let actualStartLine = startLine ? Math.max(1, startLine) : 1;
		let actualEndLine = endLine ? Math.min(totalLines, endLine) : totalLines;

		// Apply maxLines limit if specified
		if (maxLines && actualEndLine - actualStartLine + 1 > maxLines) {
			actualEndLine = actualStartLine + maxLines - 1;
		}

		// Extract requested lines (convert to 0-indexed)
		const requestedLines = lines.slice(actualStartLine - 1, actualEndLine);
		const resultContent = requestedLines.join("\n");

		const wasTruncated =
			actualEndLine < totalLines || (maxLines !== undefined && totalLines > maxLines);

		return {
			success: true,
			path: resolvedPath,
			content: resultContent,
			lineCount: totalLines,
			truncated: wasTruncated,
			readRange: {
				startLine: actualStartLine,
				endLine: actualEndLine,
			},
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
 * Read Tool - Read file contents (text, images, PDFs)
 *
 * Safe read-only operation - no approval required.
 * Supports line-range reading for large files.
 */
export const readTool: Tool<typeof readInputSchema, typeof readOutputSchema, "read"> = {
	name: "read",
	description:
		"Read the contents of a file. " +
		"Supports text files (UTF-8), binary files (base64 encoded), and line-range reading. " +
		"Use startLine/endLine to read specific sections of large files. " +
		"Binary files (images, PDFs) are automatically detected and base64 encoded.",
	inputSchema: readInputSchema,
	outputSchema: readOutputSchema,
	execute: executeRead,
	needsApproval: false, // ✅ Safe - read-only
};

// =============================================================================
// EXPORTS
// =============================================================================

export { readInputSchema, readOutputSchema };
export type { ReadInput, ReadOutput };
