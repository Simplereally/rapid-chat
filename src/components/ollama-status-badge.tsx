import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useOllamaStore } from "@/stores/ollama-store";
import { motion } from "framer-motion";
import {
	Activity,
	AlertCircle,
	CheckCircle2,
	Download,
	ExternalLink,
	Power,
	RefreshCw,
	Settings,
} from "lucide-react";
import { useEffect } from "react";

/**
 * Status badge for Ollama with polling and start capability.
 */
export function OllamaStatusBadge() {
	const {
		status,
		models,
		checkStatus,
		startService,
		error,
		customPath,
		setCustomPath,
	} = useOllamaStore();

	// Check status on mount and poll every 30 seconds
	useEffect(() => {
		checkStatus();
		const interval = setInterval(checkStatus, 30000);
		return () => clearInterval(interval);
	}, [checkStatus]);

	const statusConfig = {
		checking: {
			color: "bg-amber-500",
			text: "Checking status",
			icon: <RefreshCw className="h-3 w-3 animate-spin" />,
			description: "Detecting local Ollama instance...",
		},
		running: {
			color: "bg-emerald-500",
			text: "Service online",
			icon: <CheckCircle2 className="h-3 w-3" />,
			description: "Ollama is active and ready",
		},
		stopped: {
			color: "bg-red-500",
			text: "Service offline",
			icon: <Activity className="h-3 w-3" />,
			description: "Ollama is not running locally",
		},
		"not-installed": {
			color: "bg-slate-500",
			text: "Not installed",
			icon: <AlertCircle className="h-3 w-3" />,
			description: "Ollama was not found on this system",
		},
	};

	const config = statusConfig[status];

	return (
		<HoverCard openDelay={0} closeDelay={100}>
			<HoverCardTrigger asChild>
				<div
					className={cn(
						"flex items-center gap-2 px-3 py-1.5 rounded-full text-md font-semibold border cursor-default transition-all duration-300 shadow-sm hover:shadow-md active:scale-95",
						status === "running"
							? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10"
							: status === "checking"
								? "bg-amber-500/5 text-amber-600 border-amber-500/20 hover:bg-amber-500/10"
								: "bg-red-500/5 text-red-600 border-red-500/20 hover:bg-red-500/10",
					)}
				>
					<div className="relative flex h-2 w-2">
						{status === "running" && (
							<motion.span
								animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
								transition={{
									duration: 2,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
								}}
								className={cn(
									"absolute inline-flex h-full w-full rounded-full opacity-75",
									config.color,
								)}
							/>
						)}
						<span
							className={cn(
								"relative inline-flex rounded-full h-2 w-2",
								config.color,
							)}
						/>
					</div>
					<span className="hidden sm:inline">Ollama</span>
				</div>
			</HoverCardTrigger>
			<HoverCardContent align="end" className="w-80 p-4 space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<h4 className="text-md font-bold leading-none">Ollama Dashboard</h4>
						<p className="text-sm text-muted-foreground font-medium uppercase tracking-tight">
							Local LLM Runtime
						</p>
					</div>
				</div>

				<Separator className="opacity-50" />

				<div className="space-y-3">
					<div className="flex items-start gap-3">
						<div className={cn("mt-1 p-1.5 rounded-md", `${config.color}/10`)}>
							{config.icon}
						</div>
						<div className="flex-1 space-y-1">
							<div className="flex items-center justify-between">
								<p className="text-md font-semibold">{config.text}</p>
								{status === "checking" && (
									<span className="text-md text-amber-500 font-medium">
										Scanning...
									</span>
								)}
							</div>
							<p className="text-md text-muted-foreground">
								{config.description}
							</p>
						</div>
					</div>

					{status === "running" && (
						<div className="space-y-2.5 pt-1">
							<div className="flex items-center justify-between">
								<Label className="text-md font-bold tracking-wider text-muted-foreground">
									Loaded Models
								</Label>
								<span className="text-md font-medium bg-muted px-1.5 py-0.5 rounded">
									{models.length} installed
								</span>
							</div>
							<div className="flex flex-wrap gap-1.5 min-h-12 items-start content-start">
								{models.length > 0 ? (
									<>
										{models.slice(0, 8).map((m) => (
											<Badge
												key={m}
												variant="secondary"
												className="text-md font-normal px-2 py-0 border-transparent hover:border-border transition-colors"
											>
												{m}
											</Badge>
										))}
										{models.length > 8 && (
											<Badge variant="outline" className="text-md font-normal">
												+{models.length - 8} more
											</Badge>
										)}
									</>
								) : (
									<p className="text-md italic text-muted-foreground pt-1">
										No models currently loaded in memory
									</p>
								)}
							</div>
						</div>
					)}

					{status === "stopped" && (
						<div className="space-y-3 pt-2">
							{error && (
								<Alert
									variant="destructive"
									className="py-2 px-3 bg-red-500/5 border-red-500/20"
								>
									<AlertCircle className="h-3 w-3" />
									<AlertDescription className="text-md leading-tight">
										{error}
									</AlertDescription>
								</Alert>
							)}
							<Button
								size="sm"
								className="w-full h-9 text-md gap-2 font-semibold shadow-sm"
								onClick={() => startService()}
							>
								<Power className="h-3.5 w-3.5" />
								Start Ollama Service
							</Button>
						</div>
					)}

					{status === "not-installed" && (
						<div className="space-y-4 pt-1">
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<Label className="text-md font-bold uppercase tracking-wider text-muted-foreground">
										Custom Executable Path
									</Label>
									{customPath && (
										<Button
											variant="link"
											size="sm"
											className="h-auto p-0 text-md text-primary"
											onClick={() => setCustomPath(null)}
										>
											Reset Path
										</Button>
									)}
								</div>
								<div className="flex gap-2">
									<Input
										placeholder="C:\...\ollama.exe"
										className="h-8 text-md bg-muted/30 focus-visible:bg-background transition-colors"
										defaultValue={customPath || ""}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												setCustomPath(e.currentTarget.value);
											}
										}}
									/>
									<Button
										variant="outline"
										size="icon"
										className="h-8 w-8 shrink-0 hover:bg-primary hover:text-primary-foreground transition-colors"
										onClick={(e) => {
											const input = e.currentTarget
												.previousElementSibling as HTMLInputElement;
											setCustomPath(input.value);
										}}
									>
										<Settings className="h-3.5 w-3.5" />
									</Button>
								</div>
								<p className="text-md text-muted-foreground italic leading-snug">
									Enter the full path to your Ollama executable if it's in a
									non-standard location.
								</p>
							</div>

							<Separator className="opacity-50" />

							<Button
								variant="outline"
								className="w-full h-9 text-md gap-2 font-semibold border-primary/20 hover:border-primary/50 hover:bg-primary/5"
								asChild
							>
								<a href="https://ollama.com" target="_blank" rel="noreferrer">
									<Download className="h-3.5 w-3.5" />
									Get Ollama from ollama.com
									<ExternalLink className="h-3 w-3 ml-auto opacity-40" />
								</a>
							</Button>
						</div>
					)}
				</div>

				<Separator className="opacity-50" />

				<div className="flex justify-between items-center pt-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 px-2.5 text-md gap-1.5 hover:bg-muted font-medium"
						onClick={() => checkStatus()}
					>
						<RefreshCw
							className={cn("h-3 w-3", status === "checking" && "animate-spin")}
						/>
						Refresh Status
					</Button>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
}
