import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup after each test to prevent React state from leaking
afterEach(() => {
	cleanup();
});
