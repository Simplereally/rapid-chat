import { Loader2 } from "lucide-react";

/**
 * Simple indicator shown while the AI is generating a response.
 * Used when streaming has started but no visible content (text, thinking, tools) yet.
 */
export function GeneratingIndicator() {
	return (
		<div className="flex items-center gap-2 text-sm py-1 text-muted-foreground/60">
			<Loader2 className="h-3 w-3 animate-spin" />
			<span className="italic">Generating...</span>
		</div>
	);
}
