/**
 * @vitest-environment jsdom
 */
import { describe, expect, test, vi, afterAll } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsMobile } from "./use-mobile";

// Store original values once
const originalMatchMedia = window.matchMedia;
const originalInnerWidth = window.innerWidth;

describe("useIsMobile", () => {
	const MOBILE_BREAKPOINT = 768;

	// Helper to setup window mocks
	function setupWindow(width: number) {
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: width,
		});

		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: width < MOBILE_BREAKPOINT,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));
	}

	// Restore after all tests
	afterAll(() => {
		window.matchMedia = originalMatchMedia;
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: originalInnerWidth,
		});
	});

	test("returns false when window width is above breakpoint (1024px)", () => {
		setupWindow(1024);
		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(false);
	});

	test("returns true when window width is below breakpoint (500px)", () => {
		setupWindow(500);
		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(true);
	});

	test("returns false when window width equals breakpoint (768px)", () => {
		setupWindow(MOBILE_BREAKPOINT);
		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(false);
	});

	test("returns true when window width is one pixel below breakpoint (767px)", () => {
		setupWindow(MOBILE_BREAKPOINT - 1);
		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(true);
	});

	test("returns true for very small screen width (320px)", () => {
		setupWindow(320);
		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(true);
	});

	test("returns false for very large screen width (2560px)", () => {
		setupWindow(2560);
		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(false);
	});

	test("registers change event listener on mount", () => {
		const addEventListener = vi.fn();
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 1024,
		});
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			addEventListener,
			removeEventListener: vi.fn(),
		}));

		renderHook(() => useIsMobile());

		expect(addEventListener).toHaveBeenCalledWith(
			"change",
			expect.any(Function),
		);
	});

	test("removes event listener on unmount", () => {
		const removeEventListener = vi.fn();
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: 1024,
		});
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener,
		}));

		const { unmount } = renderHook(() => useIsMobile());
		unmount();

		expect(removeEventListener).toHaveBeenCalledWith(
			"change",
			expect.any(Function),
		);
	});
});
