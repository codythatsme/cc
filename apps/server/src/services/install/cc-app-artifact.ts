import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { HOST_DAEMON_PROTOCOL_VERSION } from "@cc/host-daemon-contract";
import { resolveBundledNpmCli } from "@cc/plugin-build";
import { omitNpmScriptPolicyEnv } from "@cc/process-utils";

const execFileAsync = promisify(execFile);
const HOST_DEPENDENCIES = [
  "@parcel/watcher",
  "fs-native-extensions",
  "node-pty",
  "npm",
  "pino",
  "pino-pretty",
  "pino-roll",
] as const;
const HOST_DAEMON_FILES = [
  "cc",
  "cc-parcel-watcher-child.mjs",
  "cc-plugin-host-worker.mjs",
  "cc-provider-bridge-worker.mjs",
  "daemon-bundle.mjs",
] as const;

export interface CcAppArtifact {
  digest: string;
  path: string;
  size: number;
}

export interface CcAppArtifactService {
  getArtifact(): Promise<CcAppArtifact>;
  getVersion(): Promise<string>;
}

export interface CcAppArtifactCommandRunner {
  (command: string, args: readonly string[], cwd: string): Promise<string>;
}

interface CreateCcAppArtifactServiceOptions {
  dataDir: string;
  commandRunner?: CcAppArtifactCommandRunner;
  protocolVersion?: number;
  serverEntryUrl: string;
}

interface CcAppPackageJson {
  dependencies: Record<string, string>;
  engines: { node: string };
  name: "cc-app";
  os: string[];
  version: string;
}

export async function defaultCommandRunner(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<string> {
  const npmCliPath = command === "npm" ? resolveBundledNpmCli() : null;
  const result = await execFileAsync(
    npmCliPath === null ? command : process.execPath,
    npmCliPath === null ? [...args] : [npmCliPath, ...args],
    {
      cwd,
      env: omitNpmScriptPolicyEnv(process.env),
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  return result.stdout;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    value !== null &&
    typeof value === "object" &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

async function readCcAppPackageJson(
  packageRoot: string,
): Promise<CcAppPackageJson> {
  const parsed: unknown = JSON.parse(
    await readFile(join(packageRoot, "package.json"), "utf8"),
  );
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !("name" in parsed) ||
    parsed.name !== "cc-app" ||
    !("version" in parsed) ||
    typeof parsed.version !== "string" ||
    !("dependencies" in parsed) ||
    !isStringRecord(parsed.dependencies) ||
    !("engines" in parsed) ||
    parsed.engines === null ||
    typeof parsed.engines !== "object" ||
    !("node" in parsed.engines) ||
    typeof parsed.engines.node !== "string" ||
    !("os" in parsed) ||
    !Array.isArray(parsed.os) ||
    !parsed.os.every((entry) => typeof entry === "string")
  ) {
    throw new Error(`Expected a cc-app package at ${packageRoot}`);
  }
  return {
    dependencies: parsed.dependencies,
    engines: { node: parsed.engines.node },
    name: parsed.name,
    os: parsed.os,
    version: parsed.version,
  };
}

interface ResolvedCcAppPackage {
  layout: "packaged" | "repo";
  packageJson: CcAppPackageJson;
  root: string;
}

export async function resolveCcAppPackage(
  serverEntryUrl: string,
): Promise<ResolvedCcAppPackage> {
  const serverEntryDir = dirname(fileURLToPath(serverEntryUrl));
  const candidates: readonly { layout: "packaged" | "repo"; root: string }[] = [
    { layout: "packaged", root: resolve(serverEntryDir, "../..") },
    {
      layout: "repo",
      root: resolve(serverEntryDir, "../../../packages/cc-app"),
    },
  ];
  for (const candidate of candidates) {
    try {
      const packageJson = await readCcAppPackageJson(candidate.root);
      return { ...candidate, packageJson };
    } catch {}
  }
  throw new Error(
    `Unable to locate the cc-app package from ${serverEntryDir}; tried ${candidates
      .map((candidate) => candidate.root)
      .join(", ")}`,
  );
}

function hostPackageJson(packageJson: CcAppPackageJson): object {
  const dependencies = Object.fromEntries(
    HOST_DEPENDENCIES.map((name) => {
      const version = packageJson.dependencies[name];
      if (version === undefined) {
        throw new Error(`cc-app is missing host dependency ${name}`);
      }
      return [name, version];
    }),
  );
  return {
    name: packageJson.name,
    version: packageJson.version,
    description: "cc enrolled host runtime",
    type: "module",
    os: packageJson.os,
    bin: {
      cc: "dist/cc.js",
      "cc-app": "dist/cc-app.js",
      "cc-host-daemon": "dist/cc-host-daemon.js",
    },
    files: ["dist", "host-daemon", "README.md"],
    engines: packageJson.engines,
    dependencies,
  };
}

async function materializePackagedHostPackage(
  packageRoot: string,
  packageJson: CcAppPackageJson,
  cacheDir: string,
): Promise<string> {
  const hostPackageRoot = await mkdtemp(join(cacheDir, "host-package-"));
  const distDir = join(hostPackageRoot, "dist");
  const hostDaemonSource = join(packageRoot, "host-daemon", "dist");
  const hostDaemonTarget = join(hostPackageRoot, "host-daemon", "dist");
  await mkdir(hostDaemonTarget, { recursive: true });
  await mkdir(distDir, { recursive: true });
  for (const fileName of ["cc-app.js", "cc-host-daemon.js", "cc.js"]) {
    await copyFile(
      join(packageRoot, "dist", fileName),
      join(distDir, fileName),
    );
    await chmod(join(distDir, fileName), 0o755);
  }
  for (const fileName of HOST_DAEMON_FILES) {
    await copyFile(
      join(hostDaemonSource, fileName),
      join(hostDaemonTarget, fileName),
    );
  }
  await chmod(join(hostDaemonTarget, "cc"), 0o755);
  await cp(
    join(hostDaemonSource, "plugin-sdk"),
    join(hostDaemonTarget, "plugin-sdk"),
    { recursive: true },
  );
  await cp(
    join(hostDaemonSource, "cc-chunks"),
    join(hostDaemonTarget, "cc-chunks"),
    { recursive: true },
  );
  try {
    await copyFile(
      join(packageRoot, "README.md"),
      join(hostPackageRoot, "README.md"),
    );
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "ENOENT")
    ) {
      throw error;
    }
  }
  await writeFile(
    join(hostPackageRoot, "package.json"),
    `${JSON.stringify(hostPackageJson(packageJson), null, 2)}\n`,
  );
  return hostPackageRoot;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function createCcAppArtifactService(
  options: CreateCcAppArtifactServiceOptions,
): CcAppArtifactService {
  const commandRunner = options.commandRunner ?? defaultCommandRunner;
  const cacheDir = join(options.dataDir, "install-cache");
  const protocolVersion =
    options.protocolVersion ?? HOST_DAEMON_PROTOCOL_VERSION;
  let resolvedPackagePromise: Promise<ResolvedCcAppPackage> | undefined;
  let artifactPromise: Promise<CcAppArtifact> | undefined;

  function getResolvedPackage(): Promise<ResolvedCcAppPackage> {
    resolvedPackagePromise ??= resolveCcAppPackage(options.serverEntryUrl);
    return resolvedPackagePromise;
  }

  async function buildArtifact(): Promise<CcAppArtifact> {
    const resolved = await getResolvedPackage();
    const { packageJson, root: packageRoot } = resolved;
    await mkdir(cacheDir, { recursive: true });
    let temporaryHostPackageRoot: string | undefined;
    let hostPackageRoot: string;
    if (resolved.layout === "repo") {
      const repoRoot = resolve(packageRoot, "../..");
      await commandRunner(
        "pnpm",
        ["exec", "turbo", "run", "build:host", "--filter=cc-app"],
        repoRoot,
      );
      hostPackageRoot = join(packageRoot, "host-package");
    } else {
      temporaryHostPackageRoot = await materializePackagedHostPackage(
        packageRoot,
        packageJson,
        cacheDir,
      );
      hostPackageRoot = temporaryHostPackageRoot;
    }

    try {
      const stdout = await commandRunner(
        "npm",
        ["pack", "--pack-destination", cacheDir],
        hostPackageRoot,
      );
      const packedName = stdout.trim().split(/\r?\n/u).at(-1);
      if (!packedName) {
        throw new Error("npm pack did not report a tarball name");
      }
      const packedPath = join(cacheDir, packedName);
      const bytes = await readFile(packedPath);
      const digest = sha256(bytes);
      const artifactPath = join(
        cacheDir,
        `cc-app-host-${packageJson.version}-protocol-${protocolVersion}-${digest}.tgz`,
      );
      await rename(packedPath, artifactPath);
      const artifactStats = await stat(artifactPath);
      return { digest, path: artifactPath, size: artifactStats.size };
    } finally {
      if (temporaryHostPackageRoot !== undefined) {
        await rm(temporaryHostPackageRoot, { force: true, recursive: true });
      }
    }
  }

  return {
    getArtifact(): Promise<CcAppArtifact> {
      artifactPromise ??= buildArtifact().catch((error: unknown) => {
        artifactPromise = undefined;
        throw error;
      });
      return artifactPromise;
    },
    async getVersion(): Promise<string> {
      return (await getResolvedPackage()).packageJson.version;
    },
  };
}
