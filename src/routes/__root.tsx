import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	redirect,
	Scripts,
	useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useEffect } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import { env } from "@/env";
import { fetchClerkAuth } from "@/server/auth";
import { initializeCrossTabSync } from "@/stores/chat-client-store";
import appCss from "../../app.css?url";
import themeCss from "../../index.css?url";
import baseCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
	convexClient: ConvexReactClient;
	convexQueryClient: ConvexQueryClient;
}>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: env.VITE_APP_TITLE,
			},
		],
		links: [
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com",
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Russo+One&display=swap",
			},
			{
				rel: "stylesheet",
				href: baseCss,
			},
			{
				rel: "stylesheet",
				href: themeCss,
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	beforeLoad: async (ctx) => {
		// On client-side navigation, don't block - let the page render immediately
		// Auth protection is handled by Clerk's client hooks in the components
		if (typeof window !== "undefined") {
			// Return cached auth context or defaults - don't await server call
			return {
				userId: null,
				token: null,
				isAuthenticated: true, // Assume authenticated, Clerk hooks will redirect if not
			};
		}

		// SSR only: fetch auth state for initial page load
		const { userId, token, isAuthenticated } = await fetchClerkAuth();

		const publicPaths = ["/sign-in", "/sign-up"];
		const isPublicPath = publicPaths.some((path) =>
			ctx.location.pathname.startsWith(path),
		);

		// If authenticated and trying to access sign-in/sign-up, redirect to home
		if (isAuthenticated && isPublicPath) {
			throw redirect({
				to: "/",
			});
		}

		// If not authenticated and trying to access a protected route, redirect to sign-in
		if (!isAuthenticated && !isPublicPath) {
			throw redirect({
				to: "/sign-in/$",
			});
		}

		// During SSR only (the only time serverHttpClient exists),
		// set the Clerk auth token to make HTTP queries with.
		if (token) {
			ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
		}

		return { userId, token, isAuthenticated };
	},

	component: RootComponent,
});

function RootComponent() {
	const context = useRouteContext({ from: Route.id });

	return (
		<ClerkProvider>
			<ConvexProviderWithClerk client={context.convexClient} useAuth={useAuth}>
				<QueryClientProvider client={context.queryClient}>
					<RootDocument>
						<Outlet />
					</RootDocument>
				</QueryClientProvider>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	// Initialize cross-tab sync for streaming messages on mount
	useEffect(() => {
		initializeCrossTabSync();
	}, []);

	const showDevtools =
		process.env.NODE_ENV !== "production" &&
		env.VITE_TANSTACK_DEVTOOLS === "true";

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					<div className="fixed top-4 right-4 z-50">
						<ModeToggle />
					</div>
					{children}
					{showDevtools && (
						<TanStackDevtools
							config={{
								position: "bottom-right",
							}}
							plugins={[
								{
									name: "Tanstack Router",
									render: <TanStackRouterDevtoolsPanel />,
								},
							]}
						/>
					)}
				</ThemeProvider>
				<Scripts />
			</body>
		</html>
	);
}
