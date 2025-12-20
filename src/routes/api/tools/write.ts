/**
 * Write Tool Execution API
 *
 * POST /api/tools/write
 *
 * Writes a file after the client has obtained user approval.
 * This is the server-side execution endpoint for Pattern B.
 */

import { createFileRoute } from "@tanstack/react-router";
import { writeInputSchema } from "@/tools/definitions/write";
import { executeWrite } from "@/tools/execution/write.server";

export const Route = createFileRoute("/api/tools/write")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const json = await request.json();
					const parsed = writeInputSchema.safeParse(json);

					if (!parsed.success) {
						return Response.json(
							{ error: "Invalid input", details: parsed.error.issues },
							{ status: 400 },
						);
					}

					console.log(`[Write API] Writing file: ${parsed.data.path}`);
					const result = await executeWrite(parsed.data);
					console.log(`[Write API] Result: success=${result.success}`);

					return Response.json(result);
				} catch (error) {
					console.error("[Write API] Execution error:", error);
					return Response.json(
						{
							success: false,
							path: "",
							error:
								error instanceof Error
									? error.message
									: "Internal server error",
						},
						{ status: 500 },
					);
				}
			},
		},
	},
});
