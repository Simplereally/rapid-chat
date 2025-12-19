/**
 * Custom Connection Adapter for Tool Approval Flow
 *
 * This adapter wraps fetchServerSentEvents to include the full UIMessages
 * (with parts including approval state) in the request body, enabling
 * server-side tool approval handling.
 *
 * The TanStack AI server's collectClientState() expects messages with 'parts'
 * to extract approval responses, but the default adapter only sends ModelMessages.
 */

import type { ConnectionAdapter } from "@tanstack/ai-client";
import type { StreamChunk } from "@tanstack/ai";

/**
 * Merge custom headers into request headers
 */
function mergeHeaders(
	customHeaders?: Record<string, string> | Headers,
): Record<string, string> {
	if (!customHeaders) {
		return {};
	}
	if (customHeaders instanceof Headers) {
		const result: Record<string, string> = {};
		customHeaders.forEach((value, key) => {
			result[key] = value;
		});
		return result;
	}
	return customHeaders;
}

/**
 * Read lines from a stream (newline-delimited)
 */
async function* readStreamLines(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	abortSignal?: AbortSignal,
): AsyncGenerator<string> {
	try {
		const decoder = new TextDecoder();
		let buffer = "";

		while (true) {
			if (abortSignal?.aborted) {
				break;
			}

			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (line.trim()) {
					yield line;
				}
			}
		}

		if (buffer.trim()) {
			yield buffer;
		}
	} finally {
		reader.releaseLock();
	}
}

export interface FetchConnectionOptions {
	headers?: Record<string, string> | Headers;
	credentials?: RequestCredentials;
	signal?: AbortSignal;
	body?: Record<string, unknown>;
	fetchClient?: typeof globalThis.fetch;
}

/**
 * Create a custom SSE connection adapter that preserves UIMessages
 * for server-side tool approval handling.
 *
 * Unlike the standard fetchServerSentEvents, this adapter sends the
 * raw messages (including UIMessage parts) to the server, allowing
 * the server to extract approval state from message parts.
 *
 * @param url - The API endpoint URL (or a function that returns the URL)
 * @param options - Fetch options (headers, credentials, body, etc.)
 * @returns A connection adapter for SSE streams
 */
export function fetchServerSentEventsWithParts(
	url: string | (() => string),
	options:
		| FetchConnectionOptions
		| (() => FetchConnectionOptions | Promise<FetchConnectionOptions>) = {},
): ConnectionAdapter {
	return {
		async *connect(messages, data, abortSignal) {
			const resolvedUrl = typeof url === "function" ? url() : url;
			const resolvedOptions =
				typeof options === "function" ? await options() : options;

			const requestHeaders: Record<string, string> = {
				"Content-Type": "application/json",
				...mergeHeaders(resolvedOptions.headers),
			};

			// The key difference: we send the original messages with parts intact
			// This allows the server to extract approval state from UIMessage.parts
			const requestBody = {
				messages: messages, // Keep original format (UIMessages with parts)
				data,
				...resolvedOptions.body,
			};

			const fetchClient = resolvedOptions.fetchClient ?? fetch;
			const response = await fetchClient(resolvedUrl, {
				method: "POST",
				headers: requestHeaders,
				body: JSON.stringify(requestBody),
				credentials: resolvedOptions.credentials || "same-origin",
				signal: abortSignal || resolvedOptions.signal,
			});

			if (!response.ok) {
				throw new Error(
					`HTTP error! status: ${response.status} ${response.statusText}`,
				);
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error("Response body is not readable");
			}

			for await (const line of readStreamLines(reader, abortSignal)) {
				const lineData = line.startsWith("data: ") ? line.slice(6) : line;
				if (lineData === "[DONE]") continue;

				try {
					const parsed: StreamChunk = JSON.parse(lineData);
					yield parsed;
				} catch (parseError) {
					console.warn("Failed to parse SSE chunk:", lineData);
				}
			}
		},
	};
}
