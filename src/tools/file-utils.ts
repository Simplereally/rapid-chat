import * as path from "node:path";

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Sandbox configuration for allowed paths.
 * In production, this should be configured based on user workspace.
 */
const ALLOWED_BASE_PATHS = [
	process.cwd(), // Current working directory
	// Add more allowed paths as needed
];

/**
 * Resolve and validate a path to ensure it's within allowed boundaries.
 * Prevents directory traversal attacks (e.g., ../../etc/passwd).
 */
export function resolveSafePath(inputPath: string): string {
	// Resolve to absolute path
	const absolutePath = path.resolve(process.cwd(), inputPath);

	// Check if path is within allowed boundaries
	const isAllowed = ALLOWED_BASE_PATHS.some((base) =>
		absolutePath.startsWith(path.resolve(base)),
	);

	if (!isAllowed) {
		throw new Error(
			`Access denied: Path "${inputPath}" is outside allowed workspace boundaries.`,
		);
	}

	return absolutePath;
}
