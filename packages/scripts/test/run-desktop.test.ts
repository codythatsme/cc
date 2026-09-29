import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveDevInstanceConfig } from "@cc/config/runtime";
import {
  createDesktopPackageCommand,
  createDesktopRunCommand,
  resolveDesktopLaunchMode,
  resolveDesktopPackageTask,
  resolveDesktopUserDataDir,
  toDesktopLaunchProcessEnv,
} from "../src/commands/run-desktop.js";

const config = resolveDevInstanceConfig({
  homeDir: "/Users/tester",
  repoRoot: "/Users/tester/checkouts/cc",
});

describe("desktop launch mode", () => {
  it("defaults to the installed data directory and rejects unknown arguments", () => {
    expect(resolveDesktopLaunchMode([])).toBe("prod");
    expect(resolveDesktopLaunchMode(["--worktree"])).toBe("worktree");
    expect(() => resolveDesktopLaunchMode(["--worktre"])).toThrow(
      /Unknown arguments: --worktre/u,
    );
    expect(() => resolveDesktopLaunchMode(["--worktree", "--extra"])).toThrow(
      /Unknown arguments/u,
    );
  });
});

describe("desktop packaging task", () => {
  it("selects the platform packaging task and refuses unsupported platforms", () => {
    expect(resolveDesktopPackageTask("darwin")).toBe("package");
    expect(resolveDesktopPackageTask("linux")).toBe("package:linux");
    expect(() => resolveDesktopPackageTask("win32")).toThrow(
      /supported on macOS and Linux/u,
    );
    expect(createDesktopPackageCommand("darwin").args).toEqual(
      expect.arrayContaining(["run", "package", "--filter=@cc/desktop"]),
    );
  });

  it("runs the packaged app from the desktop package directory", () => {
    const command = createDesktopRunCommand();
    expect(command.cwd.endsWith("/apps/desktop")).toBe(true);
    expect(command.args[0]?.endsWith("/scripts/run-packaged-app.mjs")).toBe(
      true,
    );
  });
});

describe("desktop launch environment", () => {
  it("isolates the worktree launch onto this checkout's data directory and ports", () => {
    const env = toDesktopLaunchProcessEnv({
      baseEnv: {
        CC_DATA_DIR: "/Users/tester/.cc",
        CC_DEV_APP_PORT: "5173",
        NODE_ENV: "development",
        OPENAI_API_KEY: "test-key",
      },
      config,
      mode: "worktree",
    });

    expect(env).toMatchObject({
      CC_DATA_DIR: config.dataDir,
      CC_DESKTOP_OPEN_DEVTOOLS: "0",
      CC_DESKTOP_USER_DATA_DIR: join(config.dataDir, "desktop"),
      CC_HOST_DAEMON_PORT: String(config.ports.hostDaemonPort),
      CC_SERVER_PORT: String(config.ports.serverPort),
      NODE_ENV: "production",
      OPENAI_API_KEY: "test-key",
    });
    expect(env.CC_DATA_DIR).not.toBe("/Users/tester/.cc");
    expect(env.CC_SERVER_PORT).not.toBe("38886");
    expect(env.CC_DEV_APP_PORT).toBeUndefined();
  });

  it("keeps the worktree build off the installed Electron user data directory", () => {
    const env = toDesktopLaunchProcessEnv({
      baseEnv: {},
      config,
      mode: "worktree",
    });

    expect(env.CC_DESKTOP_USER_DATA_DIR?.startsWith(config.dataDir)).toBe(true);
    expect(env.CC_DESKTOP_USER_DATA_DIR).not.toContain("Application Support");
  });

  it("preserves an explicit Electron user data directory", () => {
    const userDataDir = "/tmp/cc-desktop-profile";
    const env = toDesktopLaunchProcessEnv({
      baseEnv: { CC_DESKTOP_USER_DATA_DIR: ` ${userDataDir} ` },
      config,
      mode: "worktree",
    });

    expect(env.CC_DESKTOP_USER_DATA_DIR).toBe(userDataDir);
    expect(
      resolveDesktopUserDataDir(
        { CC_DESKTOP_USER_DATA_DIR: "relative-profile" },
        config,
      ),
    ).toBe(join(process.cwd(), "relative-profile"));
  });

  it("lets an explicit devtools choice survive the worktree default", () => {
    const env = toDesktopLaunchProcessEnv({
      baseEnv: { CC_DESKTOP_OPEN_DEVTOOLS: "1" },
      config,
      mode: "worktree",
    });

    expect(env.CC_DESKTOP_OPEN_DEVTOOLS).toBe("1");
  });

  it("leaves the installed data directory and ports alone without --worktree", () => {
    const env = toDesktopLaunchProcessEnv({
      baseEnv: { NODE_ENV: "development", OPENAI_API_KEY: "test-key" },
      config,
      mode: "prod",
    });

    expect(env.CC_DATA_DIR).toBeUndefined();
    expect(env.CC_SERVER_PORT).toBeUndefined();
    expect(env.CC_HOST_DAEMON_PORT).toBeUndefined();
    expect(env.CC_DESKTOP_USER_DATA_DIR).toBeUndefined();
    expect(env).toMatchObject({
      CC_DESKTOP_OPEN_DEVTOOLS: "0",
      NODE_ENV: "production",
      OPENAI_API_KEY: "test-key",
    });
  });
});
