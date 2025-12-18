import { useAuth } from "@clerk/tanstack-react-start";
import type { StreamChunk } from "@tanstack/ai";
import {
	fetchServerSentEvents,
	type UIMessage,
	useChat as useTanStackChat,
} from "@tanstack/ai-react";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import type { ChatUiMessage } from "../types";
import {
	type BroadcastMessage,
	type LoadingChangePayload,
	type StreamingChunkPayload,
	type StreamingCompletePayload,
	useBroadcastChannel,
	type UserMessagePayload,
} from "./use-broadcast-channel";

/**
 * Convert stored Convex messages to UIMessage format for TanStack AI
 */
function storedMessagesToUIMessages(
	storedMessages: Doc<"messages">[],
): UIMessage[] {
	return storedMessages
		.filter(
			(msg): msg is Doc<"messages"> & { role: "user" | "assistant" } =>
				msg.role === "user" || msg.role === "assistant",
		)
		.map((msg) => ({
			id: msg._id,
			role: msg.role,
			parts: [{ type: "text" as const, content: msg.content }],
		}));
}

/**
 * Extract text content from UIMessage parts
 */
function extractTextContent(message: UIMessage): string {
	return message.parts
		.filter(
			(part): part is { type: "text"; content: string } => part.type === "text",
		)
		.map((part) => part.content)
		.join("");
}

function isUserOrAssistantMessage(
	message: UIMessage,
): message is UIMessage & { role: "user" | "assistant" } {
	return message.role === "user" || message.role === "assistant";
}

interface UseChatProps {
	threadId: string;
}

/**
 * Chat hook with cross-tab synchronization via BroadcastChannel.
 *
 * Architecture:
 * 1. Load persisted messages from Convex (one-time hydration)
 * 2. TanStack AI manages streaming UI state for the primary tab
 * 3. BroadcastChannel syncs streaming chunks to other tabs in real-time
 * 4. On finish callback persists assistant response to Convex (fire-and-forget)
 *
 * Cross-tab sync flow:
 * - Tab A (sender): Broadcasts user message, streaming chunks, and completion
 * - Tab B (receiver): Listens for broadcasts and updates local UI state
 * - Both tabs receive Convex hydration on initial load
 */
export function useChat({ threadId }: UseChatProps) {
	const { getToken } = useAuth();
	const addMessage = useMutation(api.messages.add);

	// Load persisted messages from Convex (reactive - auto-updates)
	const storedMessages = useQuery(api.messages.list, {
		threadId: threadId as Id<"threads">,
	});

	// Track if this tab is the "primary" (the one making API calls)
	const isPrimaryTabRef = useRef(false);

	// Track current streaming assistant message for cross-tab sync
	const [remoteStreamingMessage, setRemoteStreamingMessage] = useState<{
		messageId: string;
		content: string;
	} | null>(null);
	const [isRemoteLoading, setIsRemoteLoading] = useState(false);

	// Error deduplication ref
	const lastPersistedErrorRef = useRef<{ content: string; at: number } | null>(
		null,
	);

	// Track accumulated content for streaming broadcasts
	const streamingContentRef = useRef<string>("");
	const streamingMessageIdRef = useRef<string | null>(null);

	// Refs for cross-tab handlers (populated after useTanStackChat)
	const messagesRef = useRef<UIMessage[]>([]);
	const setMessagesRef = useRef<(messages: UIMessage[]) => void>(() => {});

	/**
	 * Handle incoming broadcast messages from other tabs.
	 * Uses refs to access latest state without recreating the callback.
	 */
	const handleBroadcastMessage = useCallback(
		(message: BroadcastMessage) => {
			const currentMessages = messagesRef.current;
			const setMsgs = setMessagesRef.current;

			switch (message.type) {
				case "user-message": {
					const payload = message.payload as UserMessagePayload;
					// Don't add if already exists
					if (currentMessages.some((m) => m.id === payload.messageId)) return;
					// Add user message to local state
					const userMessage: UIMessage = {
						id: payload.messageId,
						role: "user",
						parts: [{ type: "text", content: payload.content }],
					};
					setMsgs([...currentMessages, userMessage]);
					setIsRemoteLoading(true);
					break;
				}
				case "streaming-chunk": {
					const payload = message.payload as StreamingChunkPayload;
					setRemoteStreamingMessage({
						messageId: payload.messageId,
						content: payload.fullContent,
					});
					break;
				}
				case "streaming-complete": {
					const payload = message.payload as StreamingCompletePayload;
					// Finalize the streaming message
					setRemoteStreamingMessage(null);
					setIsRemoteLoading(false);
					// Don't add if already exists
					if (currentMessages.some((m) => m.id === payload.messageId)) return;
					// Add the complete assistant message
					const assistantMessage: UIMessage = {
						id: payload.messageId,
						role: "assistant",
						parts: [{ type: "text", content: payload.finalContent }],
					};
					setMsgs([...currentMessages, assistantMessage]);
					break;
				}
				case "loading-change": {
					const payload = message.payload as LoadingChangePayload;
					setIsRemoteLoading(payload.isLoading);
					if (!payload.isLoading) {
						setRemoteStreamingMessage(null);
					}
					break;
				}
			}
		},
		[], // No dependencies - uses refs
	);

	// Setup BroadcastChannel for cross-tab sync
	const { broadcast } = useBroadcastChannel({
		threadId,
		onMessage: handleBroadcastMessage,
	});

	/**
	 * Fire-and-forget persistence for assistant messages.
	 * Also broadcasts completion to other tabs.
	 */
	const persistAssistantMessage = useCallback(
		(message: UIMessage): void => {
			const textContent = extractTextContent(message);
			if (!textContent.trim()) return;

			// Broadcast completion to other tabs
			broadcast<StreamingCompletePayload>("streaming-complete", {
				messageId: message.id,
				finalContent: textContent,
			});

			// Reset streaming refs
			streamingContentRef.current = "";
			streamingMessageIdRef.current = null;
			isPrimaryTabRef.current = false;

			// Fire-and-forget: don't await - Convex ensures reliable delivery
			addMessage({
				threadId: threadId as Id<"threads">,
				role: "assistant",
				content: textContent,
			}).catch((err) => {
				console.error("Failed to persist assistant message:", err);
			});
		},
		[addMessage, broadcast, threadId],
	);

	/**
	 * Fire-and-forget error persistence with deduplication.
	 */
	const persistError = useCallback(
		(err: unknown): void => {
			const rawMessage =
				err instanceof Error
					? err.message
					: typeof err === "string"
						? err
						: "Something went wrong while generating a response.";

			const content = rawMessage.trim() || "Something went wrong.";
			const dedupeKey = content.slice(0, 300);
			const now = Date.now();
			const last = lastPersistedErrorRef.current;

			// Dedupe rapid-fire errors (within 2s window)
			if (last && last.content === dedupeKey && now - last.at < 2000) {
				return;
			}
			lastPersistedErrorRef.current = { content: dedupeKey, at: now };

			// Broadcast loading change
			broadcast<LoadingChangePayload>("loading-change", { isLoading: false });

			// Fire-and-forget: Convex handles reliable persistence
			addMessage({
				threadId: threadId as Id<"threads">,
				role: "error",
				content,
			}).catch((persistErr) => {
				console.error("Failed to persist chat error:", persistErr);
			});
		},
		[addMessage, broadcast, threadId],
	);

	/**
	 * Handle streaming chunks - broadcast to other tabs
	 */
	const handleChunk = useCallback(
		(chunk: StreamChunk): void => {
			// Extract text content from chunk (type is 'content', not 'text')
			if (chunk.type === "content") {
				// Use delta if available, otherwise use content
				const textDelta = chunk.delta || chunk.content || "";
				streamingContentRef.current += textDelta;

				// Broadcast chunk to other tabs
				if (streamingMessageIdRef.current) {
					broadcast<StreamingChunkPayload>("streaming-chunk", {
						messageId: streamingMessageIdRef.current,
						content: textDelta,
						fullContent: streamingContentRef.current,
					});
				}
			}
		},
		[broadcast],
	);

	/**
	 * Handle response start - mark this tab as primary and setup streaming
	 */
	const handleResponse = useCallback(() => {
		isPrimaryTabRef.current = true;
		streamingContentRef.current = "";
		// Generate a temporary ID for the streaming message
		streamingMessageIdRef.current = `streaming-${Date.now()}`;

		// Broadcast loading state to other tabs
		broadcast<LoadingChangePayload>("loading-change", { isLoading: true });
	}, [broadcast]);

	// TanStack AI useChat with cross-tab sync callbacks
	const { messages, isLoading, stop, setMessages, append, error, sendMessage } =
		useTanStackChat({
			id: `thread:${threadId}`,
			connection: fetchServerSentEvents(
				() => `/api/chat?threadId=${threadId}`,
				async () => {
					const token = await getToken({ template: "convex" });
					if (!token) {
						throw new Error("No authentication token available");
					}
					return {
						headers: { Authorization: `Bearer ${token}` },
					};
				},
			),
			onResponse: handleResponse,
			onChunk: handleChunk,
			onFinish: persistAssistantMessage,
			onError: persistError,
		});

	// Keep refs in sync with latest state
	messagesRef.current = messages;
	setMessagesRef.current = setMessages;

	/**
	 * Wrapped append that broadcasts user message to other tabs
	 */
	const appendWithBroadcast = useCallback(
		async (message: Parameters<typeof append>[0]) => {
			// Mark as primary before sending
			isPrimaryTabRef.current = true;

			// Broadcast user message to other tabs
			const normalizedMessage =
				"parts" in message
					? message
					: {
							id: `user-${Date.now()}`,
							role: "user" as const,
							parts: [{ type: "text" as const, content: String(message) }],
						};

			const textContent =
				"parts" in normalizedMessage
					? normalizedMessage.parts
							.filter(
								(p): p is { type: "text"; content: string } =>
									p.type === "text",
							)
							.map((p) => p.content)
							.join("")
					: String(message);

			broadcast<UserMessagePayload>("user-message", {
				messageId: normalizedMessage.id,
				content: textContent,
			});

			// Call original append
			await append(message);
		},
		[append, broadcast],
	);

	// One-time hydration: sync Convex data to TanStack AI when it first loads
	const hasHydratedRef = useRef(false);

	useEffect(() => {
		// Already hydrated - TanStack AI is now source of truth
		if (hasHydratedRef.current) return;
		// Still loading from Convex
		if (!storedMessages) return;
		// Don't interrupt active streaming
		if (isLoading) return;

		// Mark as hydrated to prevent future runs
		hasHydratedRef.current = true;

		// Only sync if Convex has messages and TanStack doesn't yet
		const convexUIMessages = storedMessagesToUIMessages(storedMessages);
		if (convexUIMessages.length > 0 && messagesRef.current.length === 0) {
			setMessages(convexUIMessages);
		}
	}, [storedMessages, isLoading, setMessages]);

	// Reset hydration state and clear messages when thread changes
	const prevThreadIdRef = useRef(threadId);
	useEffect(() => {
		if (prevThreadIdRef.current !== threadId) {
			hasHydratedRef.current = false;
			prevThreadIdRef.current = threadId;
			// Clear local streaming state
			setRemoteStreamingMessage(null);
			setIsRemoteLoading(false);
			// Clear TanStack AI messages so new thread can hydrate properly
			setMessages([]);
		}
	}, [threadId, setMessages]);

	// Merge local and remote streaming messages for UI
	const { uiMessages, conversationMessages } = useMemo(() => {
		const baseMessages = messages.filter(isUserOrAssistantMessage);

		// If there's a remote streaming message, add it as a temporary message
		const allMessages = [...baseMessages];
		if (remoteStreamingMessage && !isPrimaryTabRef.current) {
			// Check if we already have this message
			const existingIdx = allMessages.findIndex(
				(m) => m.id === remoteStreamingMessage.messageId,
			);
			if (existingIdx === -1) {
				// Add streaming message
				allMessages.push({
					id: remoteStreamingMessage.messageId,
					role: "assistant",
					parts: [{ type: "text", content: remoteStreamingMessage.content }],
				});
			} else {
				// Update existing message
				allMessages[existingIdx] = {
					...allMessages[existingIdx],
					parts: [{ type: "text", content: remoteStreamingMessage.content }],
				};
			}
		}

		const ui: ChatUiMessage[] = allMessages.map((message) => ({
			...message,
			role: message.role,
		}));

		return {
			uiMessages: ui,
			conversationMessages: allMessages.map((m) => ({
				id: m.id,
				role: m.role,
				parts: m.parts ?? [],
			})),
		};
	}, [messages, remoteStreamingMessage]);

	// Convex loading state
	const isConvexLoading = storedMessages === undefined;

	// Combined loading state (local or remote)
	const isChatLoading = isLoading || isRemoteLoading;

	return {
		uiMessages,
		conversationMessages,
		messages,
		isLoading: isChatLoading,
		isConvexLoading,
		stop,
		append: appendWithBroadcast,
		setMessages,
		storedMessages,
		isTokenLoaded: true,
		error,
		sendMessage,
		// Expose for debugging
		isPrimaryTab: isPrimaryTabRef.current,
	};
}
