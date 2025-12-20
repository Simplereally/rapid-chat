/**
 * Bash Client Tool
 *
 * Client-side bash tool that calls the execution API after user approval.
 * This runs in the browser and communicates with /api/tools/bash.
 */

import { bashToolDef, type BashInput, type BashOutput } from "../definitions/bash";

/**
 * Client-side bash tool.
 * After approval, this calls the server-side execution API.
 */
export const bashToolClient = bashToolDef.client(async (args: BashInput): Promise<BashOutput> => {
	const response = await fetch("/api/tools/bash", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(args),
	});

	if (!response.ok) {
		return {
			success: false,
			exitCode: null,
			stdout: "",
			stderr: `API error: ${response.status} ${response.statusText}`,
			timedOut: false,
			executionTime: 0,
		};
	}

	return response.json();
});
