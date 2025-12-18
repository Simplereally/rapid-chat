import { useCallback, useEffect, useRef } from "react";

/**
 * Message types for cross-tab chat synchronization
 */
export type BroadcastMessageType =
	| "user-message"
	| "streaming-start"
	| "streaming-chunk"
	| "streaming-complete"
	| "loading-change"
	| "messages-sync";

export interface BroadcastMessage<T = unknown> {
	type: BroadcastMessageType;
	threadId: string;
	senderId: string;
	payload: T;
	timestamp: number;
}

export interface UserMessagePayload {
	messageId: string;
	content: string;
}

export interface StreamingChunkPayload {
	messageId: string;
	content: string;
	/** Full accumulated content up to this point */
	fullContent: string;
}

export interface StreamingCompletePayload {
	messageId: string;
	finalContent: string;
}

export interface LoadingChangePayload {
	isLoading: boolean;
}

export interface MessagesSyncPayload {
	messages: Array<{
		id: string;
		role: "user" | "assistant";
		content: string;
	}>;
}

interface UseBroadcastChannelOptions {
	threadId: string;
	onMessage: (message: BroadcastMessage) => void;
	enabled?: boolean;
}

/**
 * Hook for cross-tab communication via BroadcastChannel API.
 *
 * Creates a unique sender ID to prevent echo (receiving own messages).
 * Automatically cleans up on unmount or thread change.
 */
export function useBroadcastChannel({
	threadId,
	onMessage,
	enabled = true,
}: UseBroadcastChannelOptions) {
	// Unique ID for this tab instance - stable across re-renders
	const senderIdRef = useRef<string>(
		`tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
	);

	const channelRef = useRef<BroadcastChannel | null>(null);
	const onMessageRef = useRef(onMessage);
	onMessageRef.current = onMessage;

	// Initialize channel
	useEffect(() => {
		if (!enabled) return;

		const channelName = `chat-thread:${threadId}`;
		const channel = new BroadcastChannel(channelName);
		channelRef.current = channel;

		const handleMessage = (event: MessageEvent<BroadcastMessage>) => {
			const message = event.data;
			// Ignore own messages
			if (message.senderId === senderIdRef.current) return;
			// Ignore messages for different threads (shouldn't happen, but safety check)
			if (message.threadId !== threadId) return;

			onMessageRef.current(message);
		};

		channel.addEventListener("message", handleMessage);

		return () => {
			channel.removeEventListener("message", handleMessage);
			channel.close();
			channelRef.current = null;
		};
	}, [threadId, enabled]);

	/**
	 * Broadcast a message to all other tabs viewing this thread
	 */
	const broadcast = useCallback(
		<T>(type: BroadcastMessageType, payload: T) => {
			if (!channelRef.current) return;

			const message: BroadcastMessage<T> = {
				type,
				threadId,
				senderId: senderIdRef.current,
				payload,
				timestamp: Date.now(),
			};

			channelRef.current.postMessage(message);
		},
		[threadId],
	);

	return {
		broadcast,
		senderId: senderIdRef.current,
	};
}
