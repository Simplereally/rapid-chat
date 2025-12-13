import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Label } from "../ui/label";

const NotFoundPage = () => (
	<main className="flex min-h-screen items-center justify-center bg-background px-4 py-16 sm:px-6">
		<div className="flex w-full max-w-5xl flex-col items-center gap-8 text-center sm:gap-10">
			<img
				src="/images/404-not-found.svg"
				alt="Page not found"
				className="h-auto w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl"
				loading="lazy"
			/>

			<div className="space-y-3 sm:space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
					Page not found
				</h1>
				<p className="text-sm text-muted-foreground sm:text-base md:text-lg">
					The page you are looking for doesn't exist or has been moved.
				</p>
			</div>

			<div className="flex flex-wrap items-center justify-center gap-3">
				<Button asChild>
					<Link to="/">Go home</Link>
				</Button>
			</div>
		</div>
		<Label className="text-xs text-muted-foreground/60 italic absolute bottom-0">
			Web illustrations by Storyset
		</Label>
	</main>
);

export default NotFoundPage;
