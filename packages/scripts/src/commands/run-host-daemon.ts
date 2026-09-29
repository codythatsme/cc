import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  CC_PROD_HOST_DAEMON_PORT,
  resolvePortFromEnv,
  resolveRuntimeDataDir,
  resolveRuntimeMode,
  type CcRuntimeMode,
} from "@cc/config/runtime";
import { loadServerUrlValue } from "@cc/config/server-url";
import {
  HOST_AUTH_FILE_NAME,
  HOST_ID_FILE_NAME,
  hostDaemonEnrollKeyResponseSchema,
  type HostDaemonEnrollKeyRequest,
} from "@cc/host-daemon-contract";
import { loadHostDaemonEntrypointConfig } from "@cc/config/host-daemon-entrypoint";
import type { HostDaemonRuntimeEnvironment } from "../lib/host-daemon-runtime.js";
import { toHostDaemonProcessEnv } from "../lib/host-daemon-runtime.js";
import { resolveDevHostDaemonPort } from "../lib/dev-restart-utils.js";
import { pathExists } from "../lib/legacy-dev-data-migration.js";
import { runScriptProcess } from "../lib/process-helpers.js";
import { repoRoot, runMainIfEntrypoint } from "../lib/script-entry.js";
import { waitForServerHealth } from "../lib/wait-for-server-health.js";

interface HostDaemonProcessCommand {
  args: string[];
  command: string;
}

interface CreateAutoJoinRequestArgs {
  requestedHostId: string | null;
}

interface ResolveHostDaemonPortArgs {
  mode: CcRuntimeMode;
  requiresExplicitPort: boolean;
}

function resolveHostDaemonPort(args: ResolveHostDaemonPortArgs): number {
  if (
    args.requiresExplicitPort &&
    process.env.CC_HOST_DAEMON_PORT === undefined
  ) {
    throw new Error(
      "CC_HOST_DAEMON_PORT is required when running a dev extra-host daemon without CC_DATA_DIR. Set it to a port distinct from pnpm dev's host daemon port.",
    );
  }

  return resolvePortFromEnv({
    defaultPort:
      args.mode === "dev"
        ? resolveDevHostDaemonPort()
        : CC_PROD_HOST_DAEMON_PORT,
    env: process.env,
    name: "CC_HOST_DAEMON_PORT",
  });
}

function ensureDevOverridePair(mode: CcRuntimeMode): void {
  if (mode !== "dev") {
    return;
  }

  const hasDataDirOverride = process.env.CC_DATA_DIR !== undefined;
  const hasServerUrlOverride = process.env.CC_SERVER_URL !== undefined;
  if (hasDataDirOverride !== hasServerUrlOverride) {
    throw new Error(
      "Dev host-daemon overrides must set both CC_DATA_DIR and CC_SERVER_URL, or neither.",
    );
  }
}

export function resolveHostDaemonRuntimeEnvironment(
  mode: CcRuntimeMode,
): HostDaemonRuntimeEnvironment {
  ensureDevOverridePair(mode);
  const usesDefaultDevExtraHost =
    mode === "dev" && process.env.CC_DATA_DIR === undefined;
  const devDataDirSuffix = usesDefaultDevExtraHost ? "extra-host" : undefined;
  const dataDir = resolveRuntimeDataDir({
    env: process.env,
    homeDir: homedir(),
    mode,
    repoRoot: mode === "dev" ? repoRoot : undefined,
  });
  const hostDaemonEntrypointConfig = loadHostDaemonEntrypointConfig();
  return {
    ...hostDaemonEntrypointConfig,
    CC_DATA_DIR:
      devDataDirSuffix === undefined
        ? dataDir
        : join(dataDir, devDataDirSuffix),
    CC_HOST_DAEMON_PORT: String(
      resolveHostDaemonPort({
        mode,
        requiresExplicitPort: usesDefaultDevExtraHost,
      }),
    ),
    CC_SERVER_URL: loadServerUrlValue({
      env: process.env,
      homeDir: homedir(),
      mode,
      repoRoot,
    }),
    NODE_ENV: mode === "dev" ? "development" : "production",
  };
}

export function resolveHostDaemonProcessCommand(
  mode: CcRuntimeMode,
): HostDaemonProcessCommand {
  if (mode === "dev") {
    return {
      args: [
        "--conditions=source",
        "--import",
        "tsx",
        "apps/host-daemon/src/index.ts",
      ],
      command: process.execPath,
    };
  }

  return {
    args: ["apps/host-daemon/dist/index.js"],
    command: process.execPath,
  };
}

async function readPersistedHostId(dataDir: string): Promise<string | null> {
  try {
    const value = (
      await readFile(join(dataDir, HOST_ID_FILE_NAME), "utf8")
    ).trim();
    return value.length > 0 ? value : null;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function createAutoJoinRequest(
  args: CreateAutoJoinRequestArgs,
): HostDaemonEnrollKeyRequest {
  const request: HostDaemonEnrollKeyRequest = {};
  if (args.requestedHostId !== null) {
    request.hostId = args.requestedHostId;
  }
  return request;
}

export async function maybeAddAutoJoinEnv(
  env: HostDaemonRuntimeEnvironment,
  autoJoin: boolean,
): Promise<HostDaemonRuntimeEnvironment> {
  if (!autoJoin || env.CC_HOST_ENROLL_KEY) {
    return env;
  }

  if (await pathExists(join(env.CC_DATA_DIR, HOST_AUTH_FILE_NAME))) {
    return env;
  }

  await waitForServerHealth(env.CC_SERVER_URL);
  const requestedHostId =
    env.CC_HOST_ID?.trim() || (await readPersistedHostId(env.CC_DATA_DIR));

  const response = await fetch(
    `${env.CC_SERVER_URL}/internal/hosts/enroll-key`,
    {
      body: JSON.stringify(createAutoJoinRequest({ requestedHostId })),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    },
  );

  if (response.status !== 201) {
    const detail = await response.text();
    throw new Error(
      `Failed to request host enroll key: ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ""}`,
    );
  }

  const enrollKeyResponse = hostDaemonEnrollKeyResponseSchema.parse(
    await response.json(),
  );
  if (requestedHostId && enrollKeyResponse.hostId !== requestedHostId) {
    throw new Error(
      `Enroll key response host ID ${enrollKeyResponse.hostId} does not match persisted host ID ${requestedHostId}`,
    );
  }

  return {
    ...env,
    CC_HOST_ENROLL_KEY: enrollKeyResponse.enrollKey,
    CC_HOST_ID: enrollKeyResponse.hostId,
  };
}

async function main(): Promise<void> {
  const mode = resolveRuntimeMode();
  const autoJoin = process.argv.includes("--auto-join");
  const env = await maybeAddAutoJoinEnv(
    resolveHostDaemonRuntimeEnvironment(mode),
    autoJoin,
  );
  const daemonProcessCommand = resolveHostDaemonProcessCommand(mode);
  process.exitCode = await runScriptProcess({
    args: daemonProcessCommand.args,
    command: daemonProcessCommand.command,
    cwd: repoRoot,
    env: toHostDaemonProcessEnv(env),
    stdio: "inherit",
  });
}

runMainIfEntrypoint(import.meta.url, main);
