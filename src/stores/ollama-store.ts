import {
	checkOllamaStatus,
	startOllama,
} from "@/features/ollama/ollama-server";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type OllamaStatus = "checking" | "running" | "stopped" | "not-installed";

interface OllamaStore {
	status: OllamaStatus;
	models: string[];
	baseUrl: string;
	error: string | null;
	installPath: string | null;
	customPath: string | null;

	checkStatus: () => Promise<void>;
	startService: () => Promise<void>;
	setCustomPath: (path: string | null) => void;
}

const CUSTOM_PATH_KEY = "rapid-chat-ollama-path";

export const useOllamaStore = create<OllamaStore>()(
	devtools(
		(set, get) => ({
			status: "checking",
			models: [],
			baseUrl: "http://127.0.0.1:11434",
			error: null,
			installPath: null,
			customPath:
				typeof window !== "undefined"
					? localStorage.getItem(CUSTOM_PATH_KEY)
					: null,

			checkStatus: async () => {
				const { customPath } = get();
				try {
					const result = await checkOllamaStatus({ data: { customPath } });
					set({
						status: result.status,
						models: result.models,
						baseUrl: result.baseUrl,
						installPath: result.path || null,
						error: null,
					});
				} catch (err) {
					console.error("Failed to check Ollama status:", err);
					set({
						status: "stopped",
						error: (err as Error).message,
					});
				}
			},

			startService: async () => {
				const { status, customPath } = get();
				if (status === "running") return;

				set({ status: "checking" });
				try {
					const result = await startOllama({ data: { customPath } });
					if (result.success) {
						// Poll for status update
						let attempts = 0;
						const poll = async () => {
							attempts++;
							await get().checkStatus();
							if (get().status !== "running" && attempts < 10) {
								setTimeout(poll, 1000);
							}
						};
						setTimeout(poll, 1000);
					} else {
						set({
							status: "stopped",
							error: result.error || "Failed to start Ollama",
						});
					}
				} catch (err) {
					console.error("Failed to start Ollama:", err);
					set({
						status: "stopped",
						error: (err as Error).message,
					});
				}
			},

			setCustomPath: (path: string | null) => {
				if (path) {
					localStorage.setItem(CUSTOM_PATH_KEY, path);
				} else {
					localStorage.removeItem(CUSTOM_PATH_KEY);
				}
				set({ customPath: path });
				get().checkStatus();
			},
		}),
		{ name: "OllamaStore" },
	),
);

// Helper hook for status
export function useOllamaStatus() {
	return useOllamaStore((state) => state.status);
}

export function useIsOllamaRunning() {
	return useOllamaStore((state) => state.status === "running");
}
