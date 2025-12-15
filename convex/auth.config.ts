import type { AuthConfig } from "convex/server";

// This environment variable must be set on the Convex dashboard
// (dashboard.convex.dev) under Settings > Environment Variables
// Value should be your Clerk Frontend API URL, e.g., https://verb-noun-00.clerk.accounts.dev
const clerkIssuerUrl = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!clerkIssuerUrl) {
	throw new Error("CLERK_JWT_ISSUER_DOMAIN must be set on the Convex dashboard for auth to work.");
}

export default {
	providers: [
		{
			domain: clerkIssuerUrl,
			applicationID: "convex",
		},
	],
} satisfies AuthConfig;
