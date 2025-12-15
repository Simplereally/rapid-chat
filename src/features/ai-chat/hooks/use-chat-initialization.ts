import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { triggerTitleGeneration } from "../lib/title-generation";

export function useChatInitializationLogic({
	threadId,
	initialInput,
	clearInitialInput,
	append,
	isTokenLoaded,
	getToken,
}: {
	threadId: string;
	initialInput?: string;
	clearInitialInput: () => void;
	append: (message: {
		role: "user";
		content: string;
	}) => Promise<string | null | undefined | void>;
	isTokenLoaded: boolean;
	getToken: () => Promise<string | null>;
}) {
	const addMessage = useMutation(api.messages.add);
	const hasTriggeredInitial = useRef(false);

	useEffect(() => {
		if (initialInput && isTokenLoaded && !hasTriggeredInitial.current) {
			hasTriggeredInitial.current = true;

			const run = async () => {
				// 1. Save to Convex
				const { isFirstMessage } = await addMessage({
					threadId: threadId as Id<"threads">,
					role: "user",
					content: initialInput,
				});

				// 2. Trigger AI title generation if this is the first message
				// Fire-and-forget: don't await, don't block the chat
				if (isFirstMessage) {
					getToken().then((token) => {
						if (token) {
							triggerTitleGeneration(threadId, initialInput, token);
						}
					});
				}

				// 3. Trigger AI
				await append({
					role: "user",
					content: initialInput,
				});

				// 4. Clear URL param
				clearInitialInput();
			};

			run();
		}
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
