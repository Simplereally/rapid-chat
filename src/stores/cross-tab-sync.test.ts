import { describe, expect, test } from "vitest";
import { serializeMessages, deserializeMessages } from "./cross-tab-sync";
import type { UIMessage } from "@tanstack/ai-react";

describe("cross-tab-sync", () => {
	describe("serializeMessages", () => {
		test("serializes simple message array", () => {
			const messages: UIMessage[] = [
				{
					id: "1",
					role: "user",
					parts: [{ type: "text", content: "Hello" }],
				},
			];

			const result = serializeMessages(messages);

			expect(result).toEqual([
				{
					id: "1",
					role: "user",
					parts: [{ type: "text", content: "Hello" }],
				},
			]);
		});

		test("serializes Date objects to ISO strings", () => {
			const date = new Date("2024-01-15T10:30:00.000Z");
			const messages: UIMessage[] = [
				{
					id: "1",
					role: "assistant",
					parts: [{ type: "text", content: "Hi" }],
					createdAt: date,
				},
			];

			const result = serializeMessages(messages);

			expect(result[0].createdAt).toBe("2024-01-15T10:30:00.000Z");
		});

		test("handles empty array", () => {
			const result = serializeMessages([]);
			expect(result).toEqual([]);
		});

		test("serializes multiple messages", () => {
			const messages: UIMessage[] = [
				{
					id: "1",
					role: "user",
					parts: [{ type: "text", content: "Hello" }],
				},
				{
					id: "2",
					role: "assistant",
					parts: [{ type: "text", content: "Hi there!" }],
				},
			];

			const result = serializeMessages(messages);

			expect(result).toHaveLength(2);
			expect(result[0].role).toBe("user");
			expect(result[1].role).toBe("assistant");
		});

		test("handles complex parts array", () => {
			// Use any[] for the parts to test serialization of arbitrary structures
			const messages = [
				{
					id: "1",
					role: "assistant" as const,
					parts: [
						{ type: "text", content: "Here is the code:" },
						{ type: "tool-call", id: "tc1", name: "write", arguments: "{}", state: "input-complete" as const },
					],
				},
			];

			const result = serializeMessages(messages as UIMessage[]);

			expect(result[0].parts).toHaveLength(2);
			expect(result[0].parts[1].name).toBe("write");
		});
	});

	describe("deserializeMessages", () => {
		test("deserializes simple message array", () => {
			const serialized = [
				{
					id: "1",
					role: "user",
					parts: [{ type: "text", content: "Hello" }],
				},
			];

			const result = deserializeMessages(serialized);

			expect(result[0].id).toBe("1");
			expect(result[0].role).toBe("user");
		});

		test("converts ISO date string back to Date object", () => {
			const serialized = [
				{
					id: "1",
					role: "assistant",
					parts: [{ type: "text", content: "Hi" }],
					createdAt: "2024-01-15T10:30:00.000Z",
				},
			];

			const result = deserializeMessages(serialized);

			expect(result[0].createdAt).toBeInstanceOf(Date);
			expect(result[0].createdAt?.toISOString()).toBe("2024-01-15T10:30:00.000Z");
		});

		test("handles missing createdAt field", () => {
			const serialized = [
				{
					id: "1",
					role: "user",
					parts: [{ type: "text", content: "Hello" }],
				},
			];

			const result = deserializeMessages(serialized);

			expect(result[0].createdAt).toBeUndefined();
		});

		test("handles null createdAt field", () => {
			const serialized = [
				{
					id: "1",
					role: "user",
					parts: [],
					createdAt: null,
				},
			];

			const result = deserializeMessages(serialized);

			expect(result[0].createdAt).toBeUndefined();
		});

		test("handles empty array", () => {
			const result = deserializeMessages([]);
			expect(result).toEqual([]);
		});

		test("preserves role type correctly", () => {
			const serialized = [
				{ id: "1", role: "user", parts: [] },
				{ id: "2", role: "assistant", parts: [] },
			];

			const result = deserializeMessages(serialized);

			expect(result[0].role).toBe("user");
			expect(result[1].role).toBe("assistant");
		});

		test("preserves parts array structure", () => {
			const serialized = [
				{
					id: "1",
					role: "assistant",
					parts: [
						{ type: "text", content: "Response" },
						{ type: "tool-call", id: "tc1", name: "bash", arguments: '{"command":"ls"}', state: "input-complete" },
					],
				},
			];

			const result = deserializeMessages(serialized);

			expect(result[0].parts).toHaveLength(2);
			expect(result[0].parts[0]).toHaveProperty("type", "text");
			expect(result[0].parts[1]).toHaveProperty("name", "bash");
		});
	});

	describe("round-trip serialization", () => {
		test("preserves message content through serialize/deserialize cycle", () => {
			const original: UIMessage[] = [
				{
					id: "msg-1",
					role: "user",
					parts: [{ type: "text", content: "What is 2+2?" }],
					createdAt: new Date("2024-01-15T10:30:00.000Z"),
				},
				{
					id: "msg-2",
					role: "assistant",
					parts: [{ type: "text", content: "The answer is 4." }],
					createdAt: new Date("2024-01-15T10:30:05.000Z"),
				},
			];

			const serialized = serializeMessages(original);
			const deserialized = deserializeMessages(serialized);

			expect(deserialized).toHaveLength(2);
			expect(deserialized[0].id).toBe("msg-1");
			expect(deserialized[0].parts[0]).toHaveProperty("content", "What is 2+2?");
			expect(deserialized[1].id).toBe("msg-2");
			expect(deserialized[1].parts[0]).toHaveProperty("content", "The answer is 4.");
		});

		test("preserves Date accuracy through round-trip", () => {
			const originalDate = new Date("2024-06-20T14:45:30.123Z");
			const original: UIMessage[] = [
				{
					id: "1",
					role: "user",
					parts: [],
					createdAt: originalDate,
				},
			];

			const serialized = serializeMessages(original);
			const deserialized = deserializeMessages(serialized);

			expect(deserialized[0].createdAt?.getTime()).toBe(originalDate.getTime());
		});
	});
});
