import { Check, X } from "lucide-react";
import { memo } from "react";
import { Highlight, themes } from "prism-react-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ToolName } from "@/tools/types";

// ===================================
// Types
// ===================================

export interface ToolApprovalCardProps {
	/** The name of the tool requiring approval */
	toolName: ToolName | string;
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

// ===================================
// Utility Functions
// ===================================

/**
 * Extract file extension from path and map to language
 */
function getLanguageFromPath(path: string): string {
	const ext = path.toLowerCase().match(/\.([^.]+)$/)?.[1] || "";
	const langMap: Record<string, string> = {
		ts: "typescript",
		tsx: "tsx",
		js: "javascript",
		jsx: "jsx",
		py: "python",
		rb: "ruby",
		java: "java",
		go: "go",
		rs: "rust",
		cpp: "cpp",
		c: "c",
		h: "c",
		hpp: "cpp",
		cs: "csharp",
		php: "php",
		swift: "swift",
		kt: "kotlin",
		scala: "scala",
		sh: "bash",
		bash: "bash",
		zsh: "bash",
		fish: "bash",
		ps1: "powershell",
		sql: "sql",
		html: "html",
		css: "css",
		scss: "scss",
		less: "less",
		json: "json",
		yaml: "yaml",
		yml: "yaml",
		toml: "toml",
		xml: "xml",
		md: "markdown",
		mdx: "markdown",
		graphql: "graphql",
		gql: "graphql",
		dockerfile: "docker",
		makefile: "makefile",
		cmake: "cmake",
	};
	return langMap[ext] || "text";
}

// Filename helper removed - not currently needed

// ===================================
// Code Block Component
// ===================================

interface InlineCodeBlockProps {
	code: string;
	language: string;
	maxLines?: number;
}

function InlineCodeBlock({
	code,
	language,
	maxLines = 5,
}: InlineCodeBlockProps) {
	const lineHeight = 20; // approximate line height in px
	const paddingTop = language !== "text" ? 28 : 8; // extra room for language badge
	const maxHeight = maxLines * lineHeight + paddingTop + 8; // +8 for bottom padding

	return (
		<div
			className="relative rounded-md border bg-[#282c34] my-2 overflow-auto"
			style={{ maxHeight }}
		>
			{/* Language badge */}
			{language !== "text" && (
				<Badge
					variant="secondary"
					className="sticky top-1 left-1 z-10 px-1.5 py-0 h-5 text-[10px] font-medium uppercase tracking-wide bg-muted/80 text-muted-foreground inline-block"
				>
					{language}
				</Badge>
			)}
			<Highlight theme={themes.oneDark} code={code} language={language}>
				{({ className, style, tokens, getLineProps, getTokenProps }) => (
					<pre
						className={cn(
							"p-2 text-xs font-mono whitespace-pre",
							language !== "text" && "pt-1",
							className,
						)}
						style={{
							...style,
							background: "transparent",
							margin: 0,
							minWidth: "max-content",
						}}
					>
						{tokens.map((line, i) => (
							<div key={i} {...getLineProps({ line })}>
								{line.map((token, key) => (
									<span key={key} {...getTokenProps({ token })} />
								))}
							</div>
						))}
					</pre>
				)}
			</Highlight>
		</div>
	);
}

// ===================================
// Tool-Specific Renderers
// ===================================

interface ToolContentProps {
	toolName: string;
	args: Record<string, unknown>;
}

function WriteToolContent({ args }: ToolContentProps) {
	const path = typeof args.path === "string" ? args.path : "unknown path";
	const content = typeof args.content === "string" ? args.content : "";
	const language = getLanguageFromPath(path);

	return (
		<div className="text-sm">
			<span className="text-muted-foreground">Write to file </span>
			<code className="bg-muted/70 px-1.5 py-0.5 rounded text-xs font-mono">
				{path}
			</code>
			<span className="text-muted-foreground"> with contents:</span>
			{content && <InlineCodeBlock code={content} language={language} />}
		</div>
	);
}

function EditToolContent({ args }: ToolContentProps) {
	const path = typeof args.path === "string" ? args.path : "unknown path";
	const oldString = typeof args.oldString === "string" ? args.oldString : "";
	const newString = typeof args.newString === "string" ? args.newString : "";
	const language = getLanguageFromPath(path);

	return (
		<div className="text-sm space-y-2">
			<div>
				<span className="text-muted-foreground">Edit </span>
				<code className="bg-muted/70 px-1.5 py-0.5 rounded text-xs font-mono">
					{path}
				</code>
			</div>
			{oldString && (
				<div>
					<span className="text-xs text-muted-foreground font-medium">
						Find:
					</span>
					<InlineCodeBlock code={oldString} language={language} maxLines={3} />
				</div>
			)}
			{newString && (
				<div>
					<span className="text-xs text-muted-foreground font-medium">
						Replace with:
					</span>
					<InlineCodeBlock code={newString} language={language} maxLines={3} />
				</div>
			)}
		</div>
	);
}

function MultiEditToolContent({ args }: ToolContentProps) {
	const path = typeof args.path === "string" ? args.path : "unknown path";
	const edits = Array.isArray(args.edits) ? args.edits : [];
	const language = getLanguageFromPath(path);

	return (
		<div className="text-sm space-y-2">
			<div>
				<span className="text-muted-foreground">Batch edit </span>
				<code className="bg-muted/70 px-1.5 py-0.5 rounded text-xs font-mono">
					{path}
				</code>
				<span className="text-muted-foreground">
					{" "}
					({edits.length} replacement{edits.length !== 1 ? "s" : ""})
				</span>
			</div>
			<ScrollArea className="max-h-48">
				<div className="space-y-3">
					{edits.map((edit, i) => {
						const e = edit as { oldString?: string; newString?: string };
						return (
							<div
								key={i}
								className="border-l-2 border-muted-foreground/30 pl-2"
							>
								<span className="text-xs text-muted-foreground font-medium">
									#{i + 1}
								</span>
								{e?.oldString && (
									<div>
										<span className="text-xs text-muted-foreground">Find:</span>
										<InlineCodeBlock
											code={e.oldString}
											language={language}
											maxLines={2}
										/>
									</div>
								)}
								{e?.newString !== undefined && (
									<div>
										<span className="text-xs text-muted-foreground">
											Replace:
										</span>
										<InlineCodeBlock
											code={e.newString}
											language={language}
											maxLines={2}
										/>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</ScrollArea>
		</div>
	);
}

function BashToolContent({ args }: ToolContentProps) {
	const command = typeof args.command === "string" ? args.command : "";
	const cwd = typeof args.cwd === "string" ? args.cwd : undefined;

	return (
		<div className="text-sm">
			<span className="text-muted-foreground">Execute command</span>
			{cwd && (
				<>
					<span className="text-muted-foreground"> in </span>
					<code className="bg-muted/70 px-1.5 py-0.5 rounded text-xs font-mono">
						{cwd}
					</code>
				</>
			)}
			<span className="text-muted-foreground">:</span>
			{command && <InlineCodeBlock code={command} language="bash" />}
		</div>
	);
}

function DefaultToolContent({ toolName, args }: ToolContentProps) {
	const entries = Object.entries(args).slice(0, 4);

	return (
		<div className="text-sm space-y-1">
			<span className="text-muted-foreground">
				Approve{" "}
				<code className="bg-muted/70 px-1.5 py-0.5 rounded text-xs font-mono">
					{toolName}
				</code>
			</span>
			{entries.length > 0 && (
				<div className="text-xs text-muted-foreground space-y-0.5 mt-1">
					{entries.map(([key, value]) => (
						<div key={key} className="flex gap-2">
							<span className="font-medium min-w-[60px]">{key}:</span>
							<code className="font-mono truncate max-w-[200px]">
								{typeof value === "string"
									? value.slice(0, 50) + (value.length > 50 ? "..." : "")
									: JSON.stringify(value).slice(0, 50)}
							</code>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ===================================
// Action Buttons
// ===================================

interface ActionButtonsProps {
	approvalId: string;
	onApprove: (approvalId: string) => void;
	onDeny: (approvalId: string) => void;
}

function ActionButtons({ approvalId, onApprove, onDeny }: ActionButtonsProps) {
	return (
		<div className="flex gap-2 mt-2">
			<Button
				variant="outline"
				size="sm"
				onClick={() => onDeny(approvalId)}
				className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-destructive hover:border-destructive"
				data-testid="deny-button"
			>
				<X className="h-3 w-3" />
				Deny
			</Button>
			<Button
				size="sm"
				onClick={() => onApprove(approvalId)}
				className="h-7 px-2 gap-1 text-xs"
				data-testid="approve-button"
			>
				<Check className="h-3 w-3" />
				Approve
			</Button>
		</div>
	);
}

// ===================================
// Main Component
// ===================================

/**
 * Streamlined, inline approval card for tool execution.
 *
 * Displays a compact, elegant approval UI with:
 * - Inline description of the operation
 * - Scrollable code block with syntax highlighting
 * - Compact approve/deny buttons
 */
function ToolApprovalCardComponent({
	toolName,
	args,
	approvalId,
	onApprove,
	onDeny,
	className,
}: ToolApprovalCardProps) {
	const renderContent = () => {
		switch (toolName) {
			case "write":
				return <WriteToolContent toolName={toolName} args={args} />;
			case "edit":
				return <EditToolContent toolName={toolName} args={args} />;
			case "multi_edit":
				return <MultiEditToolContent toolName={toolName} args={args} />;
			case "bash":
				return <BashToolContent toolName={toolName} args={args} />;
			default:
				return <DefaultToolContent toolName={toolName} args={args} />;
		}
	};

	return (
		<div
			className={cn(
				"my-2 rounded-lg border border-warning/30 bg-warning/5 p-3",
				className,
			)}
			data-testid="tool-approval-card"
			data-tool-name={toolName}
		>
			{renderContent()}
			<ActionButtons
				approvalId={approvalId}
				onApprove={onApprove}
				onDeny={onDeny}
			/>
		</div>
	);
}

export const ToolApprovalCard = memo(ToolApprovalCardComponent);
