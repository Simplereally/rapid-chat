import { Check, Copy, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatMessageActionsProps {
	messageId: string;
	isUserMessage: boolean;
	isCopied: boolean;
	onCopy: () => void;
	onEdit?: () => void;
	onRegenerate?: () => void;
	position: "left" | "right";
}

/**
 * Action buttons that appear on hover over a message.
 * Shows copy for all messages, edit for user messages, regenerate for AI messages.
 */
export function ChatMessageActions({
	isUserMessage,
	isCopied,
	onCopy,
	onEdit,
	onRegenerate,
	position,
}: ChatMessageActionsProps) {
	const positionClasses =
		position === "right"
			? "right-0 translate-x-full pl-1"
			: "left-0 -translate-x-full pr-1";

	return (
		<div
			className={`absolute top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${positionClasses}`}
		>
			{/* Copy button with feedback */}
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={onCopy}
						className={
							isCopied
								? "bg-green-500/20 text-green-600 hover:bg-green-500/30 hover:text-green-600"
								: ""
						}
					>
						{isCopied ? (
							<Check className="h-3.5 w-3.5" />
						) : (
							<Copy className="h-3.5 w-3.5" />
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>{isCopied ? "Copied!" : "Copy message"}</TooltipContent>
			</Tooltip>

			{/* Regenerate for AI messages */}
			{!isUserMessage && onRegenerate && (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant="ghost" size="icon-sm" onClick={onRegenerate}>
							<RefreshCw className="h-3.5 w-3.5" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Regenerate response</TooltipContent>
				</Tooltip>
			)}

			{/* Edit for user messages */}
			{isUserMessage && onEdit && (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant="ghost" size="icon-sm" onClick={onEdit}>
							<Pencil className="h-3.5 w-3.5" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Edit message</TooltipContent>
				</Tooltip>
			)}
		</div>
	);
}
