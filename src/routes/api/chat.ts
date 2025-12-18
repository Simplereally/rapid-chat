import { env } from "@/env";
import {
	readTool,
	writeTool,
	editTool,
	multiEditTool,
	globTool,
	grepTool,
	lsTool,
	webSearchTool,
} from "@/tools";
import { chat, type ModelMessage, toStreamResponse } from "@tanstack/ai";
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
 */
const availableTools = [
	// Search / Discovery (use these FIRST to locate what you need)
	grepTool,         // Search file contents by regex
	globTool,         // Find files by pattern
	lsTool,           // List directory contents
	
	// Direct file IO
	readTool,         // Read files (text, images, PDFs)
	writeTool,        // ⚠️ Create or overwrite files [Requires Permission]
	editTool,         // ⚠️ Single find-and-replace [Requires Permission]
	multiEditTool,    // ⚠️ Batch edits on one file [Requires Permission]
	
	// External tools
	webSearchTool,    // Search the web for current information
];

/**
 * Base system prompt that's always included.
 * Provides context about available capabilities and TOOL SELECTION GUIDANCE.
 *
 * This is where we teach the model the most efficient way to use tools.
 */
const BASE_SYSTEM_PROMPT = `You are a helpful assistant with powerful tool-calling capabilities for working with files and searching for information.

## Available Tools (Claude Code aligned)

### Search / Discovery
- \`grep\` - Search file contents by regex. Use this FIRST to find content within files.
- \`glob\` - Find files by pattern. Use when you know part of the filename.
- \`ls\` - List directory contents. Use to explore directory structure.

### Direct file IO
- \`read\` - Read file contents (text, images, PDFs).
- \`write\` - Create or overwrite files. ⚠️ Requires user approval.
- \`edit\` - Single find-and-replace in a file. ⚠️ Requires user approval.
- \`multi_edit\` - Batch multiple edits on one file. ⚠️ Requires user approval.

### External
- \`web_search\` - Search the web for current information.

## Tool Selection Strategy

Choose tools efficiently by following this decision tree:

### When working with files:
1. **Finding content WITHIN files** → Use \`grep\` first
   - Search for function names, imports, error messages, TODOs, variable names
   - Returns matching lines with file paths and line numbers
   - Much faster than reading entire files

2. **Finding files BY NAME** → Use \`glob\`
   - When you know part of the filename (e.g., "find all test files", "where is package.json")
   - Supports glob patterns: \`*.ts\`, \`test-*\`, \`**/*.tsx\`

3. **Exploring directory structure** → Use \`ls\`
   - When you need to see what's in a directory
   - Less common than grep/glob, but useful for orientation

4. **Reading file contents** → Use \`read\` AFTER locating the file
   - Only read files you've already found via search
   - Use \`startLine\`/\`endLine\` for large files to avoid overwhelming context

5. **Making surgical edits** → Use \`edit\` or \`multi_edit\` (requires approval)
   - \`edit\` for single find-and-replace operations
   - \`multi_edit\` for multiple changes to the same file
   - Both require exact match of oldText including whitespace

6. **Creating/overwriting files** → Use \`write\` (requires approval)
   - For new files or complete rewrites
   - Prefer edit/multi_edit for modifications to existing files

### When you need external information:
- **Current events, facts, documentation** → Use \`web_search\`
  - For anything beyond your training data
  - Returns summarized results with source URLs

## Best Practices

- **Search before reading**: Use grep or glob before read
- **Be specific**: Narrow searches with file type filters (e.g., \`*.tsx\`)
- **Chain efficiently**: grep → read(specific file) → edit/multi_edit
- **Prefer edit over write**: For modifications, edit is safer than full file replacement
- **Explain your approach**: Tell the user what you're searching for and why

## Handling Approvals

When a tool requires approval (write, edit, multi_edit), explain clearly:
1. What operation you're about to perform
2. Why it's necessary
3. What the expected outcome is

Wait for user approval before the operation executes.`;


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
					const stream = chat({
						adapter: ollama({
							baseUrl: env.OLLAMA_BASE_URL,
						}),
						messages: conversationMessages,
						model: env.OLLAMA_MODEL as "llama3",
						systemPrompts: allSystemPrompts,
						tools: availableTools
						// agentLoopStrategy: ...
					});
					
					return toStreamResponse(stream);
				} catch (e) {
					console.error(e);
					return new Response("Internal Error", { status: 500 });
				}
			},
		},
	},
});
