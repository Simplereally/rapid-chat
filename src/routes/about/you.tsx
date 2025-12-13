import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about/you")({
	component: AboutYouPage,
});

function AboutYouPage() {
	return (
		<main className="p-6 space-y-3">
			<h1 className="text-2xl font-semibold">About You</h1>
			<p className="text-muted-foreground">About You</p>
		</main>
	);
}
