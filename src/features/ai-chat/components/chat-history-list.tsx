import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot } from "lucide-react";
import type { RefObject } from "react";
import type { ParsedMessage } from "../types";
import { ChatMessage } from "./chat-message";

interface ChatHistoryListProps {
	messages: ParsedMessage[];
	scrollRef: RefObject<HTMLDivElement>;
	isLoading: boolean;
	// Interaction props pass-through
	editingMessageId: string | null;
	editContent: string;
	setEditContent: (val: string) => void;
	startEditing: (id: string, content: string) => void;
	cancelEditing: () => void;
	submitEdit: () => void;
	copiedMessageId: string | null;
	copyToClipboard: (id: string, content: string) => void;
	regenerateResponse: (id: string) => void;
	getDisplayContent: (msg: ParsedMessage) => string;
}

export function ChatHistoryList({
	messages,
	scrollRef,
	isLoading,
	editingMessageId,
	editContent,
	setEditContent,
	startEditing,
	cancelEditing,
	submitEdit,
	copiedMessageId,
	copyToClipboard,
	regenerateResponse,
	getDisplayContent,
}: ChatHistoryListProps) {
	return (
		<ScrollArea className="flex-1 min-h-0 px-4" ref={scrollRef}>
			<div className="space-y-4 pb-4 pt-2">
				{messages.length === 0 && (
					<div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground opacity-50">
						<Bot className="h-12 w-12 mb-2" />
						<p>Start a conversation...</p>
					</div>
				)}
				{messages.map((message, messageIndex) => {
					const displayContent = getDisplayContent(message);
					const onRetry =
						message.role === "error"
							? () => {
								for (let i = messageIndex - 1; i >= 0; i--) {
									if (messages[i].role === "assistant") {
										regenerateResponse(messages[i].id);
										break;
									}
								}
							}
							: undefined;
					return (
						<ChatMessage
							key={message.id}
							message={message}
							isBeingEdited={editingMessageId === message.id}
							isDimmed={
								editingMessageId !== null && editingMessageId !== message.id
							}
							isCopied={copiedMessageId === message.id}
							editContent={editContent}
							isLoading={isLoading}
							onCopy={() => copyToClipboard(message.id, displayContent)}
							onEdit={() => startEditing(message.id, displayContent)}
							onRegenerate={() => regenerateResponse(message.id)}
							onRetry={onRetry}
							onEditContentChange={setEditContent}
							onEditSubmit={submitEdit}
							onEditCancel={cancelEditing}
							hasActiveEdit={editingMessageId !== null}
						/>
					);
				})}
			</div>
		</ScrollArea>
	);
}
