/**
 * Write Server Tool
 *
 * Server implementation of the write tool using toolDefinition().server() pattern.
 */

import {
	type WriteInput,
	type WriteOutput,
	writeToolDef,
} from "../definitions/write";
import { executeWrite } from "../execution/write.server";

/**
 * Write server tool - created using toolDefinition().server()
 * Pass this to chat() for server-side execution with approval flow.
 */
export const writeServerTool = writeToolDef.server(
	async (input: WriteInput): Promise<WriteOutput> => {
		console.log("[writeServerTool] Writing to:", input.path);
		const result = await executeWrite(input);
		console.log("[writeServerTool] Result:", {
			success: result.success,
			path: result.path,
		});
		return result;
	},
);
