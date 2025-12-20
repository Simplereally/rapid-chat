import type { UIMessage } from "@tanstack/ai-react";
import {
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type { ParsedMessage } from "../types";

const PINNED_TO_BOTTOM_THRESHOLD_PX = 12;

export function useChatScroll(
	messages: UIMessage[] | ParsedMessage[],
	_isLoading: boolean, // Kept for API compatibility, but no longer used
) {
	const scrollViewportRef = useRef<HTMLDivElement>(
		null,
	) as RefObject<HTMLDivElement>;

	const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
	const hasPerformedInitialScrollRef = useRef(false);
	const prevMessageCountRef = useRef(messages.length);

	const getIsNearBottom = useCallback((viewport: HTMLDivElement): boolean => {
		const distanceFromBottom =
			viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
		return distanceFromBottom <= PINNED_TO_BOTTOM_THRESHOLD_PX;
	}, []);

	const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
		if (scrollViewportRef.current) {
			scrollViewportRef.current.scrollTo({
				top: scrollViewportRef.current.scrollHeight,
				behavior,
			});
		}
	}, []);

	const pinToBottom = useCallback(() => {
		setIsPinnedToBottom(true);
		scrollToBottom("smooth");
	}, [scrollToBottom]);

	// Track scroll position to show/hide scroll-to-bottom button
	useEffect(() => {
		const viewport = scrollViewportRef.current;
		if (!viewport) return;

		let rafId: number | null = null;
		const onScroll = () => {
			if (rafId !== null) return;
			rafId = window.requestAnimationFrame(() => {
				rafId = null;
				const isNearBottom = getIsNearBottom(viewport);
				setIsPinnedToBottom(isNearBottom);
			});
		};

		viewport.addEventListener("scroll", onScroll, { passive: true });
		onScroll();

		return () => {
			viewport.removeEventListener("scroll", onScroll);
			if (rafId !== null) window.cancelAnimationFrame(rafId);
		};
	}, [getIsNearBottom]);

	// Scroll to bottom only on initial mount and when new messages are added (not during streaming)
	useEffect(() => {
		const viewport = scrollViewportRef.current;
		if (!viewport) return;

		// Initial scroll to bottom on mount
		if (!hasPerformedInitialScrollRef.current && messages.length > 0) {
			hasPerformedInitialScrollRef.current = true;
			setIsPinnedToBottom(true);
			scrollToBottom("auto");
			return;
		}

		// Scroll to bottom when a new message is added (message count increases)
		// This handles: user sends a message, or new AI response starts
		const messageCountChanged = prevMessageCountRef.current !== messages.length;
		prevMessageCountRef.current = messages.length;

		if (messageCountChanged && messages.length > 0) {
			scrollToBottom("auto");
		}
	}, [messages.length, scrollToBottom]);

	const showScrollToBottom = !isPinnedToBottom;

	return {
		scrollViewportRef,
		isPinnedToBottom,
		showScrollToBottom,
		pinToBottom,
	};
}
