// @ts-nocheck - Types are used in interface definitions

import { ChatClient, fetchServerSentEvents } from "@tanstack/ai-client";
import type { UIMessage } from "@tanstack/ai-react";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { useShallow } from "zustand/shallow";
import {
	broadcastStreamingComplete,
	broadcastStreamingUpdate,
	initCrossTabSync,
} from "./cross-tab-sync";

// Thread streaming status for UI indicators
export type ThreadStreamingStatus = "streaming" | "completed";

// State for a single ChatClient instance
export interface ChatClientState {
	client: ChatClient | null;
	messages: UIMessage[];
	isLoading: boolean;
	error: Error | undefined;
	lastActivity: number;
	streamingStatus: ThreadStreamingStatus | undefined;
	isRead: boolean;
}

// Configuration for chat request
export interface ChatRequestConfig {
	threadId: string;
	content: string;
	apiEndpoint: string;
	getAuthHeaders: () => Promise<Record<string, string>>;
	onFinish?: (message: UIMessage) => void | Promise<void>;
	onError?: (error: Error) => void;
}

// Chat store interface
interface ChatStore {
	clients: Map<string, ChatClientState>;

	/** Get existing client state or create new empty state */
	getOrCreateClient: (
		threadId: string,
		createClient: () => ChatClient,
	) => ChatClientState;

	/** Start a new chat request - manages entire stream lifecycle at store level (fire-and-forget) */
	startChatRequest: (config: ChatRequestConfig) => void;

	setMessages: (threadId: string, messages: UIMessage[]) => void;

	setLoading: (threadId: string, isLoading: boolean) => void;

	setError: (threadId: string, error: Error | undefined) => void;

	setStreamingStatus: (threadId: string, status: ThreadStreamingStatus) => void;

	markAsRead: (threadId: string) => void;

	stopStream: (threadId: string) => void;

	clearClient: (threadId: string) => void;

	/** Cleanup completed/idle streams older than specified age (default 30 min) */
	cleanupStaleClients: (maxAgeMs?: number) => void;

	/** Completely remove streaming state after successful Convex persistence */
	nukeStreamingState: (threadId: string) => void;

	getStreamingThreadIds: () => string[];

	getUnreadThreadIds: () => string[];
}

/**
 * Global Zustand store for managing ChatClient instances across threads.
 */
export const useChatClientStore = create<ChatStore>()(
	devtools(
		(set, get) => ({
			clients: new Map(),

			getOrCreateClient: (threadId, createClient) => {
				const existing = get().clients.get(threadId);
				if (existing) {
					return existing;
				}

				const client = createClient();
				const newState: ChatClientState = {
					client,
					messages: [],
					isLoading: false,
					error: undefined,
					lastActivity: Date.now(),
					streamingStatus: undefined,
					isRead: true,
				};

				set((state) => ({
					clients: new Map(state.clients).set(threadId, newState),
				}));

				return newState;
			},

			startChatRequest: (config) => {
				const {
					threadId,
					content,
					apiEndpoint,
					getAuthHeaders,
					onFinish,
					onError,
				} = config;

				// Get or initialize client state
				let clientState = get().clients.get(threadId);

				// Create ChatClient if doesn't exist
				if (!clientState || !clientState.client) {
					const client = new ChatClient({
						connection: fetchServerSentEvents(
							() => apiEndpoint,
							async () => ({
								headers: await getAuthHeaders(),
							}),
						),
						onMessagesChange: (newMessages: UIMessage[]) => {
							// Sync messages to Zustand store
							set((state) => {
								const updated = new Map(state.clients);
								const current = updated.get(threadId);
								if (current) {
									updated.set(threadId, {
										...current,
										messages: newMessages,
										lastActivity: Date.now(),
									});
									// Broadcast to other tabs
									broadcastStreamingUpdate(
										threadId,
										newMessages,
										current.isLoading,
										current.streamingStatus,
									);
								}
								return { clients: updated };
							});
						},
						onLoadingChange: (newIsLoading: boolean) => {
							// Sync loading state to Zustand store
							set((state) => {
								const updated = new Map(state.clients);
								const current = updated.get(threadId);
								if (current) {
									const newStatus = newIsLoading
										? "streaming"
										: current.streamingStatus;
									updated.set(threadId, {
										...current,
										isLoading: newIsLoading,
										streamingStatus: newStatus,
										lastActivity: Date.now(),
									});
									// Broadcast to other tabs
									broadcastStreamingUpdate(
										threadId,
										current.messages,
										newIsLoading,
										newStatus,
									);
								}
								return { clients: updated };
							});
						},
						onErrorChange: (newError: Error | undefined) => {
							// Sync error state to Zustand store
							set((state) => {
								const updated = new Map(state.clients);
								const current = updated.get(threadId);
								if (current) {
									updated.set(threadId, {
										...current,
										error: newError,
										lastActivity: Date.now(),
									});
								}
								return { clients: updated };
							});
						},
						onFinish: async (finishedMessage: UIMessage) => {
							// Mark as completed
							set((state) => {
								const updated = new Map(state.clients);
								const current = updated.get(threadId);
								if (current) {
									updated.set(threadId, {
										...current,
										isLoading: false,
										streamingStatus: "completed",
										lastActivity: Date.now(),
									});
								}
								return { clients: updated };
							});

							// Call external onFinish callback for Convex persistence
							if (onFinish && finishedMessage.role === "assistant") {
								try {
									await onFinish(finishedMessage);
								} catch (err) {
									console.error("onFinish callback error:", err);
								}
							}

							// Broadcast completion to other tabs
							broadcastStreamingComplete(threadId);

							// Schedule cleanup after successful completion
							setTimeout(() => {
								get().cleanupStaleClients();
							}, 5000);
						},
						onError: (err: Error) => {
							set((state) => {
								const updated = new Map(state.clients);
								const current = updated.get(threadId);
								if (current) {
									updated.set(threadId, {
										...current,
										isLoading: false,
										streamingStatus: undefined,
										error: err,
										lastActivity: Date.now(),
									});
								}
								return { clients: updated };
							});

							if (onError) {
								onError(err);
							}
						},
					});

					// Initialize client state in store
					const newState: ChatClientState = {
						client,
						messages: [],
						isLoading: false,
						error: undefined,
						lastActivity: Date.now(),
						streamingStatus: undefined,
						isRead: true,
					};

					set((state) => ({
						clients: new Map(state.clients).set(threadId, newState),
					}));

					// Re-fetch the client state after setting (it will exist now)
					const updatedState = get().clients.get(threadId);
					if (!updatedState?.client) {
						console.error("Failed to create client for thread:", threadId);
						return;
					}
					clientState = updatedState;
				}

				// Capture client reference before async operations
				const client = clientState.client;
				if (!client) {
					console.error("No client available for thread:", threadId);
					return;
				}

				// Update state to streaming before sending
				set((state) => {
					const updated = new Map(state.clients);
					const current = updated.get(threadId);
					if (current) {
						updated.set(threadId, {
							...current,
							isLoading: true,
							streamingStatus: "streaming",
							error: undefined,
							lastActivity: Date.now(),
						});
					}
					return { clients: updated };
				});

				// Fire and forget - don't await sendMessage!
				// ChatClient handles state updates via callbacks (onMessagesChange, onFinish, onError)
				// Awaiting would block and prevent parallel streaming across threads
				console.log(
					`[CHAT] Thread ${threadId} - calling sendMessage at ${Date.now()}`,
				);
				client.sendMessage(content).catch((error) => {
					// Error handling is done via onError callback above
					// This catch is for any synchronous errors that slip through
					const err = error as Error;
					set((state) => {
						const updated = new Map(state.clients);
						const current = updated.get(threadId);
						if (current) {
							updated.set(threadId, {
								...current,
								isLoading: false,
								streamingStatus: undefined,
								error: err,
								lastActivity: Date.now(),
							});
						}
						return { clients: updated };
					});

					if (onError) {
						onError(err);
					}
				});
			},

			setMessages: (threadId, messages) => {
				set((state) => {
					const clientState = state.clients.get(threadId);
					if (!clientState) return state;

					const updated = new Map(state.clients);
					updated.set(threadId, {
						...clientState,
						messages,
						lastActivity: Date.now(),
					});

					return { clients: updated };
				});
			},

			setLoading: (threadId, isLoading) => {
				set((state) => {
					const clientState = state.clients.get(threadId);
					if (!clientState) return state;

					const updated = new Map(state.clients);
					updated.set(threadId, {
						...clientState,
						isLoading,
						lastActivity: Date.now(),
					});

					return { clients: updated };
				});
			},

			setError: (threadId, error) => {
				set((state) => {
					const clientState = state.clients.get(threadId);
					if (!clientState) return state;

					const updated = new Map(state.clients);
					updated.set(threadId, {
						...clientState,
						error,
						lastActivity: Date.now(),
					});

					return { clients: updated };
				});
			},

			setStreamingStatus: (threadId, status) => {
				set((state) => {
					const clientState = state.clients.get(threadId);
					if (!clientState) return state;

					const updated = new Map(state.clients);
					updated.set(threadId, {
						...clientState,
						streamingStatus: status,
						isRead: status === "streaming" ? true : clientState.isRead,
						lastActivity: Date.now(),
					});

					return { clients: updated };
				});
			},

			markAsRead: (threadId) => {
				set((state) => {
					const clientState = state.clients.get(threadId);
					if (!clientState) return state;

					const updated = new Map(state.clients);
					updated.set(threadId, {
						...clientState,
						isRead: true,
					});

					return { clients: updated };
				});
			},

			stopStream: (threadId) => {
				const clientState = get().clients.get(threadId);
				if (!clientState || !clientState.client) return;

				clientState.client.stop();

				set((state) => {
					const updated = new Map(state.clients);
					const current = updated.get(threadId);
					if (current) {
						updated.set(threadId, {
							...current,
							isLoading: false,
							streamingStatus: undefined,
							lastActivity: Date.now(),
						});
					}
					return { clients: updated };
				});
			},

			clearClient: (threadId) => {
				const clientState = get().clients.get(threadId);
				if (clientState) {
					if (clientState.isLoading && clientState.client) {
						clientState.client.stop();
					}
				}

				set((state) => {
					const updated = new Map(state.clients);
					updated.delete(threadId);
					return { clients: updated };
				});
			},

			cleanupStaleClients: (maxAgeMs = 30 * 60 * 1000) => {
				const now = Date.now();
				set((state) => {
					const updated = new Map(state.clients);

					for (const [threadId, clientState] of updated.entries()) {
						const isStale = now - clientState.lastActivity > maxAgeMs;
						const isCompleted = clientState.streamingStatus === "completed";

						// Clean up completed streams that are stale (data is in Convex)
						if (isCompleted && isStale && !clientState.isLoading) {
							if (clientState.client) {
								clientState.client.stop();
							}
							updated.delete(threadId);
						}
					}

					return { clients: updated };
				});
			},

			nukeStreamingState: (threadId) => {
				set((state) => {
					const updated = new Map(state.clients);
					const current = updated.get(threadId);

					if (current) {
						// After Convex persistence, nuke the streaming state completely
						updated.delete(threadId);
					}

					return { clients: updated };
				});
			},

			getStreamingThreadIds: () => {
				const streamingIds: string[] = [];
				for (const [threadId, state] of get().clients.entries()) {
					if (state.streamingStatus === "streaming") {
						streamingIds.push(threadId);
					}
				}
				return streamingIds;
			},

			getUnreadThreadIds: () => {
				const unreadIds: string[] = [];
				for (const [threadId, state] of get().clients.entries()) {
					if (state.streamingStatus === "completed" && !state.isRead) {
						unreadIds.push(threadId);
					}
				}
				return unreadIds;
			},
		}),
		{ name: "ChatClientStore" },
	),
);

export function useThreadStreamingStatus(
	threadId: string,
): ThreadStreamingStatus | undefined {
	return useChatClientStore(
		(state) => state.clients.get(threadId)?.streamingStatus,
	);
}

export function useThreadIsUnread(threadId: string): boolean {
	return useChatClientStore((state) => {
		const clientState = state.clients.get(threadId);
		return clientState?.streamingStatus === "completed" && !clientState.isRead;
	});
}

export function useStreamingThreadIds(): string[] {
	return useChatClientStore(
		useShallow((state) => {
			const ids: string[] = [];
			for (const [threadId, clientState] of state.clients.entries()) {
				if (clientState.streamingStatus === "streaming") {
					ids.push(threadId);
				}
			}
			return ids;
		}),
	);
}

export function useUnreadThreadIds(): string[] {
	return useChatClientStore(
		useShallow((state) => {
			const ids: string[] = [];
			for (const [threadId, clientState] of state.clients.entries()) {
				if (
					clientState.streamingStatus === "completed" &&
					!clientState.isRead
				) {
					ids.push(threadId);
				}
			}
			return ids;
		}),
	);
}

/**
 * Initialize cross-tab synchronization for streaming messages.
 * Call this once when the app starts (e.g., in a root layout or provider).
 * This enables streaming updates to appear in all open tabs for the same conversation.
 */
export function initializeCrossTabSync(): void {
	initCrossTabSync(
		// Handle streaming updates from other tabs
		(threadId, messages, isLoading, streamingStatus) => {
			const state = useChatClientStore.getState();
			const existing = state.clients.get(threadId);

			// Only update if we're not the tab that initiated the stream
			// (indicated by not having a client instance)
			if (!existing?.client) {
				useChatClientStore.setState((prev) => {
					const updated = new Map(prev.clients);
					const current = updated.get(threadId) || {
						client: null,
						messages: [],
						isLoading: false,
						error: undefined,
						lastActivity: Date.now(),
						streamingStatus: undefined,
						isRead: true,
					};
					updated.set(threadId, {
						...current,
						messages,
						isLoading,
						streamingStatus,
						lastActivity: Date.now(),
					});
					return { clients: updated };
				});
			}
		},
		// Handle streaming completion from other tabs
		(threadId) => {
			const state = useChatClientStore.getState();
			const existing = state.clients.get(threadId);

			// Only update if we're not the tab that initiated the stream
			if (!existing?.client) {
				useChatClientStore.setState((prev) => {
					const updated = new Map(prev.clients);
					// Remove the streaming state since it's now persisted in Convex
					updated.delete(threadId);
					return { clients: updated };
				});
			}
		},
	);
}
