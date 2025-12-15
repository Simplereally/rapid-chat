import { ModeToggle } from "@/components/mode-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import { env } from "@/env";
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { auth } from "@clerk/tanstack-react-start/server";
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
import { createServerFn } from "@tanstack/react-start";
import type { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import appCss from "../../app.css?url";
import themeCss from "../../index.css?url";
import baseCss from "../styles.css?url";

// Server function to fetch Clerk auth and get Convex token
// The auth() function uses the global context set by clerkMiddleware
const fetchClerkAuth = createServerFn({ method: "GET" }).handler(async () => {
	const authState = await auth();
	const token = await authState.getToken({ template: "convex" });
	return {
		userId: authState.userId,
		token,
		isAuthenticated: !!authState.userId,
	};
});

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
		// Don't check auth for sign-in/sign-up routes
		const publicPaths = ["/sign-in", "/sign-up"];
		const isPublicPath = publicPaths.some((path) =>
			ctx.location.pathname.startsWith(path),
		);

		if (isPublicPath) {
			return { userId: null, token: null, isAuthenticated: false };
		}

		// Fetch auth state from Clerk with proper request context
		const { userId, token, isAuthenticated } = await fetchClerkAuth();

		// During SSR only (the only time serverHttpClient exists),
		// set the Clerk auth token to make HTTP queries with.
		if (token) {
			ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
		}

		// If not authenticated and not on a public path, redirect to sign-in
		if (!isAuthenticated) {
			throw redirect({
				to: "/sign-in/$",
			});
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
	const showDevtools = process.env.NODE_ENV !== "production";

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
