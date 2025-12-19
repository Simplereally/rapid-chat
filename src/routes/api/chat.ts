import { env } from "@/env";
import {
	bashTool,
	editTool,
	globTool,
	grepTool,
	lsTool,
	multiEditTool,
	readTool,
	webSearchTool,
	writeTool,
} from "@/tools";
import {
	type AgentLoopStrategy,
	chat,
	type ModelMessage,
	toStreamResponse,
} from "@tanstack/ai";
import { ollama } from "@tanstack/ai-ollama";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Available tools for the chat model (Claude Code aligned).
 *
 * Direct file IO:
 * - read: Read files (text, images, PDFs)
 * - write: Create or overwrite files [Requires Permission]
 * - edit: Single find-and-replace in a file [Requires Permission]
 * - multi_edit: Batch multiple Edit operations [Requires Permission]
 *
 * Search / Discovery:
 * - glob: Find files by pattern
 * - grep: Search file contents by regex
 * - ls: List directory contents
 *
 * Shell / Terminal:
 * - bash: Execute shell commands [Requires Permission]
 */
const availableTools = [
	// Search / Discovery (use these FIRST to locate what you need)
	grepTool, // Search file contents by regex
	globTool, // Find files by pattern
	lsTool, // List directory contents

	// Direct file IO
	readTool, // Read files (text, images, PDFs)
	writeTool, // ⚠️ Create or overwrite files [Requires Permission]
	editTool, // ⚠️ Single find-and-replace [Requires Permission]
	multiEditTool, // ⚠️ Batch edits on one file [Requires Permission]

	// Shell / Terminal
	bashTool, // ⚠️ Execute shell commands [Requires Permission]

	// External tools
	webSearchTool, // Search the web for current information
];

/**
 * Base system prompt that's always included.
 * Provides context about available capabilities and TOOL SELECTION GUIDANCE.
 *
 * This is where we teach the model the most efficient way to use tools.
 */
const BASE_SYSTEM_PROMPT = `You are an agentic reasoning assistant with advanced tool-calling capabilities for files, commands, and information retrieval. You follow instructions and tend to not second guess yourself.

## Tools
**Search/Discovery**: \`grep\` (search file contents), \`glob\` (find files by pattern), \`ls\` (list directories)
**File I/O**: \`read\`, \`write\` ⚠️, \`edit\` ⚠️, \`multi_edit\` ⚠️
**Shell**: \`bash\` ⚠️ (execute commands, run tests, install deps, manage services)
**External**: \`web_search\` (current info beyond training data)

## Tool Selection
**Finding content** → grep first, then read specific files
**Finding files** → glob for names, ls for structure
**Modifying files** → edit/multi_edit for changes, write for new files
**Running tasks** → bash for build/test/lint
**Current info** → web_search

## Execution Model
**Simple/obvious requests**: Execute immediately with sensible defaults. Don't deliberate on trivial choices (quote types, default timeouts, standard commands).
**Complex/ambiguous tasks**: Reason about approach, then act efficiently.
**Chain operations**: grep → read → edit. Search before reading.

## Guidelines
- Use defaults for all tool calls, unless specified (timeout: 30000ms, cwd: current dir)
- edit > write for modifications (exact whitespace match required)
- ⚠️ = requires approval: state operation + reason briefly
- Prefer action over deliberation for straightforward tasks

Reason deeply when needed. Act decisively when obvious.`;

const MessageSchema = z
	.object({
		role: z.enum(["system", "user", "assistant", "tool"]),
		content: z.string().nullable().optional(),
	})
	.passthrough(); // Allow additional fields like toolCalls, toolCallId without validation

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
						.filter(
							(m): m is { role: "system"; content: string } =>
								m.role === "system" && typeof m.content === "string",
						)
						.map((m) => m.content);

					// Combine base system prompt with any client-provided prompts
					const allSystemPrompts = [BASE_SYSTEM_PROMPT, ...clientSystemPrompts];

					const conversationMessages = incomingMessages
						.filter(
							(m) =>
								m.role === "user" ||
								m.role === "assistant" ||
								m.role === "tool",
						)
						.map((m) => m as unknown as ModelMessage<string | null>);

					// Agent loop strategy: Continue looping when model wants to use tools
					// Max 10 iterations for safety (prevents infinite loops)
					const agentLoopStrategy: AgentLoopStrategy = ({
						iterationCount,
						finishReason,
					}) => {
						// Stop if we've reached max iterations
						if (iterationCount >= 10) {
							console.warn(
								`Agent loop reached max iterations (${iterationCount}), stopping.`,
							);
							return false;
						}
						// Continue if the model wants to call more tools
						return finishReason === "tool_calls";
					};

					// Stream the chat response - no DB persistence here
					const rawStream = chat({
						adapter: ollama({
							baseUrl: env.OLLAMA_BASE_URL,
						}),
						messages: conversationMessages,
						model: env.OLLAMA_MODEL as "llama3",
						systemPrompts: allSystemPrompts,
						tools: availableTools,
						agentLoopStrategy,
					});

					// Debug: Log stream chunks
					async function* debugStream(
						source: AsyncIterable<import("@tanstack/ai").StreamChunk>,
					) {
						let chunkCount = 0;
						console.log(`[Chat Debug] Starting stream for thread: ${threadId}`);
						console.log(
							`[Chat Debug] Message count: ${conversationMessages.length}`,
						);
						try {
							for await (const chunk of source) {
								chunkCount++;
								console.log(
									`[Chat Debug] Chunk #${chunkCount}:`,
									JSON.stringify(chunk).slice(0, 50),
								);
								yield chunk;
							}
							console.log(
								`[Chat Debug] Stream completed. Total chunks: ${chunkCount}`,
							);
						} catch (error) {
							console.error(`[Chat Debug] Stream error:`, error);
							throw error;
						}
					}

					return toStreamResponse(debugStream(rawStream));
				} catch (e) {
					console.error(e);
					return new Response("Internal Error", { status: 500 });
				}
			},
		},
	},
});
