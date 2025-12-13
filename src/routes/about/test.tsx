import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about/test")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6">
			<h1 className="text-3xl font-semibold">Page not found</h1>
			<p className="text-muted-foreground">We couldn't find that page.</p>
			<Link to="/" className="underline">
				Go home
			</Link>
		</main>
	);
}
