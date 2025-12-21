import { describe, expect, test } from "vitest";
import { writeInputSchema, writeOutputSchema } from "./write";

describe("write tool schemas", () => {
	describe("writeInputSchema", () => {
		describe("valid inputs", () => {
			test("parses minimal valid input", () => {
				const input = {
					path: "/test/file.txt",
					content: "Hello, World!",
				};

				const result = writeInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.path).toBe("/test/file.txt");
					expect(result.data.content).toBe("Hello, World!");
				}
			});

			test("applies default encoding (utf-8)", () => {
				const input = {
					path: "/test/file.txt",
					content: "content",
				};

				const result = writeInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.encoding).toBe("utf-8");
				}
			});

			test("applies default createDirectories (true)", () => {
				const input = {
					path: "/test/file.txt",
					content: "content",
				};

				const result = writeInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.createDirectories).toBe(true);
				}
			});

			test("accepts all valid encoding options", () => {
				const encodings = ["utf-8", "base64", "ascii"] as const;

				for (const encoding of encodings) {
					const result = writeInputSchema.safeParse({
						path: "/file.txt",
						content: "test",
						encoding,
					});

					expect(result.success).toBe(true);
					if (result.success) {
						expect(result.data.encoding).toBe(encoding);
					}
				}
			});

			test("accepts createDirectories as false", () => {
				const input = {
					path: "/test/file.txt",
					content: "content",
					createDirectories: false,
				};

				const result = writeInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.createDirectories).toBe(false);
				}
			});

			test("accepts empty content", () => {
				const input = {
					path: "/empty.txt",
					content: "",
				};

				const result = writeInputSchema.safeParse(input);

				expect(result.success).toBe(true);
			});
		});

		describe("invalid inputs", () => {
			test("fails when path is missing", () => {
				const input = {
					content: "Hello",
				};

				const result = writeInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});

			test("fails when content is missing", () => {
				const input = {
					path: "/test.txt",
				};

				const result = writeInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});

			test("fails with invalid encoding", () => {
				const input = {
					path: "/test.txt",
					content: "hello",
					encoding: "invalid-encoding",
				};

				const result = writeInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});

			test("fails when path is not a string", () => {
				const input = {
					path: 123,
					content: "hello",
				};

				const result = writeInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});

			test("fails when content is not a string", () => {
				const input = {
					path: "/test.txt",
					content: { text: "hello" },
				};

				const result = writeInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});
		});
	});

	describe("writeOutputSchema", () => {
		test("parses successful output", () => {
			const output = {
				success: true,
				path: "/test/file.txt",
				bytesWritten: 13,
				created: true,
				message: "Successfully created file",
			};

			const result = writeOutputSchema.safeParse(output);

			expect(result.success).toBe(true);
		});

		test("parses error output", () => {
			const output = {
				success: false,
				path: "/test/file.txt",
				error: "Permission denied",
			};

			const result = writeOutputSchema.safeParse(output);

			expect(result.success).toBe(true);
		});

		test("requires success field", () => {
			const output = {
				path: "/test.txt",
			};

			const result = writeOutputSchema.safeParse(output);

			expect(result.success).toBe(false);
		});

		test("requires path field", () => {
			const output = {
				success: true,
			};

			const result = writeOutputSchema.safeParse(output);

			expect(result.success).toBe(false);
		});
	});
});
