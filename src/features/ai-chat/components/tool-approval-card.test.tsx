import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ToolApprovalCard } from "./tool-approval-card";

describe("ToolApprovalCard", () => {
	describe("rendering", () => {
		test("renders with required props", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="write"
					args={{ path: "/test/file.txt", content: "hello" }}
					approvalId="approval-123"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("tool-approval-card");
			expect(html).toContain("write");
			expect(html).toContain("Approve");
			expect(html).toContain("Deny");
		});

		test("renders with custom className", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="edit"
					args={{ path: "/test/file.txt" }}
					approvalId="approval-456"
					onApprove={() => {}}
					onDeny={() => {}}
					className="custom-class"
				/>,
			);

			expect(html).toContain("custom-class");
		});

		test("includes data-testid and data-tool-name attributes", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="bash"
					args={{ command: "ls -la" }}
					approvalId="approval-789"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain('data-testid="tool-approval-card"');
			expect(html).toContain('data-tool-name="bash"');
		});
	});

	describe("bash tool", () => {
		test("displays command in details", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="bash"
					args={{ command: "npm run build" }}
					approvalId="approval-1"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("Execute Shell Command");
			expect(html).toContain("npm run build");
			expect(html).toContain("Command");
		});

		test("displays cwd when provided", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="bash"
					args={{ command: "ls", cwd: "/home/user/project" }}
					approvalId="approval-2"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("Directory");
			expect(html).toContain("/home/user/project");
		});

		test("displays timeout when provided", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="bash"
					args={{ command: "long-process", timeout: 60000 }}
					approvalId="approval-3"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("Timeout");
			expect(html).toContain("60000ms");
		});
	});

	describe("write tool", () => {
		test("displays file path", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="write"
					args={{ path: "/src/components/Button.tsx", content: "export..." }}
					approvalId="approval-4"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("Write File");
			expect(html).toContain("/src/components/Button.tsx");
			expect(html).toContain("Path");
		});

		test("displays content stats", () => {
			const multiLineContent = "line 1\nline 2\nline 3";
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="write"
					args={{ path: "/test.txt", content: multiLineContent }}
					approvalId="approval-5"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("Content");
			expect(html).toContain("3 lines");
		});

		test("displays content preview", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="write"
					args={{ path: "/test.txt", content: "Hello, World!" }}
					approvalId="approval-6"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("Preview");
			expect(html).toContain("Hello, World!");
		});

		test("truncates long content in preview", () => {
			const longContent = "a".repeat(300);
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="write"
					args={{ path: "/test.txt", content: longContent }}
					approvalId="approval-7"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("...");
			// Should not contain the full 300 character string
			expect(html).not.toContain(longContent);
		});

		test("displays createDirectories option", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="write"
					args={{
						path: "/new/nested/path/file.txt",
						content: "data",
						createDirectories: true,
					}}
					approvalId="approval-8"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("Options");
			expect(html).toContain("Create directories if needed");
		});
	});

	describe("edit tool", () => {
		test("displays file path and edit details", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="edit"
					args={{
						path: "/src/utils.ts",
						oldString: "const old = 1;",
						newString: "const new = 2;",
					}}
					approvalId="approval-9"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("Edit File");
			expect(html).toContain("/src/utils.ts");
			expect(html).toContain("Find");
			expect(html).toContain("const old = 1;");
			expect(html).toContain("Replace");
			expect(html).toContain("const new = 2;");
		});

		test("truncates long strings", () => {
			const longOldString = "x".repeat(200);
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="edit"
					args={{
						path: "/file.ts",
						oldString: longOldString,
						newString: "short",
					}}
					approvalId="approval-10"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("...");
			expect(html).not.toContain(longOldString);
		});
	});

	describe("multi_edit tool", () => {
		test("displays file path and edit count", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="multi_edit"
					args={{
						path: "/src/large-file.ts",
						edits: [
							{ oldString: "foo", newString: "bar" },
							{ oldString: "baz", newString: "qux" },
							{ oldString: "one", newString: "two" },
						],
					}}
					approvalId="approval-11"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("Batch Edit File");
			expect(html).toContain("/src/large-file.ts");
			expect(html).toContain("3 replacements");
		});

		test("shows preview of first edits", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="multi_edit"
					args={{
						path: "/file.ts",
						edits: [
							{ oldString: "first edit", newString: "new first" },
							{ oldString: "second edit", newString: "new second" },
						],
					}}
					approvalId="approval-12"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("Edit 1");
			expect(html).toContain("first edit");
			expect(html).toContain("Edit 2");
			expect(html).toContain("second edit");
		});

		test("shows additional edits count when more than 2", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="multi_edit"
					args={{
						path: "/file.ts",
						edits: [
							{ oldString: "1", newString: "a" },
							{ oldString: "2", newString: "b" },
							{ oldString: "3", newString: "c" },
							{ oldString: "4", newString: "d" },
							{ oldString: "5", newString: "e" },
						],
					}}
					approvalId="approval-13"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("5 replacements");
			expect(html).toContain("... and 3 more edits");
		});

		test("handles single edit count grammar", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="multi_edit"
					args={{
						path: "/file.ts",
						edits: [{ oldString: "only", newString: "one" }],
					}}
					approvalId="approval-14"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("1 replacement");
			expect(html).not.toContain("1 replacements");
		});
	});

	describe("unknown tool", () => {
		test("displays generic approval UI for unknown tools", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="custom_tool"
					args={{ param1: "value1", param2: 42 }}
					approvalId="approval-15"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("Approve custom_tool");
			expect(html).toContain("This tool requires your approval");
			expect(html).toContain("param1");
			expect(html).toContain("value1");
			expect(html).toContain("param2");
			expect(html).toContain("42");
		});

		test("truncates args list when more than 5 params", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="many_params_tool"
					args={{
						a: "1",
						b: "2",
						c: "3",
						d: "4",
						e: "5",
						f: "6",
						g: "7",
					}}
					approvalId="approval-16"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("... and 2 more parameters");
		});
	});

	describe("action buttons", () => {
		test("renders approve button with correct test id", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="write"
					args={{ path: "/test.txt" }}
					approvalId="test-approval"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain('data-testid="approve-button"');
		});

		test("renders deny button with correct test id", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="write"
					args={{ path: "/test.txt" }}
					approvalId="test-approval"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain('data-testid="deny-button"');
		});
	});

	describe("styling", () => {
		test("has warning styling by default", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="bash"
					args={{ command: "echo test" }}
					approvalId="style-test"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			// Warning colors should be present
			expect(html).toContain("border-warning");
			expect(html).toContain("bg-warning");
		});
	});

	describe("edge cases", () => {
		test("handles empty args", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="write"
					args={{}}
					approvalId="empty-args"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("Write File");
			expect(html).toContain("unknown path");
		});

		test("handles non-string args values", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="custom"
					args={{
						number: 123,
						boolean: true,
						array: [1, 2, 3],
						object: { nested: "value" },
					}}
					approvalId="mixed-args"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("123");
			expect(html).toContain("true");
		});

		test("handles empty content in write tool", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="write"
					args={{ path: "/test.txt", content: "" }}
					approvalId="empty-content"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("Write File");
			// Should show 1 line (empty string split produces 1 element)
			expect(html).toContain("1 line");
		});

		test("handles empty edits array in multi_edit", () => {
			const html = renderToStaticMarkup(
				<ToolApprovalCard
					toolName="multi_edit"
					args={{ path: "/test.txt", edits: [] }}
					approvalId="empty-edits"
					onApprove={() => {}}
					onDeny={() => {}}
				/>,
			);

			expect(html).toContain("Batch Edit File");
			expect(html).toContain("0 replacements");
		});
	});
});
