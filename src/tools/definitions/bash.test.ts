import { describe, expect, test } from "vitest";
import { bashInputSchema, bashOutputSchema } from "./bash";

describe("bash tool schemas", () => {
	describe("bashInputSchema", () => {
		describe("valid inputs", () => {
			test("parses minimal valid input", () => {
				const input = {
					command: "ls -la",
				};

				const result = bashInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.command).toBe("ls -la");
				}
			});

			test("applies default timeout (30000ms)", () => {
				const input = {
					command: "echo hello",
				};

				const result = bashInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.timeout).toBe(30000);
				}
			});

			test("accepts optional cwd", () => {
				const input = {
					command: "npm run build",
					cwd: "/home/user/project",
				};

				const result = bashInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.cwd).toBe("/home/user/project");
				}
			});

			test("accepts custom timeout", () => {
				const input = {
					command: "long-running-task",
					timeout: 60000,
				};

				const result = bashInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.timeout).toBe(60000);
				}
			});

			test("accepts complex shell commands with pipes", () => {
				const input = {
					command: "cat file.txt | grep 'pattern' | wc -l",
				};

				const result = bashInputSchema.safeParse(input);

				expect(result.success).toBe(true);
			});

			test("accepts all optional fields together", () => {
				const input = {
					command: "npm test",
					cwd: "/app",
					timeout: 120000,
				};

				const result = bashInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.command).toBe("npm test");
					expect(result.data.cwd).toBe("/app");
					expect(result.data.timeout).toBe(120000);
				}
			});
		});

		describe("invalid inputs", () => {
			test("fails when command is missing", () => {
				const input = {
					cwd: "/tmp",
				};

				const result = bashInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});

			test("fails when command is not a string", () => {
				const input = {
					command: ["ls", "-la"],
				};

				const result = bashInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});

			test("fails when timeout is not a number", () => {
				const input = {
					command: "echo",
					timeout: "5000",
				};

				const result = bashInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});

			test("fails when cwd is not a string", () => {
				const input = {
					command: "ls",
					cwd: 123,
				};

				const result = bashInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});
		});
	});

	describe("bashOutputSchema", () => {
		test("parses successful command output", () => {
			const output = {
				success: true,
				exitCode: 0,
				stdout: "file1.txt\nfile2.txt\n",
				stderr: "",
				timedOut: false,
				executionTime: 50,
			};

			const result = bashOutputSchema.safeParse(output);

			expect(result.success).toBe(true);
		});

		test("parses failed command output", () => {
			const output = {
				success: false,
				exitCode: 1,
				stdout: "",
				stderr: "command not found: xyz",
				timedOut: false,
				executionTime: 10,
			};

			const result = bashOutputSchema.safeParse(output);

			expect(result.success).toBe(true);
		});

		test("parses timed out command output", () => {
			const output = {
				success: false,
				exitCode: null,
				stdout: "partial output...",
				stderr: "",
				timedOut: true,
				executionTime: 30000,
			};

			const result = bashOutputSchema.safeParse(output);

			expect(result.success).toBe(true);
		});

		test("requires all fields", () => {
			const output = {
				success: true,
				// missing other required fields
			};

			const result = bashOutputSchema.safeParse(output);

			expect(result.success).toBe(false);
		});

		test("exitCode can be null (for killed processes)", () => {
			const output = {
				success: false,
				exitCode: null,
				stdout: "",
				stderr: "",
				timedOut: true,
				executionTime: 30000,
			};

			const result = bashOutputSchema.safeParse(output);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.exitCode).toBeNull();
			}
		});
	});
});
