import type { Tool } from "@tanstack/ai";
import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { resolveSafePath } from "./file-utils";

// =============================================================================
// WRITE TOOL - Create or overwrite files [Requires Permission]
// =============================================================================

const writeInputSchema = z.object({
	path: z
		.string()
		.describe(
			"The target file path to write to. " +
				"Parent directories will be created if they don't exist.",
		),
	content: z
		.string()
		.describe(
			"The content to write to the file. " +
				"This will completely replace any existing file content.",
		),
	encoding: z
		.enum(["utf-8", "base64", "ascii"])
		.optional()
		.default("utf-8")
		.describe(
			"Encoding for writing file contents. " +
				"Use 'base64' for binary content. Defaults to 'utf-8'.",
		),
	createDirectories: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			"If true (default), parent directories will be created if they don't exist.",
		),
});

const writeOutputSchema = z.object({
	success: z.boolean().describe("Whether the write operation succeeded"),
	path: z.string().describe("The resolved file path"),
	bytesWritten: z
		.number()
		.optional()
		.describe("Number of bytes written to the file"),
	created: z
		.boolean()
		.optional()
		.describe("True if this was a new file, false if it was overwritten"),
	message: z.string().optional().describe("Human-readable success message"),
	error: z.string().optional().describe("Error message if write failed"),
});

type WriteInput = z.infer<typeof writeInputSchema>;
type WriteOutput = z.infer<typeof writeOutputSchema>;

/**
 * Execute file write operation
 */
async function executeWrite(input: WriteInput): Promise<WriteOutput> {
	const { content, encoding, createDirectories } = input;
	const resolvedPath = resolveSafePath(input.path);

	try {
		// Check if file already exists
		let fileExisted = false;
		try {
			await fs.stat(resolvedPath);
			fileExisted = true;
		} catch {
			// File doesn't exist - that's okay
		}

		// Create parent directories if needed
		if (createDirectories) {
			await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
		}

		// Write the file
		await fs.writeFile(resolvedPath, content, encoding);
		const bytesWritten = Buffer.byteLength(content, encoding);

		return {
			success: true,
			path: resolvedPath,
			bytesWritten,
			created: !fileExisted,
			message: fileExisted
				? `Successfully overwrote ${resolvedPath} (${bytesWritten} bytes)`
				: `Successfully created ${resolvedPath} (${bytesWritten} bytes)`,
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
 * Write Tool - Create or overwrite files
 *
 * ⚠️ REQUIRES USER APPROVAL - This tool modifies the filesystem.
 */
export const writeTool: Tool<typeof writeInputSchema, typeof writeOutputSchema, "write"> = {
	name: "write",
	description:
		"Create a new file or overwrite an existing file with the provided content. " +
		"⚠️ This tool modifies the filesystem and requires user approval. " +
		"Parent directories are created automatically. " +
		"For surgical edits to existing files, prefer the 'edit' or 'multi_edit' tools instead.",
	inputSchema: writeInputSchema,
	outputSchema: writeOutputSchema,
	execute: executeWrite,
	needsApproval: true, // 🔒 DANGEROUS - requires user permission
};

// =============================================================================
// EXPORTS
// =============================================================================

export { writeInputSchema, writeOutputSchema };
export type { WriteInput, WriteOutput };
