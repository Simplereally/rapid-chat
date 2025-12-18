import { useAuth } from "@clerk/tanstack-react-start";
import type { UIMessage } from "@tanstack/ai-react";
import {
	fetchServerSentEvents,
	useChat as useTanStackChat,
} from "@tanstack/ai-react";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type {
	BroadcastMessageType,
	LoadingChangePayload,
	StreamingChunkPayload,
	StreamingCompletePayload,
	UserMessagePayload,
} from "./use-broadcast-channel";
import { useBroadcastChannel } from "./use-broadcast-channel";

interface UseChatProps {
	threadId: string;
}

interface UseChatReturn {
	messages: UIMessage[];
	isLoading: boolean;
	stop: () => void;
	append: (
		message: { role: "user"; content: string } | UIMessage,
	) => Promise<void>;
	setMessages: (messages: UIMessage[]) => void;
	isTokenLoaded: boolean;
}

/**
 * Enhanced chat hook with cross-tab synchronization via BroadcastChannel.
 *
 * Primary tab broadcasts streaming chunks, follower tabs receive and display in real-time.
 */
export function useChat({ threadId }: UseChatProps): UseChatReturn {
	const auth = useAuth();
	const { isLoaded: isTokenLoaded } = auth;

	// Convex mutation for persisting assistant messages
	const addMessage = useMutation(api.messages.add);

	// Remote streaming state for follower tabs
	const [remoteStreamingMessage, setRemoteStreamingMessage] =
		useState<UIMessage | null>(null);

	// Track if we're the primary tab (the one that initiated the request)
	const isPrimaryTabRef = useRef(false);

	// Ref to hold broadcast function for callbacks
	const broadcastRef = useRef<
		(<T>(type: BroadcastMessageType, payload: T) => void) | null
	>(null);

	// Ref to store received messages that need to be processed
	const pendingMessagesRef = useRef<UIMessage[]>([]);
	const shouldSetMessagesRef = useRef(false);

	// Clear pending messages when thread changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: threadId change should trigger cleanup
	useEffect(() => {
		pendingMessagesRef.current = [];
		shouldSetMessagesRef.current = false;
		setRemoteStreamingMessage(null);
		isPrimaryTabRef.current = false;
	}, [threadId]);

	// Memoize connection to avoid recreating on every render
	const connection = useMemo(
		() =>
			fetchServerSentEvents(`/api/chat?threadId=${threadId}`, async () => {
				const token = await auth.getToken({ template: "convex" });
				return {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				};
			}),
		[threadId, auth],
	);

	// TanStack AI chat instance
	const tanstackChat = useTanStackChat({
		connection,
		onChunk: (chunk) => {
			// Primary tab broadcasts each streaming chunk
			if (
				isPrimaryTabRef.current &&
				chunk.type === "content" &&
				broadcastRef.current
			) {
				broadcastRef.current("streaming-chunk", {
					messageId: "streaming", // Will be replaced with actual ID on finish
					content: chunk.delta,
					fullContent: chunk.content, // Full accumulated content
				});
			}
		},
		onFinish: (message) => {
			// Primary tab broadcasts completion
			if (
				isPrimaryTabRef.current &&
				message.role === "assistant" &&
				broadcastRef.current
			) {
				const content = message.parts
					.filter((part) => part.type === "text" || part.type === "thinking")
					.map((part) => part.content)
					.join("");

				broadcastRef.current("streaming-complete", {
					messageId: message.id,
					finalContent: content,
				});

				// Persist to Convex
				addMessage({
					threadId: threadId as Id<"threads">,
					role: "assistant",
					content,
				}).catch((err) => {
					console.error("Failed to persist assistant message:", err);
				});
			}
			isPrimaryTabRef.current = false;
		},
	});

	// BroadcastChannel for cross-tab sync
	const { broadcast } = useBroadcastChannel({
		threadId,
		onMessage: (message) => {
			switch (message.type) {
				case "user-message": {
					const payload = message.payload as UserMessagePayload;
					// Follower tab receives user message from primary tab
					const userMessage: UIMessage = {
						id: payload.messageId,
						role: "user" as const,
						parts: [{ type: "text" as const, content: payload.content }],
					};
					pendingMessagesRef.current.push(userMessage);
					shouldSetMessagesRef.current = true;
					break;
				}

				case "streaming-chunk": {
					const payload = message.payload as StreamingChunkPayload;
					// Follower tab updates streaming message in real-time
					// Use fullContent from broadcast so refreshed tabs see full history
					setRemoteStreamingMessage({
						id: "streaming",
						role: "assistant" as const,
						parts: [{ type: "text" as const, content: payload.fullContent }],
					});
					break;
				}

				case "streaming-complete": {
					const payload = message.payload as StreamingCompletePayload;
					// Follower tab replaces streaming message with final one
					setRemoteStreamingMessage(null);
					const assistantMessage: UIMessage = {
						id: payload.messageId,
						role: "assistant" as const,
						parts: [{ type: "text" as const, content: payload.finalContent }],
					};
					pendingMessagesRef.current.push(assistantMessage);
					shouldSetMessagesRef.current = true;
					break;
				}

				case "loading-change": {
					const payload = message.payload as LoadingChangePayload;
					// Sync loading state (though TanStack AI manages this internally)
					if (!payload.isLoading) {
						setRemoteStreamingMessage(null);
					}
					break;
				}
			}
		},
	});

	// Store broadcast function in ref for use in callbacks
	broadcastRef.current = broadcast;

	// Process pending messages from broadcast channel
	useEffect(() => {
		if (shouldSetMessagesRef.current && pendingMessagesRef.current.length > 0) {
			const messagesToAdd = [...pendingMessagesRef.current];
			pendingMessagesRef.current = [];
			shouldSetMessagesRef.current = false;

			// Add to current messages
			const updatedMessages = [...tanstackChat.messages, ...messagesToAdd];
			tanstackChat.setMessages(updatedMessages);
		}
	});

	// Enhanced append that broadcasts to other tabs
	const enhancedAppend = useCallback(
		async (message: { role: "user"; content: string } | UIMessage) => {
			isPrimaryTabRef.current = true;

			const content =
				"content" in message
					? message.content
					: message.parts.find((p) => p.type === "text")?.content || "";

			// Broadcast user message to follower tabs
			broadcast("user-message", {
				messageId: "id" in message ? message.id : `msg-${Date.now()}`,
				content,
			});

			// Broadcast loading state
			broadcast("loading-change", { isLoading: true });

			// Call TanStack AI's append
			await tanstackChat.append(message);
		},
		[tanstackChat, broadcast],
	);

	// Merge remote streaming message with regular messages for rendering
	const mergedMessages = useMemo(() => {
		if (remoteStreamingMessage) {
			return [...tanstackChat.messages, remoteStreamingMessage];
		}
		return tanstackChat.messages;
	}, [tanstackChat.messages, remoteStreamingMessage]);

	return {
		messages: mergedMessages,
		isLoading: tanstackChat.isLoading,
		stop: tanstackChat.stop,
		append: enhancedAppend,
		setMessages: tanstackChat.setMessages,
		isTokenLoaded,
	};
}
