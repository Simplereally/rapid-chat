/**
 * Custom connection adapter that sends UIMessages to the server.
 *
 * The standard fetchServerSentEvents adapter converts UIMessages to ModelMessages,
 * which loses the `.parts` property containing approval state (part.approval.approved).
 *
 * This adapter sends BOTH:
 * - `messages`: ModelMessages for the LLM
 * - `uiMessages`: Original UIMessages with .parts for approval state
 *
 * The server's chat() function can then extract approval state from uiMessages.
 */

import type { StreamChunk } from "@tanstack/ai";
import { convertMessagesToModelMessages } from "@tanstack/ai";
import type {
	ConnectionAdapter,
	FetchConnectionOptions,
} from "@tanstack/ai-client";

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

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		while (true) {
			// Check if aborted before reading
			if (abortSignal?.aborted) {
				break;
			}

			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");

			// Keep the last incomplete line in the buffer
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (line.trim()) {
					yield line;
				}
			}
		}

		// Process any remaining data in the buffer
		if (buffer.trim()) {
			yield buffer;
		}
	} finally {
		reader.releaseLock();
	}
}

/**
 * Create a Server-Sent Events connection adapter that includes UIMessages.
 *
 * Unlike the standard fetchServerSentEvents, this adapter sends:
 * - `messages`: ModelMessages for the LLM (standard format)
 * - `uiMessages`: Original UIMessages with .parts containing approval state
 *
 * This allows the server to extract tool approval states from uiMessages.parts.
 *
 * @param url - The API endpoint URL (or a function that returns the URL)
 * @param options - Fetch options (headers, credentials, body, etc.)
 * @returns A connection adapter for SSE streams with UIMessage support
 *
 * @example
 * ```typescript
 * const connection = fetchServerSentEventsWithUIMessages('/api/chat', {
 *   headers: { 'Authorization': 'Bearer token' }
 * });
 *
 * const client = new ChatClient({ connection });
 * ```
 */
export function fetchServerSentEventsWithUIMessages(
	url: string | (() => string),
	options:
		| FetchConnectionOptions
		| (() => FetchConnectionOptions | Promise<FetchConnectionOptions>) = {},
): ConnectionAdapter {
	return {
		async *connect(messages, data, abortSignal) {
			// Resolve URL and options if they are functions
			const resolvedUrl = typeof url === "function" ? url() : url;
			const resolvedOptions =
				typeof options === "function" ? await options() : options;

			// Convert to ModelMessages for LLM consumption
			const modelMessages = convertMessagesToModelMessages(messages);

			const requestHeaders: Record<string, string> = {
				"Content-Type": "application/json",
				...mergeHeaders(resolvedOptions.headers),
			};

			// Include BOTH modelMessages AND uiMessages in the request body
			// - messages: ModelMessages for the LLM (standard format expected by chat())
			// - uiMessages: Original UIMessages with .parts for approval state extraction
			const requestBody = {
				messages: modelMessages,
				uiMessages: messages, // Keep original UIMessages with .parts
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

			// Parse Server-Sent Events format
			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error("Response body is not readable");
			}

			for await (const line of readStreamLines(reader, abortSignal)) {
				// Handle Server-Sent Events format
				const eventData = line.startsWith("data: ") ? line.slice(6) : line;

				if (eventData === "[DONE]") continue;

				try {
					const parsed: StreamChunk = JSON.parse(eventData);
					yield parsed;
				} catch (parseError) {
					// Skip non-JSON lines or malformed chunks
					console.warn("Failed to parse SSE chunk:", eventData);
				}
			}
		},
	};
}
