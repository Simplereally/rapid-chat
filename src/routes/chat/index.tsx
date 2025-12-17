import { ChatInputForm } from "@/features/ai-chat";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Bot } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/chat/")({
	component: NewChatPage,
});

function NewChatPage() {
	const navigate = useNavigate();
	const createThread = useMutation(api.threads.create);
	const [isCreating, setIsCreating] = useState(false);
	const [isThinkingEnabled, setIsThinkingEnabled] = useState(true);

	const handleInputSubmit = async (content: string) => {
		if (!content.trim() || isCreating) return;

		setIsCreating(true);
		try {
			const threadId = await createThread({});

			const thinkPrefix = isThinkingEnabled ? "/think " : "/no_think ";
			const fullContent = thinkPrefix + content;

			navigate({
				to: "/chat/$threadId",
				params: { threadId },
				search: { initialInput: fullContent, initialThinking: isThinkingEnabled },
			});
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl mx-auto">
			<div className="flex-1 flex flex-col items-center justify-center p-4">
				<div className="flex flex-col items-center text-center max-w-md">
					{/* Hero icon */}
					<div className="relative mb-6">
						<div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-primary/10 rounded-full blur-xl" />
						<div className="relative rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-6">
							<Bot className="h-12 w-12 text-primary" />
						</div>
					</div>

					{/* Heading */}
					<h1 className="text-2xl font-semibold tracking-tight mb-2">
						How can I help you?
					</h1>
					<p className="text-muted-foreground mb-8">
						Start a new conversation to begin.
					</p>
				</div>
			</div>

			<div className="shrink-0 border-t border-border bg-background px-4 pt-2 pb-4">
				<ChatInputForm
					onSubmit={handleInputSubmit}
					onStop={() => {}}
					isLoading={isCreating}
					isThinkingEnabled={isThinkingEnabled}
					onThinkingToggle={() => setIsThinkingEnabled(!isThinkingEnabled)}
				/>
			</div>
		</div>
	);
}
