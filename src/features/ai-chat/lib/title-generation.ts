/**
 * AI Title Generation Utility
 * 
 * Handles the fire-and-forget title generation for chat threads.
 * This runs independently of the main chat flow to not block the user experience.
 */

/**
 * Triggers AI title generation in the background.
 * Fire-and-forget - does not block the chat flow.
 * 
 * @param threadId - The Convex thread ID to update
 * @param userMessage - The user's first message (used to generate title)
 * @param token - The Clerk auth token for authorization
 */
export async function triggerTitleGeneration(
	threadId: string,
	userMessage: string,
	token: string,
): Promise<void> {
	try {
		// Strip thinking prefix for title generation
		const cleanMessage = userMessage
			.replace(/^\/(think|no_think)\s+/, "")
			.trim();

		await fetch("/api/generate-title", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				threadId,
				userMessage: cleanMessage,
			}),
		});
	} catch (error) {
		// Silently fail - title generation is non-critical
		console.error("Title generation failed:", error);
	}
}
