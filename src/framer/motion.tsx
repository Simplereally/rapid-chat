"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   MOTION VARIANTS - Premium Animation Presets
   ═══════════════════════════════════════════════════════════════ */

export const staggerContainer: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: 0.08,
			delayChildren: 0.1,
		},
	},
};

export const fadeInUp: Variants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.4,
			ease: [0.25, 0.46, 0.45, 0.94],
		},
	},
};

export const scaleIn: Variants = {
	hidden: { opacity: 0, scale: 0.95 },
	visible: {
		opacity: 1,
		scale: 1,
		transition: {
			duration: 0.3,
			ease: [0.34, 1.56, 0.64, 1],
		},
	},
};

/* ═══════════════════════════════════════════════════════════════
   MOTION LIST - Container for Staggered Animations
   ═══════════════════════════════════════════════════════════════ */

interface MotionListProps {
	children: ReactNode;
	className?: string;
	/** Grid layout class, e.g., "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" */
	gridClassName?: string;
	/** Gap class, defaults to "gap-4" */
	gapClassName?: string;
}

/**
 * Container for staggered entrance animations.
 * Wrap MotionItem children for beautiful reveal effects.
 */
export function MotionList({
	children,
	className,
	gridClassName = "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
	gapClassName = "gap-4",
}: MotionListProps) {
	return (
		<motion.div
			variants={staggerContainer}
			initial="hidden"
			animate="visible"
			className={cn("grid", gridClassName, gapClassName, className)}
		>
			{children}
		</motion.div>
	);
}

/* ═══════════════════════════════════════════════════════════════
   MOTION ITEM - Individual Animated Child
   ═══════════════════════════════════════════════════════════════ */

interface MotionItemProps {
	children: ReactNode;
	className?: string;
	/** Animation variant, defaults to fadeInUp */
	variant?: "fadeInUp" | "scaleIn";
}

/**
 * Animated item for use within MotionList.
 * Automatically inherits stagger timing from parent.
 */
export function MotionItem({
	children,
	className,
	variant = "fadeInUp",
}: MotionItemProps) {
	const variants = variant === "scaleIn" ? scaleIn : fadeInUp;

	return (
		<motion.div variants={variants} className={className}>
			{children}
		</motion.div>
	);
}

/* ═══════════════════════════════════════════════════════════════
   MOTION CARD - Interactive Card with Hover Effects
   ═══════════════════════════════════════════════════════════════ */

interface MotionCardProps {
	children: ReactNode;
	className?: string;
	/** Enable hover lift effect */
	hoverLift?: boolean;
	/** Enable hover glow effect */
	hoverGlow?: boolean;
	/** Enable scale on hover */
	hoverScale?: boolean;
	/** Click handler */
	onClick?: () => void;
}

/**
 * Premium card with interactive hover effects.
 * Combines motion, elevation, and glow for a luxurious feel.
 */
export function MotionCard({
	children,
	className,
	hoverLift = true,
	hoverGlow = false,
	hoverScale = false,
	onClick,
}: MotionCardProps) {
	return (
		<motion.div
			whileHover={{
				y: hoverLift ? -4 : 0,
				scale: hoverScale ? 1.02 : 1,
			}}
			transition={{
				type: "spring",
				stiffness: 400,
				damping: 25,
			}}
			onClick={onClick}
			className={cn(
				"card-premium",
				hoverGlow && "hover:glow-primary",
				onClick && "cursor-pointer",
				className,
			)}
		>
			{children}
		</motion.div>
	);
}

/* ═══════════════════════════════════════════════════════════════
   MOTION FADE - Simple Fade Entrance
   ═══════════════════════════════════════════════════════════════ */

interface MotionFadeProps {
	children: ReactNode;
	className?: string;
	/** Delay before animation starts */
	delay?: number;
}

/**
 * Simple fade-in animation wrapper.
 * Useful for page content sections.
 */
export function MotionFade({
	children,
	className,
	delay = 0,
}: MotionFadeProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				duration: 0.4,
				delay,
				ease: [0.25, 0.46, 0.45, 0.94],
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/* ═══════════════════════════════════════════════════════════════
   MOTION TRANSITION - Skeleton to Content Transition
   ═══════════════════════════════════════════════════════════════ */

interface MotionTransitionProps {
	/** Whether data is loading */
	isLoading: boolean;
	/** Skeleton/Loading content to show while loading */
	loadingContent: ReactNode;
	/** Actual content to show when loaded */
	children: ReactNode;
	/** ClassName applied to both loading and content wrappers */
	className?: string;
}

/**
 * Smooth transition wrapper that handles switching between skeleton loading state and actual content.
 * Features a graceful exit for skeletons and a slight slide-up entrance for content.
 */
export function MotionTransition({
	isLoading,
	loadingContent,
	children,
	className,
}: MotionTransitionProps) {
	return (
		<AnimatePresence mode="wait">
			{isLoading ? (
				<motion.div
					key="loading"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
					className={className}
				>
					{loadingContent}
				</motion.div>
			) : (
				<motion.div
					key="content"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
					className={className}
				>
					{children}
				</motion.div>
			)}
		</AnimatePresence>
	);
}
