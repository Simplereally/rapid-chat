/**
 * Multi-Edit Server Tool
 *
 * Server implementation of the multi-edit tool using toolDefinition().server() pattern.
 */

import {
	type MultiEditInput,
	type MultiEditOutput,
	multiEditToolDef,
} from "../definitions/multi-edit";
import { executeMultiEdit } from "../execution/multi-edit.server";

/**
 * Multi-edit server tool - created using toolDefinition().server()
 * Pass this to chat() for server-side execution with approval flow.
 */
export const multiEditServerTool = multiEditToolDef.server(
	async (input: MultiEditInput): Promise<MultiEditOutput> => {
		console.log(
			"[multiEditServerTool] Multi-editing:",
			input.path,
			`(${input.edits.length} edits)`,
		);
		const result = await executeMultiEdit(input);
		console.log("[multiEditServerTool] Result:", {
			success: result.success,
			applied: result.appliedEdits,
		});
		return result;
	},
);
