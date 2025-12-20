/**
 * Edit Server Tool
 *
 * Server implementation of the edit tool using toolDefinition().server() pattern.
 */

import {
	type EditInput,
	type EditOutput,
	editToolDef,
} from "../definitions/edit";
import { executeEdit } from "../execution/edit.server";

/**
 * Edit server tool - created using toolDefinition().server()
 * Pass this to chat() for server-side execution with approval flow.
 */
export const editServerTool = editToolDef.server(
	async (input: EditInput): Promise<EditOutput> => {
		console.log("[editServerTool] Editing:", input.path);
		const result = await executeEdit(input);
		console.log("[editServerTool] Result:", {
			success: result.success,
			replacements: result.replacementsCount,
		});
		return result;
	},
);
