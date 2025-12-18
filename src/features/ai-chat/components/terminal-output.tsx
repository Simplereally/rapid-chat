import { CheckCircle, XCircle, Terminal, Clock, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TerminalOutputProps {
	command: string;
	output?: {
		success: boolean;
		exitCode: number | null;
		stdout: string;
		stderr: string;
		timedOut: boolean;
		executionTime: number;
	};
	isExecuting?: boolean;
	isApprovalRequired?: boolean;
}

/**
 * Terminal output component for displaying bash command execution inline.
 * Similar to how Cursor, Antigravity, and other AI coding tools display terminal output.
 */
export function TerminalOutput({
	command,
	output,
	isExecuting,
	isApprovalRequired,
}: TerminalOutputProps) {
	const [isExpanded, setIsExpanded] = useState(true);
	
	const hasOutput = output && (output.stdout || output.stderr);
	const showExpandButton = hasOutput && (output.stdout.length > 200 || output.stderr.length > 100);

	return (
		<div className="my-2 rounded-lg border border-border bg-zinc-900 font-mono text-sm overflow-hidden">
			{/* Terminal header */}
			<div 
				className={cn(
					"flex items-center gap-2 px-3 py-2 border-b border-border/50",
					isApprovalRequired && "bg-warning/10",
					isExecuting && "bg-primary/10",
					output?.success && "bg-green-500/10",
					output && !output.success && "bg-red-500/10",
				)}
				onClick={() => hasOutput && setIsExpanded(!isExpanded)}
				role={hasOutput ? "button" : undefined}
				style={{ cursor: hasOutput ? "pointer" : "default" }}
			>
				{/* Status indicator */}
				{isApprovalRequired && (
					<Clock className="h-4 w-4 text-warning shrink-0" />
				)}
				{isExecuting && (
					<Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
				)}
				{output?.success && (
					<CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
				)}
				{output && !output.success && (
					<XCircle className="h-4 w-4 text-red-500 shrink-0" />
				)}
				
				<Terminal className="h-4 w-4 text-muted-foreground shrink-0" />
				
				{/* Command */}
				<code className="text-zinc-300 truncate flex-1">
					$ {command}
				</code>
				
				{/* Execution time / status */}
				{output && (
					<span className="text-xs text-muted-foreground shrink-0">
						{output.timedOut ? (
							<span className="text-warning">Timed out</span>
						) : output.exitCode !== null ? (
							`Exit: ${output.exitCode} (${output.executionTime}ms)`
						) : (
							"Killed"
						)}
					</span>
				)}
				
				{/* Expand/collapse indicator */}
				{showExpandButton && (
					<span className="text-xs text-muted-foreground">
						{isExpanded ? "▼" : "▶"}
					</span>
				)}
			</div>

			{/* Output content */}
			{isExpanded && hasOutput && (
				<div className="px-3 py-2 max-h-80 overflow-auto">
					{/* stdout */}
					{output.stdout && (
						<pre className="text-zinc-200 whitespace-pre-wrap break-all text-xs leading-relaxed">
							{output.stdout}
						</pre>
					)}
					
					{/* stderr - show in red/orange */}
					{output.stderr && (
						<pre className={cn(
							"whitespace-pre-wrap break-all text-xs leading-relaxed mt-2",
							output.success ? "text-yellow-400" : "text-red-400"
						)}>
							{output.stderr}
						</pre>
					)}
				</div>
			)}
			
			{/* Waiting for approval state */}
			{isApprovalRequired && !output && (
				<div className="px-3 py-2 text-warning/80 text-xs italic">
					Waiting for approval to execute...
				</div>
			)}
			
			{/* Executing state */}
			{isExecuting && !output && (
				<div className="px-3 py-2 text-primary/80 text-xs italic flex items-center gap-2">
					<span className="animate-pulse">Executing command...</span>
				</div>
			)}
		</div>
	);
}
