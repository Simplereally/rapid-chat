import { AlertTriangle, Bot, User } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MarkdownMessage } from "@/components/ui/markdown-message";
import { stripThinkPrefix } from "../lib/chat-utils";
import type { ParsedMessage, ParsedTextPart } from "../types";
import { ChatMessageActions } from "./chat-message-actions";
import { EditMessageForm } from "./edit-message-form";
import { ThinkingSection } from "./thinking-section";
import { ToolCallIndicator } from "./tool-call-indicator";
import { TypingIndicator } from "./typing-indicator";

interface ChatMessageProps {
	message: ParsedMessage;
	isBeingEdited: boolean;
	isDimmed: boolean;
	isCopied: boolean;
	editContent: string;
	isLoading: boolean;
	onCopy: () => void;
	onEdit?: () => void;
	onRegenerate?: () => void;
	onRetry?: () => void;
	onEditContentChange: (content: string) => void;
	onEditSubmit: () => void;
	onEditCancel: () => void;
	hasActiveEdit: boolean;
}

function getTextContent(parts: ParsedMessage["parsedParts"]): string {
	for (const part of parts) {
		if (
			part &&
			typeof part === "object" &&
			"type" in part &&
			part.type === "text"
		) {
			const p = part as { content?: unknown };
			if (typeof p.content === "string") return p.content;
		}
	}
	return "";
}

function getHasVisibleAssistantParts(message: ParsedMessage): boolean {
	return message.parsedParts.some((part) => {
		if (!part || typeof part !== "object") return false;
		if (!("type" in part)) return false;

		const type = (part as { type: unknown }).type;

		if (type === "thinking") return true;

		if (type === "tool-call") {
			return (part as { output?: unknown }).output === undefined;
		}

		if (type === "text") {
			const textPart = part as ParsedTextPart;
			const parsedContent =
				typeof textPart.parsedContent === "string"
					? textPart.parsedContent
					: "";
			const thinkingContent =
				typeof textPart.thinkingContent === "string"
					? textPart.thinkingContent
					: "";

			return (
				textPart.isThinking === true ||
				parsedContent.trim().length > 0 ||
				thinkingContent.trim().length > 0
			);
		}

		return false;
	});
}

/**
 * Single chat message bubble with avatar, content, and action buttons.
 */
export function ChatMessage({
	message,
	isBeingEdited,
	isDimmed,
	isCopied,
	editContent,
	isLoading,
	onCopy,
	onEdit,
	onRegenerate,
	onRetry,
	onEditContentChange,
	onEditSubmit,
	onEditCancel,
	hasActiveEdit,
}: ChatMessageProps) {
	const isUserMessage = message.role === "user";
	const isAssistant = message.role === "assistant";
	const isErrorMessage = message.role === "error";
	const isLeftAligned = isAssistant || isErrorMessage;
	const showGenerating =
		message.isStreamingAssistant && !getHasVisibleAssistantParts(message);

	return (
		<div
			className={`flex gap-3 transition-all duration-300 ${
				isLeftAligned ? "justify-start" : "justify-end"
			} ${isDimmed ? "opacity-40 scale-[0.98]" : ""} ${isBeingEdited ? "z-10 relative" : ""}`}
		>
			{/* Bot Avatar */}
			{isAssistant && (
				<Avatar
					className={`h-8 w-8 shrink-0 transition-opacity duration-300 ${isDimmed ? "opacity-50" : ""}`}
				>
					<AvatarFallback className="bg-primary/10">
						<Bot className="h-5 w-5 text-primary" />
					</AvatarFallback>
				</Avatar>
			)}

			<div className="flex flex-col gap-1 max-w-[80%]">
				{/* Message bubble with action buttons */}
				<div className="group relative">
					<div
						className={`transition-all duration-300 ${
							isErrorMessage ? "" : "rounded-lg px-4 py-2"
						} ${
							isErrorMessage
								? ""
								: isAssistant
									? "bg-muted text-foreground"
									: "bg-primary text-primary-foreground"
						} ${isBeingEdited ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg" : ""}`}
					>
						{/* Edit mode - show textarea */}
						{isErrorMessage ? (
							<Alert variant="destructive" className="rounded-lg">
								<AlertTriangle />
								<AlertTitle>Request failed</AlertTitle>
								<AlertDescription>
									<div className="whitespace-pre-wrap">
										{getTextContent(message.parsedParts)}
									</div>
									{onRetry && (
										<Button
											variant="outline"
											size="sm"
											className="mt-2"
											onClick={onRetry}
											disabled={isLoading}
										>
											Retry
										</Button>
									)}
								</AlertDescription>
							</Alert>
						) : isBeingEdited ? (
							<EditMessageForm
								editContent={editContent}
								onEditContentChange={onEditContentChange}
								onSubmit={onEditSubmit}
								onCancel={onEditCancel}
								isSubmitDisabled={!editContent.trim() || isLoading}
								isUserMessage={isUserMessage}
							/>
						) : (
							/* Normal display mode */
							<>
								{message.parsedParts.map((part, idx) => {
									if (part.type === "text") {
										// For user messages, show content without /think or /no_think prefix
										if (isUserMessage) {
											const displayText = stripThinkPrefix(part.content);
											return (
												<div
													key={`${message.id}-user-text`}
													className="whitespace-pre-wrap"
												>
													{displayText}
												</div>
											);
										}

										// For assistant messages, show thinking section and cleaned content
										const parsedPart = part as ParsedTextPart;
										const thinkingContent = parsedPart.thinkingContent ?? "";
										const parsedContent = parsedPart.parsedContent ?? "";
										const isThinking = parsedPart.isThinking ?? false;
										const isLastPart = idx === message.parsedParts.length - 1;

										// Only show cursor when streaming main content (not while thinking)
										const showCursor =
											message.isStreamingAssistant && !isThinking && isLastPart;

										// Don't show main content area if:
										// - We're actively thinking (content is being streamed to thinking section)
										// - We have no parsed content AND no cursor to show
										const hasMainContent =
											parsedContent.length > 0 || showCursor;

										return (
											<div key={`${message.id}-assistant-text`}>
												<ThinkingSection
													content={thinkingContent}
													isThinking={isThinking}
												/>
												{hasMainContent && (
													<div>
														<MarkdownMessage content={parsedContent} />
														{showCursor && <TypingIndicator />}
													</div>
												)}
											</div>
										);
									}
									if (part.type === "thinking") {
										// Handle native thinking parts from TanStack AI
										return (
											<ThinkingSection
												key={`${message.id}-thinking`}
												content={part.content}
												isThinking={false}
											/>
										);
									}
									if (part.type === "tool-call") {
										// Only show indicator while tool is executing (no output yet)
										const toolPart = part as {
											id: string;
											name: string;
											arguments: string;
											output?: unknown;
										};
										if (toolPart.output === undefined) {
											let parsedArgs: Record<string, unknown> = {};
											try {
												parsedArgs = JSON.parse(toolPart.arguments || "{}");
											} catch {
												// Invalid JSON, use empty object
											}
											return (
												<ToolCallIndicator
													key={`${message.id}-tool-${toolPart.id}`}
													toolName={toolPart.name}
													args={parsedArgs}
												/>
											);
										}
										// Tool completed - don't render anything (indicator disappears)
										return null;
									}
									return null;
								})}

								{showGenerating && (
									<ToolCallIndicator toolName="generating" args={{}} />
								)}
							</>
						)}
					</div>

					{/* Action buttons - show on hover when not editing and not streaming */}
					{!isBeingEdited &&
						!isErrorMessage &&
						!message.isStreamingAssistant &&
						!hasActiveEdit && (
							<ChatMessageActions
								messageId={message.id}
								isUserMessage={isUserMessage}
								isCopied={isCopied}
								onCopy={onCopy}
								onEdit={isUserMessage ? onEdit : undefined}
								onRegenerate={!isUserMessage ? onRegenerate : undefined}
								position={isAssistant ? "right" : "left"}
							/>
						)}
				</div>
			</div>

			{/* User Avatar */}
			{isUserMessage && (
				<Avatar
					className={`h-8 w-8 shrink-0 transition-opacity duration-300 ${isDimmed ? "opacity-50" : ""}`}
				>
					<AvatarFallback className="bg-primary/10">
						<User className="h-5 w-5 text-primary" />
					</AvatarFallback>
				</Avatar>
			)}
		</div>
	);
}
