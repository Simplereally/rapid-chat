import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { ConvexReactClient } from "convex/react";

import NotFoundPage from "@/components/error-components/404-not-found";
import { env } from "@/env";

import { routeTree } from "./routeTree.gen.ts";

export function getRouter() {
	const convex = new ConvexReactClient(env.VITE_CONVEX_URL, {
		unsavedChangesWarning: false,
	});
	const convexQueryClient = new ConvexQueryClient(convex);

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: convexQueryClient.hashFn(),
				queryFn: convexQueryClient.queryFn(),
			},
		},
	});

	convexQueryClient.connect(queryClient);

	const router = routerWithQueryClient(
		createTanStackRouter({
			routeTree,
			scrollRestoration: true,
			defaultPreloadStaleTime: 0,
			defaultNotFoundComponent: NotFoundPage,
			// Performance: Instant navigation - show new page immediately
			defaultPendingMs: 0,
			// Performance: Prefetch on hover/focus by default
			defaultPreload: "intent",
			context: {
				queryClient,
				convexClient: convex,
				convexQueryClient,
			},
		}),
		queryClient,
	);

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
