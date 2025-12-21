import * as path from "node:path";
import { describe, expect, test } from "vitest";
import { resolveSafePath } from "./file-utils";

describe("file-utils", () => {

	describe("resolveSafePath", () => {
		describe("valid paths within workspace", () => {
			test("resolves relative path to absolute path", () => {
				const result = resolveSafePath("src/index.ts");
				expect(path.isAbsolute(result)).toBe(true);
				expect(result).toContain("src/index.ts");
			});

			test("resolves current directory path", () => {
				const result = resolveSafePath("./test.txt");
				expect(path.isAbsolute(result)).toBe(true);
				expect(result.endsWith("test.txt")).toBe(true);
			});

			test("resolves nested relative path", () => {
				const result = resolveSafePath("src/components/Button.tsx");
				expect(result).toContain("src/components/Button.tsx");
			});

			test("returns absolute path unchanged if within workspace", () => {
				const absolutePath = path.join(process.cwd(), "src/file.ts");
				const result = resolveSafePath(absolutePath);
				expect(result).toBe(absolutePath);
			});
		});

		describe("directory traversal prevention", () => {
			test("blocks simple directory traversal", () => {
				expect(() => resolveSafePath("../../../etc/passwd")).toThrow(
					"Access denied",
				);
			});

			test("blocks traversal with path normalization", () => {
				expect(() => resolveSafePath("src/../../../etc/passwd")).toThrow(
					"Access denied",
				);
			});

			test("blocks absolute paths outside workspace", () => {
				expect(() => resolveSafePath("/etc/passwd")).toThrow("Access denied");
			});

			test("blocks paths to system directories", () => {
				expect(() => resolveSafePath("/usr/bin/env")).toThrow("Access denied");
			});

			test("error message includes the attempted path", () => {
				try {
					resolveSafePath("../secret");
					expect.fail("Should have thrown an error");
				} catch (error) {
					expect((error as Error).message).toContain("../secret");
					expect((error as Error).message).toContain(
						"outside allowed workspace boundaries",
					);
				}
			});
		});

		describe("edge cases", () => {
			test("handles empty string (resolves to cwd)", () => {
				const result = resolveSafePath("");
				expect(result).toBe(process.cwd());
			});

			test("handles path with spaces", () => {
				const result = resolveSafePath("src/my file.ts");
				expect(result).toContain("my file.ts");
			});

			test("handles path with special characters", () => {
				const result = resolveSafePath("src/file-name_v2.test.tsx");
				expect(result).toContain("file-name_v2.test.tsx");
			});

			test("normalizes redundant slashes", () => {
				const result = resolveSafePath("src//components///Button.tsx");
				expect(result).not.toContain("//");
			});

			test("handles dot in middle of path", () => {
				const result = resolveSafePath("src/./components/Button.tsx");
				expect(result).toContain("src/components/Button.tsx");
			});
		});
	});
});
