import { env } from "@/env";
import { webSearchTool } from "@/tools";
import { chat, type ModelMessage, toStreamResponse } from "@tanstack/ai";
import { ollama } from "@tanstack/ai-ollama";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Available tools for the chat model.
 * Add new tools here to make them available to the LLM.
 */
const availableTools = [
	webSearchTool,
	// Add more tools here as needed:
	// calculatorTool,
	// urlReaderTool,
];

/**
 * Base system prompt that's always included.
 * Provides context about available capabilities.
 */
const BASE_SYSTEM_PROMPT = `You are a helpful assistant with tool-calling capabilities.

Use tools when you need current information or capabilities beyond your training data. After receiving tool results, integrate them naturally into your response with proper attribution. If no tool is needed, answer directly.`;

const MessageSchema = z
	.object({
		role: z.enum(["system", "user", "assistant", "tool"]),
		content: z.string(),
	})
	.strict(); // Allow additional fields like toolCalls, toolCallId without validation

const ChatRequestSchema = z.object({
	messages: z.array(MessageSchema),
});

export const Route = createFileRoute("/api/chat")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const url = new URL(request.url);
					const threadId = url.searchParams.get("threadId");

					// DIAGNOSTIC: Log when request hits server
					console.log(
						`[SERVER] Chat request received for thread ${threadId} at ${Date.now()}`,
					);

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

					// Separate system messages for systemPrompts and filter conversation messages
					const clientSystemPrompts = incomingMessages
						.filter((m) => m.role === "system")
						.map((m) => m.content);

					// Combine base system prompt with any client-provided prompts
					const allSystemPrompts = [BASE_SYSTEM_PROMPT, ...clientSystemPrompts];

					const conversationMessages: Array<ModelMessage<string | null>> =
						incomingMessages.filter(
							(
								m,
							): m is {
								role: "user" | "assistant" | "tool";
								content: string;
							} =>
								m.role === "user" ||
								m.role === "assistant" ||
								m.role === "tool",
						);

					// Stream the chat response - no DB persistence here
					// Client handles persistence via onFinish callback
					console.log(
						`[SERVER] Thread ${threadId} - creating chat stream at ${Date.now()}`,
					);
					const stream = chat({
						adapter: ollama({
							baseUrl: env.OLLAMA_BASE_URL,
						}),
						messages: conversationMessages,
						model: env.OLLAMA_MODEL as "llama3",
						systemPrompts: allSystemPrompts,
						tools: availableTools,
					});

					console.log(
						`[SERVER] Thread ${threadId} - returning streaming response at ${Date.now()}`,
					);
					return toStreamResponse(stream);
				} catch (e) {
					console.error(e);
					return new Response("Internal Error", { status: 500 });
				}
			},
		},
	},
});
