import { join } from "node:path";
import {
  ccAppRuntimeVerifyTokens,
  readCcAppRuntimeFile,
  type CcAppRuntimeFile,
} from "@cc/config/app-runtime-file";
import type { VerifiedProcessOps } from "@cc/config/verified-process-stop";
import { SERVER_MOVED_FILE_NAME } from "@cc/server-archive";
import { pathExists } from "./fs.js";

export type LauncherProcessOps = Pick<
  VerifiedProcessOps,
  "isRunning" | "readCommand"
>;

export interface LauncherMovedMode {
  serverPort: number | null;
}

export async function isLiveCcAppRuntime(
  runtime: CcAppRuntimeFile,
  processOps: LauncherProcessOps,
): Promise<boolean> {
  if (!processOps.isRunning(runtime.pid)) {
    return false;
  }
  const command = await processOps.readCommand(runtime.pid);
  return (
    command !== null &&
    ccAppRuntimeVerifyTokens(runtime.entryPath).some(
      (token) => token.length > 0 && command.includes(token),
    )
  );
}

export function serverUrlPort(serverUrl: string): number | null {
  let url: URL;
  try {
    url = new URL(serverUrl);
  } catch {
    return null;
  }
  if (url.port !== "") {
    return Number(url.port);
  }
  if (url.protocol === "http:") {
    return 80;
  }
  return url.protocol === "https:" ? 443 : null;
}

export async function detectLauncherMovedMode(args: {
  dataDir: string;
  processOps: LauncherProcessOps;
}): Promise<LauncherMovedMode | null> {
  if (!(await pathExists(join(args.dataDir, SERVER_MOVED_FILE_NAME)))) {
    return null;
  }
  const runtime = await readCcAppRuntimeFile(args.dataDir);
  if (
    runtime === null ||
    !(await isLiveCcAppRuntime(runtime, args.processOps))
  ) {
    return null;
  }
  return {
    serverPort: serverUrlPort(runtime.serverUrl),
  };
}
