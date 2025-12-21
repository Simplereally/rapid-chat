import { AlertTriangle, Brain, Send, Square } from "lucide-react";
import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsOllamaRunning } from "@/stores/ollama-store";

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
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const isOllamaRunning = useIsOllamaRunning();

	const handleSubmit = useCallback(
		async (e?: React.FormEvent) => {
			e?.preventDefault();
			if (isLoading || !isOllamaRunning) return;

			const rawValue = textareaRef.current?.value ?? "";
			const content = rawValue.trim();
			if (!content) return;

			await onSubmit(content);

			if (textareaRef.current) {
				textareaRef.current.value = "";
			}
		},
		[isLoading, onSubmit, isOllamaRunning],
	);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex gap-2 items-end p-1">
			{/* Thinking Toggle */}
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant={isThinkingEnabled ? "outline" : "ghost"}
						size="icon"
						onClick={onThinkingToggle}
						disabled={!isOllamaRunning}
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
					{!isOllamaRunning
						? "Start Ollama to chat"
						: isThinkingEnabled
							? "Thinking enabled"
							: "Thinking disabled"}
				</TooltipContent>
			</Tooltip>

			<div className="relative flex-1">
				<Textarea
					ref={textareaRef}
					placeholder={
						isOllamaRunning ? "Ask something..." : "Ollama is not running..."
					}
					className={`min-h-[40px] max-h-[300px] pr-10 transition-colors duration-200 resize-none ${
						isThinkingEnabled ? "border-primary ring-1 ring-primary/20" : ""
					}`}
					disabled={isLoading || !isOllamaRunning}
					onKeyDown={handleKeyDown}
					rows={1}
				/>
				{!isOllamaRunning && (
					<div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500">
						<Tooltip>
							<TooltipTrigger asChild>
								<AlertTriangle className="h-4 w-4" />
							</TooltipTrigger>
							<TooltipContent>
								Ollama must be running to send messages
							</TooltipContent>
						</Tooltip>
					</div>
				)}
			</div>

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
						<Button
							type="submit"
							size="icon"
							disabled={isLoading || !isOllamaRunning}
						>
							<Send className="h-4 w-4" />
							<span className="sr-only">Send</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						{isOllamaRunning ? "Send message" : "Ollama not running"}
					</TooltipContent>
				</Tooltip>
			)}
		</form>
	);
}
