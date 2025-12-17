import { Brain, Send, Square } from "lucide-react";
import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatInputFormProps {
	onSubmit: (content: string) => void | Promise<void>;
	onStop: () => void;
	isLoading: boolean;
	isThinkingEnabled: boolean;
	onThinkingToggle: () => void;
}

/**
 * Chat input form with thinking toggle and send button.
 */
export function ChatInputForm({
	onSubmit,
	onStop,
	isLoading,
	isThinkingEnabled,
	onThinkingToggle,
}: ChatInputFormProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (isLoading) return;

			const rawValue = inputRef.current?.value ?? "";
			const content = rawValue.trim();
			if (!content) return;

			await onSubmit(content);

			if (inputRef.current) {
				inputRef.current.value = "";
			}
		},
		[isLoading, onSubmit],
	);

	return (
		<form onSubmit={handleSubmit} className="flex gap-2 items-end pb-2">
			{/* Thinking Toggle */}
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant={isThinkingEnabled ? "outline" : "ghost"}
						size="icon"
						onClick={onThinkingToggle}
						className={
							isThinkingEnabled
								? "bg-primary/10 border-primary text-primary hover:bg-primary/20"
								: ""
						}
					>
						<Brain className="h-4 w-4" />
						<span className="sr-only">
							{isThinkingEnabled ? "Disable thinking" : "Enable thinking"}
						</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					{isThinkingEnabled ? "Thinking enabled" : "Thinking disabled"}
				</TooltipContent>
			</Tooltip>

			<Input
				type="text"
				ref={inputRef}
				placeholder="Ask something..."
				className="flex-1"
				disabled={isLoading}
			/>

			{isLoading ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							size="icon"
							variant="destructive"
							onClick={onStop}
						>
							<Square className="h-4 w-4" />
							<span className="sr-only">Stop</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>Stop generating</TooltipContent>
				</Tooltip>
			) : (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button type="submit" size="icon" disabled={isLoading}>
							<Send className="h-4 w-4" />
							<span className="sr-only">Send</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>Send message</TooltipContent>
				</Tooltip>
			)}
		</form>
	);
}
