/**
 * Write Tool Execution (Server-only)
 *
 * This function writes files on the server.
 * It's called from the /api/tools/write endpoint after client-side approval.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { resolveSafePath } from "../file-utils";
import type { WriteInput, WriteOutput } from "../definitions/write";

/**
 * Execute a file write operation.
 * This is the server-side implementation called from the tool execution API.
 */
export async function executeWrite(input: WriteInput): Promise<WriteOutput> {
	const { content, encoding = "utf-8", createDirectories = true } = input;
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
