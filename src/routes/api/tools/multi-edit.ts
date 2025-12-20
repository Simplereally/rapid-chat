/**
 * Multi-Edit Tool Execution API
 *
 * POST /api/tools/multi-edit
 *
 * Performs batch edits after the client has obtained user approval.
 * This is the server-side execution endpoint for Pattern B.
 */

import { createFileRoute } from "@tanstack/react-router";
import { multiEditInputSchema } from "@/tools/definitions/multi-edit";
import { executeMultiEdit } from "@/tools/execution/multi-edit.server";

export const Route = createFileRoute("/api/tools/multi-edit")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const json = await request.json();
					const parsed = multiEditInputSchema.safeParse(json);

					if (!parsed.success) {
						return Response.json(
							{ error: "Invalid input", details: parsed.error.issues },
							{ status: 400 },
						);
					}

					console.log(
						`[MultiEdit API] Editing file: ${parsed.data.path} (${parsed.data.edits.length} edits)`,
					);
					const result = await executeMultiEdit(parsed.data);
					console.log(
						`[MultiEdit API] Result: success=${result.success}, applied=${result.appliedEdits}/${result.totalEdits}`,
					);

					return Response.json(result);
				} catch (error) {
					console.error("[MultiEdit API] Execution error:", error);
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
