import { useAuth } from "@clerk/tanstack-react-start";
import type { ChunkStrategy } from "@tanstack/ai";
import {
	fetchServerSentEvents,
	type UIMessage,
	useChat,
} from "@tanstack/ai-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef } from "react";
import { env } from "@/env";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import type { ChatUiMessage } from "../types";

class ThrottledBoundaryChunkStrategy implements ChunkStrategy {
	private lastEmitAt = 0;
	private lastEmitLength = 0;

	constructor(
		private readonly options: {
			minIntervalMs: number;
			minChars: number;
		},
	) {}

	reset(): void {
		this.lastEmitAt = 0;
		this.lastEmitLength = 0;
	}

	shouldEmit(chunk: string, accumulated: string): boolean {
		const now = Date.now();
		const sinceLastEmitMs = now - this.lastEmitAt;
		const charsSinceLastEmit = accumulated.length - this.lastEmitLength;
		const hasBoundary = /[\s\n]|[.,!?;:]/.test(chunk);

		if (charsSinceLastEmit >= this.options.minChars) {
			this.lastEmitAt = now;
			this.lastEmitLength = accumulated.length;
			return true;
		}

		if (hasBoundary && sinceLastEmitMs >= this.options.minIntervalMs) {
			this.lastEmitAt = now;
			this.lastEmitLength = accumulated.length;
			return true;
		}

		return false;
	}
}

function createChatChunkStrategy(): ChunkStrategy {
	const minIntervalMs = env.VITE_CHAT_STREAM_CHUNK_MIN_INTERVAL_MS ?? 80;
	const minChars = env.VITE_CHAT_STREAM_CHUNK_MIN_CHARS ?? 64;
	return new ThrottledBoundaryChunkStrategy({
		minIntervalMs,
		minChars,
	});
}

function isUserOrAssistantMessage(
	message: UIMessage,
): message is UIMessage & { role: "user" | "assistant" } {
	return message.role === "user" || message.role === "assistant";
}

function isConversationStoredMessage(
	message: Doc<"messages">,
): message is Doc<"messages"> & { role: "user" | "assistant" } {
	return message.role === "user" || message.role === "assistant";
}

function isConversationChatUiMessage(
	message: ChatUiMessage,
): message is ChatUiMessage & { role: "user" | "assistant" } {
	return message.role === "user" || message.role === "assistant";
}

interface UseHybridChatMessagesProps {
	threadId: string;
}

export function useHybridChatMessages({
	threadId,
}: UseHybridChatMessagesProps) {
	// 1. Convex State (Single Source of Truth for confirmed history)
	const storedMessages = useQuery(api.messages.list, {
		threadId: threadId as Id<"threads">,
	});

	const addMessage = useMutation(api.messages.add);
	const lastPersistedErrorRef = useRef<{ content: string; at: number } | null>(
		null,
	);

	// 2. TanStack AI `useChat` (Transient Streaming State)
	// Use async options function to fetch token fresh at each request time
	const { getToken } = useAuth();
	const chunkStrategyRef = useRef<ChunkStrategy | null>(null);
	if (chunkStrategyRef.current === null) {
		chunkStrategyRef.current = createChatChunkStrategy();
	}
	const chunkStrategy = chunkStrategyRef.current;

	const {
		messages: streamingMessages,
		isLoading,
		stop,
		setMessages: setStreamingMessages,
		append,
	} = useChat({
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
		streamProcessor: {
			chunkStrategy,
		},
		onError: (error) => {
			const rawMessage =
				error instanceof Error
					? error.message
					: typeof error === "string"
						? error
						: "Something went wrong while generating a response.";

			const content = rawMessage.trim() || "Something went wrong.";
			const dedupeKey = content.slice(0, 300);
			const now = Date.now();
			const last = lastPersistedErrorRef.current;

			if (last && last.content === dedupeKey && now - last.at < 2000) {
				return;
			}
			lastPersistedErrorRef.current = { content: dedupeKey, at: now };

			addMessage({
				threadId: threadId as Id<"threads">,
				role: "error",
				content,
			}).catch((persistError) => {
				console.error("Failed to persist chat error:", persistError);
			});
		},
	});

	// 3. Hybrid State Merge
	// Always sync `streamingMessages` *from* `storedMessages` when we are NOT loading.
	// This ensures `useChat` context is always fresh with confirmed history.
	useEffect(() => {
		if (!isLoading && storedMessages) {
			const conversation: UIMessage[] = storedMessages
				.filter(isConversationStoredMessage)
				.map((msg) => ({
					id: msg._id,
					role: msg.role,
					parts: [{ type: "text" as const, content: msg.content }],
				}));
			setStreamingMessages(conversation);
		}
	}, [storedMessages, isLoading, setStreamingMessages]);

	// View Logic:
	const { uiMessages, conversationMessages } = useMemo(() => {
		if (!storedMessages) {
			const conversation = streamingMessages.filter(isUserOrAssistantMessage);
			const ui: ChatUiMessage[] = conversation.map((message) => ({
				...message,
				role: message.role,
			}));
			return { uiMessages: ui, conversationMessages: conversation };
		}

		const streamingById = new Map(streamingMessages.map((m) => [m.id, m]));
		const persistedUi: ChatUiMessage[] = storedMessages.map((msg) => {
			const streamingOverride = streamingById.get(msg._id);
			if (streamingOverride && isUserOrAssistantMessage(streamingOverride)) {
				return {
					...streamingOverride,
					role: streamingOverride.role,
				};
			}
			return {
				id: msg._id,
				role: msg.role,
				parts: [{ type: "text" as const, content: msg.content }],
			};
		});

		let streamingAssistantIdToSuppress: string | null = null;
		let effectivePersistedUi = persistedUi;
		if (isLoading) {
			const lastStreamingAssistant = (() => {
				for (let i = streamingMessages.length - 1; i >= 0; i--) {
					const message = streamingMessages[i];
					if (message?.role === "assistant") return message;
				}
				return null;
			})();

			const lastPersistedAssistant = (() => {
				for (let i = storedMessages.length - 1; i >= 0; i--) {
					const message = storedMessages[i];
					if (message?.role === "assistant") return message;
				}
				return null;
			})();

			if (lastStreamingAssistant && lastPersistedAssistant) {
				const persistedId = lastPersistedAssistant._id;
				const lastStored = storedMessages[storedMessages.length - 1];
				if (lastStreamingAssistant.id !== persistedId) {
					const targetIndex = persistedUi.findIndex(
						(m) => m.id === persistedId,
					);
					if (
						targetIndex >= 0 &&
						lastStored?.role === "assistant" &&
						lastStored._id === persistedId
					) {
						effectivePersistedUi = [...persistedUi];
						effectivePersistedUi[targetIndex] = {
							...lastStreamingAssistant,
							id: persistedId,
							role: "assistant",
						};
						streamingAssistantIdToSuppress = lastStreamingAssistant.id;
					}
				}
			}
		}

		const persistedConversation: UIMessage[] = effectivePersistedUi
			.filter(isConversationChatUiMessage)
			.map((m) => ({
				id: m.id,
				role: m.role,
				parts: m.parts ?? [],
			}));

		if (!isLoading) {
			return {
				uiMessages: effectivePersistedUi,
				conversationMessages: persistedConversation,
			};
		}

		const persistedIds = new Set(effectivePersistedUi.map((m) => m.id));
		const appendedStreaming = streamingMessages
			.filter((m) => !persistedIds.has(m.id))
			.filter((m) =>
				streamingAssistantIdToSuppress
					? m.id !== streamingAssistantIdToSuppress
					: true,
			)
			.filter(isUserOrAssistantMessage);

		const appendedUi: ChatUiMessage[] = appendedStreaming.map((message) => ({
			...message,
			role: message.role,
		}));

		const mergedUi: ChatUiMessage[] = [...effectivePersistedUi, ...appendedUi];
		const mergedConversation: UIMessage[] = [
			...persistedConversation,
			...appendedStreaming,
		];

		return { uiMessages: mergedUi, conversationMessages: mergedConversation };
	}, [isLoading, streamingMessages, storedMessages]);

	return {
		uiMessages,
		conversationMessages,
		isLoading,
		stop,
		append,
		setMessages: setStreamingMessages,
		storedMessages, // Exposing this might be useful for checking if loaded
		isTokenLoaded: true, // Token is fetched on-demand at request time
	};
}
