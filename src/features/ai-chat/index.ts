// Components

export { ChatHeader } from "./components/chat-header";
export { ChatInputForm } from "./components/chat-input-form";
export { ChatMessage } from "./components/chat-message";
export { ChatMessageActions } from "./components/chat-message-actions";
export { EditMessageForm } from "./components/edit-message-form";
export { ThinkingSection } from "./components/thinking-section";
export { ToolCallIndicator } from "./components/tool-call-indicator";
export {
	ToolApprovalDialog,
	ToolApprovalInline,
	getToolIcon,
} from "./components/tool-approval-dialog";
export { TypingIndicator } from "./components/typing-indicator";

// Hooks
export { useMessageActions } from "./hooks/use-message-actions";
export {
	useToolApprovals,
	isAwaitingApproval,
	wasApproved,
	wasDenied,
} from "./hooks/use-tool-approvals";
export type { PendingApproval } from "./hooks/use-tool-approvals";

// Utilities
export {
	BLINK_ANIMATION_CSS,
	parseThinkingContent,
	stripThinkPrefix,
} from "./lib/chat-utils";

export { triggerTitleGeneration } from "./lib/title-generation";

// Types
export type {
	ParsedMessage,
	ParsedPart,
	ParsedTextPart,
	ParsedThinkingPart,
} from "./types";
