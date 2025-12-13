import { createRouter } from "@tanstack/react-router";

import NotFoundPage from "@/components/error-components/404-not-found";

import { routeTree } from "./routeTree.gen.ts";

// Create a new router instance
export const getRouter = () => {
	const router = createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		defaultNotFoundComponent: NotFoundPage,
	});

	return router;
};
