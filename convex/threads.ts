import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Threads API
// Get all threads for the authenticated user
export const list = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return [];
		}

		const threads = await ctx.db
			.query("threads")
			.withIndex("by_user_ai_response", (q) => q.eq("userId", identity.subject))
			.order("desc")
			.collect();

		return threads;
	},
});

// Get a single thread by ID (with ownership check)
export const get = query({
	args: { threadId: v.id("threads") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.userId !== identity.subject) {
			return null;
		}

		return thread;
	},
});

// Create a new thread
export const create = mutation({
	args: { title: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		const now = Date.now();
		const threadId = await ctx.db.insert("threads", {
			userId: identity.subject,
			title: args.title ?? "New Chat",
			createdAt: now,
			updatedAt: now,
		});

		return threadId;
	},
});

// Update thread title
export const updateTitle = mutation({
	args: { threadId: v.id("threads"), title: v.string() },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.userId !== identity.subject) {
			throw new Error("Thread not found");
		}

		await ctx.db.patch(args.threadId, {
			title: args.title,
			updatedAt: Date.now(),
		});
	},
});

// Delete a thread and all its messages
export const remove = mutation({
	args: { threadId: v.id("threads") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.userId !== identity.subject) {
			throw new Error("Thread not found");
		}

		// Delete all messages in the thread
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.collect();

		for (const message of messages) {
			await ctx.db.delete(message._id);
		}

		// Delete the thread itself
		await ctx.db.delete(args.threadId);
	},
});
