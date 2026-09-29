import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveCcAppVersion } from "../version.js";

describe("resolveCcAppVersion", () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "cc-cli-version-"));
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it("prefers CC_APP_VERSION from the env", () => {
    expect(
      resolveCcAppVersion({
        env: { CC_APP_VERSION: "1.2.3" },
        fromDir: tempRoot,
      }),
    ).toBe("1.2.3");
  });

  it("trims whitespace around CC_APP_VERSION", () => {
    expect(
      resolveCcAppVersion({
        env: { CC_APP_VERSION: "  4.5.6  " },
        fromDir: tempRoot,
      }),
    ).toBe("4.5.6");
  });

  it("reads the cc-app package.json adjacent to the binary", async () => {
    const packageRoot = join(tempRoot, "package-root");
    const binDir = join(packageRoot, "host-daemon", "dist");
    await mkdir(binDir, { recursive: true });
    await writeFile(
      join(packageRoot, "package.json"),
      JSON.stringify({ name: "cc-app", version: "0.0.7" }),
    );
    expect(
      resolveCcAppVersion({
        env: {},
        fromDir: binDir,
      }),
    ).toBe("0.0.7");
  });

  it("ignores adjacent package.json files that are not cc-app", async () => {
    const repoRoot = join(tempRoot, "repo");
    const cliDistDir = join(repoRoot, "apps", "cli", "dist");
    await mkdir(cliDistDir, { recursive: true });
    await writeFile(
      join(repoRoot, "package.json"),
      JSON.stringify({ name: "cc", version: "0.0.0", private: true }),
    );
    await writeFile(
      join(repoRoot, "apps", "cli", "package.json"),
      JSON.stringify({ name: "@cc/cli", version: "0.0.1" }),
    );
    const ccAppDir = join(repoRoot, "packages", "cc-app");
    await mkdir(ccAppDir, { recursive: true });
    await writeFile(
      join(ccAppDir, "package.json"),
      JSON.stringify({ name: "cc-app", version: "0.1.2" }),
    );
    expect(
      resolveCcAppVersion({
        env: {},
        fromDir: cliDistDir,
      }),
    ).toBe("0.1.2");
  });

  it("falls back to the dev sentinel when no cc-app package.json is found", () => {
    expect(
      resolveCcAppVersion({
        env: {},
        fromDir: tempRoot,
      }),
    ).toBe("0.0.0-dev");
  });
});
