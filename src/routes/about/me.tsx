import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about/me")({
	component: AboutMePage,
});

function AboutMePage() {
	return (
		<main className="p-6 space-y-3">
			<h1 className="text-2xl font-semibold">About Me</h1>
			<p className="text-muted-foreground">About Me</p>
		</main>
	);
}
