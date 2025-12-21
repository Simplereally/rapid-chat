import {
	AlertTriangle,
	CheckCircle2,
	Edit,
	Edit2,
	FileText,
	FolderOpen,
	FolderSearch,
	Globe,
	List,
	Loader2,
	Search,
	Terminal,
	XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolName } from "@/tools/client-index";

interface ToolCallIndicatorProps {
	toolName: ToolName;
	args: Record<string, unknown>;
	state?: string; // Tool call state for approval handling
	output?: unknown;
	/** Whether the tool was denied by the user */
	approval?: {
		id: string;
		needsApproval: boolean;
		approved?: boolean;
	};
}

/**
 * Displays a subtle indicator while a tool is executing.
 * Styled with lower opacity to match modern AI chat UIs (ChatGPT, Claude, t3.chat).
 * This component is temporary and only shown during tool execution.
 *
 * For tools requiring approval, shows a warning state.
 */
export function ToolCallIndicator({
	toolName,
	args,
	state,
	output,
	approval,
}: ToolCallIndicatorProps) {
	// Check if the tool was denied
	const wasDenied =
		state === "approval-responded" && approval?.approved === false;

	// Format the display text based on tool name
	const displayText = getToolDisplayText(toolName, args, state, output, wasDenied);
	const isApprovalRequired = state === "approval-requested";
	const isFinished = output !== undefined || wasDenied;
	const Icon = getToolIcon(toolName);
	const StatusIcon = wasDenied
		? XCircle
		: isFinished
			? CheckCircle2
			: isApprovalRequired
				? AlertTriangle
				: Loader2;

	return (
		<div
			className={cn(
				"flex items-center gap-2 text-sm py-1 transition-colors duration-200",
				wasDenied
					? "text-destructive/70"
					: isApprovalRequired
						? "text-warning"
						: isFinished
							? "text-green-500/80"
							: "text-muted-foreground/60",
			)}
		>
			<StatusIcon
				className={cn(
					"h-3 w-3",
					!isFinished && !isApprovalRequired && "animate-spin",
				)}
			/>
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
	output?: unknown,
	wasDenied?: boolean,
): string {
	// Handle denied tools first
	if (wasDenied) {
		return getDeniedText(toolName, args);
	}

	// Handle approval requests
	if (state === "approval-requested") {
		return getApprovalRequestText(toolName, args);
	}

	// Parse output if it exists - output can be a JSON string, parsed object, or raw string
	let parsedOutput: Record<string, unknown> | undefined;
	if (output !== undefined) {
		if (typeof output === "string") {
			try {
				parsedOutput = JSON.parse(output);
			} catch {
				// Not JSON - leave parsedOutput undefined since we can't access properties on a raw string
				// The isFinished flag will still work correctly for display text
			}
		} else if (typeof output === "object" && output !== null) {
			// Already a parsed object (e.g., from findToolResultForCall or direct assignment)
			parsedOutput = output as Record<string, unknown>;
		}
	}

	const isFinished = output !== undefined;

	switch (toolName) {
		// ===================
		// Search / Discovery
		// ===================

		case "grep": {
			const pattern =
				typeof args.pattern === "string"
					? args.pattern
					: typeof args.query === "string"
						? args.query
						: "";
			const path =
				typeof args.path === "string"
					? args.path
					: typeof args.searchPath === "string"
						? args.searchPath
						: ".";
			const shortPattern =
				pattern.length > 30 ? `${pattern.slice(0, 27)}...` : pattern;
			const shortPath = path.length > 20 ? `...${path.slice(-17)}` : path;

			if (isFinished) {
				const count = (parsedOutput?.totalMatches as number | undefined) ?? 0;
				return `${count} match${count === 1 ? "" : "es"} found for "${shortPattern}"`;
			}

			return pattern
				? `Searching for "${shortPattern}" in ${shortPath}`
				: "Searching files...";
		}

		case "glob": {
			const pattern = typeof args.pattern === "string" ? args.pattern : "*";
			const path =
				typeof args.path === "string"
					? args.path
					: typeof args.searchPath === "string"
						? args.searchPath
						: ".";
			const shortPath = path.length > 20 ? `...${path.slice(-17)}` : path;

			if (isFinished) {
				const count = (parsedOutput?.totalFound as number | undefined) ?? 0;
				return `${count} found: "${pattern}"`;
			}

			return `Finding "${pattern}" in ${shortPath}`;
		}

		case "ls": {
			const path = typeof args.path === "string" ? args.path : ".";
			const shortPath = path.length > 40 ? `...${path.slice(-37)}` : path;

			if (isFinished) {
				const count = (parsedOutput?.totalItems as number | undefined) ?? 0;
				return `${count} item${count === 1 ? "" : "s"} in ${shortPath}`;
			}

			return `Listing directory: ${shortPath}`;
		}

		// ===================
		// Direct file IO
		// ===================

		case "read": {
			const path = typeof args.path === "string" ? args.path : "";
			const shortPath = path.length > 40 ? `...${path.slice(-37)}` : path;

			if (isFinished) {
				if (parsedOutput?.success) {
					const content = parsedOutput?.content;
					const size = typeof content === "string" ? content.length : 0;
					const lines = (parsedOutput?.lineCount as number | undefined) ?? 0;
					return `Read ${lines > 0 ? `${lines} lines` : `${size} bytes`} from ${shortPath}`;
				}
				return `Failed to read ${shortPath}`;
			}

			return `Reading: ${shortPath}`;
		}

		case "write": {
			const path = typeof args.path === "string" ? args.path : "";
			const shortPath = path.length > 40 ? `...${path.slice(-37)}` : path;

			if (isFinished) {
				return parsedOutput?.success
					? `Wrote to ${shortPath}`
					: `Failed to write ${shortPath}`;
			}

			return `Writing: ${shortPath}`;
		}

		case "edit": {
			const path = typeof args.path === "string" ? args.path : "";
			const shortPath = path.length > 40 ? `...${path.slice(-37)}` : path;

			if (isFinished) {
				return parsedOutput?.success
					? `Updated ${shortPath}`
					: `Failed to edit ${shortPath}`;
			}

			return `Editing: ${shortPath}`;
		}

		case "multi_edit": {
			const path = typeof args.path === "string" ? args.path : "";
			const shortPath = path.length > 40 ? `...${path.slice(-37)}` : path;

			if (isFinished) {
				return parsedOutput?.success
					? `Applied batch edits to ${shortPath}`
					: `Failed batch edit on ${shortPath}`;
			}

			return `Batch editing: ${shortPath}`;
		}

		// ===================
		// Shell / Terminal
		// ===================

		case "bash": {
			const command = typeof args.command === "string" ? args.command : "";
			const shortCommand =
				command.length > 50 ? `${command.slice(0, 47)}...` : command;

			if (isFinished) {
				return parsedOutput?.success
					? `Ran: ${shortCommand}`
					: `Failed: ${shortCommand}`;
			}

			return command ? `Running: ${shortCommand}` : "Running command...";
		}

		// ===================
		// External
		// ===================

		case "web_search": {
			const query = typeof args.query === "string" ? args.query : "";

			if (isFinished) {
				const results = parsedOutput?.results as unknown[] | undefined;
				const count = results?.length ?? 0;
				return `${count} result${count === 1 ? "" : "s"} for "${query}"`;
			}

			return query
				? `Searching the web for "${query}"`
				: "Searching the web...";
		}

		default:
			return isFinished ? `Finished ${toolName}` : `Running ${toolName}...`;
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
			const command =
				typeof args.command === "string" ? args.command : "command";
			const shortCommand =
				command.length > 40 ? `${command.slice(0, 37)}...` : command;
			return `⚠️ Approval needed: run "${shortCommand}"`;
		}

		case "write": {
			const path = typeof args.path === "string" ? args.path : "file";
			const shortPath = path.length > 30 ? `...${path.slice(-27)}` : path;
			return `⚠️ Approval needed: write "${shortPath}"`;
		}

		case "edit":
		case "multi_edit": {
			const path = typeof args.path === "string" ? args.path : "file";
			const shortPath = path.length > 30 ? `...${path.slice(-27)}` : path;
			return `⚠️ Approval needed: edit "${shortPath}"`;
		}

		default:
			return `⚠️ Approval needed for ${toolName}`;
	}
}

/**
 * Get text for denied tool operations
 */
function getDeniedText(
	toolName: ToolName,
	args: Record<string, unknown>,
): string {
	switch (toolName) {
		case "bash": {
			const command =
				typeof args.command === "string" ? args.command : "command";
			const shortCommand =
				command.length > 40 ? `${command.slice(0, 37)}...` : command;
			return `Denied: run "${shortCommand}"`;
		}

		case "write": {
			const path = typeof args.path === "string" ? args.path : "file";
			const shortPath = path.length > 30 ? `...${path.slice(-27)}` : path;
			return `Denied: write "${shortPath}"`;
		}

		case "edit":
		case "multi_edit": {
			const path = typeof args.path === "string" ? args.path : "file";
			const shortPath = path.length > 30 ? `...${path.slice(-27)}` : path;
			return `Denied: edit "${shortPath}"`;
		}

		default:
			return `Denied: ${toolName}`;
	}
}
