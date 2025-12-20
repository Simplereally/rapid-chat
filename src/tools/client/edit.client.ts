/**
 * Edit Client Tool
 *
 * Client-side edit tool that calls the execution API after user approval.
 * This runs in the browser and communicates with /api/tools/edit.
 */

import { editToolDef, type EditInput, type EditOutput } from "../definitions/edit";

/**
 * Client-side edit tool.
 * After approval, this calls the server-side execution API.
 */
export const editToolClient = editToolDef.client(async (args: EditInput): Promise<EditOutput> => {
	const response = await fetch("/api/tools/edit", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(args),
	});

	if (!response.ok) {
		return {
			success: false,
			path: args.path,
			error: `API error: ${response.status} ${response.statusText}`,
		};
	}

	return response.json();
});
