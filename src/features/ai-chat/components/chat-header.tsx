import { Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatHeaderProps {
	hasMessages: boolean;
	isLoading: boolean;
	onClear: () => void;
	title?: string;
}

/**
 * Chat header with title and clear conversation button.
 * Uses a confirmation dialog before clearing the conversation.
 */
export function ChatHeader({
	hasMessages,
	isLoading,
	onClear,
	title = "Rapid Chat",
}: ChatHeaderProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const handleConfirmClear = useCallback(() => {
		onClear();
		setIsDialogOpen(false);
	}, [onClear]);

	return (
		<>
			<div className="flex items-center justify-between p-2 px-4">
				<div className="flex items-center gap-2">
					<h1 className="font-bold truncate">{title}</h1>
				</div>

				{/* Clear conversation button with confirmation dialog */}
				{hasMessages && (
					<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
						<Tooltip>
							<TooltipTrigger asChild>
								<DialogTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										disabled={isLoading}
										className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2"
									>
										<Trash2 className="h-4 w-4" />
										Clear
									</Button>
								</DialogTrigger>
							</TooltipTrigger>
							<TooltipContent>Clear conversation</TooltipContent>
						</Tooltip>

						<DialogContent>
							<DialogHeader>
								<DialogTitle>Clear Conversation</DialogTitle>
								<DialogDescription>
									Are you sure you want to clear this conversation? This action
									cannot be undone and all messages will be permanently deleted.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<DialogClose asChild>
									<Button variant="outline">Cancel</Button>
								</DialogClose>
								<Button variant="destructive" onClick={handleConfirmClear}>
									<Trash2 className="h-4 w-4 mr-2" />
									Clear Conversation
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				)}
			</div>

			<Separator className="mb-2" />
		</>
	);
}
