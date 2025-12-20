import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ThinkingSectionProps {
	content: string;
	isThinking: boolean;
}

/**
 * Component to display collapsible thinking/reasoning content.
 * Uses Shadcn Collapsible for proper accessibility and animation.
 *
 * Behavior:
 * - Starts EXPANDED when streaming reasoning (isThinking=true)
 * - Auto-collapses when reasoning finishes (isThinking transitions false)
 * - Stays collapsed for persisted/loaded messages
 */
export function ThinkingSection({ content, isThinking }: ThinkingSectionProps) {
	// Start expanded when actively thinking, collapsed for persisted content
	const [isOpen, setIsOpen] = useState(isThinking);
	const prevThinkingRef = useRef(isThinking);
	// Track if we've auto-collapsed to avoid re-collapsing on subsequent renders
	const hasAutoCollapsedRef = useRef(false);

	// Handle transition from thinking -> done (auto-collapse when reasoning finishes)
	useEffect(() => {
		if (
			prevThinkingRef.current &&
			!isThinking &&
			!hasAutoCollapsedRef.current
		) {
			// Reasoning just finished: Collapse automatically
			setIsOpen(false);
			hasAutoCollapsedRef.current = true;
		} else if (!prevThinkingRef.current && isThinking) {
			// Starting to think: Expand automatically and reset collapse tracking
			setIsOpen(true);
			hasAutoCollapsedRef.current = false;
		}
		prevThinkingRef.current = isThinking;
	}, [isThinking]);

	if (!content && !isThinking) return null;

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-2">
			<CollapsibleTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="flex items-center gap-1.5 h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
				>
					<Brain
						className={`h-3.5 w-3.5 transition-colors ${isThinking ? "text-primary animate-pulse" : ""}`}
					/>
					<span className="font-medium">
						{isThinking ? "Thinking..." : "Thoughts"}
					</span>
					{isOpen ? (
						<ChevronUp className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
					) : (
						<ChevronDown className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
					)}
				</Button>
			</CollapsibleTrigger>

			<CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
				<div className="pl-2 border-l-2 border-primary/20 text-sm text-muted-foreground italic whitespace-pre-wrap py-2">
					{content}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
