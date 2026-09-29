import { readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { z } from "zod";
import { pathExists } from "./fs.js";

const CC_APP_VERSION_DEV_FALLBACK = "0.0.0-dev";
const CC_APP_PACKAGE_NAME = "cc-app";

const packageJsonVersionSchema = z.object({ version: z.string().min(1) });

export function resolvePackagedCcAppRoot(
  daemonEntryPath: string | null,
): string | null {
  if (daemonEntryPath === null) {
    return null;
  }
  const distDir = dirname(resolve(daemonEntryPath));
  const hostDaemonDir = dirname(distDir);
  if (
    basename(daemonEntryPath) !== "daemon-bundle.mjs" ||
    basename(distDir) !== "dist" ||
    basename(hostDaemonDir) !== "host-daemon"
  ) {
    return null;
  }
  return dirname(hostDaemonDir);
}

export function npmPrefixCcAppRoot(npmPrefix: string): string {
  return join(npmPrefix, "lib", "node_modules", CC_APP_PACKAGE_NAME);
}

export async function resolveCcServerEntry(
  packageRoot: string,
): Promise<string | null> {
  const serverEntry = join(packageRoot, "dist", "cc-server.js");
  const required = [
    join(packageRoot, "dist", "cc-app.js"),
    serverEntry,
    join(packageRoot, "server", "dist", "index.js"),
    join(packageRoot, "app", "dist", "index.html"),
  ];
  for (const path of required) {
    if (!(await pathExists(path))) {
      return null;
    }
  }
  return serverEntry;
}

export async function resolveCcAppLauncherEntry(
  packageRoot: string,
): Promise<string | null> {
  const entry = join(packageRoot, "dist", "cc-app.js");
  return (await pathExists(entry)) ? entry : null;
}

export async function readCcAppVersion(args: {
  env: NodeJS.ProcessEnv;
  packageRoot: string | null;
}): Promise<string> {
  const configured = args.env.CC_APP_VERSION?.trim();
  if (configured !== undefined && configured !== "") {
    return configured;
  }
  if (args.packageRoot === null) {
    return CC_APP_VERSION_DEV_FALLBACK;
  }
  try {
    return packageJsonVersionSchema.parse(
      JSON.parse(
        await readFile(join(args.packageRoot, "package.json"), "utf8"),
      ),
    ).version;
  } catch {
    return CC_APP_VERSION_DEV_FALLBACK;
  }
}
