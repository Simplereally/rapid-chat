/**
 * Bash Tool - Execute shell commands
 *
 * This tool allows the AI to run shell commands on the local system.
 * It's a powerful capability that requires user approval for safety.
 *
 * Features:
 * - Execute arbitrary bash commands
 * - Capture stdout, stderr, and exit code
 * - Configurable timeout
 * - Working directory support
 *
 * Security:
 * - Always requires user approval (needsApproval: true)
 * - Timeout prevents runaway processes
 * - Designed for local development use only
 */

import type { Tool } from "@tanstack/ai";
import { spawn } from "node:child_process";
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
	success: z.boolean().describe("Whether the command executed successfully (exit code 0)"),
	exitCode: z.number().nullable().describe("Command exit code, null if killed by timeout"),
	stdout: z.string().describe("Standard output from the command"),
	stderr: z.string().describe("Standard error output from the command"),
	timedOut: z.boolean().describe("Whether the command was killed due to timeout"),
	executionTime: z.number().describe("Execution time in milliseconds"),
});

export type BashInput = z.infer<typeof bashInputSchema>;
export type BashOutput = z.infer<typeof bashOutputSchema>;

// =============================================================================
// EXECUTE FUNCTION
// =============================================================================

async function executeBash(input: BashInput): Promise<BashOutput> {
	const { command, cwd, timeout = 30000 } = input;
	const startTime = Date.now();

	return new Promise((resolve) => {
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		let killed = false;

		// Use bash -c to execute the command, allowing pipes and complex commands
		const process = spawn("bash", ["-c", command], {
			cwd: cwd || undefined,
			env: {
				...globalThis.process?.env,
				// Set PAGER to cat to prevent interactive pagers
				PAGER: "cat",
				// Disable colors for cleaner output
				NO_COLOR: "1",
			},
			shell: false,
		});

		// Timeout handler
		const timeoutId = setTimeout(() => {
			timedOut = true;
			killed = true;
			process.kill("SIGTERM");
			// Force kill after 2 seconds if still running
			setTimeout(() => {
				if (!process.killed) {
					process.kill("SIGKILL");
				}
			}, 2000);
		}, timeout);

		// Capture stdout
		process.stdout?.on("data", (data: Buffer) => {
			stdout += data.toString();
			// Limit stdout size to prevent memory issues
			if (stdout.length > 1_000_000) {
				stdout = stdout.slice(0, 500_000) + "\n...[output truncated]...\n" + stdout.slice(-500_000);
			}
		});

		// Capture stderr
		process.stderr?.on("data", (data: Buffer) => {
			stderr += data.toString();
			// Limit stderr size
			if (stderr.length > 100_000) {
				stderr = stderr.slice(0, 50_000) + "\n...[output truncated]...\n" + stderr.slice(-50_000);
			}
		});

		// Handle process exit
		process.on("close", (code: number | null) => {
			clearTimeout(timeoutId);
			const executionTime = Date.now() - startTime;

			resolve({
				success: code === 0 && !timedOut,
				exitCode: killed ? null : code,
				stdout: stdout.trim(),
				stderr: stderr.trim(),
				timedOut,
				executionTime,
			});
		});

		// Handle spawn errors
		process.on("error", (error: Error) => {
			clearTimeout(timeoutId);
			const executionTime = Date.now() - startTime;

			resolve({
				success: false,
				exitCode: null,
				stdout: "",
				stderr: `Failed to execute command: ${error.message}`,
				timedOut: false,
				executionTime,
			});
		});
	});
}

// =============================================================================
// TOOL DEFINITION
// =============================================================================

/**
 * Bash tool for executing shell commands.
 * ⚠️ ALWAYS requires user approval - this can modify the system.
 */
export const bashTool: Tool<typeof bashInputSchema, typeof bashOutputSchema, "bash"> = {
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
	execute: executeBash,
	needsApproval: true, // ALWAYS require approval for shell commands
};
