import { useAuth } from "@clerk/tanstack-react-start";
import {
	fetchServerSentEvents,
	type UIMessage,
	useChat,
} from "@tanstack/ai-react";
import { useQuery } from "convex/react";
import { useEffect, useMemo } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

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

	// 2. TanStack AI `useChat` (Transient Streaming State)
	// Use async options function to fetch token fresh at each request time
	const { getToken } = useAuth();

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
		onError: (error) => {
			console.error("Stream error:", error);
		},
	});

	// 3. Hybrid State Merge
	// Always sync `streamingMessages` *from* `storedMessages` when we are NOT loading.
	// This ensures `useChat` context is always fresh with confirmed history.
	useEffect(() => {
		if (!isLoading && storedMessages) {
			const uiMessages: UIMessage[] = storedMessages.map((msg) => ({
				id: msg._id,
				role: msg.role,
				parts: [{ type: "text" as const, content: msg.content }],
			}));
			setStreamingMessages(uiMessages);
		}
	}, [storedMessages, isLoading, setStreamingMessages]);

	// View Logic:
	const displayMessages = useMemo(() => {
		if (isLoading) {
			return streamingMessages;
		}
		// If not loading, rely on storedMessages to ensure we matched what is in DB
		if (!storedMessages) return [];
		return storedMessages.map((msg) => ({
			id: msg._id,
			role: msg.role,
			parts: [{ type: "text" as const, content: msg.content }],
		}));
	}, [isLoading, streamingMessages, storedMessages]);

	return {
		messages: displayMessages,
		isLoading,
		stop,
		append,
		setMessages: setStreamingMessages,
		storedMessages, // Exposing this might be useful for checking if loaded
		isTokenLoaded: true, // Token is fetched on-demand at request time
	};
}
