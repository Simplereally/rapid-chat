import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ChatLayout } from "@/features/chat-sidebar";

export const Route = createFileRoute("/chat")({
	component: ChatLayoutWrapper,
});

function ChatLayoutWrapper() {
	return (
		<ChatLayout>
			<Outlet />
		</ChatLayout>
	);
}
