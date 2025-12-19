/**
 * Edit Tool Execution API
 *
 * POST /api/tools/edit
 *
 * Performs a find-and-replace edit after the client has obtained user approval.
 * This is the server-side execution endpoint for Pattern B.
 */

import { createFileRoute } from "@tanstack/react-router";
import { executeEdit } from "@/tools/execution/edit.server";
import { editInputSchema } from "@/tools/definitions/edit";

export const Route = createFileRoute("/api/tools/edit")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const json = await request.json();
					const parsed = editInputSchema.safeParse(json);

					if (!parsed.success) {
						return Response.json(
							{ error: "Invalid input", details: parsed.error.issues },
							{ status: 400 }
						);
					}

					console.log(`[Edit API] Editing file: ${parsed.data.path}`);
					const result = await executeEdit(parsed.data);
					console.log(`[Edit API] Result: success=${result.success}`);

					return Response.json(result);
				} catch (error) {
					console.error("[Edit API] Execution error:", error);
					return Response.json(
						{
							success: false,
							path: "",
							error: error instanceof Error ? error.message : "Internal server error",
						},
						{ status: 500 }
					);
				}
			},
		},
	},
});
