/**
 * Cross-tab synchronization for streaming chat messages using BroadcastChannel.
 * This enables real-time streaming to appear in all open tabs for the same conversation.
 */

import type { UIMessage } from "@tanstack/ai-react";
import type { ThreadStreamingStatus } from "./chat-client-store";

// Message types for cross-tab communication
interface StreamingUpdate {
	type: "streaming-update";
	threadId: string;
	messages: UIMessage[];
	isLoading: boolean;
	streamingStatus: ThreadStreamingStatus | undefined;
}

interface StreamingComplete {
	type: "streaming-complete";
	threadId: string;
}

type CrossTabMessage = StreamingUpdate | StreamingComplete;

// Serializable version of the message for BroadcastChannel
interface SerializedUIMessage {
	id: string;
	role: "user" | "assistant";
	parts: Array<{ type: string; content?: string; [key: string]: unknown }>;
	createdAt?: string;
}

const CHANNEL_NAME = "rapid-chat-streaming";

let channel: BroadcastChannel | null = null;
let messageHandler: ((event: MessageEvent<CrossTabMessage>) => void) | null =
	null;

/**
 * Initialize the BroadcastChannel for cross-tab streaming sync.
 * Call this once when the app starts.
 */
export function initCrossTabSync(
	onStreamingUpdate: (
		threadId: string,
		messages: UIMessage[],
		isLoading: boolean,
		streamingStatus: ThreadStreamingStatus | undefined,
	) => void,
	onStreamingComplete: (threadId: string) => void,
): void {
	// Clean up existing channel if any
	cleanupCrossTabSync();

	// Check if BroadcastChannel is supported
	if (typeof BroadcastChannel === "undefined") {
		console.warn("BroadcastChannel not supported - cross-tab sync disabled");
		return;
	}

	channel = new BroadcastChannel(CHANNEL_NAME);

	messageHandler = (event: MessageEvent<CrossTabMessage>) => {
		const message = event.data;

		if (message.type === "streaming-update") {
			// Deserialize dates in messages
			const messages = deserializeMessages(
				message.messages as unknown as SerializedUIMessage[],
			);
			onStreamingUpdate(
				message.threadId,
				messages,
				message.isLoading,
				message.streamingStatus,
			);
		} else if (message.type === "streaming-complete") {
			onStreamingComplete(message.threadId);
		}
	};

	channel.addEventListener("message", messageHandler);
}

/**
 * Broadcast streaming update to other tabs
 */
export function broadcastStreamingUpdate(
	threadId: string,
	messages: UIMessage[],
	isLoading: boolean,
	streamingStatus: ThreadStreamingStatus | undefined,
): void {
	if (!channel) return;

	// Serialize dates in messages for transmission
	const serializedMessages = serializeMessages(messages);

	const message: StreamingUpdate = {
		type: "streaming-update",
		threadId,
		messages: serializedMessages as unknown as UIMessage[],
		isLoading,
		streamingStatus,
	};

	channel.postMessage(message);
}

/**
 * Broadcast streaming completion to other tabs
 */
export function broadcastStreamingComplete(threadId: string): void {
	if (!channel) return;

	const message: StreamingComplete = {
		type: "streaming-complete",
		threadId,
	};

	channel.postMessage(message);
}

/**
 * Clean up BroadcastChannel when app unmounts
 */
export function cleanupCrossTabSync(): void {
	if (channel && messageHandler) {
		channel.removeEventListener("message", messageHandler);
	}
	if (channel) {
		channel.close();
		channel = null;
	}
	messageHandler = null;
}

// Helper functions for serialization using JSON for reliable cross-tab transmission
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeMessages(messages: UIMessage[]): any[] {
	return JSON.parse(JSON.stringify(messages));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserializeMessages(messages: any[]): UIMessage[] {
	return messages.map((msg) => ({
		...msg,
		role: msg.role as "user" | "assistant",
		createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
	})) as UIMessage[];
}
