import { existsSync, readFileSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { z } from "zod";
import semver from "semver";
import {
  formatAppUpdateVersionsDir,
  type NpmAppRevision,
} from "@cc/config/app-update";
import type { RunCommand } from "./run-command.js";
import { isSamePath } from "./shim-support.js";

const packageJsonSchema = z
  .object({ version: z.string().min(1) })
  .passthrough();

export const NPM_REVISION_REQUIRED_FILES = [
  join("dist", "cc-app.js"),
  join("server", "dist", "index.js"),
  join("host-daemon", "dist", "daemon-bundle.mjs"),
  join("app", "dist", "index.html"),
] as const;

export function readPackageVersion(packageRoot: string): string | null {
  try {
    const parsed = packageJsonSchema.safeParse(
      JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")),
    );
    return parsed.success ? parsed.data.version : null;
  } catch {
    return null;
  }
}

export function isUsableNpmRevision(revision: NpmAppRevision): boolean {
  return (
    readPackageVersion(revision.packageRoot) === revision.version &&
    NPM_REVISION_REQUIRED_FILES.every((file) =>
      existsSync(join(revision.packageRoot, file)),
    )
  );
}

export function formatNpmRevisionInstallDir(
  dataDir: string,
  version: string,
): string {
  return join(formatAppUpdateVersionsDir(dataDir), version);
}

export function formatNpmRevisionPackageRoot(
  dataDir: string,
  version: string,
): string {
  return join(
    formatNpmRevisionInstallDir(dataDir, version),
    "node_modules",
    "cc-app",
  );
}

export function resolveNpmCliPath(): string | null {
  try {
    const require = createRequire(import.meta.url);
    return join(
      dirname(require.resolve("npm/package.json")),
      "bin",
      "npm-cli.js",
    );
  } catch {
    return null;
  }
}

export interface InstallNpmRevisionArgs {
  dataDir: string;
  npmCliPath: string | null;
  onLine: (line: string) => void;
  onStep: (step: string) => void;
  runner: RunCommand;
  signal?: AbortSignal;
  version: string;
}

export async function installNpmRevision(
  args: InstallNpmRevisionArgs,
): Promise<NpmAppRevision> {
  if (semver.valid(args.version) === null) {
    throw new Error(
      `Refusing to install invalid cc-app version ${args.version}`,
    );
  }
  const revision: NpmAppRevision = {
    kind: "npm",
    packageRoot: formatNpmRevisionPackageRoot(args.dataDir, args.version),
    version: args.version,
  };
  if (isUsableNpmRevision(revision)) return revision;
  throw new Error(
    "cc is distributed through Homebrew. Run brew upgrade --cask codythatsme/tap/cc.",
  );
}

export async function pruneNpmRevisions(args: {
  dataDir: string;
  keepPackageRoots: readonly string[];
}): Promise<void> {
  const versionsDir = formatAppUpdateVersionsDir(args.dataDir);
  let entries: string[];
  try {
    entries = await readdir(versionsDir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const installDir = join(versionsDir, entry);
    const packageRoot = join(installDir, "node_modules", "cc-app");
    if (args.keepPackageRoots.some((root) => isSamePath(root, packageRoot))) {
      continue;
    }
    if (
      entry.startsWith(".staging-") &&
      entry.endsWith(`-${String(process.pid)}`)
    ) {
      continue;
    }
    await rm(installDir, { force: true, recursive: true });
  }
}
