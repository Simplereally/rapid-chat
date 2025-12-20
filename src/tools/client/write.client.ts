/**
 * Write Client Tool
 *
 * Client-side write tool that calls the execution API after user approval.
 * This runs in the browser and communicates with /api/tools/write.
 */

import { writeToolDef, type WriteInput, type WriteOutput } from "../definitions/write";

/**
 * Client-side write tool.
 * After approval, this calls the server-side execution API.
 */
export const writeToolClient = writeToolDef.client(async (args: WriteInput): Promise<WriteOutput> => {
	const response = await fetch("/api/tools/write", {
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
