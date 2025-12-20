/**
 * Multi-Edit Client Tool
 *
 * Client-side multi-edit tool that calls the execution API after user approval.
 * This runs in the browser and communicates with /api/tools/multi-edit.
 */

import {
	type MultiEditInput,
	type MultiEditOutput,
	multiEditToolDef,
} from "../definitions/multi-edit";

/**
 * Client-side multi-edit tool.
 * After approval, this calls the server-side execution API.
 */
export const multiEditToolClient = multiEditToolDef.client(
	async (args: MultiEditInput): Promise<MultiEditOutput> => {
		const response = await fetch("/api/tools/multi-edit", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(args),
		});

		if (!response.ok) {
			return {
				success: false,
				path: args.path,
				totalEdits: args.edits.length,
				error: `API error: ${response.status} ${response.statusText}`,
			};
		}

		return response.json();
	},
);
