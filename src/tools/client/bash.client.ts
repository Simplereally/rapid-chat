/**
 * Bash Client Tool
 *
 * Client-side bash tool that calls the execution API after user approval.
 * This runs in the browser and communicates with /api/tools/bash.
 */

import {
	type BashInput,
	type BashOutput,
	bashToolDef,
} from "../definitions/bash";

/**
 * Client-side bash tool.
 * After approval, this calls the server-side execution API.
 */
export const bashToolClient = bashToolDef.client(
	async (args: BashInput): Promise<BashOutput> => {
		console.log("[Bash Client] Execute called with args:", args);

		try {
			const response = await fetch("/api/tools/bash", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(args),
			});

			console.log("[Bash Client] API response status:", response.status);

			if (!response.ok) {
				const errorResult = {
					success: false,
					exitCode: null,
					stdout: "",
					stderr: `API error: ${response.status} ${response.statusText}`,
					timedOut: false,
					executionTime: 0,
				};
				console.log("[Bash Client] Returning error result:", errorResult);
				return errorResult;
			}

			const result = await response.json();
			console.log("[Bash Client] Returning success result:", result);
			return result;
		} catch (err) {
			console.error("[Bash Client] Fetch error:", err);
			throw err;
		}
	},
);
