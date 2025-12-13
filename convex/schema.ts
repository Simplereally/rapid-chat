import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	jobs: defineTable({
		workId: v.optional(v.string()),
		title: v.optional(v.string()),
		status: v.union(
			v.literal("queued"),
			v.literal("running"),
			v.literal("completed"),
			v.literal("failed"),
			v.literal("cancelled"),
		),
		progress: v.number(),
		message: v.optional(v.string()),
		result: v.optional(v.string()),
		error: v.optional(v.string()),
		scheduledId: v.optional(v.string()),
		logs: v.optional(
			v.array(
				v.object({
					at: v.number(),
					message: v.string(),
				}),
			),
		),
	}).index("by_status", ["status"]),
});
