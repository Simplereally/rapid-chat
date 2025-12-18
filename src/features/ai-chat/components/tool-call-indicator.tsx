import { 
	FileText, 
	FolderOpen, 
	FolderSearch, 
	Globe, 
	Loader2, 
	AlertTriangle, 
	Search,
	Terminal,
	List,
	Edit,
	Edit2
} from "lucide-react";
import type { ToolName } from "@/tools";

interface ToolCallIndicatorProps {
	toolName: ToolName;
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
 * Get the appropriate icon for a tool (Claude Code aligned names)
 */
function getToolIcon(toolName: ToolName) {
	switch (toolName) {
		// Search / Discovery
		case "grep":
			return Search;
		case "glob":
			return FolderSearch;
		case "ls":
			return List;
		
		// Direct file IO
		case "read":
			return FileText;
		case "write":
			return FolderOpen;
		case "edit":
			return Edit;
		case "multi_edit":
			return Edit2;
		
		// Shell / Terminal
		case "bash":
			return Terminal;
		
		// External
		case "web_search":
			return Globe;
		
		default:
			return null;
	}
}

/**
 * Get human-readable display text for a tool call.
 * Supports both new Claude Code aligned names and legacy names.
 */
function getToolDisplayText(
	toolName: ToolName,
	args: Record<string, unknown>,
	state?: string,
): string {
	// Handle approval-requested state
	if (state === "approval-requested") {
		return getApprovalRequestText(toolName, args);
	}

	switch (toolName) {
		// ===================
		// Search / Discovery
		// ===================
		
		case "grep": {
			const pattern = typeof args.pattern === "string" ? args.pattern : "";
			const path = typeof args.path === "string" ? args.path : ".";
			const shortPattern = pattern.length > 30 ? pattern.slice(0, 27) + "..." : pattern;
			const shortPath = path.length > 20 ? "..." + path.slice(-17) : path;
			return pattern
				? `Searching for "${shortPattern}" in ${shortPath}`
				: "Searching files...";
		}
		
		case "glob": {
			const pattern = typeof args.pattern === "string" ? args.pattern : "*";
			const path = typeof args.path === "string" ? args.path : ".";
			const shortPath = path.length > 20 ? "..." + path.slice(-17) : path;
			return `Finding "${pattern}" in ${shortPath}`;
		}
		
		case "ls": {
			const path = typeof args.path === "string" ? args.path : ".";
			const shortPath = path.length > 40 ? "..." + path.slice(-37) : path;
			return `Listing directory: ${shortPath}`;
		}

		// ===================
		// Direct file IO
		// ===================
		
		case "read": {
			const path = typeof args.path === "string" ? args.path : "";
			const shortPath = path.length > 40 ? "..." + path.slice(-37) : path;
			return `Reading: ${shortPath}`;
		}
		
		case "write": {
			const path = typeof args.path === "string" ? args.path : "";
			const shortPath = path.length > 40 ? "..." + path.slice(-37) : path;
			return `Writing: ${shortPath}`;
		}
		
		case "edit": {
			const path = typeof args.path === "string" ? args.path : "";
			const shortPath = path.length > 40 ? "..." + path.slice(-37) : path;
			return `Editing: ${shortPath}`;
		}
		
		case "multi_edit": {
			const path = typeof args.path === "string" ? args.path : "";
			const shortPath = path.length > 40 ? "..." + path.slice(-37) : path;
			return `Batch editing: ${shortPath}`;
		}

		// ===================
		// Shell / Terminal
		// ===================
		
		case "bash": {
			const command = typeof args.command === "string" ? args.command : "";
			const shortCommand = command.length > 50 ? command.slice(0, 47) + "..." : command;
			return command
				? `Running: ${shortCommand}`
				: "Running command...";
		}

		// ===================
		// External
		// ===================
		
		case "web_search": {
			const query = typeof args.query === "string" ? args.query : "";
			return query
				? `Searching the web for "${query}"`
				: "Searching the web...";
		}

		default:
			// Exhaustive check - TypeScript will error if we miss a tool
			const _exhaustiveCheck: never = toolName;
			return `Running ${_exhaustiveCheck}...`;
	}
}

/**
 * Get approval request text for dangerous operations
 */
function getApprovalRequestText(
	toolName: ToolName,
	args: Record<string, unknown>,
): string {
	switch (toolName) {
		case "bash": {
			const command = typeof args.command === "string" ? args.command : "command";
			const shortCommand = command.length > 40 ? command.slice(0, 37) + "..." : command;
			return `⚠️ Approval needed: run "${shortCommand}"`;
		}
		
		case "write": {
			const path = typeof args.path === "string" ? args.path : "file";
			const shortPath = path.length > 30 ? "..." + path.slice(-27) : path;
			return `⚠️ Approval needed: write "${shortPath}"`;
		}
		
		case "edit":
		case "multi_edit": {
			const path = typeof args.path === "string" ? args.path : "file";
			const shortPath = path.length > 30 ? "..." + path.slice(-27) : path;
			return `⚠️ Approval needed: edit "${shortPath}"`;
		}
		
		default:
			return `⚠️ Approval needed for ${toolName}`;
	}
}
