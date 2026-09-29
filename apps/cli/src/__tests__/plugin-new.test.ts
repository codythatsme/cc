import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BUNDLED_PLUGIN_SDK_SPECIFIER } from "../plugin-sdk-package.js";
import { RESERVED_CC_CLI_COMMANDS } from "@cc/domain/plugin-cli";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerPluginCommands,
  resolveNewPluginTarget,
} from "../commands/plugin.js";
import { installFakeNpm } from "./helpers/fake-npm.js";

describe("resolveNewPluginTarget", () => {
  it.each([
    ["hello", "cc-plugin-hello", "cc-plugin-hello"],
    ["cc-plugin-hello", "cc-plugin-hello", "cc-plugin-hello"],
    ["@acme/cc-plugin-hello", "@acme/cc-plugin-hello", "cc-plugin-hello"],
  ])("resolves %s", (name, expectedPackageName, expectedDirectoryName) => {
    expect(resolveNewPluginTarget(name)).toEqual({
      packageName: expectedPackageName,
      directoryName: expectedDirectoryName,
    });
  });

  it.each([
    "Hello",
    "cc-plugin-",
    "@acme/hello",
    "@acme/cc-plugin-Hello",
    "@acme/team/cc-plugin-hello",
  ])("rejects %s", (name) => {
    expect(resolveNewPluginTarget(name)).toBeNull();
  });

  it.each(RESERVED_CC_CLI_COMMANDS)("rejects reserved id %s", (id) => {
    expect(resolveNewPluginTarget(id)).toBeNull();
    expect(resolveNewPluginTarget(`cc-plugin-${id}`)).toBeNull();
    expect(resolveNewPluginTarget(`@acme/cc-plugin-${id}`)).toBeNull();
  });
});

describe.sequential("cc plugin new dependency install", () => {
  const originalCwd = process.cwd();
  let workDir: string;
  let logged: string[];
  let warned: string[];

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), "cc-plugin-new-"));
    process.chdir(workDir);
    await installFakeNpm(workDir);
    vi.stubEnv("NODE_ENV", "production");
    logged = [];
    warned = [];
    vi.spyOn(console, "log").mockImplementation((line: unknown) => {
      logged.push(String(line));
    });
    vi.spyOn(console, "warn").mockImplementation((line: unknown) => {
      warned.push(String(line));
    });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    await rm(workDir, { recursive: true, force: true });
  });

  async function runPluginNew(args: string[]): Promise<void> {
    const program = new Command();
    program.exitOverride();
    registerPluginCommands(program, () => "http://localhost");
    await program.parseAsync(["node", "cc", "plugin", "new", ...args]);
  }

  async function isInstalled(
    directoryName: string,
    packageName: string,
  ): Promise<boolean> {
    return stat(join(workDir, directoryName, "node_modules", packageName))
      .then(() => true)
      .catch(() => false);
  }

  it("installs the packages the plugin needs to build under NODE_ENV=production", async () => {
    await runPluginNew(["prod-env"]);

    expect(await isInstalled("cc-plugin-prod-env", "zod")).toBe(true);
    expect(await isInstalled("cc-plugin-prod-env", "typescript")).toBe(true);
    expect(await isInstalled("cc-plugin-prod-env", "clsx")).toBe(true);
    expect(warned).toEqual([]);
    expect(logged).toContain("Installed dependencies (npm install).");
    expect(logged).not.toContain("  npm install --include=dev");
  });

  it("accepts a tree npm hoisted to a workspace root", async () => {
    await writeFile(
      join(workDir, "package.json"),
      JSON.stringify({ name: "host", private: true, workspaces: ["*"] }),
    );
    vi.stubEnv("CC_TEST_NPM_HOIST_TO", workDir);

    await runPluginNew(["hoisted"]);

    expect(await isInstalled("cc-plugin-hoisted", "zod")).toBe(false);
    expect(warned).toEqual([]);
    expect(logged).toContain("Installed dependencies (npm install).");
  });

  it("does not report success when npm exits 0 without installing the tree", async () => {
    vi.stubEnv("CC_TEST_NPM_ALWAYS_OMIT_DEV", "1");

    await runPluginNew(["silent-omit"]);

    expect(await isInstalled("cc-plugin-silent-omit", "typescript")).toBe(
      false,
    );
    expect(logged).not.toContain("Installed dependencies (npm install).");
    expect(warned.join("\n")).toMatch(
      /npm install reported success but .*\btypescript\b.* missing from node_modules/,
    );
    expect(logged).toContain("  npm install --include=dev");
  });

  it("pins the scaffold to this cc's SDK version", async () => {
    await runPluginNew(["pinned"]);

    const manifest: { devDependencies: Record<string, string> } = JSON.parse(
      await readFile(join(workDir, "cc-plugin-pinned", "package.json"), "utf8"),
    );
    expect(manifest.devDependencies["@codythatsme/plugin-sdk"]).toBe(
      BUNDLED_PLUGIN_SDK_SPECIFIER,
    );
    expect(
      await isInstalled("cc-plugin-pinned", "@codythatsme/plugin-sdk"),
    ).toBe(true);
    expect(warned).toEqual([]);
  });

  it.each(["missing", "e404", "error"])(
    "uses its bundled SDK even when registry probing would return %s",
    async (result) => {
      vi.stubEnv("CC_TEST_NPM_VIEW", result);
      await runPluginNew(["local-sdk"]);
      expect(warned).toEqual([]);
      const manifest = JSON.parse(
        await readFile(
          join(workDir, "cc-plugin-local-sdk", "package.json"),
          "utf8",
        ),
      );
      expect(manifest.devDependencies["@codythatsme/plugin-sdk"]).toBe(
        BUNDLED_PLUGIN_SDK_SPECIFIER,
      );
      const sdk = JSON.parse(
        await readFile(
          join(
            workDir,
            "cc-plugin-local-sdk",
            BUNDLED_PLUGIN_SDK_SPECIFIER.slice(7),
            "package.json",
          ),
          "utf8",
        ),
      );
      expect(sdk.name).toBe("@codythatsme/plugin-sdk");
      expect(sdk.devDependencies).toBeUndefined();
      expect(sdk.scripts).toBeUndefined();
      expect(sdk.exports["."].source).toBeUndefined();
    },
  );

  it("passes npm's own reason through when the install fails", async () => {
    vi.stubEnv("CC_TEST_NPM_INSTALL", "fail");

    await runPluginNew(["npm-broken"]);

    const warnings = warned.join("\n");
    expect(warnings).toContain("Could not run npm install");
    expect(warnings).toContain("npm error code EPERM");
    expect(warnings).toContain("Your cache folder contains root-owned files");
  });

  it("keeps stderr details when a failed install also writes stdout", async () => {
    vi.stubEnv("CC_TEST_NPM_INSTALL", "fail-noisy-stdout");

    await runPluginNew(["npm-noisy"]);

    const warnings = warned.join("\n");
    expect(warnings).toContain("npm error code EPERM");
    expect(warnings).not.toContain("progress line");
  });

  it("falls back to the manual step when npm is not on PATH", async () => {
    vi.stubEnv("PATH", join(workDir, "empty-bin"));

    await runPluginNew(["no-npm"]);

    expect(warned.join("\n")).toContain("Could not run npm install");
    expect(logged).toContain("  npm install --include=dev");
    expect(warned.join("\n")).not.toContain("npm registry");
    expect(warned.join("\n")).not.toContain("was not found on npm");
  });
});
