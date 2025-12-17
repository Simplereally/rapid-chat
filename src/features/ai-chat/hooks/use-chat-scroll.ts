import type { UIMessage } from "@tanstack/ai-react";
import {
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import type { ParsedMessage } from "../types";

/**
 * Get a lightweight fingerprint of the last message for scroll detection.
 * Avoids JSON.stringify which is expensive during rapid streaming.
 */
function getLastMessageFingerprint(
	messages: UIMessage[] | ParsedMessage[],
): string {
	if (messages.length === 0) return "";
	const last = messages[messages.length - 1];
	// Use id + parts count + approximate content length for change detection
	// This is much cheaper than JSON.stringify during streaming
	// Handle both UIMessage (parts) and ParsedMessage (parsedParts)
	const parts =
		(last as UIMessage).parts || (last as ParsedMessage).parsedParts || [];
	let contentLength = 0;
	for (const part of parts) {
		const p = part as {
			content?: string;
			text?: string;
			parsedContent?: string;
		};
		if (typeof p.content === "string") contentLength += p.content.length;
		if (typeof p.text === "string") contentLength += p.text.length;
		if (typeof p.parsedContent === "string")
			contentLength += p.parsedContent.length;
	}
	return `${last.id}:${parts.length}:${contentLength}`;
}

export function useChatScroll(
	messages: UIMessage[] | ParsedMessage[],
	isLoading: boolean,
) {
	const scrollViewportRef = useRef<HTMLDivElement>(
		null,
	) as RefObject<HTMLDivElement>;

	const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
	const [showScrollToBottom, setShowScrollToBottom] = useState(false);
	const isPinnedToBottomRef = useRef(isPinnedToBottom);
	const hasPerformedInitialScrollRef = useRef(false);
	const scrollButtonTimerRef = useRef<number | null>(null);

	useEffect(() => {
		isPinnedToBottomRef.current = isPinnedToBottom;
	}, [isPinnedToBottom]);

	// Handle delayed visibility of scroll-to-bottom button
	useEffect(() => {
		if (isPinnedToBottom) {
			// User is at bottom - hide button immediately and clear any pending timer
			if (scrollButtonTimerRef.current !== null) {
				window.clearTimeout(scrollButtonTimerRef.current);
				scrollButtonTimerRef.current = null;
			}
			setShowScrollToBottom(false);
		} else {
			// User scrolled away from bottom - show button after 1 second delay
			if (scrollButtonTimerRef.current === null) {
				scrollButtonTimerRef.current = window.setTimeout(() => {
					setShowScrollToBottom(true);
					scrollButtonTimerRef.current = null;
				}, 1000);
			}
		}

		return () => {
			if (scrollButtonTimerRef.current !== null) {
				window.clearTimeout(scrollButtonTimerRef.current);
			}
		};
	}, [isPinnedToBottom]);

	const nearBottomThresholdPx = 80;

	const getIsNearBottom = useCallback((viewport: HTMLDivElement): boolean => {
		const distanceFromBottom =
			viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
		return distanceFromBottom <= nearBottomThresholdPx;
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
		setShowScrollToBottom(false);
		setIsPinnedToBottom(true);
		scrollToBottom("smooth");
	}, [scrollToBottom]);

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

	// Auto-scroll trigger using lightweight fingerprint
	const lastMessageFingerprint = getLastMessageFingerprint(messages);
	const lastMessageFingerprintRef = useRef(lastMessageFingerprint);

	useLayoutEffect(() => {
		const viewport = scrollViewportRef.current;
		if (!viewport) return;

		if (!hasPerformedInitialScrollRef.current && messages.length > 0) {
			hasPerformedInitialScrollRef.current = true;
			setShowScrollToBottom(false);
			setIsPinnedToBottom(true);
			scrollToBottom("auto");
			return;
		}

		const didFingerprintChange =
			lastMessageFingerprintRef.current !== lastMessageFingerprint;
		lastMessageFingerprintRef.current = lastMessageFingerprint;
		if (!didFingerprintChange && !isLoading) return;

		if (isPinnedToBottomRef.current) {
			scrollToBottom("auto");
			return;
		}
	}, [lastMessageFingerprint, isLoading, messages.length, scrollToBottom]);

	return {
		scrollViewportRef,
		isPinnedToBottom,
		showScrollToBottom,
		pinToBottom,
	};
}
