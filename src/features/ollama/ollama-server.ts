import { createServerFn } from "@tanstack/react-start";
import type { ChildProcess } from "child_process";
import { exec, spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { env } from "@/env";

const execAsync = promisify(exec);

type OllamaInput = {
  customPath?: string | null;
};

export const checkOllamaStatus = createServerFn({ method: "POST" })
  .inputValidator((data?: OllamaInput) => data)
  .handler(({ data }) =>
    checkOllamaStatusImpl(
      {
        fetchFn: fetch,
        baseUrl: env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
        getInstallation: getOllamaInstallation,
      },
      data,
    ),
  );


export const startOllama = createServerFn({ method: "POST" })
  .inputValidator((data?: OllamaInput) => data)
  .handler(({ data }) =>
    startOllamaImpl(
      {
        spawnFn: spawn,
        getInstallation: getOllamaInstallation,
        logError: console.error,
      },
      data,
    ),
  );



export async function checkOllamaStatusImpl(
  deps: {
    fetchFn: typeof fetch;
    baseUrl: string;
    getInstallation: (customPath?: string | null) => Promise<{ exists: boolean; path: string | null }>;
  },
  data?: OllamaInput,
) {
  const { fetchFn, baseUrl, getInstallation } = deps;

  try {
    const response = await fetchFn(`${baseUrl}/api/tags`);
    if (response.ok) {
      const json = (await response.json()) as { models: Array<{ name: string }> };
      return {
        status: "running" as const,
        models: json.models.map((m) => m.name),
        baseUrl,
      };
    }
  } catch {}

  const installation = await getInstallation(data?.customPath);
  return {
    status: installation.exists ? ("stopped" as const) : ("not-installed" as const),
    models: [],
    baseUrl,
    path: installation.path,
  };
}

export async function startOllamaImpl(
  deps: {
    spawnFn: (
      command: string,
      args: readonly string[],
      options: { detached: boolean; stdio: "ignore" }
    ) => Pick<ChildProcess, "unref">;
    getInstallation: (
      customPath?: string | null
    ) => Promise<{ exists: boolean; path: string | null }>;
    logError?: (...args: any[]) => void;
  },
  data?: OllamaInput,
) {
  const installation = await deps.getInstallation(data?.customPath);

  if (!installation.exists) {
    throw new Error("Ollama is not installed");
  }

  try {
    const child = deps.spawnFn(installation.path!, ["serve"], { detached: true, stdio: "ignore" });
    child.unref();
    return { success: true as const };
  } catch (e) {
    deps.logError?.("Failed to start Ollama:", e);
    return { success: false as const, error: (e as Error).message };
  }
}

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
