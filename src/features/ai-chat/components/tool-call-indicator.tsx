import { Globe, Loader2 } from "lucide-react";

interface ToolCallIndicatorProps {
	toolName: string;
	args: Record<string, unknown>;
}

/**
 * Displays a subtle indicator while a tool is executing.
 * Styled with lower opacity to match modern AI chat UIs (ChatGPT, Claude, t3.chat).
 * This component is temporary and only shown during tool execution.
 */
export function ToolCallIndicator({ toolName, args }: ToolCallIndicatorProps) {
	// Format the display text based on tool name
	const displayText = getToolDisplayText(toolName, args);

	return (
		<div className="flex items-center gap-2 text-sm text-muted-foreground/60 py-1">
			<Loader2 className="h-3 w-3 animate-spin" />
			{toolName === "web_search" && <Globe className="h-3 w-3" />}
			<span className="italic">{displayText}</span>
		</div>
	);
}

/**
 * Get human-readable display text for a tool call.
 */
function getToolDisplayText(
	toolName: string,
	args: Record<string, unknown>,
): string {
	switch (toolName) {
		case "generating":
			return "Generating...";
		case "web_search": {
			const query = typeof args.query === "string" ? args.query : "";
			return query
				? `Searching the web for "${query}"`
				: "Searching the web...";
		}
		default:
			return `Running ${toolName}...`;
	}
}
