import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface PageHeaderProps {
	title: string;
	description?: string;
	children?: ReactNode;
	badge?: ReactNode;
}

/**
 * Premium page header with animated entrance and gradient accent line.
 * Provides consistent styling across all pages with optional actions slot.
 */
export function PageHeader({
	title,
	description,
	children,
	badge,
}: PageHeaderProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
			className="page-header"
		>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1.5">
					<div className="flex items-center gap-3">
						<h1 className="text-3xl font-bold tracking-tight">{title}</h1>
						{badge}
					</div>
					{description && (
						<p className="text-muted-foreground max-w-2xl">{description}</p>
					)}
				</div>
				{children && (
					<div className="flex items-center gap-2 shrink-0">{children}</div>
				)}
			</div>
		</motion.div>
	);
}
