/**
 * Tests for ollama-server.ts
 *
 * Best-practice approach:
 * - Unit test the impl functions (checkOllamaStatusImpl/startOllamaImpl) with injected deps
 * - Keep a small set of tests that indirectly exercise getOllamaInstallation via checkOllamaStatus
 */
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

// Use vi.hoisted to ensure mocks are available during module hoisting
const { mockExecAsync, mockSpawn, mockFsAccess, mockOsPlatform, mockOsHomedir } = vi.hoisted(() => ({
  mockExecAsync: vi.fn(),
  mockSpawn: vi.fn(),
  mockFsAccess: vi.fn(),
  mockOsPlatform: vi.fn(),
  mockOsHomedir: vi.fn(),
}));

/**
 * IMPORTANT: createServerFn must support chaining now:
 * createServerFn(...).inputValidator(...).handler(...)
 */
vi.mock("@tanstack/react-start", () => ({
  createServerFn: (_opts: { method: string }) => {
    const builder: any = {
      inputValidator: () => builder,
      middleware: () => builder,
      handler: (fn: any) => fn,
    };
    return builder;
  },
}));

vi.mock("@/env", () => ({
  env: {
    OLLAMA_BASE_URL: undefined,
  },
}));

vi.mock("child_process", () => ({
  exec: vi.fn(),
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

vi.mock("util", () => ({
  promisify: () => mockExecAsync,
}));

vi.mock("fs/promises", () => ({
  default: {
    access: (...args: unknown[]) => mockFsAccess(...args),
  },
}));

vi.mock("os", () => ({
  default: {
    platform: () => mockOsPlatform(),
    homedir: () => mockOsHomedir(),
  },
}));

// Now import the module under test
import {
  checkOllamaStatus,
  checkOllamaStatusImpl,
  startOllamaImpl,
} from "./ollama-server";

describe("ollama-server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("checkOllamaStatusImpl", () => {
    describe("when Ollama is running", () => {
      test("returns status 'running' with models list when API responds successfully", async () => {
        const mockModels = [{ name: "llama2" }, { name: "codellama" }];

        const fetchFn = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ models: mockModels }),
        });

        const getInstallation = vi.fn(); // should not be called when running

        const result = await checkOllamaStatusImpl(
          {
            fetchFn,
            baseUrl: "http://127.0.0.1:11434",
            getInstallation,
          },
          {}, // optional input
        );

        expect(result).toEqual({
          status: "running",
          models: ["llama2", "codellama"],
          baseUrl: "http://127.0.0.1:11434",
        });

        expect(fetchFn).toHaveBeenCalledWith("http://127.0.0.1:11434/api/tags");
        expect(getInstallation).not.toHaveBeenCalled();
      });

      test("returns empty models array when no models are available", async () => {
        const fetchFn = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ models: [] }),
        });

        const result = await checkOllamaStatusImpl(
          {
            fetchFn,
            baseUrl: "http://127.0.0.1:11434",
            getInstallation: vi.fn(),
          },
          {},
        );

        expect(result).toEqual({
          status: "running",
          models: [],
          baseUrl: "http://127.0.0.1:11434",
        });
      });
    });

    describe("when Ollama is not running", () => {
      test("returns status 'stopped' when Ollama is installed but not running", async () => {
        const fetchFn = vi.fn().mockRejectedValue(new Error("Connection refused"));
        const getInstallation = vi.fn().mockResolvedValue({
          exists: true,
          path: "/usr/local/bin/ollama",
        });

        const result = await checkOllamaStatusImpl(
          {
            fetchFn,
            baseUrl: "http://127.0.0.1:11434",
            getInstallation,
          },
          {},
        );

        expect(result).toEqual({
          status: "stopped",
          models: [],
          baseUrl: "http://127.0.0.1:11434",
          path: "/usr/local/bin/ollama",
        });

        expect(getInstallation).toHaveBeenCalledWith(undefined);
      });

      test("returns status 'not-installed' when Ollama is not found", async () => {
        const fetchFn = vi.fn().mockRejectedValue(new Error("Connection refused"));
        const getInstallation = vi.fn().mockResolvedValue({
          exists: false,
          path: null,
        });

        const result = await checkOllamaStatusImpl(
          {
            fetchFn,
            baseUrl: "http://127.0.0.1:11434",
            getInstallation,
          },
          {},
        );

        expect(result).toEqual({
          status: "not-installed",
          models: [],
          baseUrl: "http://127.0.0.1:11434",
          path: null,
        });
      });

      test("passes customPath through to getInstallation", async () => {
        const fetchFn = vi.fn().mockRejectedValue(new Error("Connection refused"));
        const getInstallation = vi.fn().mockResolvedValue({
          exists: true,
          path: "/custom/path/to/ollama",
        });

        const result = await checkOllamaStatusImpl(
          {
            fetchFn,
            baseUrl: "http://127.0.0.1:11434",
            getInstallation,
          },
          { customPath: "/custom/path/to/ollama" },
        );

        expect(result.status).toBe("stopped");
        expect(getInstallation).toHaveBeenCalledWith("/custom/path/to/ollama");
      });

      test("handles non-ok API response as not running", async () => {
        const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 500 });
        const getInstallation = vi.fn().mockResolvedValue({ exists: false, path: null });

        const result = await checkOllamaStatusImpl(
          {
            fetchFn,
            baseUrl: "http://127.0.0.1:11434",
            getInstallation,
          },
          {},
        );

        expect(result.status).toBe("not-installed");
      });
    });
  });

  describe("startOllamaImpl", () => {
    describe("successful start", () => {
      test("starts Ollama when installed (using discovered path)", async () => {
        const mockChildProcess = { unref: vi.fn() };
        const spawnFn = vi.fn().mockReturnValue(mockChildProcess);

        const result = await startOllamaImpl(
          {
            spawnFn,
            getInstallation: vi.fn().mockResolvedValue({
              exists: true,
              path: "/usr/local/bin/ollama",
            }),
            logError: vi.fn(),
          },
          {},
        );

        expect(result).toEqual({ success: true });
        expect(spawnFn).toHaveBeenCalledWith(
          "/usr/local/bin/ollama",
          ["serve"],
          { detached: true, stdio: "ignore" },
        );
        expect(mockChildProcess.unref).toHaveBeenCalled();
      });

      test("passes customPath through to getInstallation", async () => {
        const mockChildProcess = { unref: vi.fn() };
        const spawnFn = vi.fn().mockReturnValue(mockChildProcess);
        const getInstallation = vi.fn().mockResolvedValue({
          exists: true,
          path: "/my/custom/ollama",
        });

        const result = await startOllamaImpl(
          { spawnFn, getInstallation, logError: vi.fn() },
          { customPath: "/my/custom/ollama" },
        );

        expect(result).toEqual({ success: true });
        expect(getInstallation).toHaveBeenCalledWith("/my/custom/ollama");
        expect(spawnFn).toHaveBeenCalledWith(
          "/my/custom/ollama",
          ["serve"],
          { detached: true, stdio: "ignore" },
        );
      });

      test("uses 'ollama' fallback when installation path is null but exists=true", async () => {
        const mockChildProcess = { unref: vi.fn() };
        const spawnFn = vi.fn().mockReturnValue(mockChildProcess);

        const result = await startOllamaImpl(
          {
            spawnFn,
            getInstallation: vi.fn().mockResolvedValue({ exists: true, path: null }),
            logError: vi.fn(),
          },
          {},
        );

        expect(result).toEqual({ success: true });
        expect(spawnFn).toHaveBeenCalledWith(
          "ollama",
          ["serve"],
          { detached: true, stdio: "ignore" },
        );
      });
    });

    describe("error handling", () => {
      test("throws error when Ollama is not installed", async () => {
        await expect(
          startOllamaImpl(
            {
              spawnFn: vi.fn(),
              getInstallation: vi.fn().mockResolvedValue({ exists: false, path: null }),
              logError: vi.fn(),
            },
            {},
          ),
        ).rejects.toThrow("Ollama is not installed");
      });

      test("returns error object when spawn fails", async () => {
        const spawnFn = vi.fn(() => {
          throw new Error("spawn ENOENT");
        });

        const logError = vi.fn();

        const result = await startOllamaImpl(
          {
            spawnFn,
            getInstallation: vi.fn().mockResolvedValue({ exists: true, path: "/usr/local/bin/ollama" }),
            logError,
          },
          {},
        );

        expect(result).toEqual({ success: false, error: "spawn ENOENT" });
        expect(logError).toHaveBeenCalledWith("Failed to start Ollama:", expect.any(Error));
      });

      test("returns error message from spawn exception", async () => {
        const spawnFn = vi.fn(() => {
          throw new Error("Permission denied");
        });

        const result = await startOllamaImpl(
          {
            spawnFn,
            getInstallation: vi.fn().mockResolvedValue({ exists: true, path: "/usr/bin/ollama" }),
            logError: vi.fn(),
          },
          {},
        );

        expect(result).toEqual({ success: false, error: "Permission denied" });
      });
    });

    describe("Windows-like behavior (just path usage)", () => {
      test("starts Ollama using a Windows path returned by getInstallation", async () => {
        const mockChildProcess = { unref: vi.fn() };
        const spawnFn = vi.fn().mockReturnValue(mockChildProcess);

        const result = await startOllamaImpl(
          {
            spawnFn,
            getInstallation: vi.fn().mockResolvedValue({
              exists: true,
              path: "C:\\Users\\TestUser\\AppData\\Local\\Programs\\Ollama\\ollama.exe",
            }),
            logError: vi.fn(),
          },
          {},
        );

        expect(result).toEqual({ success: true });
        expect(spawnFn).toHaveBeenCalledWith(
          "C:\\Users\\TestUser\\AppData\\Local\\Programs\\Ollama\\ollama.exe",
          ["serve"],
          { detached: true, stdio: "ignore" },
        );
      });
    });
  });

  /**
   * Keep these: they indirectly test getOllamaInstallation via the exported server fn.
   * (Because getOllamaInstallation is not exported.)
   */
  describe("getOllamaInstallation (tested via checkOllamaStatus)", () => {
    beforeEach(() => {
      // Force the status path to go through installation lookup
      global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused")) as any;
    });

    describe("macOS/Linux path resolution", () => {
      test("finds ollama via 'which' command", async () => {
        mockOsPlatform.mockReturnValue("linux");
        mockExecAsync.mockResolvedValue({ stdout: "/snap/bin/ollama\n" });

        const result = await checkOllamaStatus({ data: {} });

        expect(result.path).toBe("/snap/bin/ollama");
        expect(result.status).toBe("stopped");
      });

      test("handles empty 'which' output", async () => {
        mockOsPlatform.mockReturnValue("darwin");
        mockExecAsync.mockResolvedValue({ stdout: "   \n" });

        const result = await checkOllamaStatus({ data: {} });

        expect(result.status).toBe("not-installed");
        expect(result.path).toBeNull();
      });
    });

    describe("Windows path resolution", () => {
      beforeEach(() => {
        mockOsPlatform.mockReturnValue("win32");
        mockOsHomedir.mockReturnValue("C:\\Users\\TestUser");
      });

      test("checks user AppData path first", async () => {
        mockFsAccess.mockResolvedValue(undefined);

        const result = await checkOllamaStatus({ data: {} });

        expect(mockFsAccess).toHaveBeenCalled();
        const accessPath = mockFsAccess.mock.calls[0][0] as string;

        expect(accessPath).toContain("C:\\Users\\TestUser");
        expect(accessPath).toContain("AppData");
        expect(accessPath).toContain("ollama.exe");

        expect(result.status).toBe("stopped");
        expect(result.path).toContain("ollama.exe");
      });

      test("checks LOCALAPPDATA path as fallback", async () => {
        mockFsAccess
          .mockRejectedValueOnce(new Error("ENOENT"))
          .mockResolvedValueOnce(undefined);

        const originalEnv = process.env.LOCALAPPDATA;
        process.env.LOCALAPPDATA = "C:\\Users\\TestUser\\AppData\\Local";

        const result = await checkOllamaStatus({ data: {} });

        expect(result.status).toBe("stopped");
        expect(result.path).toContain("AppData");
        expect(result.path).toContain("ollama.exe");

        process.env.LOCALAPPDATA = originalEnv;
      });

      test("falls back to 'where' command when local paths not found", async () => {
        mockFsAccess.mockRejectedValue(new Error("ENOENT"));
        mockExecAsync.mockResolvedValue({
          stdout: "D:\\CustomPath\\ollama.exe\r\nC:\\Other\\ollama.exe\r\n",
        });

        const result = await checkOllamaStatus({ data: {} });

        expect(result.path).toBe("D:\\CustomPath\\ollama.exe");
      });

      test("handles Windows line endings in 'where' output", async () => {
        mockFsAccess.mockRejectedValue(new Error("ENOENT"));
        mockExecAsync.mockResolvedValue({
          stdout: "C:\\Program Files\\Ollama\\ollama.exe\r\n",
        });

        const result = await checkOllamaStatus({ data: {} });

        expect(result.path).toBe("C:\\Program Files\\Ollama\\ollama.exe");
      });
    });

    describe("custom path priority", () => {
      test("custom path takes priority over system paths", async () => {
        mockOsPlatform.mockReturnValue("darwin");
        mockFsAccess.mockResolvedValue(undefined);
        mockExecAsync.mockResolvedValue({ stdout: "/usr/bin/ollama\n" });

        const result = await checkOllamaStatus({
          data: { customPath: "/opt/ollama/bin/ollama" },
        });

        expect(result.path).toBe("/opt/ollama/bin/ollama");
      });

      test("falls back to default paths when custom path is invalid", async () => {
        mockOsPlatform.mockReturnValue("darwin");
        mockFsAccess.mockRejectedValue(new Error("ENOENT"));
        mockExecAsync.mockResolvedValue({ stdout: "/usr/bin/ollama\n" });

        const result = await checkOllamaStatus({
          data: { customPath: "/invalid/path/ollama" },
        });

        expect(result.status).toBe("stopped");
        expect(result.path).toBe("/usr/bin/ollama");
      });
    });
  });

  describe("environment configuration (impl)", () => {
    test("uses provided baseUrl (wrapper uses env; impl uses passed value)", async () => {
      const fetchFn = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const result = await checkOllamaStatusImpl(
        {
          fetchFn,
          baseUrl: "http://127.0.0.1:11434",
          getInstallation: vi.fn(),
        },
        {},
      );

      expect(result.baseUrl).toBe("http://127.0.0.1:11434");
      expect(fetchFn).toHaveBeenCalledWith("http://127.0.0.1:11434/api/tags");
    });
  });
});
