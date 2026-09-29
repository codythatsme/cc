import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { z } from "zod";
import { isProcessRunning } from "./verified-process-stop.js";

const CC_APP_RUNTIME_FILE_NAME = "cc-app-runtime.json";

const ccAppRuntimeFileSchema = z.object({
  entryPath: z.string().min(1),
  pid: z.number().int().positive(),
  surface: z.string().min(1),
  serverUrl: z.string().min(1),
  startedAt: z.string().min(1),
  version: z.string().min(1),
});

export type CcAppRuntimeFile = z.infer<typeof ccAppRuntimeFileSchema>;

interface WriteCcAppRuntimeFileArgs {
  dataDir: string;
  entryPath: string;
  pid: number;
  serverUrl: string;
  startedAt: string;
  surface: string;
  version: string;
}

export function formatCcAppRuntimeFilePath(dataDir: string): string {
  return join(dataDir, CC_APP_RUNTIME_FILE_NAME);
}

export async function writeCcAppRuntimeFile(
  args: WriteCcAppRuntimeFileArgs,
): Promise<void> {
  const runtimeFile: CcAppRuntimeFile = {
    entryPath: args.entryPath,
    pid: args.pid,
    serverUrl: args.serverUrl,
    startedAt: args.startedAt,
    surface: args.surface,
    version: args.version,
  };
  await mkdir(args.dataDir, { recursive: true });
  await writeFile(
    formatCcAppRuntimeFilePath(args.dataDir),
    `${JSON.stringify(runtimeFile, null, 2)}\n`,
    "utf8",
  );
}

export async function claimCcAppRuntimeFile(
  args: WriteCcAppRuntimeFileArgs & { isRunning?: (pid: number) => boolean },
): Promise<boolean> {
  const isRunning = args.isRunning ?? isProcessRunning;
  const existing = await readCcAppRuntimeFile(args.dataDir);
  if (
    existing !== null &&
    existing.pid !== args.pid &&
    isRunning(existing.pid)
  ) {
    return false;
  }
  await writeCcAppRuntimeFile(args);
  return true;
}

async function clearCcAppRuntimeFile(dataDir: string): Promise<void> {
  await rm(formatCcAppRuntimeFilePath(dataDir), { force: true });
}

export async function clearOwnCcAppRuntimeFile(args: {
  dataDir: string;
  pid: number;
}): Promise<boolean> {
  const runtimeFile = await readCcAppRuntimeFile(args.dataDir);
  if (runtimeFile === null || runtimeFile.pid !== args.pid) {
    return false;
  }
  await clearCcAppRuntimeFile(args.dataDir);
  return true;
}

export function ccAppRuntimeVerifyTokens(entryPath: string): string[] {
  return [entryPath, basename(entryPath)];
}

export async function readCcAppRuntimeFile(
  dataDir: string,
): Promise<CcAppRuntimeFile | null> {
  let rawContents: string;
  try {
    rawContents = await readFile(formatCcAppRuntimeFilePath(dataDir), "utf8");
  } catch {
    return null;
  }

  try {
    const parsed = ccAppRuntimeFileSchema.safeParse(JSON.parse(rawContents));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
