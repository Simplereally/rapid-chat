import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

// Get all messages for a thread
export const list = query({
	args: { threadId: v.id("threads") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return [];
		}

		// Verify thread ownership
		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.userId !== identity.subject) {
			return [];
		}

		const messages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.order("asc")
			.collect();

		return messages;
	},
});

// Add a message to a thread
export const add = mutation({
	args: {
		threadId: v.id("threads"),
		role: v.union(v.literal("user"), v.literal("assistant")),
		content: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		// Verify thread ownership
		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.userId !== identity.subject) {
			throw new Error("Thread not found");
		}

		const now = Date.now();

		// Add the message
		const messageId = await ctx.db.insert("messages", {
			threadId: args.threadId,
			role: args.role,
			content: args.content,
			createdAt: now,
		});


		const patch: Partial<Doc<"threads">> = {
			updatedAt: now,
		};
		if (args.role === "assistant") {
			patch.lastAiResponseAt = now;
		}
		// Update thread's timestamps
		await ctx.db.patch(args.threadId, patch);

		// Check if this is the first user message (for AI title generation)
		let isFirstMessage = false;
		if (args.role === "user") {
			const existingMessages = await ctx.db
				.query("messages")
				.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
				.collect();

			// If this is the first message (just inserted), flag it
			isFirstMessage = existingMessages.length === 1;
		}

		return { messageId, isFirstMessage };
	},
});

// Update a message's content
export const update = mutation({
	args: {
		messageId: v.id("messages"),
		content: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		const message = await ctx.db.get(args.messageId);
		if (!message) {
			throw new Error("Message not found");
		}

		// Verify thread ownership
		const thread = await ctx.db.get(message.threadId);
		if (!thread || thread.userId !== identity.subject) {
			throw new Error("Unauthorized");
		}

		await ctx.db.patch(args.messageId, {
			content: args.content,
		});

		const now = Date.now();
		const patch: Partial<Doc<"threads">> = {
			updatedAt: now,
		};
		if (message.role === "assistant") {
			patch.lastAiResponseAt = now;
		}
		// Update thread timestamp
		await ctx.db.patch(message.threadId, patch);
	},
});

// Delete a message
export const remove = mutation({
	args: { messageId: v.id("messages") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		const message = await ctx.db.get(args.messageId);
		if (!message) {
			throw new Error("Message not found");
		}

		// Verify thread ownership
		const thread = await ctx.db.get(message.threadId);
		if (!thread || thread.userId !== identity.subject) {
			throw new Error("Unauthorized");
		}

		await ctx.db.delete(args.messageId);
	},
});

// Clear all messages in a thread (but keep the thread)
export const clearThread = mutation({
	args: { threadId: v.id("threads") },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Unauthorized");
		}

		// Verify thread ownership
		const thread = await ctx.db.get(args.threadId);
		if (!thread || thread.userId !== identity.subject) {
			throw new Error("Thread not found");
		}

		const messages = await ctx.db
			.query("messages")
			.withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
			.collect();

		for (const message of messages) {
			await ctx.db.delete(message._id);
		}

		// Reset thread title
		await ctx.db.patch(args.threadId, {
			title: "New Chat",
			updatedAt: Date.now(),
		});
	},
});
