import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";

// Server function to fetch Clerk auth and get Convex token
// The auth() function uses the global context set by clerkMiddleware
export const fetchClerkAuth = createServerFn({ method: "GET" }).handler(
	async () => {
		const authState = await auth();
		const token = await authState.getToken({ template: "convex" });
		return {
			userId: authState.userId,
			token,
			isAuthenticated: !!authState.userId,
		};
	},
);
