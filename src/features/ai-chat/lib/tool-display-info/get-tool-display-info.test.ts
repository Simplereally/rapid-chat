import { describe, expect, test } from "vitest";
import {
	getToolDisplayInfo,
	getToolIcon,
	truncate,
} from "./get-tool-display-info";

describe("get-tool-display-info", () => {
	describe("truncate", () => {
		test("returns string unchanged if shorter than max length", () => {
			expect(truncate("hello", 10)).toBe("hello");
		});

		test("returns string unchanged if equal to max length", () => {
			expect(truncate("hello", 5)).toBe("hello");
		});

		test("truncates string with ellipsis if longer than max length", () => {
			expect(truncate("hello world", 8)).toBe("hello...");
		});

		test("handles empty string", () => {
			expect(truncate("", 5)).toBe("");
		});
	});

	describe("getToolIcon", () => {
		test("returns Terminal icon for bash", () => {
			const icon = getToolIcon("bash");
			expect(icon).toBeTruthy();
		});

		test("returns FolderOpen icon for write", () => {
			const icon = getToolIcon("write");
			expect(icon).toBeTruthy();
		});

		test("returns Edit2 icon for edit", () => {
			const icon = getToolIcon("edit");
			expect(icon).toBeTruthy();
		});

		test("returns Edit2 icon for multi_edit", () => {
			const icon = getToolIcon("multi_edit");
			expect(icon).toBeTruthy();
		});

		test("returns FileText icon for read", () => {
			const icon = getToolIcon("read");
			expect(icon).toBeTruthy();
		});

		test("returns FileText icon for ls", () => {
			const icon = getToolIcon("ls");
			expect(icon).toBeTruthy();
		});

		test("returns AlertTriangle icon for unknown tools", () => {
			const icon = getToolIcon("unknown");
			expect(icon).toBeTruthy();
		});
	});

	describe("getToolDisplayInfo", () => {
		describe("bash tool", () => {
			test("returns correct title and description", () => {
				const info = getToolDisplayInfo("bash", { command: "ls -la" });

				expect(info.title).toBe("Execute Shell Command");
				expect(info.description).toContain("shell");
				expect(info.variant).toBe("warning");
			});

			test("includes command in details", () => {
				const info = getToolDisplayInfo("bash", { command: "npm run build" });

				const commandDetail = info.details.find((d) => d.label === "Command");
				expect(commandDetail).toBeDefined();
				expect(commandDetail?.value).toBe("npm run build");
				expect(commandDetail?.isCode).toBe(true);
			});

			test("includes cwd when provided", () => {
				const info = getToolDisplayInfo("bash", {
					command: "ls",
					cwd: "/home/user",
				});

				const cwdDetail = info.details.find((d) => d.label === "Directory");
				expect(cwdDetail).toBeDefined();
				expect(cwdDetail?.value).toBe("/home/user");
			});

			test("includes timeout when provided", () => {
				const info = getToolDisplayInfo("bash", {
					command: "long-process",
					timeout: 60000,
				});

				const timeoutDetail = info.details.find((d) => d.label === "Timeout");
				expect(timeoutDetail).toBeDefined();
				expect(timeoutDetail?.value).toBe("60000ms");
			});
		});

		describe("write tool", () => {
			test("returns correct title", () => {
				const info = getToolDisplayInfo("write", { path: "/test.txt" });

				expect(info.title).toBe("Write File");
				expect(info.variant).toBe("warning");
			});

			test("includes path in details", () => {
				const info = getToolDisplayInfo("write", {
					path: "/src/components/Button.tsx",
				});

				const pathDetail = info.details.find((d) => d.label === "Path");
				expect(pathDetail?.value).toBe("/src/components/Button.tsx");
			});

			test("shows full file content", () => {
				const info = getToolDisplayInfo("write", {
					path: "/test.txt",
					content: "Hello, World!",
				});

				const contentDetail = info.details.find((d) => d.label === "File Content");
				expect(contentDetail?.value).toBe("Hello, World!");
				expect(contentDetail?.isCode).toBe(true);
			});

			test("shows full content even when long (no truncation)", () => {
				const longContent = "a".repeat(300);
				const info = getToolDisplayInfo("write", {
					path: "/test.txt",
					content: longContent,
				});

				const contentDetail = info.details.find((d) => d.label === "File Content");
				expect(contentDetail?.value).toBe(longContent);
				expect(contentDetail?.value.length).toBe(300);
			});

			test("includes createDirectories option", () => {
				const info = getToolDisplayInfo("write", {
					path: "/new/path/file.txt",
					createDirectories: true,
				});

				const optionsDetail = info.details.find((d) => d.label === "Options");
				expect(optionsDetail?.value).toContain("Create directories");
			});
		});

		describe("edit tool", () => {
			test("returns correct title", () => {
				const info = getToolDisplayInfo("edit", { path: "/test.txt" });

				expect(info.title).toBe("Edit File");
			});

			test("shows full find and replace strings", () => {
				const info = getToolDisplayInfo("edit", {
					path: "/src/utils.ts",
					oldString: "const old = 1;",
					newString: "const new = 2;",
				});

				const findDetail = info.details.find((d) => d.label === "Find");
				expect(findDetail?.value).toBe("const old = 1;");
				expect(findDetail?.isCode).toBe(true);

				const replaceDetail = info.details.find((d) => d.label === "Replace with");
				expect(replaceDetail?.value).toBe("const new = 2;");
				expect(replaceDetail?.isCode).toBe(true);
			});

			test("shows full content even when long (no truncation for security)", () => {
				const longString = "x".repeat(200);
				const info = getToolDisplayInfo("edit", {
					path: "/file.ts",
					oldString: longString,
				});

				const findDetail = info.details.find((d) => d.label === "Find");
				expect(findDetail?.value).toBe(longString);
				expect(findDetail?.value.length).toBe(200);
			});
		});

		describe("multi_edit tool", () => {
			test("returns correct title", () => {
				const info = getToolDisplayInfo("multi_edit", {
					path: "/test.txt",
					edits: [],
				});

				expect(info.title).toBe("Batch Edit File");
			});

			test("shows total edit count", () => {
				const info = getToolDisplayInfo("multi_edit", {
					path: "/test.txt",
					edits: [
						{ oldString: "a", newString: "b" },
						{ oldString: "c", newString: "d" },
						{ oldString: "e", newString: "f" },
					],
				});

				const totalDetail = info.details.find((d) => d.label === "Total");
				expect(totalDetail?.value).toBe("3 replacements");
			});

			test("shows all edits with find and replace", () => {
				const info = getToolDisplayInfo("multi_edit", {
					path: "/test.txt",
					edits: [
						{ oldString: "first edit", newString: "new first" },
						{ oldString: "second edit", newString: "new second" },
					],
				});

				const find1 = info.details.find((d) => d.label === "Find #1");
				expect(find1?.value).toBe("first edit");

				const replace1 = info.details.find((d) => d.label === "Replace #1");
				expect(replace1?.value).toBe("new first");

				const find2 = info.details.find((d) => d.label === "Find #2");
				expect(find2?.value).toBe("second edit");

				const replace2 = info.details.find((d) => d.label === "Replace #2");
				expect(replace2?.value).toBe("new second");
			});

			test("shows all edits even when many (no truncation)", () => {
				const info = getToolDisplayInfo("multi_edit", {
					path: "/test.txt",
					edits: [
						{ oldString: "1", newString: "a" },
						{ oldString: "2", newString: "b" },
						{ oldString: "3", newString: "c" },
						{ oldString: "4", newString: "d" },
						{ oldString: "5", newString: "e" },
					],
				});

				// Should have: Path + Total + (5 finds + 5 replaces) = 12 details
				expect(info.details).toHaveLength(12);
				
				// Verify all 5 edits are shown
				const find5 = info.details.find((d) => d.label === "Find #5");
				expect(find5?.value).toBe("5");
			});

			test("handles singular edit grammar", () => {
				const info = getToolDisplayInfo("multi_edit", {
					path: "/test.txt",
					edits: [{ oldString: "only" }],
				});

				const totalDetail = info.details.find((d) => d.label === "Total");
				expect(totalDetail?.value).toBe("1 replacement");
			});
		});

		describe("unknown tools", () => {
			test("returns generic title with tool name", () => {
				const info = getToolDisplayInfo("custom_tool", { param: "value" });

				expect(info.title).toBe("Approve custom_tool");
				expect(info.description).toContain("approval");
			});

			test("shows args as details", () => {
				const info = getToolDisplayInfo("custom", {
					param1: "value1",
					param2: 42,
				});

				const param1 = info.details.find((d) => d.label === "param1");
				expect(param1?.value).toBe("value1");

				const param2 = info.details.find((d) => d.label === "param2");
				expect(param2?.value).toBe("42");
			});

			test("truncates args list when more than 5 params", () => {
				const info = getToolDisplayInfo("custom", {
					a: "1",
					b: "2",
					c: "3",
					d: "4",
					e: "5",
					f: "6",
					g: "7",
				});

				// Should only have 5 params + 1 "more parameters" message
				expect(info.details).toHaveLength(6);
				const moreDetail = info.details.find((d) =>
					d.value.includes("more parameter"),
				);
				expect(moreDetail?.value).toBe("... and 2 more parameters");
			});
		});

		describe("edge cases", () => {
			test("handles empty args", () => {
				const info = getToolDisplayInfo("write", {});

				expect(info.title).toBe("Write File");
				const pathDetail = info.details.find((d) => d.label === "Path");
				expect(pathDetail?.value).toBe("unknown path");
			});

			test("handles missing path in edit", () => {
				const info = getToolDisplayInfo("edit", {});

				const pathDetail = info.details.find((d) => d.label === "Path");
				expect(pathDetail?.value).toBe("unknown path");
			});

			test("handles empty edits array in multi_edit", () => {
				const info = getToolDisplayInfo("multi_edit", {
					path: "/test.txt",
					edits: [],
				});

				const totalDetail = info.details.find((d) => d.label === "Total");
				expect(totalDetail?.value).toBe("0 replacements");
			});

			test("defaults to 'command' when bash command not provided", () => {
				const info = getToolDisplayInfo("bash", {});

				const commandDetail = info.details.find((d) => d.label === "Command");
				expect(commandDetail?.value).toBe("command");
			});
		});
	});
});
