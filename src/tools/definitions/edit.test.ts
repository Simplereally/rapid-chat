import { describe, expect, test } from "vitest";
import { editInputSchema, editOutputSchema } from "./edit";

describe("edit tool schemas", () => {
	describe("editInputSchema", () => {
		describe("valid inputs", () => {
			test("parses minimal valid input", () => {
				const input = {
					path: "/src/utils.ts",
					oldText: "const foo = 1;",
					newText: "const foo = 2;",
				};

				const result = editInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.path).toBe("/src/utils.ts");
					expect(result.data.oldText).toBe("const foo = 1;");
					expect(result.data.newText).toBe("const foo = 2;");
				}
			});

			test("applies default expectedReplacements (1)", () => {
				const input = {
					path: "/file.ts",
					oldText: "old",
					newText: "new",
				};

				const result = editInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.expectedReplacements).toBe(1);
				}
			});

			test("accepts custom expectedReplacements", () => {
				const input = {
					path: "/file.ts",
					oldText: "console.log",
					newText: "logger.info",
					expectedReplacements: 5,
				};

				const result = editInputSchema.safeParse(input);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.expectedReplacements).toBe(5);
				}
			});

			test("accepts empty newText (deletion)", () => {
				const input = {
					path: "/file.ts",
					oldText: "// TODO: remove this",
					newText: "",
				};

				const result = editInputSchema.safeParse(input);

				expect(result.success).toBe(true);
			});

			test("accepts multiline text", () => {
				const input = {
					path: "/file.ts",
					oldText: "function old() {\n  return 1;\n}",
					newText: "function new() {\n  return 2;\n}",
				};

				const result = editInputSchema.safeParse(input);

				expect(result.success).toBe(true);
			});
		});

		describe("invalid inputs", () => {
			test("fails when path is missing", () => {
				const input = {
					oldText: "old",
					newText: "new",
				};

				const result = editInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});

			test("fails when oldText is missing", () => {
				const input = {
					path: "/file.ts",
					newText: "new",
				};

				const result = editInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});

			test("fails when newText is missing", () => {
				const input = {
					path: "/file.ts",
					oldText: "old",
				};

				const result = editInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});

			test("fails when expectedReplacements is not a number", () => {
				const input = {
					path: "/file.ts",
					oldText: "old",
					newText: "new",
					expectedReplacements: "many",
				};

				const result = editInputSchema.safeParse(input);

				expect(result.success).toBe(false);
			});
		});
	});

	describe("editOutputSchema", () => {
		test("parses successful output", () => {
			const output = {
				success: true,
				path: "/src/utils.ts",
				replacementsCount: 1,
				message: "Successfully replaced 1 occurrence",
				diff: {
					before: "const foo = 1;",
					after: "const foo = 2;",
				},
			};

			const result = editOutputSchema.safeParse(output);

			expect(result.success).toBe(true);
		});

		test("parses error output", () => {
			const output = {
				success: false,
				path: "/file.ts",
				error: "Text not found in file",
			};

			const result = editOutputSchema.safeParse(output);

			expect(result.success).toBe(true);
		});

		test("requires success and path fields", () => {
			const result = editOutputSchema.safeParse({});

			expect(result.success).toBe(false);
		});
	});
});
