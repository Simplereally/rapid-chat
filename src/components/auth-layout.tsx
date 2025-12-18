import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeInUp, staggerContainer } from "@/framer/motion";

interface AuthLayoutProps {
	children: ReactNode;
	title: string;
	description: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
	return (
		<div className="flex min-h-screen w-full overflow-hidden bg-background">
			{/* Left Panel - Visual & Branding (Hidden on mobile) */}
			<motion.div
				className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex"
				initial="hidden"
				animate="visible"
				variants={staggerContainer}
			>
				{/* Ambient Background Animation */}
				<div className="absolute inset-0 z-0 overflow-hidden">
					<motion.div
						className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-sidebar-ring/10 mix-blend-overlay blur-[100px]"
						animate={{
							x: [0, 100, 0],
							y: [0, -100, 0],
							scale: [1, 1.2, 1],
						}}
						transition={{
							duration: 20,
							repeat: Infinity,
							ease: "linear",
						}}
					/>
					<motion.div
						className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-white/5 mix-blend-overlay blur-[80px]"
						animate={{
							x: [0, -50, 0],
							y: [0, 50, 0],
							scale: [1, 1.1, 1],
						}}
						transition={{
							duration: 15,
							repeat: Infinity,
							ease: "linear",
							delay: 2,
						}}
					/>
				</div>

				<div className="relative z-10">
					<motion.div
						variants={fadeInUp}
						className="flex items-center gap-2 text-lg font-medium"
					>
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground backdrop-blur-sm">
							<svg
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="h-5 w-5"
							>
								<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
							</svg>
						</div>
						<span>Rapid Chat</span>
					</motion.div>
				</div>

				<motion.div variants={fadeInUp} className="relative z-10 max-w-lg">
					<h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-white">
						{title}
					</h1>
					<p className="text-lg text-primary-foreground/80">{description}</p>
				</motion.div>

				<motion.div
					variants={fadeInUp}
					className="relative z-10 flex items-center gap-4 text-sm text-primary-foreground/60"
				>
					<div>© 2024 Rapid Chat Inc.</div>
				</motion.div>
			</motion.div>

			{/* Right Panel - Form */}
			<div className="flex w-full flex-col items-center justify-center bg-background px-4 lg:w-1/2">
				<motion.div
					initial={{ opacity: 0, scale: 0.95, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					transition={{
						duration: 0.5,
						type: "spring",
						stiffness: 100,
						damping: 20,
						delay: 0.2,
					}}
					className="w-full max-w-sm"
				>
					{children}
				</motion.div>
			</div>
		</div>
	);
}
