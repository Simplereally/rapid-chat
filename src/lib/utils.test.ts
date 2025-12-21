import { describe, expect, test } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
	describe("basic class merging", () => {
		test("merges multiple class strings", () => {
			expect(cn("flex", "items-center")).toBe("flex items-center");
		});

		test("handles single class", () => {
			expect(cn("flex")).toBe("flex");
		});

		test("handles empty input", () => {
			expect(cn()).toBe("");
		});

		test("handles empty strings", () => {
			expect(cn("", "flex", "")).toBe("flex");
		});
	});

	describe("conditional classes", () => {
		test("includes class when condition is true", () => {
			const isActive = true;
			expect(cn("base", isActive && "active")).toBe("base active");
		});

		test("excludes class when condition is false", () => {
			const isActive = false;
			expect(cn("base", isActive && "active")).toBe("base");
		});

		test("handles undefined values", () => {
			expect(cn("flex", undefined, "gap-2")).toBe("flex gap-2");
		});

		test("handles null values", () => {
			expect(cn("flex", null, "gap-2")).toBe("flex gap-2");
		});
	});

	describe("tailwind class conflict resolution", () => {
		test("resolves padding conflicts (last wins)", () => {
			expect(cn("p-4", "p-2")).toBe("p-2");
		});

		test("resolves margin conflicts", () => {
			expect(cn("m-2", "m-4")).toBe("m-4");
		});

		test("resolves text color conflicts", () => {
			expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
		});

		test("resolves background color conflicts", () => {
			expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
		});

		test("resolves width conflicts", () => {
			expect(cn("w-full", "w-auto")).toBe("w-auto");
		});

		test("does not conflict unrelated classes", () => {
			expect(cn("p-4", "m-2", "text-red-500")).toBe("p-4 m-2 text-red-500");
		});
	});

	describe("object syntax", () => {
		test("includes classes with truthy values", () => {
			expect(cn({ flex: true, hidden: false })).toBe("flex");
		});

		test("handles mixed string and object syntax", () => {
			expect(cn("base", { active: true, disabled: false })).toBe("base active");
		});
	});

	describe("array syntax", () => {
		test("handles array of classes", () => {
			expect(cn(["flex", "items-center"])).toBe("flex items-center");
		});

		test("handles nested arrays", () => {
			expect(cn(["flex", ["items-center", "gap-2"]])).toBe(
				"flex items-center gap-2",
			);
		});
	});
});
