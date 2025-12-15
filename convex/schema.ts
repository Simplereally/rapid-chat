import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	// Chat threads - each thread belongs to a user
	threads: defineTable({
		userId: v.string(),
		title: v.string(),
		createdAt: v.optional(v.number()),
		updatedAt: v.optional(v.number()),
		lastAiResponseAt: v.optional(v.number()), // For sorting by AI activity
		// Legacy/Extra fields found in DB
		lastMessageAt: v.optional(v.number()),
		messages: v.optional(v.any()),

	})
		.index("by_user", ["userId"])
		.index("by_user_updated", ["userId", "updatedAt"])
		.index("by_user_ai_response", ["userId", "lastAiResponseAt"]),

	// Messages within threads
	messages: defineTable({
		threadId: v.id("threads"),
		role: v.union(v.literal("user"), v.literal("assistant")),
		content: v.string(),
		createdAt: v.optional(v.number()),
	}).index("by_thread", ["threadId", "createdAt"]),

	// Legacy jobs table (keeping for compatibility)
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
