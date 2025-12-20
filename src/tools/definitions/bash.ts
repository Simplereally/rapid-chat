/**
 * Bash Tool Definition
 *
 * Tool DEFINITION only - no execute function.
 * This is used by both server (chat API) and client.
 * Actual execution happens via /api/tools/bash endpoint.
 */

import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

// =============================================================================
// SCHEMAS
// =============================================================================

export const bashInputSchema = z.object({
	command: z
		.string()
		.describe(
			"The shell command to execute. Can be any valid bash command or pipeline.",
		),
	cwd: z
		.string()
		.optional()
		.describe(
			"Working directory for command execution. Defaults to current directory.",
		),
	timeout: z
		.number()
		.optional()
		.default(30000)
		.describe(
			"Maximum execution time in milliseconds. Defaults to 30 seconds (30000ms).",
		),
});

export const bashOutputSchema = z.object({
	success: z
		.boolean()
		.describe("Whether the command executed successfully (exit code 0)"),
	exitCode: z
		.number()
		.nullable()
		.describe("Command exit code, null if killed by timeout"),
	stdout: z.string().describe("Standard output from the command"),
	stderr: z.string().describe("Standard error output from the command"),
	timedOut: z
		.boolean()
		.describe("Whether the command was killed due to timeout"),
	executionTime: z.number().describe("Execution time in milliseconds"),
});

export type BashInput = z.infer<typeof bashInputSchema>;
export type BashOutput = z.infer<typeof bashOutputSchema>;

// =============================================================================
// TOOL DEFINITION (no execute - for Pattern B)
// =============================================================================

/**
 * Bash tool DEFINITION only.
 * ⚠️ ALWAYS requires user approval - this can modify the system.
 *
 * When passed to chat(), the server will NOT execute this tool.
 * Instead, it emits a tool-input-available chunk for client-side handling.
 */
export const bashToolDef = toolDefinition({
	name: "bash",
	description: `Execute a shell command on the local system.

Use this tool to:
- Run build/test commands (npm, bun, cargo, etc.)
- Inspect system state (ls, cat, head, tail, wc, etc.)
- Execute scripts
- Install dependencies (requires approval)
- Start/stop services

The command runs in a bash shell, supporting pipes, redirects, and complex commands.

IMPORTANT:
- Always requires user approval before execution
- Default timeout is 30 seconds
- Use 'cwd' to specify working directory
- Long-running commands may time out
- Output is captured and returned (stdout/stderr)

Examples:
- "npm run test" - Run tests
- "ls -la src/" - List directory contents
- "cat package.json | jq .dependencies" - Read and parse JSON
- "git status" - Check git status`,
	inputSchema: bashInputSchema,
	outputSchema: bashOutputSchema,
	needsApproval: true, // Approval handled by ChatClient
});
