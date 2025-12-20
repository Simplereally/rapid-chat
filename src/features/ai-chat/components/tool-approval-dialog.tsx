import { AlertTriangle, Check, FileText, FolderOpen, X } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ToolApprovalDialogProps {
	isOpen: boolean;
	toolName: string;
	toolCallId: string;
	approvalId: string;
	args: Record<string, unknown>;
	onApprove: (approvalId: string) => void;
	onDeny: (approvalId: string) => void;
}

/**
 * Dialog for approving/denying dangerous tool operations.
 * Displays detailed information about what the tool is trying to do.
 */
export function ToolApprovalDialog({
	isOpen,
	toolName,
	args,
	approvalId,
	onApprove,
	onDeny,
}: ToolApprovalDialogProps) {
	const { title, description, details } = getApprovalDetails(toolName, args);

	return (
		<AlertDialog open={isOpen}>
			<AlertDialogContent className="max-w-lg">
				<AlertDialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
							<AlertTriangle className="h-5 w-5 text-warning" />
						</div>
						<div>
							<AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
							<Badge variant="outline" className="mt-1 text-xs font-mono">
								{toolName}
							</Badge>
						</div>
					</div>
				</AlertDialogHeader>

				<AlertDialogDescription className="text-foreground/80">
					{description}
				</AlertDialogDescription>

				{details.length > 0 && (
					<ScrollArea className="max-h-48 rounded-md border bg-muted/30 p-3">
						<div className="space-y-2 text-sm">
							{details.map((detail, index) => (
								<div key={index} className="flex items-start gap-2">
									<span className="text-muted-foreground font-medium min-w-[80px]">
										{detail.label}:
									</span>
									<span className="font-mono text-xs break-all">
										{detail.value}
									</span>
								</div>
							))}
						</div>
					</ScrollArea>
				)}

				<AlertDialogFooter>
					<AlertDialogCancel
						onClick={() => onDeny(approvalId)}
						className="gap-2"
					>
						<X className="h-4 w-4" />
						Deny
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={() => onApprove(approvalId)}
						className="gap-2 bg-primary hover:bg-primary/90"
					>
						<Check className="h-4 w-4" />
						Approve
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

/**
 * Inline approval UI for when dialogs aren't preferred
 */
interface ToolApprovalInlineProps {
	toolName: string;
	args: Record<string, unknown>;
	approvalId: string;
	onApprove: (approvalId: string) => void;
	onDeny: (approvalId: string) => void;
}

export function ToolApprovalInline({
	toolName,
	args,
	approvalId,
	onApprove,
	onDeny,
}: ToolApprovalInlineProps) {
	const { title, description, details } = getApprovalDetails(toolName, args);

	return (
		<div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
			<div className="flex items-center gap-3">
				<AlertTriangle className="h-5 w-5 text-warning shrink-0" />
				<div className="flex-1">
					<h4 className="font-medium text-sm">{title}</h4>
					<p className="text-xs text-muted-foreground mt-0.5">{description}</p>
				</div>
			</div>

			{details.length > 0 && (
				<div className="bg-muted/30 rounded-md p-2 space-y-1">
					{details.slice(0, 3).map((detail, index) => (
						<div key={index} className="flex items-center gap-2 text-xs">
							<span className="text-muted-foreground">{detail.label}:</span>
							<code className="font-mono truncate max-w-[200px]">
								{detail.value}
							</code>
						</div>
					))}
				</div>
			)}

			<div className="flex gap-2">
				<button
					onClick={() => onDeny(approvalId)}
					className="flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-muted hover:bg-muted/80 transition-colors"
				>
					<X className="h-4 w-4" />
					Deny
				</button>
				<button
					onClick={() => onApprove(approvalId)}
					className="flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
				>
					<Check className="h-4 w-4" />
					Approve
				</button>
			</div>
		</div>
	);
}

// =============================================================================
// Helper Functions
// =============================================================================

interface ApprovalDetails {
	title: string;
	description: string;
	details: Array<{ label: string; value: string }>;
}

function getApprovalDetails(
	toolName: string,
	args: Record<string, unknown>,
): ApprovalDetails {
	switch (toolName) {
		case "file_write": {
			const operation = String(args.operation ?? "unknown");
			const path = String(args.path ?? "unknown");
			const destination = args.destination ? String(args.destination) : null;
			const contentPreview = args.content
				? String(args.content).slice(0, 100) +
					(String(args.content).length > 100 ? "..." : "")
				: null;

			const operationLabels: Record<string, string> = {
				write_file: "Write File",
				append_file: "Append to File",
				create_directory: "Create Directory",
				delete: "Delete",
				move: "Move/Rename",
				copy: "Copy",
			};

			const operationDescriptions: Record<string, string> = {
				write_file: "This will create or overwrite the specified file.",
				append_file: "This will add content to the end of the file.",
				create_directory: "This will create a new directory.",
				delete: "This will permanently delete the file or directory.",
				move: "This will move or rename the file/directory.",
				copy: "This will create a copy of the file/directory.",
			};

			const details: ApprovalDetails["details"] = [
				{ label: "Path", value: path },
			];

			if (destination) {
				details.push({ label: "Destination", value: destination });
			}

			if (contentPreview && operation !== "delete") {
				details.push({ label: "Content", value: contentPreview });
			}

			return {
				title: operationLabels[operation] ?? "File Operation",
				description:
					operationDescriptions[operation] ??
					"This operation will modify the filesystem.",
				details,
			};
		}

		default:
			return {
				title: `Approve ${toolName}`,
				description: "This tool requires your approval before executing.",
				details: Object.entries(args).map(([key, value]) => ({
					label: key,
					value: String(value),
				})),
			};
	}
}

/**
 * Icon getter for tool types
 */
export function getToolIcon(toolName: string): React.ReactNode {
	switch (toolName) {
		case "file_read":
			return <FileText className="h-4 w-4" />;
		case "file_write":
			return <FolderOpen className="h-4 w-4" />;
		default:
			return null;
	}
}
