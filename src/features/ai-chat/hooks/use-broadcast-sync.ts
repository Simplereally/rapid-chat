import type { UIMessage } from "@tanstack/ai-react";
import { useEffect, useRef } from "react";

interface UseBroadcastSyncProps {
	pendingMessages: UIMessage[];
	onSync: (messages: UIMessage[]) => void;
	threadId: string;
}

/**
 * Custom hook to handle synchronization of broadcast messages.
 * Encapsulates the side effect of applying pending messages to the chat state.
 */
export function useBroadcastSync({
	pendingMessages,
	onSync,
	threadId,
}: UseBroadcastSyncProps) {
	const lastSyncedCountRef = useRef(0);

	useEffect(() => {
		// Only sync if we have new messages
		if (pendingMessages.length > lastSyncedCountRef.current) {
			const newMessages = pendingMessages.slice(lastSyncedCountRef.current);
			lastSyncedCountRef.current = pendingMessages.length;
			onSync(newMessages);
		}
	}, [pendingMessages, onSync]);

	// Reset sync counter when thread changes
	useEffect(() => {
		lastSyncedCountRef.current = 0;
	}, [threadId]);
}
