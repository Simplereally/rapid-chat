import { useAuth } from "@clerk/tanstack-react-start";
import type { UIMessage } from "@tanstack/ai-react";
import { useCallback, useEffect } from "react";
import { useChatClientStore } from "../../../stores/chat-client-store";

interface UseChatProps {
	threadId: string;
}

interface UseChatReturn {
	isLoading: boolean;
	stop: () => void;
	append: (
		message: { role: "user"; content: string } | UIMessage,
	) => Promise<void>;
	isTokenLoaded: boolean;
	/** Respond to a tool approval request */
	addToolApprovalResponse: (response: {
		id: string;
		approved: boolean;
	}) => Promise<void>;
}

/**
 * Chat hook that reads from and dispatches to Zustand store.
 * Stream management happens entirely at the store level, independent of component lifecycle.
 *
 * Note: Messages are NOT returned here. Components should read:
 * - Persisted messages from Convex queries
 * - Streaming messages from useChatClientStore selector
 * - Merge them at the view layer
 */
export function useChat({ threadId }: UseChatProps): UseChatReturn {
	const auth = useAuth();
	const { isLoaded: isTokenLoaded } = auth;

	// Select state from Zustand store
	const isLoading = useChatClientStore(
		(state) => state.clients.get(threadId)?.isLoading ?? false,
	);
	const error = useChatClientStore(
		(state) => state.clients.get(threadId)?.error,
	);

	// Expose error for debugging (components can use this if needed)
	useEffect(() => {
		if (error) {
			console.error(`Chat error in thread ${threadId}:`, error);
		}
	}, [error, threadId]);

	// Stop stream
	const stop = useCallback(() => {
		useChatClientStore.getState().stopStream(threadId);
	}, [threadId]);

	// Append message - dispatches to store which manages the stream
	const append = useCallback(
		async (message: { role: "user"; content: string } | UIMessage) => {
			const content =
				"content" in message
					? message.content
					: message.parts.find((p) => p.type === "text")?.content || "";

			const token = await auth.getToken({ template: "convex" });
			if (!token) {
				throw new Error("Authentication required");
			}

			// Fire and forget - startChatRequest manages stream via callbacks
			useChatClientStore.getState().startChatRequest({
				threadId,
				content,
				apiEndpoint: `/api/chat?threadId=${threadId}`,
				getAuthHeaders: async () => ({
					Authorization: `Bearer ${token}`,
				}),
			});
		},
		[threadId, auth],
	);

	// Tool approval response - delegates to store
	const addToolApprovalResponse = useCallback(
		async (response: { id: string; approved: boolean }) => {
			await useChatClientStore
				.getState()
				.addToolApprovalResponse(threadId, response);
		},
		[threadId],
	);

	return {
		isLoading,
		stop,
		append,
		isTokenLoaded,
		addToolApprovalResponse,
	};
}
