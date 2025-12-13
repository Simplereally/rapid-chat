import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
	return (
		<main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
			<section className="space-y-3">
				<h1 className="text-3xl font-semibold tracking-tight">Welcome</h1>
				<p className="text-muted-foreground">
					This is a simple landing page placeholder. Use the link below to see
					the component showcase.
				</p>
			</section>

			<Link
				to="/example/showcase"
				className="inline-flex w-fit items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
			>
				Go to example showcase
			</Link>
		</main>
	);
}
