import { describe, expect, test } from "vitest";
import { multiEditInputSchema, multiEditOutputSchema } from "./multi-edit";

describe("multi-edit tool schemas", () => {
	describe("multiEditInputSchema", () => {
		describe("valid inputs", () => {
			test("parses minimal valid input with single edit", () => {
				const input = {
					path: "/src/file.ts",
					edits: [{ oldText: "old", newText: "new" }],
				};

				const result = multiEditInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.path).toBe("/src/file.ts");
					expect(result.data.edits).toHaveLength(1);
				}
			});

			test("parses multiple edits", () => {
				const input = {
					path: "/file.ts",
					edits: [
						{ oldText: "foo", newText: "bar" },
						{ oldText: "baz", newText: "qux" },
						{ oldText: "hello", newText: "world" },
					],
				};

				const result = multiEditInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.edits).toHaveLength(3);
				}
			});

			test("applies default dryRun (false)", () => {
				const input = {
					path: "/file.ts",
					edits: [{ oldText: "a", newText: "b" }],
				};

				const result = multiEditInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.dryRun).toBe(false);
				}
			});

			test("accepts dryRun as true", () => {
				const input = {
					path: "/file.ts",
					edits: [{ oldText: "a", newText: "b" }],
					dryRun: true,
				};

				const result = multiEditInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.dryRun).toBe(true);
				}
			});

			test("accepts empty newText in edits (deletion)", () => {
				const input = {
					path: "/file.ts",
					edits: [{ oldText: "remove this", newText: "" }],
				};

				const result = multiEditInputSchema.safeParse(input);

				expect(result.success).toBe(true);
			});
		});

		describe("invalid inputs", () => {
			test("fails when path is missing", () => {
				const input = {
					edits: [{ oldText: "old", newText: "new" }],
				};

				const result = multiEditInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});

			test("fails when edits is missing", () => {
				const input = {
					path: "/file.ts",
				};

				const result = multiEditInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});

			test("fails when edits array is empty", () => {
				const input = {
					path: "/file.ts",
					edits: [],
				};

				const result = multiEditInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});

			test("fails when edit is missing oldText", () => {
				const input = {
					path: "/file.ts",
					edits: [{ newText: "new" }],
				};

				const result = multiEditInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});

			test("fails when edit is missing newText", () => {
				const input = {
					path: "/file.ts",
					edits: [{ oldText: "old" }],
				};

				const result = multiEditInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});

			test("fails when edits is not an array", () => {
				const input = {
					path: "/file.ts",
					edits: { oldText: "old", newText: "new" },
				};

				const result = multiEditInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});
		});
	});

	describe("multiEditOutputSchema", () => {
		test("parses successful output", () => {
			const output = {
				success: true,
				path: "/src/file.ts",
				appliedEdits: 3,
				totalEdits: 3,
				results: [
					{ index: 0, success: true, oldText: "foo", message: "Replaced" },
					{ index: 1, success: true, oldText: "bar", message: "Replaced" },
					{ index: 2, success: true, oldText: "baz", message: "Replaced" },
				],
				message: "Successfully applied 3 edits",
			};

			const result = multiEditOutputSchema.safeParse(output);

			expect(result.success).toBe(true);
		});

		test("parses dry run output", () => {
			const output = {
				success: true,
				path: "/file.ts",
				dryRun: true,
				message: "Dry run completed - no changes made",
			};

			const result = multiEditOutputSchema.safeParse(output);

			expect(result.success).toBe(true);
		});

		test("parses error output", () => {
			const output = {
				success: false,
				path: "/file.ts",
				error: "File not found",
			};

			const result = multiEditOutputSchema.safeParse(output);

			expect(result.success).toBe(true);
		});

		test("requires success and path fields", () => {
			const result = multiEditOutputSchema.safeParse({});

			expect(result.success).toBe(false);
		});
	});
});
