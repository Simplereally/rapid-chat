/**
 * Bash Tool Execution (Server-only)
 *
 * This function executes bash commands on the server.
 * It's called from the /api/tools/bash endpoint after client-side approval.
 */

import { spawn } from "node:child_process";
import type { BashInput, BashOutput } from "../definitions/bash";

/**
 * Execute a bash command with timeout and output capture.
 * This is the server-side implementation called from the tool execution API.
 */
export async function executeBash(input: BashInput): Promise<BashOutput> {
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
				stdout =
					stdout.slice(0, 500_000) +
					"\n...[output truncated]...\n" +
					stdout.slice(-500_000);
			}
		});

		// Capture stderr
		process.stderr?.on("data", (data: Buffer) => {
			stderr += data.toString();
			// Limit stderr size
			if (stderr.length > 100_000) {
				stderr =
					stderr.slice(0, 50_000) +
					"\n...[output truncated]...\n" +
					stderr.slice(-50_000);
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
