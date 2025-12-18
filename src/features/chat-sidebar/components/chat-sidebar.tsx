"use client";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useClerk, useUser } from "@clerk/tanstack-react-start";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
	Check,
	Edit,
	Edit3Icon,
	Loader2,
	LogOut,
	MessageSquare,
	MessageSquarePlus,
	MoreHorizontal,
	Pencil,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
	useThreadIsUnread,
	useThreadStreamingStatus,
} from "../../../stores/chat-client-store";

// Thread row component with streaming/unread indicators
function ThreadRow({
	threadId,
	title,
}: Readonly<{ threadId: Id<"threads">; title: string }>) {
	const streamingStatus = useThreadStreamingStatus(threadId);
	const isUnread = useThreadIsUnread(threadId);

	return (
		<>
			<MessageSquare className="h-4 w-4 shrink-0 opacity-60" />
			<span className="truncate flex-1 min-w-0">{title}</span>
			{streamingStatus === "streaming" && (
				<Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
			)}
			{isUnread && <Check className="h-3 w-3 shrink-0 text-green-500" />}
		</>
	);
}

export function ChatSidebar() {
	const threads = useQuery(api.threads.list);
	const createThread = useMutation(api.threads.create);
	const deleteThread = useMutation(api.threads.remove);
	const updateThreadTitle = useMutation(api.threads.updateTitle);
	const navigate = useNavigate();
	const params = useParams({ strict: false });
	const { isMobile, setOpenMobile } = useSidebar();
	const [threadToDelete, setThreadToDelete] = useState<Id<"threads"> | null>(
		null,
	);
	const [threadToRename, setThreadToRename] = useState<Id<"threads"> | null>(
		null,
	);
	const [renameTitle, setRenameTitle] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const { signOut } = useClerk();
	const { user } = useUser();

	const currentThreadId = params.threadId as Id<"threads"> | undefined;

	const [isShiftPressed, setIsShiftPressed] = useState(false);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Shift") setIsShiftPressed(true);
		};
		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === "Shift") setIsShiftPressed(false);
		};
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, []);

	const handleNewChat = async () => {
		setIsCreating(true);
		try {
			const threadId = await createThread({});
			if (isMobile) {
				setOpenMobile(false);
			}
			navigate({
				to: "/chat/$threadId",
				params: { threadId },
				search: { initialInput: undefined, initialThinking: undefined },
			});
		} finally {
			setIsCreating(false);
		}
	};

	const handleDeleteThread = async (id?: Id<"threads">) => {
		const threadId = id ?? threadToDelete;
		if (!threadId) return;

		await deleteThread({ threadId });
		if (!id) setThreadToDelete(null);

		// If we deleted the current thread, navigate to new chat
		if (currentThreadId === threadId) {
			navigate({ to: "/chat" });
		}
	};

	const handleRenameThread = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!threadToRename || !renameTitle.trim()) return;

		await updateThreadTitle({
			threadId: threadToRename,
			title: renameTitle.trim(),
		});
		setThreadToRename(null);
		setRenameTitle("");
	};

	const openRenameDialog = (threadId: Id<"threads">, currentTitle: string) => {
		setRenameTitle(currentTitle);
		setThreadToRename(threadId);
	};

	const handleThreadClick = () => {
		if (isMobile) {
			setOpenMobile(false);
		}
	};

	// Group threads by time period
	const groupedThreads = threads
		? (() => {
				const now = Date.now();
				const today = new Date(now).setHours(0, 0, 0, 0);
				const yesterday = today - 24 * 60 * 60 * 1000;
				const lastWeek = today - 7 * 24 * 60 * 60 * 1000;

				const groups: { label: string; threads: typeof threads }[] = [
					{ label: "Today", threads: [] },
					{ label: "Yesterday", threads: [] },
					{ label: "Previous 7 Days", threads: [] },
					{ label: "Older", threads: [] },
				];

				for (const thread of threads) {
					const updatedAt = thread.updatedAt ?? thread.createdAt ?? 0;
					if (updatedAt >= today) {
						groups[0].threads.push(thread);
					} else if (updatedAt >= yesterday) {
						groups[1].threads.push(thread);
					} else if (updatedAt >= lastWeek) {
						groups[2].threads.push(thread);
					} else {
						groups[3].threads.push(thread);
					}
				}

				return groups.filter((g) => g.threads.length > 0);
			})()
		: [];

	return (
		<>
			<Sidebar className="border-r border-border/50">
				<SidebarHeader className="max-h-14 border-b border-border/50 p-2">
					<div className="flex justify-center items-center gap-2 h-full">
						<span
							className="p-2 text-primary text-2xl"
							style={{
								fontFamily: "'Russo One', sans-serif",
								fontWeight: "bold",
								fontStyle: "italic",
								letterSpacing: "0.04em",
							}}
						>
							Rapid Chat
						</span>
					</div>
				</SidebarHeader>

				<SidebarContent>
					{threads === undefined ? (
						// Loading state
						<SidebarGroup>
							<SidebarGroupContent>
								<SidebarMenu>
									{["a", "b", "c", "d", "e"].map((id) => (
										<SidebarMenuItem key={`skeleton-${id}`}>
											<SidebarMenuSkeleton showIcon />
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					) : threads.length === 0 ? (
						// Empty state
						<div className="flex flex-col items-center justify-center px-4 py-12 text-center">
							<div className="rounded-full bg-muted p-3 mb-3">
								<MessageSquare className="h-6 w-6 text-muted-foreground" />
							</div>
							<p className="text-sm font-medium text-foreground">
								No conversations yet
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								Start a new chat to begin
							</p>
						</div>
					) : (
						// Thread groups
						<div>
							<label className="text-sm text-muted-foreground px-3">
								Chats
							</label>
							{groupedThreads.map((group) => (
								<SidebarGroup key={group.label} className="py-0">
									<SidebarGroupLabel className="text-xs text-muted-foreground/70 px-2">
										{group.label}
								</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										{group.threads.map((thread) => (
											<SidebarMenuItem key={thread._id}>
												<SidebarMenuButton
													asChild
													isActive={currentThreadId === thread._id}
													className={cn(
														"transition-colors pr-8",
														currentThreadId === thread._id &&
															"bg-accent text-accent-foreground",
													)}
												>
													<Link
														to="/chat/$threadId"
														params={{ threadId: thread._id }}
														search={{
															initialInput: undefined,
															initialThinking: undefined,
														}}
														onClick={handleThreadClick}
														preload="intent"
														className="flex items-center gap-2 overflow-hidden min-w-0"
													>
														<ThreadRow
															threadId={thread._id}
															title={thread.title}
														/>
													</Link>
												</SidebarMenuButton>
												<DropdownMenu open={isShiftPressed ? false : undefined}>
													<DropdownMenuTrigger asChild>
														<SidebarMenuAction
															showOnHover
															onClick={(e) => {
																if (e.shiftKey) {
																	e.preventDefault();
																	e.stopPropagation();
																	handleDeleteThread(thread._id);
																}
															}}
															className={cn(
																isShiftPressed &&
																	"text-destructive hover:text-destructive hover:bg-destructive/10",
															)}
														>
															<AnimatePresence mode="wait" initial={false}>
																{isShiftPressed ? (
																	<motion.div
																		key="delete"
																		initial={{
																			opacity: 0,
																			scale: 0.5,
																			rotate: -90,
																		}}
																		animate={{
																			opacity: 1,
																			scale: 1,
																			rotate: 0,
																		}}
																		exit={{
																			opacity: 0,
																			scale: 0.5,
																			rotate: 90,
																		}}
																		transition={{ duration: 0.15 }}
																	>
																		<X className="h-5 w-5" />
																	</motion.div>
																) : (
																	<motion.div
																		key="more"
																		initial={{ opacity: 0, scale: 0.5 }}
																		animate={{ opacity: 1, scale: 1 }}
																		exit={{ opacity: 0, scale: 0.5 }}
																		transition={{ duration: 0.15 }}
																	>
																		<MoreHorizontal className="h-5 w-5" />
																	</motion.div>
																)}
															</AnimatePresence>
															<span className="sr-only">
																{isShiftPressed
																	? "Delete thread"
																	: "More options"}
															</span>
														</SidebarMenuAction>
													</DropdownMenuTrigger>
													<DropdownMenuContent side="right" align="start">
														<DropdownMenuItem
															onClick={() =>
																openRenameDialog(thread._id, thread.title)
															}
														>
															<Pencil className="h-4 w-4 mr-2" />
															Rename
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => setThreadToDelete(thread._id)}
															className="text-destructive focus:text-destructive"
														>
															<Trash2 className="h-4 w-4 mr-2" />
															Delete
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						))}
					</div>
					)}
				</SidebarContent>

				<SidebarFooter className="border-t border-border/50 p-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								className="w-full justify-start px-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-auto py-2"
							>
								<div className="flex items-center gap-3 w-full text-left">
									<Avatar className="h-8 w-8">
										<AvatarImage
											src={user?.imageUrl}
											alt={user?.fullName || "User"}
										/>
										<AvatarFallback>
											{user?.firstName?.charAt(0) || "U"}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">
											{user?.fullName || "User"}
										</p>
										<p className="text-xs text-muted-foreground truncate">
											{user?.primaryEmailAddress?.emailAddress}
										</p>
									</div>
									<MoreHorizontal className="h-4 w-4 ml-auto text-muted-foreground" />
								</div>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
							align="start"
							side="top"
						>
							<div className="flex items-center gap-2 p-2">
								<Avatar className="h-8 w-8">
									<AvatarImage src={user?.imageUrl} />
									<AvatarFallback>
										{user?.firstName?.charAt(0) || "U"}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										{user?.fullName || "User"}
									</span>
									<span className="truncate text-xs text-muted-foreground">
										{user?.primaryEmailAddress?.emailAddress}
									</span>
								</div>
							</div>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => signOut({ redirectUrl: "/sign-in" })}
							>
								<LogOut className="mr-2 h-4 w-4" />
								Log out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarFooter>
			</Sidebar>

			{/* Rename Dialog */}
			<Dialog
				open={!!threadToRename}
				onOpenChange={(open) => !open && setThreadToRename(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename conversation</DialogTitle>
						<DialogDescription>
							Enter a new name for this conversation.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleRenameThread}>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor="name" className="sr-only">
									Name
								</Label>
								<Input
									id="name"
									value={renameTitle}
									onChange={(e) => setRenameTitle(e.target.value)}
									placeholder="Thread title"
									autoFocus
								/>
							</div>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="secondary"
								onClick={() => setThreadToRename(null)}
							>
								Cancel
							</Button>
							<Button type="submit">Save</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Delete confirmation dialog */}
			<AlertDialog
				open={threadToDelete !== null}
				onOpenChange={(open) => !open && setThreadToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete conversation?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete this conversation and all its
							messages. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => handleDeleteThread()}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
