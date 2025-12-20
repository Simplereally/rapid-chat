import {
	type AgentLoopStrategy,
	chat,
	type ModelMessage,
	toStreamResponse,
} from "@tanstack/ai";
import { ollama } from "@tanstack/ai-ollama";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { env } from "@/env";
import {
	// Tool DEFINITIONS only (no execute - client handles approval + execution)
	bashToolDef,
	editToolDef,
	globTool,
	// Safe tools with execute functions (auto-execute on server)
	grepTool,
	lsTool,
	multiEditToolDef,
	readTool,
	webSearchTool,
	writeToolDef,
} from "@/tools";

/**
 * Available tools for the chat model (Claude Code aligned).
 *
 * Pattern B Architecture:
 * - Safe tools (no approval): Full Tool with execute function - auto-execute on server
 * - Approval-required tools: Definition only (no execute) - server emits tool-input-available
 *   chunks which the client handles with approval UI + execution via /api/tools/*
 *
 * Direct file IO:
 * - read: Read files (text, images, PDFs)
 * - write: Create or overwrite files [Definition only - Client executes]
 * - edit: Single find-and-replace in a file [Definition only - Client executes]
 * - multi_edit: Batch multiple Edit operations [Definition only - Client executes]
 *
 * Search / Discovery:
 * - glob: Find files by pattern
 * - grep: Search file contents by regex
 * - ls: List directory contents
 *
 * Shell / Terminal:
 * - bash: Execute shell commands [Definition only - Client executes]
 */
const availableTools = [
	// ==========================================================================
	// SAFE TOOLS (auto-execute on server - no approval needed)
	// ==========================================================================
	grepTool, // Search file contents by regex
	globTool, // Find files by pattern
	lsTool, // List directory contents
	readTool, // Read files (text, images, PDFs)
	webSearchTool, // Search the web for current information

	// ==========================================================================
	// APPROVAL-REQUIRED TOOLS (definitions only - client handles execution)
	// These have NO execute function. When the LLM calls them:
	// 1. Server emits tool-input-available chunk
	// 2. Client receives chunk and shows approval UI
	// 3. User approves/denies
	// 4. Client tool's execute() calls /api/tools/{name}
	// 5. Server executes the tool and returns result
	// 6. Client adds result and continues flow
	// ==========================================================================
	bashToolDef, // ⚠️ Execute shell commands - /api/tools/bash
	writeToolDef, // ⚠️ Create or overwrite files - /api/tools/write
	editToolDef, // ⚠️ Single find-and-replace - /api/tools/edit
	multiEditToolDef, // ⚠️ Batch edits on one file - /api/tools/multi-edit
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

// Schema for incoming messages - simplified since we don't need UIMessages anymore
const MessageSchema = z
	.object({
		role: z.enum(["system", "user", "assistant", "tool"]),
		content: z.string().nullable().optional(),
		id: z.string().optional(),
	})
	.passthrough(); // Allow additional fields like toolCalls, toolCallId without validation

const ChatRequestSchema = z.object({
	messages: z.array(MessageSchema),
	// NOTE: uiMessages no longer needed with Pattern B!
	// The client handles tool approval state entirely client-side
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

					// Filter to conversation messages (user, assistant, tool)
					// No need to attach parts anymore - Pattern B handles approval client-side!
					const conversationMessages = incomingMessages.filter(
						(m) =>
							m.role === "user" || m.role === "assistant" || m.role === "tool",
					) as ModelMessage[];

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

					// Stream the chat response
					// NOTE: For approval-required tools (bashToolDef, writeToolDef, etc.),
					// the chat() function will emit tool-input-available chunks because
					// these are definitions without execute functions.
					// The client's ChatClient will receive these and handle approval.
					const rawStream = chat({
						adapter: ollama({
							baseUrl: env.OLLAMA_BASE_URL,
						}),
						messages: conversationMessages as any,
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
						console.log(
							`[Chat Debug] Using Pattern B - no UIMessage merging needed`,
						);
						try {
							for await (const chunk of source) {
								chunkCount++;
								console.log(
									`[Chat Debug] Chunk #${chunkCount}:`,
									JSON.stringify(chunk).slice(0, 100),
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
