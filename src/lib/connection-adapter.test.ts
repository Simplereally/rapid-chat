/**
 * Tests for connection-adapter.ts
 *
 * This file tests the custom SSE connection adapter that sends UIMessages to the server.
 */
import { describe, expect, test, vi, beforeEach, afterEach, type Mock } from "vitest";
import { fetchServerSentEventsWithUIMessages } from "./connection-adapter";
import type { UIMessage } from "@tanstack/ai-react";

// Helper to create a mock fetch response with SSE data
function createMockSSEResponse(
	chunks: string[],
	options: { ok?: boolean; status?: number; statusText?: string } = {},
): Response {
	const { ok = true, status = 200, statusText = "OK" } = options;

	// Create a readable stream from chunks
	const encoder = new TextEncoder();
	let chunkIndex = 0;

	const stream = new ReadableStream<Uint8Array>({
		pull(controller) {
			if (chunkIndex < chunks.length) {
				controller.enqueue(encoder.encode(chunks[chunkIndex]));
				chunkIndex++;
			} else {
				controller.close();
			}
		},
	});

	return {
		ok,
		status,
		statusText,
		body: stream,
		headers: new Headers(),
	} as Response;
}

// Helper to collect all yielded values from an async iterable
async function collectAsyncIterable<T>(
	iterable: AsyncIterable<T>,
): Promise<T[]> {
	const results: T[] = [];
	for await (const value of iterable) {
		results.push(value);
	}
	return results;
}

// Helper to safely extract and parse request body from mock fetch calls
function getRequestBody(mockFetch: Mock<typeof fetch>): Record<string, unknown> {
	const calls = mockFetch.mock.calls;
	if (calls.length === 0) {
		throw new Error("mockFetch was not called");
	}
	const callArgs = calls[0] as [RequestInfo | URL, RequestInit | undefined];
	const body = callArgs[1]?.body;
	if (typeof body !== "string") {
		throw new Error("Request body is not a string");
	}
	return JSON.parse(body) as Record<string, unknown>;
}

describe("fetchServerSentEventsWithUIMessages", () => {
	let mockFetch: Mock<typeof fetch>;

	beforeEach(() => {
		mockFetch = vi.fn() as Mock<typeof fetch>;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("request construction", () => {
		test("sends POST request with correct Content-Type header", async () => {
			const response = createMockSSEResponse([]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			const messages: UIMessage[] = [
				{ id: "1", role: "user", parts: [{ type: "text", content: "Hello" }] },
			];

			// Consume the generator
			await collectAsyncIterable(adapter.connect(messages, {}, undefined));

			expect(mockFetch).toHaveBeenCalledWith(
				"/api/chat",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						"Content-Type": "application/json",
					}),
				}),
			);
		});

		test("includes both messages and uiMessages in request body", async () => {
			const response = createMockSSEResponse([]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			const messages: UIMessage[] = [
				{
					id: "1",
					role: "user",
					parts: [{ type: "text", content: "Hello" }],
				},
			];

			await collectAsyncIterable(adapter.connect(messages, {}, undefined));

			const requestBody = getRequestBody(mockFetch);

			// Should have both messages (ModelMessages) and uiMessages
			expect(requestBody).toHaveProperty("messages");
			expect(requestBody).toHaveProperty("uiMessages");
			expect(requestBody.uiMessages).toEqual(messages);
		});

		test("includes custom data in request body", async () => {
			const response = createMockSSEResponse([]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			const customData = { conversationId: "conv-123", model: "gpt-4" };

			await collectAsyncIterable(
				adapter.connect([], customData, undefined),
			);

			const requestBody = getRequestBody(mockFetch);

			expect(requestBody.data).toEqual(customData);
		});

		test("merges custom headers from options", async () => {
			const response = createMockSSEResponse([]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
				headers: {
					Authorization: "Bearer token123",
					"X-Custom-Header": "custom-value",
				},
			});

			await collectAsyncIterable(adapter.connect([], {}, undefined));

			expect(mockFetch).toHaveBeenCalledWith(
				"/api/chat",
				expect.objectContaining({
					headers: expect.objectContaining({
						"Content-Type": "application/json",
						Authorization: "Bearer token123",
						"X-Custom-Header": "custom-value",
					}),
				}),
			);
		});

		test("merges Headers object from options", async () => {
			const response = createMockSSEResponse([]);
			mockFetch.mockResolvedValue(response);

			const customHeaders = new Headers();
			customHeaders.set("Authorization", "Bearer token456");

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
				headers: customHeaders,
			});

			await collectAsyncIterable(adapter.connect([], {}, undefined));

			expect(mockFetch).toHaveBeenCalledWith(
				"/api/chat",
				expect.objectContaining({
					headers: expect.objectContaining({
						"Content-Type": "application/json",
						// Headers API normalizes header names to lowercase
						authorization: "Bearer token456",
					}),
				}),
			);
		});

		test("merges custom body properties from options", async () => {
			const response = createMockSSEResponse([]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
				body: { customProp: "customValue", model: "gpt-4" },
			});

			await collectAsyncIterable(adapter.connect([], {}, undefined));

			const requestBody = getRequestBody(mockFetch);

			expect(requestBody.customProp).toBe("customValue");
			expect(requestBody.model).toBe("gpt-4");
		});

		test("uses same-origin credentials by default", async () => {
			const response = createMockSSEResponse([]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			await collectAsyncIterable(adapter.connect([], {}, undefined));

			expect(mockFetch).toHaveBeenCalledWith(
				"/api/chat",
				expect.objectContaining({
					credentials: "same-origin",
				}),
			);
		});

		test("uses custom credentials when provided", async () => {
			const response = createMockSSEResponse([]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
				credentials: "include",
			});

			await collectAsyncIterable(adapter.connect([], {}, undefined));

			expect(mockFetch).toHaveBeenCalledWith(
				"/api/chat",
				expect.objectContaining({
					credentials: "include",
				}),
			);
		});

		test("passes abort signal to fetch", async () => {
			const response = createMockSSEResponse([]);
			mockFetch.mockResolvedValue(response);

			const abortController = new AbortController();

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			await collectAsyncIterable(
				adapter.connect([], {}, abortController.signal),
			);

			expect(mockFetch).toHaveBeenCalledWith(
				"/api/chat",
				expect.objectContaining({
					signal: abortController.signal,
				}),
			);
		});
	});

	describe("URL resolution", () => {
		test("uses string URL directly", async () => {
			const response = createMockSSEResponse([]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages(
				"/api/v2/chat",
				{ fetchClient: mockFetch },
			);

			await collectAsyncIterable(adapter.connect([], {}, undefined));

			expect(mockFetch).toHaveBeenCalledWith("/api/v2/chat", expect.anything());
		});

		test("resolves URL from function", async () => {
			const response = createMockSSEResponse([]);
			mockFetch.mockResolvedValue(response);

			const urlFn = () => "/api/dynamic/chat";

			const adapter = fetchServerSentEventsWithUIMessages(urlFn, {
				fetchClient: mockFetch,
			});

			await collectAsyncIterable(adapter.connect([], {}, undefined));

			expect(mockFetch).toHaveBeenCalledWith(
				"/api/dynamic/chat",
				expect.anything(),
			);
		});
	});

	describe("options resolution", () => {
		test("resolves options from function", async () => {
			const response = createMockSSEResponse([]);
			mockFetch.mockResolvedValue(response);

			const optionsFn = () => ({
				fetchClient: mockFetch,
				headers: { "X-Dynamic": "true" },
			});

			const adapter = fetchServerSentEventsWithUIMessages(
				"/api/chat",
				optionsFn,
			);

			await collectAsyncIterable(adapter.connect([], {}, undefined));

			expect(mockFetch).toHaveBeenCalledWith(
				"/api/chat",
				expect.objectContaining({
					headers: expect.objectContaining({
						"X-Dynamic": "true",
					}),
				}),
			);
		});

		test("resolves options from async function", async () => {
			const response = createMockSSEResponse([]);
			mockFetch.mockResolvedValue(response);

			const asyncOptionsFn = async () => {
				await Promise.resolve(); // Simulate async operation
				return {
					fetchClient: mockFetch,
					headers: { "X-Async": "true" },
				};
			};

			const adapter = fetchServerSentEventsWithUIMessages(
				"/api/chat",
				asyncOptionsFn,
			);

			await collectAsyncIterable(adapter.connect([], {}, undefined));

			expect(mockFetch).toHaveBeenCalledWith(
				"/api/chat",
				expect.objectContaining({
					headers: expect.objectContaining({
						"X-Async": "true",
					}),
				}),
			);
		});
	});

	describe("SSE stream parsing", () => {
		test("parses single SSE chunk", async () => {
			const chunk = { type: "text", content: "Hello" };
			const response = createMockSSEResponse([
				`data: ${JSON.stringify(chunk)}\n`,
			]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			const results = await collectAsyncIterable(
				adapter.connect([], {}, undefined),
			);

			expect(results).toHaveLength(1);
			expect(results[0]).toEqual(chunk);
		});

		test("parses multiple SSE chunks", async () => {
			const chunk1 = { type: "text", content: "Hello" };
			const chunk2 = { type: "text", content: " World" };
			const response = createMockSSEResponse([
				`data: ${JSON.stringify(chunk1)}\ndata: ${JSON.stringify(chunk2)}\n`,
			]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			const results = await collectAsyncIterable(
				adapter.connect([], {}, undefined),
			);

			expect(results).toHaveLength(2);
			expect(results[0]).toEqual(chunk1);
			expect(results[1]).toEqual(chunk2);
		});

		test("handles chunks split across multiple reads", async () => {
			const chunk = { type: "text", content: "Complete message" };
			const fullData = `data: ${JSON.stringify(chunk)}\n`;
			// Split the data in the middle
			const part1 = fullData.substring(0, 10);
			const part2 = fullData.substring(10);

			const response = createMockSSEResponse([part1, part2]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			const results = await collectAsyncIterable(
				adapter.connect([], {}, undefined),
			);

			expect(results).toHaveLength(1);
			expect(results[0]).toEqual(chunk);
		});

		test("ignores [DONE] marker", async () => {
			const chunk = { type: "text", content: "Hello" };
			const response = createMockSSEResponse([
				`data: ${JSON.stringify(chunk)}\ndata: [DONE]\n`,
			]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			const results = await collectAsyncIterable(
				adapter.connect([], {}, undefined),
			);

			expect(results).toHaveLength(1);
			expect(results[0]).toEqual(chunk);
		});

		test("handles lines without data: prefix", async () => {
			const chunk = { type: "text", content: "Hello" };
			// Some SSE implementations might send raw JSON without "data: " prefix
			const response = createMockSSEResponse([
				`${JSON.stringify(chunk)}\n`,
			]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			const results = await collectAsyncIterable(
				adapter.connect([], {}, undefined),
			);

			expect(results).toHaveLength(1);
			expect(results[0]).toEqual(chunk);
		});

		test("skips empty lines", async () => {
			const chunk = { type: "text", content: "Hello" };
			const response = createMockSSEResponse([
				`\n\ndata: ${JSON.stringify(chunk)}\n\n\n`,
			]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			const results = await collectAsyncIterable(
				adapter.connect([], {}, undefined),
			);

			expect(results).toHaveLength(1);
			expect(results[0]).toEqual(chunk);
		});

		test("handles remaining buffer data after stream ends", async () => {
			const chunk = { type: "text", content: "Final" };
			// Data without trailing newline
			const response = createMockSSEResponse([
				`data: ${JSON.stringify(chunk)}`,
			]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			const results = await collectAsyncIterable(
				adapter.connect([], {}, undefined),
			);

			expect(results).toHaveLength(1);
			expect(results[0]).toEqual(chunk);
		});
	});

	describe("error handling", () => {
		test("throws error for non-OK response", async () => {
			const response = createMockSSEResponse([], {
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
			});
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			await expect(
				collectAsyncIterable(adapter.connect([], {}, undefined)),
			).rejects.toThrow("HTTP error! status: 500 Internal Server Error");
		});

		test("throws error for 404 response", async () => {
			const response = createMockSSEResponse([], {
				ok: false,
				status: 404,
				statusText: "Not Found",
			});
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			await expect(
				collectAsyncIterable(adapter.connect([], {}, undefined)),
			).rejects.toThrow("HTTP error! status: 404 Not Found");
		});

		test("throws error when response body is null", async () => {
			const response = {
				ok: true,
				status: 200,
				statusText: "OK",
				body: null,
				headers: new Headers(),
			} as Response;
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			await expect(
				collectAsyncIterable(adapter.connect([], {}, undefined)),
			).rejects.toThrow("Response body is not readable");
		});

		test("skips malformed JSON chunks and logs warning", async () => {
			const validChunk = { type: "text", content: "Valid" };
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const response = createMockSSEResponse([
				`data: not-valid-json\ndata: ${JSON.stringify(validChunk)}\n`,
			]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			const results = await collectAsyncIterable(
				adapter.connect([], {}, undefined),
			);

			expect(results).toHaveLength(1);
			expect(results[0]).toEqual(validChunk);
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				"Failed to parse SSE chunk:",
				"not-valid-json",
			);

			consoleWarnSpy.mockRestore();
		});
	});

	describe("abort handling", () => {
		test("stops processing when abort signal is triggered", async () => {
			const abortController = new AbortController();
			let readCount = 0;

			// Create a stream that tracks read calls
			const stream = new ReadableStream<Uint8Array>({
				async pull(controller) {
					readCount++;
					if (readCount === 1) {
						// First read returns data
						const encoder = new TextEncoder();
						controller.enqueue(
							encoder.encode('data: {"type":"text","content":"1"}\n'),
						);
					} else {
						// Simulate abort before second read
						abortController.abort();
						// Wait a bit to let abort propagate
						await new Promise((resolve) => setTimeout(resolve, 10));
						controller.enqueue(
							new TextEncoder().encode(
								'data: {"type":"text","content":"2"}\n',
							),
						);
					}
				},
			});

			const response = {
				ok: true,
				status: 200,
				statusText: "OK",
				body: stream,
				headers: new Headers(),
			} as Response;

			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			const results = await collectAsyncIterable(
				adapter.connect([], {}, abortController.signal),
			);

			// Should have received at least the first chunk
			expect(results.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("message conversion", () => {
		test("converts UIMessages to ModelMessages for the messages field", async () => {
			const response = createMockSSEResponse([]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			const uiMessages: UIMessage[] = [
				{
					id: "msg-1",
					role: "user",
					parts: [{ type: "text", content: "Hello, AI!" }],
				},
				{
					id: "msg-2",
					role: "assistant",
					parts: [{ type: "text", content: "Hello! How can I help?" }],
				},
			];

			await collectAsyncIterable(adapter.connect(uiMessages, {}, undefined));

			const requestBody = getRequestBody(mockFetch);

			// messages should be ModelMessages (converted)
			expect(requestBody.messages).toBeDefined();
			expect(Array.isArray(requestBody.messages)).toBe(true);

			// uiMessages should preserve the original UIMessages
			expect(requestBody.uiMessages).toEqual(uiMessages);
		});

		test("preserves tool call parts in uiMessages", async () => {
			const response = createMockSSEResponse([]);
			mockFetch.mockResolvedValue(response);

			const adapter = fetchServerSentEventsWithUIMessages("/api/chat", {
				fetchClient: mockFetch,
			});

			const uiMessages: UIMessage[] = [
				{
					id: "msg-1",
					role: "assistant",
					parts: [
						{ type: "text", content: "Let me run that for you." },
						{
							type: "tool-call",
							id: "tc-1",
							name: "bash",
							arguments: '{"command":"ls"}',
							state: "input-complete" as const,
						},
					],
				},
			];

			await collectAsyncIterable(adapter.connect(uiMessages, {}, undefined));

			const requestBody = getRequestBody(mockFetch);

			// uiMessages should preserve tool call parts
			const uiMessagesResult = requestBody.uiMessages as Array<{ parts: unknown[] }>;
			expect(uiMessagesResult[0].parts).toHaveLength(2);
			expect(uiMessagesResult[0].parts[1]).toMatchObject({
				type: "tool-call",
				id: "tc-1",
				name: "bash",
			});
		});
	});
});
