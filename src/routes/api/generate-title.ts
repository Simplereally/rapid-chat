import { chat, type StreamChunk } from "@tanstack/ai";
import { createOllamaChat } from "@tanstack/ai-ollama";
import { createFileRoute } from "@tanstack/react-router";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { env } from "@/env";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const GenerateTitleRequestSchema = z.object({
	threadId: z.string(),
	userMessage: z.string(),
});

type GenericChat = (
	options: Record<string, unknown>,
) => AsyncIterable<StreamChunk>;

const genericChat: GenericChat = chat as unknown as GenericChat;

export const Route = createFileRoute("/api/generate-title")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const json = await request.json();
					const validationResult = GenerateTitleRequestSchema.safeParse(json);

					if (!validationResult.success) {
						return new Response("Invalid Request Body", { status: 400 });
					}

					const { threadId, userMessage } = validationResult.data;
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

					// Generate a title using the AI
					const systemPrompt = `You are a title generator. Given a user's message, generate a short, descriptive title (3-7 words max) that captures the essence of the conversation topic. 
Rules:
- Be concise and descriptive
- Don't use quotes around the title
- Don't include phrases like "Title:" or "Topic:"
- Just output the title directly
- Use sentence case (capitalize first word only unless proper nouns)
- Examples of good titles: "Python debugging help", "Recipe for chocolate cake", "Travel plans for Paris", "Understanding quantum physics"`;

					const stream = await genericChat({
						adapter: createOllamaChat(env.OLLAMA_MODEL, env.OLLAMA_BASE_URL),
						messages: [
							{ role: "system", content: systemPrompt },
							{
								role: "user",
								content: `/no_think Generate a short title for a conversation that starts with this message: "${userMessage.slice(0, 500)}"`,
							},
						],
					});

					// Collect the full response
					let generatedTitle = "";
					for await (const chunk of stream) {
						const typedChunk = chunk as {
							type?: unknown;
							content?: unknown;
						};
						if (typedChunk.type === "content") {
							const content = typedChunk.content;
							if (typeof content === "string") {
								generatedTitle = content;
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
								generatedTitle = snapshot;
							}
						}
					}

					// Clean up the title - remove think tags, quotes, trim, limit length
					generatedTitle = generatedTitle
						.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "") // Remove think blocks
						.replace(/<\/?think>/gi, "") // Remove any stray think tags
						.replace(/^["']|["']$/g, "") // Remove surrounding quotes
						.replace(/^Title:\s*/i, "") // Remove "Title:" prefix if present
						.replace(/^Topic:\s*/i, "") // Remove "Topic:" prefix if present
						.trim()
						.slice(0, 100); // Limit to 100 characters

					// Fallback if generation failed
					if (!generatedTitle) {
						generatedTitle =
							userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
					}

					// Update the thread title in Convex
					await convex.mutation(api.threads.updateTitle, {
						threadId: threadId as Id<"threads">,
						title: generatedTitle,
					});

					return new Response(JSON.stringify({ title: generatedTitle }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (e) {
					console.error("Title generation error:", e);
					return new Response("Internal Error", { status: 500 });
				}
			},
		},
	},
});
