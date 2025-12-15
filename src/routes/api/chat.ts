import { chat, type StreamChunk, toStreamResponse } from "@tanstack/ai";
import { ollama } from "@tanstack/ai-ollama";
import { createFileRoute } from "@tanstack/react-router";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { env } from "@/env";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const MessageSchema = z.object({
	role: z.enum(["system", "user", "assistant"]),
	content: z.string(),
});

const ChatRequestSchema = z.object({
	messages: z.array(MessageSchema),
});

type GenericChat = (
	options: Record<string, unknown>,
) => AsyncIterable<StreamChunk>;

const genericChat: GenericChat = chat as unknown as GenericChat;

export const Route = createFileRoute("/api/chat")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const url = new URL(request.url);
					const threadId = url.searchParams.get("threadId");

					if (!threadId) {
						return new Response("Missing threadId", { status: 400 });
					}

					const json = await request.json();
					const validationResult = ChatRequestSchema.safeParse(json);

					if (!validationResult.success) {
						return new Response("Invalid Request Body", { status: 400 });
					}

					const { messages: incomingMessages } = validationResult.data;
					const authHeader = request.headers.get("Authorization");

					if (!authHeader) {
						return new Response("Unauthorized", { status: 401 });
					}

					const token = authHeader.replace("Bearer ", "");

					// Initialize Convex Client
					if (!env.VITE_CONVEX_URL) {
						console.error("VITE_CONVEX_URL is missing");
						return new Response("Configuration Error", { status: 500 });
					}
					const convex = new ConvexHttpClient(env.VITE_CONVEX_URL);
					convex.setAuth(token);

					// 1. Create a placeholder assistant message in message DB
					const messageId = await convex.mutation(api.messages.add, {
						threadId: threadId as Id<"threads">,
						role: "assistant",
						content: "",
					});

					const conversationMessages = incomingMessages.filter(
						(m) => m.role !== "system",
					);

					// 2. Start the chat stream
					const stream = await genericChat({
						adapter: ollama({
							baseUrl: env.OLLAMA_BASE_URL,
						}),
						messages: conversationMessages,
						model: env.OLLAMA_MODEL,
					});

					// 3. Wrap the stream to sync with Convex
					const wrappedStream = (async function* () {
						let fullContent = "";
						let lastUpdate = Date.now();
						const updateInterval = 1000; // Update DB every 1s max to save writes

						for await (const chunk of stream) {
							const typedChunk = chunk as {
								type?: unknown;
								content?: unknown;
							};
							if (typedChunk.type === "content") {
								const content = typedChunk.content;
								if (typeof content === "string") {
									fullContent = content;
								} else if (Array.isArray(content)) {
									let snapshot = "";
									for (const part of content) {
										const p = part as {
											type?: unknown;
											text?: unknown;
										};
										if (p.type === "text" && typeof p.text === "string") {
											snapshot += p.text;
										}
									}
									fullContent = snapshot;
								}
							}

							yield chunk;

							// Throttle DB updates
							if (Date.now() - lastUpdate > updateInterval) {
								await convex.mutation(api.messages.update, {
									messageId,
									content: fullContent,
								});
								lastUpdate = Date.now();
							}
						}

						// Final update to ensure consistency
						await convex.mutation(api.messages.update, {
							messageId,
							content: fullContent,
						});
					})();

					// 4. Return the stream response
					return toStreamResponse(wrappedStream);
				} catch (e) {
					console.error(e);
					return new Response("Internal Error", { status: 500 });
				}
			},
		},
	},
});
