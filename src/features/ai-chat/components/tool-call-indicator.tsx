import { FileText, FolderOpen, FolderSearch, Globe, Loader2, AlertTriangle, Search } from "lucide-react";

interface ToolCallIndicatorProps {
	toolName: string;
	args: Record<string, unknown>;
	state?: string; // Tool call state for approval handling
}

/**
 * Displays a subtle indicator while a tool is executing.
 * Styled with lower opacity to match modern AI chat UIs (ChatGPT, Claude, t3.chat).
 * This component is temporary and only shown during tool execution.
 *
 * For tools requiring approval, shows a warning state.
 */
export function ToolCallIndicator({ toolName, args, state }: ToolCallIndicatorProps) {
	// Format the display text based on tool name
	const displayText = getToolDisplayText(toolName, args, state);
	const isApprovalRequired = state === "approval-requested";
	const Icon = getToolIcon(toolName);

	return (
		<div className={`flex items-center gap-2 text-sm py-1 ${isApprovalRequired ? 'text-warning' : 'text-muted-foreground/60'}`}>
			{!isApprovalRequired && <Loader2 className="h-3 w-3 animate-spin" />}
			{isApprovalRequired && <AlertTriangle className="h-3 w-3" />}
			{Icon && <Icon className="h-3 w-3" />}
			<span className="italic">{displayText}</span>
		</div>
	);
}

/**
 * Get the appropriate icon for a tool
 */
function getToolIcon(toolName: string) {
	switch (toolName) {
		case "web_search":
			return Globe;
		case "grep_search":
			return Search;
		case "find_files":
			return FolderSearch;
		case "file_read":
			return FileText;
		case "file_write":
			return FolderOpen;
		default:
			return null;
	}
}

/**
 * Get human-readable display text for a tool call.
 */
function getToolDisplayText(
	toolName: string,
	args: Record<string, unknown>,
	state?: string,
): string {
	// Handle approval-requested state
	if (state === "approval-requested") {
		return getApprovalRequestText(toolName, args);
	}

	switch (toolName) {
		case "generating":
			return "Generating...";

		case "web_search": {
			const query = typeof args.query === "string" ? args.query : "";
			return query
				? `Searching the web for "${query}"`
				: "Searching the web...";
		}

		case "grep_search": {
			const query = typeof args.query === "string" ? args.query : "";
			const searchPath = typeof args.searchPath === "string" ? args.searchPath : ".";
			const shortQuery = query.length > 30 ? query.slice(0, 27) + "..." : query;
			const shortPath = searchPath.length > 20 ? "..." + searchPath.slice(-17) : searchPath;
			return query
				? `Searching for "${shortQuery}" in ${shortPath}`
				: "Searching files...";
		}

		case "find_files": {
			const pattern = typeof args.pattern === "string" ? args.pattern : "*";
			const searchPath = typeof args.searchPath === "string" ? args.searchPath : ".";
			const shortPath = searchPath.length > 20 ? "..." + searchPath.slice(-17) : searchPath;
			return `Finding "${pattern}" in ${shortPath}`;
		}

		case "file_read": {
			const operation = typeof args.operation === "string" ? args.operation : "read";
			const path = typeof args.path === "string" ? args.path : "";
			const shortPath = path.length > 40 ? "..." + path.slice(-37) : path;

			switch (operation) {
				case "read_file":
					return `Reading file: ${shortPath}`;
				case "list_directory":
					return `Listing directory: ${shortPath}`;
				case "check_exists":
					return `Checking if exists: ${shortPath}`;
				case "get_info":
					return `Getting info for: ${shortPath}`;
				default:
					return `Reading: ${shortPath}`;
			}
		}

		case "file_write": {
			const operation = typeof args.operation === "string" ? args.operation : "write";
			const path = typeof args.path === "string" ? args.path : "";
			const shortPath = path.length > 40 ? "..." + path.slice(-37) : path;

			switch (operation) {
				case "write_file":
					return `Writing file: ${shortPath}`;
				case "append_file":
					return `Appending to: ${shortPath}`;
				case "create_directory":
					return `Creating directory: ${shortPath}`;
				case "delete":
					return `Deleting: ${shortPath}`;
				case "move":
					return `Moving: ${shortPath}`;
				case "copy":
					return `Copying: ${shortPath}`;
				default:
					return `Writing: ${shortPath}`;
			}
		}

		default:
			return `Running ${toolName}...`;
	}
}

/**
 * Get approval request text for dangerous operations
 */
function getApprovalRequestText(
	toolName: string,
	args: Record<string, unknown>,
): string {
	if (toolName === "file_write") {
		const operation = typeof args.operation === "string" ? args.operation : "modify";
		const path = typeof args.path === "string" ? args.path : "file";
		const shortPath = path.length > 30 ? "..." + path.slice(-27) : path;

		return `⚠️ Approval needed: ${operation} "${shortPath}"`;
	}

	return `⚠️ Approval needed for ${toolName}`;
}
