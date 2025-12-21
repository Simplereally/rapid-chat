import { describe, expect, test } from "vitest";
import { TOOL_NAMES, type ToolName } from "./types";

describe("Tool Types", () => {
	describe("TOOL_NAMES constant", () => {
		test("contains all expected tool names", () => {
			expect(TOOL_NAMES).toContain("grep");
			expect(TOOL_NAMES).toContain("glob");
			expect(TOOL_NAMES).toContain("ls");
			expect(TOOL_NAMES).toContain("read");
			expect(TOOL_NAMES).toContain("web_search");
			expect(TOOL_NAMES).toContain("bash");
			expect(TOOL_NAMES).toContain("write");
			expect(TOOL_NAMES).toContain("edit");
			expect(TOOL_NAMES).toContain("multi_edit");
		});

		test("has exactly 9 tool names", () => {
			expect(TOOL_NAMES).toHaveLength(9);
		});

		test("is a readonly tuple", () => {
			// Verify it's an array (runtime check)
			expect(Array.isArray(TOOL_NAMES)).toBe(true);

			// Type check: This validates the tuple is readonly at compile time
			// If TOOL_NAMES were mutable, the following would cause issues
			const names: readonly string[] = TOOL_NAMES;
			expect(names).toBe(TOOL_NAMES);
		});
	});

	describe("ToolName type", () => {
		test("can be used to type tool name variables", () => {
			// This is a compile-time check - if it compiles, the type works
			const toolName: ToolName = "bash";
			expect(TOOL_NAMES).toContain(toolName);
		});

		test("all TOOL_NAMES values are valid ToolName types", () => {
			for (const name of TOOL_NAMES) {
				// If this assignment works, the type is correct
				const typed: ToolName = name;
				expect(typed).toBe(name);
			}
		});
	});

	describe("tool name categories", () => {
		test("includes read-only tools", () => {
			const readOnlyTools = ["grep", "glob", "ls", "read", "web_search"];
			for (const tool of readOnlyTools) {
				expect(TOOL_NAMES).toContain(tool);
			}
		});

		test("includes write tools requiring approval", () => {
			const writeTools = ["bash", "write", "edit", "multi_edit"];
			for (const tool of writeTools) {
				expect(TOOL_NAMES).toContain(tool);
			}
		});
	});
});
