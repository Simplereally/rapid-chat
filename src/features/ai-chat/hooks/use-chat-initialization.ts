import type { UIMessage } from "@tanstack/ai-react";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { triggerTitleGeneration } from "../lib/title-generation";

interface UseChatInitializationLogicProps {
	threadId: string;
	initialInput?: string;
	clearInitialInput: () => void;
	append: (
		message: { role: "user"; content: string } | UIMessage,
	) => Promise<void>;
	isTokenLoaded: boolean;
	getToken: () => Promise<string | null>;
}

/**
 * Handle initial input from URL params (e.g., when creating a new chat with a message).
 * Uses fire-and-forget persistence for a rapid UI experience.
 */
export function useChatInitializationLogic({
	threadId,
	initialInput,
	clearInitialInput,
	append,
	isTokenLoaded,
	getToken,
}: UseChatInitializationLogicProps) {
	const addMessage = useMutation(api.messages.add);
	const hasTriggeredInitial = useRef(false);

	useEffect(() => {
		if (!initialInput || !isTokenLoaded || hasTriggeredInitial.current) return;

		hasTriggeredInitial.current = true;

		// Fire-and-forget persistence
		addMessage({
			threadId: threadId as Id<"threads">,
			role: "user",
			content: initialInput,
		})
			.then(({ isFirstMessage }) => {
				// Trigger title generation for first message (fire-and-forget)
				if (isFirstMessage) {
					getToken().then((token) => {
						if (token) {
							triggerTitleGeneration(threadId, initialInput, token);
						}
					});
				}
			})
			.catch((err) => {
				console.error("Failed to persist initial message:", err);
			});

		// Immediately trigger the stream - don't wait for persistence
		append({ role: "user", content: initialInput }).then(() => {
			// Clear URL param after stream starts
			clearInitialInput();
		});
	}, [
		initialInput,
		isTokenLoaded,
		addMessage,
		append,
		threadId,
		clearInitialInput,
		getToken,
	]);
}
