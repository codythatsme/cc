import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAppUpdateVersionsDir } from "@cc/config/app-update";
import {
  formatNpmRevisionPackageRoot,
  installNpmRevision,
  NPM_REVISION_REQUIRED_FILES,
  pruneNpmRevisions,
} from "../src/app-update/npm-revision.js";
import type { RunCommand } from "../src/app-update/run-command.js";

const scratchDirs: string[] = [];

afterEach(() => {
  for (const dir of scratchDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

function scratchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "cc-app-update-npm-"));
  scratchDirs.push(dir);
  return dir;
}

function writePackage(
  packageRoot: string,
  version: string,
  files: readonly string[] = NPM_REVISION_REQUIRED_FILES,
): void {
  for (const file of files) {
    mkdirSync(dirname(join(packageRoot, file)), { recursive: true });
    writeFileSync(join(packageRoot, file), "");
  }
  writeFileSync(join(packageRoot, "package.json"), JSON.stringify({ version }));
}

describe("installNpmRevision", () => {
  it("rejects a remote download without invoking npm or creating install directories", async () => {
    const dataDir = scratchDir();
    const runner = vi.fn<RunCommand>();
    await expect(
      installNpmRevision({
        dataDir,
        npmCliPath: null,
        onLine: () => undefined,
        onStep: () => undefined,
        runner,
        version: "1.1.0",
      }),
    ).rejects.toThrow("brew upgrade --cask codythatsme/tap/cc");
    expect(runner).not.toHaveBeenCalled();
    expect(existsSync(formatAppUpdateVersionsDir(dataDir))).toBe(false);
  });

  it("can read an intact local revision without contacting npm", async () => {
    const dataDir = scratchDir();
    const packageRoot = formatNpmRevisionPackageRoot(dataDir, "1.1.0");
    writePackage(packageRoot, "1.1.0");
    const runner = vi.fn<RunCommand>();
    await expect(
      installNpmRevision({
        dataDir,
        npmCliPath: null,
        onLine: () => undefined,
        onStep: () => undefined,
        runner,
        version: "1.1.0",
      }),
    ).resolves.toEqual({ kind: "npm", packageRoot, version: "1.1.0" });
    expect(runner).not.toHaveBeenCalled();
  });

  it("rejects path-like versions before looking for a local revision", async () => {
    await expect(
      installNpmRevision({
        dataDir: scratchDir(),
        npmCliPath: null,
        onLine: () => undefined,
        onStep: () => undefined,
        runner: vi.fn<RunCommand>(),
        version: "../../other",
      }),
    ).rejects.toThrow("invalid cc-app version");
  });
});

describe("pruneNpmRevisions", () => {
  it("keeps the running and previous versions and removes the rest", async () => {
    const dataDir = scratchDir();
    for (const version of ["1.0.0", "1.1.0", "1.2.0"]) {
      writePackage(formatNpmRevisionPackageRoot(dataDir, version), version);
    }
    mkdirSync(join(formatAppUpdateVersionsDir(dataDir), ".staging-1.3.0-1"));

    await pruneNpmRevisions({
      dataDir,
      keepPackageRoots: [
        formatNpmRevisionPackageRoot(dataDir, "1.1.0"),
        formatNpmRevisionPackageRoot(dataDir, "1.2.0"),
      ],
    });

    expect(readdirSync(formatAppUpdateVersionsDir(dataDir)).sort()).toEqual([
      "1.1.0",
      "1.2.0",
    ]);
  });
});
