import type { ReactNode } from "react";
import {
	AlertTriangle,
	Edit2,
	FileText,
	FolderOpen,
	Globe,
	Search,
	Terminal,
} from "lucide-react";
import { createElement } from "react";
import type { ToolName } from "@/tools/types";
import type { ToolDisplayInfo } from "../../types";

// ===================================
// Constants
// ===================================

const ICON_CLASS = "h-4 w-4";

// ===================================
// Utility Functions
// ===================================

/**
 * Truncate a string with ellipsis if it exceeds max length
 */
export function truncate(str: string, maxLength: number): string {
	if (str.length <= maxLength) return str;
	return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Format a count with proper singular/plural suffix
 */
function pluralize(count: number, singular: string, plural?: string): string {
	return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

// ===================================
// Tool Icon Mapping
// ===================================

/**
 * Get the appropriate icon component for a tool type
 */
export function getToolIcon(toolName: ToolName | string): ReactNode {
	switch (toolName) {
		case "bash":
			return createElement(Terminal, { className: ICON_CLASS });
		case "write":
			return createElement(FolderOpen, { className: ICON_CLASS });
		case "edit":
		case "multi_edit":
			return createElement(Edit2, { className: ICON_CLASS });
		case "read":
			return createElement(FileText, { className: ICON_CLASS });
		case "web_search":
			return createElement(Globe, { className: ICON_CLASS });
		case "grep":
		case "glob":
			return createElement(Search, { className: ICON_CLASS });
		default:
			return createElement(AlertTriangle, { className: ICON_CLASS });
	}
}

// ===================================
// Tool-Specific Display Builders
// ===================================

function getBashDisplayInfo(
	args: Record<string, unknown>,
	icon: ReactNode,
): ToolDisplayInfo {
	const command =
		typeof args.command === "string" ? args.command : "command";
	const cwd = typeof args.cwd === "string" ? args.cwd : undefined;
	const timeout = typeof args.timeout === "number" ? args.timeout : undefined;

	const details: ToolDisplayInfo["details"] = [
		{ label: "Command", value: command, isCode: true },
	];

	if (cwd) {
		details.push({ label: "Directory", value: cwd });
	}

	if (timeout) {
		details.push({ label: "Timeout", value: `${timeout}ms` });
	}

	return {
		icon,
		title: "Execute Shell Command",
		description:
			"This command will be executed in a shell. Review it carefully before approving.",
		details,
		variant: "warning",
	};
}

function getWriteDisplayInfo(
	args: Record<string, unknown>,
	icon: ReactNode,
): ToolDisplayInfo {
	const path = typeof args.path === "string" ? args.path : "unknown path";
	const content = typeof args.content === "string" ? args.content : undefined;
	const createDirectories = args.createDirectories === true;

	const details: ToolDisplayInfo["details"] = [{ label: "Path", value: path }];

	if (createDirectories) {
		details.push({ label: "Options", value: "Create directories if needed" });
	}

	// Show the full file content - users need to see exactly what will be written
	if (content !== undefined && content.length > 0) {
		details.push({
			label: "File Content",
			value: content,
			isCode: true,
		});
	}

	return {
		icon,
		title: "Write File",
		description:
			"Review the exact content that will be written to this file.",
		details,
		variant: "warning",
	};
}

function getEditDisplayInfo(
	args: Record<string, unknown>,
	icon: ReactNode,
): ToolDisplayInfo {
	const path = typeof args.path === "string" ? args.path : "unknown path";
	const oldString =
		typeof args.oldString === "string" ? args.oldString : undefined;
	const newString =
		typeof args.newString === "string" ? args.newString : undefined;

	const details: ToolDisplayInfo["details"] = [{ label: "Path", value: path }];

	// Show the full find/replace strings - users need to see exact changes
	if (oldString !== undefined) {
		details.push({
			label: "Find",
			value: oldString,
			isCode: true,
		});
	}

	if (newString !== undefined) {
		details.push({
			label: "Replace with",
			value: newString,
			isCode: true,
		});
	}

	return {
		icon,
		title: "Edit File",
		description: "Review the exact find and replace operation.",
		details,
		variant: "warning",
	};
}

function getMultiEditDisplayInfo(
	args: Record<string, unknown>,
	icon: ReactNode,
): ToolDisplayInfo {
	const path = typeof args.path === "string" ? args.path : "unknown path";
	const edits = Array.isArray(args.edits) ? args.edits : [];

	const details: ToolDisplayInfo["details"] = [
		{ label: "Path", value: path },
		{ label: "Total", value: pluralize(edits.length, "replacement") },
	];

	// Show ALL edits - users need to see every change that will be made
	for (let i = 0; i < edits.length; i++) {
		const edit = edits[i] as { oldString?: string; newString?: string };
		if (edit?.oldString) {
			details.push({
				label: `Find #${i + 1}`,
				value: edit.oldString,
				isCode: true,
			});
		}
		if (edit?.newString !== undefined) {
			details.push({
				label: `Replace #${i + 1}`,
				value: edit.newString,
				isCode: true,
			});
		}
	}

	return {
		icon,
		title: "Batch Edit File",
		description:
			"Review all find-and-replace operations that will be applied.",
		details,
		variant: "warning",
	};
}

function getDefaultDisplayInfo(
	toolName: string,
	args: Record<string, unknown>,
	icon: ReactNode,
): ToolDisplayInfo {
	const entries = Object.entries(args).slice(0, 5);
	const details: ToolDisplayInfo["details"] = entries.map(([key, value]) => ({
		label: key,
		value:
			typeof value === "string"
				? truncate(value, 100)
				: JSON.stringify(value).slice(0, 100),
	}));

	const totalKeys = Object.keys(args).length;
	if (totalKeys > 5) {
		const remaining = totalKeys - 5;
		details.push({
			label: "",
			value: `... and ${pluralize(remaining, "more parameter")}`,
		});
	}

	return {
		icon,
		title: `Approve ${toolName}`,
		description: "This tool requires your approval before executing.",
		details,
		variant: "warning",
	};
}

// ===================================
// Main Export
// ===================================

/**
 * Get display information for a tool based on its name and arguments.
 *
 * This function returns all the data needed to render a tool approval card,
 * including the icon, title, description, details, and styling variant.
 *
 * @param toolName - The name of the tool (from ToolName union or custom string)
 * @param args - The arguments passed to the tool
 */
export function getToolDisplayInfo(
	toolName: ToolName | string,
	args: Record<string, unknown>,
): ToolDisplayInfo {
	const icon = getToolIcon(toolName);

	switch (toolName) {
		case "bash":
			return getBashDisplayInfo(args, icon);
		case "write":
			return getWriteDisplayInfo(args, icon);
		case "edit":
			return getEditDisplayInfo(args, icon);
		case "multi_edit":
			return getMultiEditDisplayInfo(args, icon);
		default:
			return getDefaultDisplayInfo(toolName, args, icon);
	}
}
