import { ChatLayout } from "@/features/chat-sidebar";
import { createFileRoute, Outlet } from "@tanstack/react-router";

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
