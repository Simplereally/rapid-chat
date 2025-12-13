import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	/**
	 * Server-side environment variables - never exposed to the browser.
	 * These are only available in server contexts (SSR, API routes, build scripts).
	 */
	server: {
		CF_WORKER_NAME: z.string().min(1),
	},

	/**
	 * Client-side environment variables - exposed to the browser.
	 * Must be prefixed with VITE_ (enforced at type and runtime level).
	 */
	clientPrefix: "VITE_",

	client: {
		VITE_CONVEX_URL: z.url(),
		VITE_APP_TITLE: z.string().min(1),
	},

	/**
	 * What object holds the environment variables at runtime.
	 * For Vite, this is import.meta.env
	 */
	runtimeEnv: import.meta.env,

	/**
	 * Treat empty strings as undefined so that:
	 * - Empty values in .env files don't bypass validation
	 * - Default values can be applied when env var is ""
	 */
	emptyStringAsUndefined: true,

	/**
	 * Tell the library when we're in a server context.
	 * Used to allow/deny access to server-only variables.
	 */
	isServer: globalThis.window === undefined,

	/**
	 * Custom error handler for validation failures.
	 * Provides clear, actionable error messages.
	 */
	onValidationError: (issues) => {
		const formatted = issues
			.map(
				(issue) =>
					`  • ${issue.path?.join(".") || "unknown"}: ${issue.message}`,
			)
			.join("\n");

		console.error(`\n❌ Invalid environment variables:\n${formatted}\n`);
		console.error(
			"💡 Check your .env.local file and ensure all required variables are set.\n",
		);

		throw new Error("Invalid environment variables");
	},

	/**
	 * Called when client code attempts to access a server-only variable.
	 * This should never happen in production if code is properly structured.
	 */
	onInvalidAccess: (variable) => {
		throw new Error(
			`❌ Attempted to access server-side environment variable "${variable}" on the client.\n` +
				"This variable is not available in the browser for security reasons.",
		);
	},
});
