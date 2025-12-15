---
description: How to set up Clerk authentication with TanStack Start and Convex
---

# Clerk + TanStack Start + Convex Authentication Setup

This guide walks through integrating Clerk authentication into a TanStack Start application that uses Convex as the backend.

---

## Prerequisites

- An existing TanStack Start project with Convex already set up
- Node.js / Bun installed
- A Convex project deployed (you should already have `VITE_CONVEX_URL` working)

---

## Step 1: Create Clerk Account & Application

1. Go to [clerk.com/sign-up](https://dashboard.clerk.com/sign-up) and create a free account
2. Create a new application in the Clerk Dashboard
3. Choose your preferred sign-in methods (Email, Google, GitHub, etc.)

---

## Step 2: Create the Convex JWT Template in Clerk

1. In the Clerk Dashboard, navigate to **JWT Templates** (left sidebar)
2. Click **"New template"**
3. Select **"Convex"** from the list
4. **⚠️ IMPORTANT: Do NOT rename this template** - it must be called `convex`
5. Copy the **Issuer URL** (looks like `https://verb-noun-00.clerk.accounts.dev`) - you'll need this later

---

## Step 3: Install Clerk SDK

```bash
# Using bun
bun add @clerk/tanstack-react-start

# Using npm
npm install @clerk/tanstack-react-start
```

---

## Step 4: Set Up Environment Variables

### Local `.env.local` file

Add these variables to your `.env.local`:

```env
# Clerk - Get these from Clerk Dashboard > API Keys
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# Clerk URLs (for redirects)
CLERK_SIGN_IN_URL=/sign-in
CLERK_SIGN_UP_URL=/sign-up
```

### Convex Dashboard Environment Variables

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Select your project → **Settings** → **Environment Variables**
3. Add:
   - `CLERK_JWT_ISSUER_DOMAIN` = Your Clerk Issuer URL from Step 2 (e.g., `https://verb-noun-00.clerk.accounts.dev`)

---

## Step 5: Create Convex Auth Config

Create or update `convex/auth.config.ts`:

```typescript
import type { AuthConfig } from "convex/server";

// This environment variable must be set on the Convex dashboard
const clerkIssuerUrl = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!clerkIssuerUrl) {
	throw new Error("CLERK_JWT_ISSUER_DOMAIN must be set on the Convex dashboard.");
}

export default {
	providers: [
		{
			domain: clerkIssuerUrl,
			applicationID: "convex",
		},
	],
} satisfies AuthConfig;
```

---

## Step 6: Create TanStack Start Server Configuration

Create or update `src/start.ts`:

```typescript
import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => {
	return {
		requestMiddleware: [clerkMiddleware()],
	};
});
```

---

## Step 7: Update the Router

Update `src/router.tsx` to create Convex clients and pass them through router context:

```typescript
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { ConvexReactClient } from "convex/react";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL, {
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
```

---

## Step 8: Update the Root Route

Update `src/routes/__root.tsx` to set up the provider hierarchy and SSR auth:

```typescript
import {
	Outlet,
	createRootRouteWithContext,
	HeadContent,
	Scripts,
	useRouteContext,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ConvexReactClient } from "convex/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";

// Server function to fetch Clerk auth and get Convex token
const fetchClerkAuth = createServerFn({ method: "GET" }).handler(async () => {
	const { userId, getToken } = await auth();
	const token = await getToken({ template: "convex" });
	return { userId, token };
});

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
	convexClient: ConvexReactClient;
	convexQueryClient: ConvexQueryClient;
}>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
		],
	}),

	beforeLoad: async (ctx) => {
		const { userId, token } = await fetchClerkAuth();

		// During SSR, set the Clerk auth token for Convex HTTP queries
		if (token) {
			ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
		}

		return { userId, token };
	},

	component: RootComponent,
});

function RootComponent() {
	const context = useRouteContext({ from: Route.id });

	return (
		<ClerkProvider>
			<ConvexProviderWithClerk client={context.convexClient} useAuth={useAuth}>
				<QueryClientProvider client={context.queryClient}>
					<html lang="en">
						<head>
							<HeadContent />
						</head>
						<body>
							<Outlet />
							<Scripts />
						</body>
					</html>
				</QueryClientProvider>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}
```

---

## Step 9: Create Sign-In and Sign-Up Routes

Create `src/routes/sign-in.$.tsx`:

```typescript
import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-in/$")({
	component: () => <SignIn />,
});
```

Create `src/routes/sign-up.$.tsx`:

```typescript
import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-up/$")({
	component: () => <SignUp />,
});
```

---

## Step 10: Protect Routes (Optional)

To protect routes server-side, add a `beforeLoad` check:

```typescript
import { auth } from "@clerk/tanstack-react-start/server";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const authStateFn = createServerFn({ method: "GET" }).handler(async () => {
	const { isAuthenticated } = await auth();
	if (!isAuthenticated) {
		throw redirect({ to: "/sign-in/$" });
	}
});

export const Route = createFileRoute("/protected-route")({
	beforeLoad: async () => {
		await authStateFn();
	},
	component: ProtectedComponent,
});
```

---

## Step 11: Use Authentication in Convex Functions

In your Convex functions, use `ctx.auth.getUserIdentity()`:

```typescript
import { mutation, query } from "./_generated/server";

export const protectedQuery = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		
		if (!identity) {
			throw new Error("Unauthorized");
		}

		// identity.subject contains the Clerk user ID
		return { userId: identity.subject };
	},
});
```

---

## Step 12: Sync and Test

1. Restart your dev servers:
   ```bash
   bun convex dev
   bun run dev
   ```

2. Navigate to your app and sign in
3. The Convex functions should now receive the authenticated user identity

---

## Troubleshooting

### "Unauthorized" errors in Convex

1. **Check JWT template**: Ensure the Clerk JWT template is named exactly `convex`
2. **Check env var**: Verify `CLERK_JWT_ISSUER_DOMAIN` is set correctly on Convex dashboard
3. **Restart convex dev**: After changing env vars, restart `bun convex dev`
4. **Clear browser**: Try incognito or clear cookies to get a fresh session

### Auth state not updating client-side

Use `useConvexAuth()` from `convex/react` instead of Clerk's `useAuth()` to check if Convex has received the auth token:

```typescript
import { useConvexAuth } from "convex/react";

function MyComponent() {
	const { isLoading, isAuthenticated } = useConvexAuth();
	
	if (isLoading) return <div>Loading...</div>;
	if (!isAuthenticated) return <div>Please sign in</div>;
	
	return <div>Authenticated!</div>;
}
```

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `convex/auth.config.ts` | Create | Configure Convex to validate Clerk JWTs |
| `src/start.ts` | Create/Update | Add Clerk middleware |
| `src/router.tsx` | Update | Pass Convex clients through router context |
| `src/routes/__root.tsx` | Update | Set up providers and SSR auth |
| `src/routes/sign-in.$.tsx` | Create | Sign-in page |
| `src/routes/sign-up.$.tsx` | Create | Sign-up page |

## Environment Variables Summary

| Variable | Location | Value |
|----------|----------|-------|
| `VITE_CLERK_PUBLISHABLE_KEY` | `.env.local` | From Clerk Dashboard > API Keys |
| `CLERK_SECRET_KEY` | `.env.local` | From Clerk Dashboard > API Keys |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex Dashboard | Clerk Issuer URL (e.g., `https://xxx.clerk.accounts.dev`) |
