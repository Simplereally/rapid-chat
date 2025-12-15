import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// Re-thinking: The hook needs to navigate too.
// Let's importing the Route object might be circular or messy if the hook is in `features`.
// Best pattern: Pass `initialInput` and a `clearInitialInput` callback?
// Or just let the hook implementation import the `Route`? No, `features` shouldn't depend on `routes`.
// Better: Pass `initialInput` value and a function to clear it.

// Actually `append` from useChat takes specific types.

export function useChatInitializationLogic({
	threadId,
	initialInput,
	clearInitialInput,
	append,
	isTokenLoaded,
}: {
	threadId: string;
	initialInput?: string;
	clearInitialInput: () => void;
	append: (message: {
		role: "user";
		content: string;
	}) => Promise<string | null | undefined | void>;
	isTokenLoaded: boolean;
}) {
	const addMessage = useMutation(api.messages.add);
	const hasTriggeredInitial = useRef(false);

	useEffect(() => {
		if (initialInput && isTokenLoaded && !hasTriggeredInitial.current) {
			hasTriggeredInitial.current = true;

			const run = async () => {
				// 1. Save to Convex
				await addMessage({
					threadId: threadId as Id<"threads">,
					role: "user",
					content: initialInput,
				});

				// 2. Trigger AI
				await append({
					role: "user",
					content: initialInput,
				});

				// 3. Clear URL param
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
	]);
}
