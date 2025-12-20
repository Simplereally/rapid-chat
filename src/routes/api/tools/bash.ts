/**
 * Bash Tool Execution API
 *
 * POST /api/tools/bash
 *
 * Executes a bash command after the client has obtained user approval.
 * This is the server-side execution endpoint for Pattern B.
 */

import { createFileRoute } from "@tanstack/react-router";
import { bashInputSchema } from "@/tools/definitions/bash";
import { executeBash } from "@/tools/execution/bash.server";

export const Route = createFileRoute("/api/tools/bash")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const json = await request.json();
					const parsed = bashInputSchema.safeParse(json);

					if (!parsed.success) {
						return Response.json(
							{ error: "Invalid input", details: parsed.error.issues },
							{ status: 400 },
						);
					}

					console.log(
						`[Bash API] Executing command: ${parsed.data.command.slice(0, 50)}...`,
					);
					const result = await executeBash(parsed.data);
					console.log(
						`[Bash API] Result: success=${result.success}, exitCode=${result.exitCode}`,
					);

					return Response.json(result);
				} catch (error) {
					console.error("[Bash API] Execution error:", error);
					return Response.json(
						{
							success: false,
							exitCode: null,
							stdout: "",
							stderr:
								error instanceof Error
									? error.message
									: "Internal server error",
							timedOut: false,
							executionTime: 0,
						},
						{ status: 500 },
					);
				}
			},
		},
	},
});
