import {
	AlertTriangle,
	Check,
	Edit2,
	FileText,
	FolderOpen,
	Globe,
	Search,
	Terminal,
	X,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ToolApprovalCardProps {
	/** The name of the tool requiring approval */
	toolName: string;
	/** The arguments passed to the tool */
	args: Record<string, unknown>;
	/** The approval ID for responding to the approval request */
	approvalId: string;
	/** Callback when user approves the tool execution */
	onApprove: (approvalId: string) => void;
	/** Callback when user denies the tool execution */
	onDeny: (approvalId: string) => void;
	/** Optional additional className */
	className?: string;
}

interface ToolDisplayInfo {
	icon: ReactNode;
	title: string;
	description: string;
	details: Array<{ label: string; value: string; isCode?: boolean }>;
	variant: "warning" | "danger";
}

/**
 * Get the appropriate icon for a tool type
 */
function getToolIcon(toolName: string): ReactNode {
	switch (toolName) {
		case "bash":
			return <Terminal className="h-4 w-4" />;
		case "write":
			return <FolderOpen className="h-4 w-4" />;
		case "edit":
		case "multi_edit":
			return <Edit2 className="h-4 w-4" />;
		case "read":
			return <FileText className="h-4 w-4" />;
		case "web_search":
			return <Globe className="h-4 w-4" />;
		case "grep":
		case "glob":
			return <Search className="h-4 w-4" />;
		default:
			return <AlertTriangle className="h-4 w-4" />;
	}
}

/**
 * Truncate a string with ellipsis if it exceeds max length
 */
function truncate(str: string, maxLength: number): string {
	if (str.length <= maxLength) return str;
	return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Get display information for a tool based on its name and arguments
 */
function getToolDisplayInfo(
	toolName: string,
	args: Record<string, unknown>,
): ToolDisplayInfo {
	const icon = getToolIcon(toolName);

	switch (toolName) {
		case "bash": {
			const command =
				typeof args.command === "string" ? args.command : "command";
			const cwd = typeof args.cwd === "string" ? args.cwd : undefined;
			const timeout =
				typeof args.timeout === "number" ? args.timeout : undefined;

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

		case "write": {
			const path = typeof args.path === "string" ? args.path : "unknown path";
			const content =
				typeof args.content === "string" ? args.content : undefined;
			const createDirectories = args.createDirectories === true;

			const details: ToolDisplayInfo["details"] = [
				{ label: "Path", value: path },
			];

			if (content !== undefined) {
				const lineCount = content.split("\n").length;
				const charCount = content.length;
				details.push({
					label: "Content",
					value: `${lineCount} line${lineCount === 1 ? "" : "s"}, ${charCount} char${charCount === 1 ? "" : "s"}`,
				});
				// Show a preview of the content
				if (content.length > 0) {
					details.push({
						label: "Preview",
						value: truncate(content, 200),
						isCode: true,
					});
				}
			}

			if (createDirectories) {
				details.push({ label: "Options", value: "Create directories if needed" });
			}

			return {
				icon,
				title: "Write File",
				description:
					"This will create or overwrite the file at the specified path.",
				details,
				variant: "warning",
			};
		}

		case "edit": {
			const path = typeof args.path === "string" ? args.path : "unknown path";
			const oldString =
				typeof args.oldString === "string" ? args.oldString : undefined;
			const newString =
				typeof args.newString === "string" ? args.newString : undefined;

			const details: ToolDisplayInfo["details"] = [
				{ label: "Path", value: path },
			];

			if (oldString !== undefined) {
				details.push({
					label: "Find",
					value: truncate(oldString, 150),
					isCode: true,
				});
			}

			if (newString !== undefined) {
				details.push({
					label: "Replace",
					value: truncate(newString, 150),
					isCode: true,
				});
			}

			return {
				icon,
				title: "Edit File",
				description:
					"This will find and replace text in the specified file.",
				details,
				variant: "warning",
			};
		}

		case "multi_edit": {
			const path = typeof args.path === "string" ? args.path : "unknown path";
			const edits = Array.isArray(args.edits) ? args.edits : [];

			const details: ToolDisplayInfo["details"] = [
				{ label: "Path", value: path },
				{ label: "Edits", value: `${edits.length} replacement${edits.length === 1 ? "" : "s"}` },
			];

			// Show preview of first few edits
			for (let i = 0; i < Math.min(edits.length, 2); i++) {
				const edit = edits[i] as { oldString?: string; newString?: string };
				if (edit?.oldString) {
					details.push({
						label: `Edit ${i + 1}`,
						value: truncate(edit.oldString, 80),
						isCode: true,
					});
				}
			}

			if (edits.length > 2) {
				details.push({
					label: "",
					value: `... and ${edits.length - 2} more edit${edits.length - 2 === 1 ? "" : "s"}`,
				});
			}

			return {
				icon,
				title: "Batch Edit File",
				description:
					"This will apply multiple find-and-replace operations to the file.",
				details,
				variant: "warning",
			};
		}

		default: {
			// Generic fallback for any other tool
			const details: ToolDisplayInfo["details"] = Object.entries(args)
				.slice(0, 5)
				.map(([key, value]) => ({
					label: key,
					value:
						typeof value === "string"
							? truncate(value, 100)
							: JSON.stringify(value).slice(0, 100),
				}));

			if (Object.keys(args).length > 5) {
				details.push({
					label: "",
					value: `... and ${Object.keys(args).length - 5} more parameter${Object.keys(args).length - 5 === 1 ? "" : "s"}`,
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
	}
}

/**
 * Generic approval card component for any tool that requires user approval.
 *
 * This component displays:
 * - Tool icon and name badge
 * - Human-readable description of what the tool will do
 * - Details of the operation (file path, command, content preview, etc.)
 * - Approve and Deny buttons
 *
 * Used for: write, edit, multi_edit, and any other tools that need approval.
 * Note: The bash tool uses TerminalOutput for a specialized terminal UI.
 */
export function ToolApprovalCard({
	toolName,
	args,
	approvalId,
	onApprove,
	onDeny,
	className,
}: ToolApprovalCardProps) {
	const { icon, title, description, details, variant } = getToolDisplayInfo(
		toolName,
		args,
	);

	const borderColor =
		variant === "danger" ? "border-destructive/40" : "border-warning/40";
	const bgColor =
		variant === "danger" ? "bg-destructive/5" : "bg-warning/5";
	const iconBgColor =
		variant === "danger" ? "bg-destructive/10" : "bg-warning/10";
	const iconColor =
		variant === "danger" ? "text-destructive" : "text-warning";

	return (
		<div
			className={cn(
				"my-2 rounded-lg border p-4 space-y-3",
				borderColor,
				bgColor,
				className,
			)}
			data-testid="tool-approval-card"
			data-tool-name={toolName}
		>
			{/* Header with icon, title, and badge */}
			<div className="flex items-start gap-3">
				<div
					className={cn(
						"flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
						iconBgColor,
					)}
				>
					<div className={iconColor}>{icon}</div>
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h4 className="font-semibold text-sm">{title}</h4>
						<Badge
							variant="outline"
							className="text-xs font-mono shrink-0"
						>
							{toolName}
						</Badge>
					</div>
					<p className="text-xs text-muted-foreground mt-1">{description}</p>
				</div>
			</div>

			{/* Details section */}
			{details.length > 0 && (
				<ScrollArea className="max-h-48 rounded-md border bg-muted/30 p-3">
					<div className="space-y-2">
						{details.map((detail, index) => (
							<div
								key={`${detail.label}-${index}`}
								className="flex items-start gap-2 text-xs"
							>
								{detail.label && (
									<span className="text-muted-foreground font-medium min-w-[70px] shrink-0">
										{detail.label}:
									</span>
								)}
								{detail.isCode ? (
									<code className="font-mono text-xs break-all whitespace-pre-wrap bg-muted/50 px-1 py-0.5 rounded">
										{detail.value}
									</code>
								) : (
									<span className="break-all">{detail.value}</span>
								)}
							</div>
						))}
					</div>
				</ScrollArea>
			)}

			{/* Action buttons */}
			<div className="flex gap-2 pt-1">
				<Button
					variant="outline"
					size="sm"
					onClick={() => onDeny(approvalId)}
					className="flex-1 gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive"
					data-testid="deny-button"
				>
					<X className="h-3.5 w-3.5" />
					Deny
				</Button>
				<Button
					size="sm"
					onClick={() => onApprove(approvalId)}
					className="flex-1 gap-1.5"
					data-testid="approve-button"
				>
					<Check className="h-3.5 w-3.5" />
					Approve
				</Button>
			</div>
		</div>
	);
}
