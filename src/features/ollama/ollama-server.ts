import { env } from "@/env";
import { createServerFn } from "@tanstack/react-start";
import { exec, spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

interface OllamaArgs {
	data?: { customPath?: string | null };
}

export const checkOllamaStatus = createServerFn({ method: "POST" }).handler(
	async (args: OllamaArgs) => {
		const data = args.data;
		const baseUrl = env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
		try {
			const response = await fetch(`${baseUrl}/api/tags`);
			if (response.ok) {
				const data = (await response.json()) as {
					models: Array<{ name: string }>;
				};
				return {
					status: "running" as const,
					models: data.models.map((m) => m.name),
					baseUrl,
				};
			}
		} catch (_e) {
			// Not running
		}

		// If not running, check if installed
		const installation = await getOllamaInstallation(data?.customPath);
		return {
			status: installation.exists
				? ("stopped" as const)
				: ("not-installed" as const),
			models: [],
			baseUrl,
			path: installation.path,
		};
	},
);

export const startOllama = createServerFn({ method: "POST" }).handler(
	async (args: OllamaArgs) => {
		const data = args.data;
		const installation = await getOllamaInstallation(data?.customPath);

		if (!installation.exists) {
			throw new Error("Ollama is not installed");
		}

		try {
			// On Windows, we can use the executable path or just 'ollama' if in PATH
			const cmd = installation.path || "ollama";

			// Spawn detached process so it keeps running
			const child = spawn(cmd, ["serve"], {
				detached: true,
				stdio: "ignore",
			});

			child.unref();

			return { success: true };
		} catch (e) {
			console.error("Failed to start Ollama:", e);
			return { success: false, error: (e as Error).message };
		}
	},
);

async function getOllamaInstallation(customPath?: string | null) {
	if (customPath) {
		try {
			await fs.access(customPath);
			return { exists: true, path: customPath };
		} catch {}
	}

	if (os.platform() === "win32") {
		// Check common windows paths
		const userDir = os.homedir();
		const commonPaths = [
			path.join(
				userDir,
				"AppData",
				"Local",
				"Programs",
				"Ollama",
				"ollama.exe",
			),
			path.join(
				process.env.LOCALAPPDATA || "",
				"Programs",
				"Ollama",
				"ollama.exe",
			),
		];

		for (const p of commonPaths) {
			try {
				await fs.access(p);
				return { exists: true, path: p };
			} catch {}
		}

		// Check if in PATH
		try {
			const { stdout } = await execAsync("where ollama");
			const firstPath = stdout.split("\r\n")[0].trim();
			if (firstPath) {
				return { exists: true, path: firstPath };
			}
		} catch {}
	} else {
		// macOS/Linux
		try {
			const { stdout } = await execAsync("which ollama");
			const firstPath = stdout.trim();
			if (firstPath) {
				return { exists: true, path: firstPath };
			}
		} catch {}
	}
	return { exists: false, path: null };
}
