import { describe, expect, test } from "vitest";
import { cleanMessageForTitle } from "./title-generation";

describe("title-generation", () => {
	describe("cleanMessageForTitle", () => {
		describe("thinking prefix removal", () => {
			test("removes /think prefix", () => {
				expect(cleanMessageForTitle("/think Hello, world!")).toBe(
					"Hello, world!",
				);
			});

			test("removes /no_think prefix", () => {
				expect(cleanMessageForTitle("/no_think Hello, world!")).toBe(
					"Hello, world!",
				);
			});

			test("handles /think with extra whitespace", () => {
				expect(cleanMessageForTitle("/think   Multiple spaces")).toBe(
					"Multiple spaces",
				);
			});

			test("handles /no_think with extra whitespace", () => {
				expect(cleanMessageForTitle("/no_think   Multiple spaces")).toBe(
					"Multiple spaces",
				);
			});
		});

		describe("messages without prefixes", () => {
			test("returns plain message unchanged", () => {
				expect(cleanMessageForTitle("Hello, world!")).toBe("Hello, world!");
			});

			test("preserves message with /think in the middle", () => {
				expect(cleanMessageForTitle("I want to /think about this")).toBe(
					"I want to /think about this",
				);
			});

			test("preserves message with /no_think in the middle", () => {
				expect(cleanMessageForTitle("Please /no_think")).toBe(
					"Please /no_think",
				);
			});
		});

		describe("edge cases", () => {
			test("returns empty string for empty input", () => {
				expect(cleanMessageForTitle("")).toBe("");
			});

			test("returns empty string for whitespace-only input", () => {
				expect(cleanMessageForTitle("   ")).toBe("");
			});

			test("handles /think with only whitespace after", () => {
				expect(cleanMessageForTitle("/think   ")).toBe("");
			});

			test("handles /no_think with only whitespace after", () => {
				expect(cleanMessageForTitle("/no_think   ")).toBe("");
			});

			test("does not remove /thinking (similar but different)", () => {
				expect(cleanMessageForTitle("/thinking is fun")).toBe(
					"/thinking is fun",
				);
			});

			test("preserves multiline messages", () => {
				const multiline = "/think First line\nSecond line\nThird line";
				expect(cleanMessageForTitle(multiline)).toBe(
					"First line\nSecond line\nThird line",
				);
			});

			test("trims leading and trailing whitespace", () => {
				expect(cleanMessageForTitle("  Hello  ")).toBe("Hello");
			});
		});
	});
});
