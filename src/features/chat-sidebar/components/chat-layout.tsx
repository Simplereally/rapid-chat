"use client";

import { OllamaStatusBadge } from "@/components/ollama-status-badge";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { ChatSidebar } from "./chat-sidebar";

interface ChatLayoutProps {
	children: React.ReactNode;
}

export function ChatLayout({ children }: ChatLayoutProps) {
	return (
		<SidebarProvider defaultOpen={true}>
			<ChatSidebar />
			<SidebarInset className="flex flex-col min-h-screen">
				{/* Header with sidebar trigger */}
				<header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
					<div className="flex items-center gap-2 flex-1">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="h-4" />
						<span className="text-sm font-medium text-muted-foreground">
							Chat
						</span>
					</div>
					<OllamaStatusBadge />
				</header>

				{/* Main content area */}
				<main className="flex-1 min-h-0">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
