// @ts-nocheck - Types are used in interface definitions

import { ChatClient } from "@tanstack/ai-client";
import type { UIMessage } from "@tanstack/ai-react";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { useShallow } from "zustand/shallow";
import { deserializeMessageParts } from "@/features/ai-chat/lib/message-serialization";
import { fetchServerSentEventsWithUIMessages } from "@/lib/connection-adapter";
// Import client tools for Pattern B
import {
	bashToolClient,
	editToolClient,
	multiEditToolClient,
	writeToolClient,
} from "@/tools/client-index";
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
	/** Conversation history to load into the ChatClient before sending the new message */
	conversationHistory?: Array<{
		role: "user" | "assistant";
		content: string;
		id?: string;
	}>;
	/** Called when stream completes with ALL messages (for persisting new assistant messages) */
	onFinish?: (allMessages: UIMessage[]) => void | Promise<void>;
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

	/** Respond to a tool approval request */
	addToolApprovalResponse: (
		threadId: string,
		response: { id: string; approved: boolean },
	) => Promise<void>;
}

/**
 * Client tools array for ChatClient registration.
 * These are called by the ChatClient after user approval.
 * They call the server-side /api/tools/* endpoints for execution.
 */
const clientToolsArray = [
	bashToolClient,
	writeToolClient,
	editToolClient,
	multiEditToolClient,
];

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
					conversationHistory,
					onFinish,
					onError,
				} = config;

				// Get or initialize client state
				let clientState = get().clients.get(threadId);

				// Create ChatClient if doesn't exist
				if (!clientState || !clientState.client) {
					const client = new ChatClient({
						// Use custom adapter that sends UIMessages with .parts for tool approval state
						// Pattern B: approval state lives in UIMessage.parts and must be sent to server
						connection: fetchServerSentEventsWithUIMessages(
							() => apiEndpoint,
							async () => {
								const headers = await getAuthHeaders();
								return {
									headers,
								};
							},
						),
						// Register client tools for approval-required operations
						// These tools have needsApproval: true and execute by calling /api/tools/*
						tools: clientToolsArray,
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
							// Check if there are pending tool approvals
							// If so, don't mark as truly "completed" - we're waiting for user input
							const hasPendingApprovals = finishedMessage.parts.some(
								(part) =>
									part.type === "tool-call" &&
									part.state === "approval-requested" &&
									part.approval?.approved === undefined,
							);

							if (hasPendingApprovals) {
								// Stream ended but we're waiting for approval
								// Keep the streaming state active but not loading
								set((state) => {
									const updated = new Map(state.clients);
									const current = updated.get(threadId);
									if (current) {
										updated.set(threadId, {
											...current,
											isLoading: false,
											// Keep streaming status so the UI knows we're not done
											streamingStatus: "streaming",
											lastActivity: Date.now(),
										});
									}
									return { clients: updated };
								});
								// Don't persist to Convex or broadcast completion yet
								// The flow will continue after approval via continueFlow()
								return;
							}

							// No pending approvals - truly complete
							const clientState = get().clients.get(threadId);
							const allMessages = clientState?.messages ?? [];

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

							// Call external onFinish callback with ALL messages for Convex persistence
							// This allows persisting all new assistant messages (including tool call messages)
							if (onFinish && allMessages.length > 0) {
								try {
									await onFinish(allMessages);
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

				// Load conversation history into the ChatClient BEFORE sending the new message
				// This ensures the LLM has full context of the conversation
				if (conversationHistory && conversationHistory.length > 0) {
					const historyAsUIMessages: UIMessage[] = conversationHistory.map(
						(msg, index) => {
							// For assistant messages, deserialize parts to restore tool calls
							// For user messages, keep as simple text parts
							const parts =
								msg.role === "assistant"
									? (deserializeMessageParts(msg.content) as UIMessage["parts"])
									: [{ type: "text" as const, content: msg.content }];

							return {
								id: msg.id || `history-${index}`,
								role: msg.role,
								parts,
								createdAt: new Date(),
							};
						},
					);
					client.setMessagesManually(historyAsUIMessages);
				}

				// Fire and forget - don't await sendMessage!
				// ChatClient handles state updates via callbacks (onMessagesChange, onFinish, onError)
				// Awaiting would block and prevent parallel streaming across threads
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

			addToolApprovalResponse: async (threadId, response) => {
				const clientState = get().clients.get(threadId);
				if (!clientState?.client) {
					console.error("No client available for thread:", threadId);
					return;
				}
				console.log(
					`[Tool Approval] Sending approval response for thread ${threadId}:`,
					response,
				);

				// For both approval and denial, we need to find the matching tool call
				const messages = clientState.messages;

				// Find the tool call part that matches this approval
				let matchedToolCall: {
					toolName: string;
					toolCallId: string;
					args: Record<string, unknown>;
				} | null = null;

				for (const msg of messages) {
					if (msg.role === "assistant" && msg.parts) {
						for (const part of msg.parts) {
							if (
								part.type === "tool-call" &&
								part.approval?.id === response.id
							) {
								matchedToolCall = {
									toolName: part.name,
									toolCallId: part.id,
									args:
										typeof part.arguments === "string"
											? JSON.parse(part.arguments)
											: part.arguments,
								};
								break;
							}
						}
						if (matchedToolCall) break;
					}
				}

				if (!matchedToolCall) {
					console.error(
						"[Tool Approval] Could not find matching tool call for approval:",
						response.id,
					);
					await clientState.client.addToolApprovalResponse(response);
					return;
				}

				// Handle denial - add a tool result indicating rejection so the LLM knows
				if (!response.approved) {
					console.log(
						`[Tool Approval] Tool denied by user: ${matchedToolCall.toolName}`,
					);

					// Add a denial result so the LLM understands what happened
					await clientState.client.addToolResult({
						toolCallId: matchedToolCall.toolCallId,
						tool: matchedToolCall.toolName,
						output: {
							success: false,
							denied: true,
							message: `User denied execution of ${matchedToolCall.toolName}. The user chose not to allow this operation. Please acknowledge the denial and ask if they want to proceed differently.`,
						},
						state: "output-available", // Use output-available so it's treated as a completed tool
					});

					// Mark approval as responded to trigger continuation
					await clientState.client.addToolApprovalResponse(response);

					console.log(
						`[Tool Approval] Denial processed, agentic loop should continue`,
					);
					return;
				}

				// For approved tools, we need to manually execute the client tool
				// because TanStack AI doesn't auto-execute client tools for approval-required tools
				console.log(
					`[Tool Approval] Executing client tool: ${matchedToolCall.toolName}`,
				);

				// Find and execute the client tool
				const clientTool = clientToolsArray.find(
					(t) => t.name === matchedToolCall!.toolName,
				);

				if (!clientTool?.execute) {
					console.error(
						`[Tool Approval] No client tool found for: ${matchedToolCall.toolName}`,
					);
					await clientState.client.addToolApprovalResponse(response);
					return;
				}

				try {
					// Execute the client tool first
					const output = await clientTool.execute(matchedToolCall.args);
					console.log(`[Tool Approval] Tool executed, output:`, output);

					// Add the tool result to the client
					// Note: This will set state to 'input-complete' which breaks areAllToolsComplete()
					await clientState.client.addToolResult({
						toolCallId: matchedToolCall.toolCallId,
						tool: matchedToolCall.toolName,
						output,
						state: "output-available",
					});

					console.log(
						`[Tool Approval] Tool result added, now marking approval as responded`,
					);

					// IMPORTANT: Call addToolApprovalResponse AFTER addToolResult
					// This does two things:
					// 1. Sets state back to 'approval-responded' (areAllToolsComplete checks for this)
					// 2. Triggers checkForContinuation() which will continue the agentic loop
					await clientState.client.addToolApprovalResponse(response);

					// Debug: check the state after marking approval responded
					// @ts-expect-error - accessing internal processor
					const messagesAfter = clientState.client.processor?.getMessages();
					// @ts-expect-error - accessing internal processor
					const areComplete =
						clientState.client.processor?.areAllToolsComplete();
					console.log(`[Tool Approval] After addToolApprovalResponse:`);
					console.log(`  - Messages count: ${messagesAfter?.length}`);
					console.log(`  - areAllToolsComplete: ${areComplete}`);
					if (messagesAfter) {
						const lastAssistant = messagesAfter.findLast(
							(m: { role: string }) => m.role === "assistant",
						);
						if (lastAssistant?.parts) {
							for (const part of lastAssistant.parts) {
								if (part.type === "tool-call") {
									console.log(`  - Tool call ${part.id}:`);
									console.log(`    - state: ${part.state}`);
									console.log(`    - output: ${part.output !== undefined}`);
									console.log(`    - approval: ${!!part.approval}`);
								}
							}
						}
					}

					console.log(
						`[Tool Approval] Approval responded, agentic loop should continue`,
					);
				} catch (err) {
					console.error(`[Tool Approval] Tool execution failed:`, err);

					// Add error result first
					await clientState.client.addToolResult({
						toolCallId: matchedToolCall.toolCallId,
						tool: matchedToolCall.toolName,
						output: null,
						state: "output-error",
						errorText:
							err instanceof Error ? err.message : "Tool execution failed",
					});

					// Then mark approval as responded to trigger continuation
					await clientState.client.addToolApprovalResponse(response);
				}
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
