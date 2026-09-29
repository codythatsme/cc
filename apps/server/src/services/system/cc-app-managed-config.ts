import { readFile } from "node:fs/promises";
import {
  ccAppManagedEnvFileSchema,
  formatCcAppConfigPath,
  formatCcAppEnvPath,
  parseCcAppManagedConfig,
  type CcAppManagedConfig,
  type CcAppManagedEnvConfig,
  type CcAppManagedEnvFile,
} from "@cc/config/cc-app-managed-config";
import { validateOptionalUrl } from "@cc/config/public-url";
import type { ServerLogger, ServerRuntimeConfig } from "../../types.js";
import type { NotificationHub } from "../../ws/hub.js";

interface ApplyCcAppManagedConfigArgs {
  baseConfig: ServerRuntimeConfig;
  managedConfig: CcAppManagedConfig;
  targetConfig: ServerRuntimeConfig;
}

interface ReadCcAppManagedConfigArgs {
  configPath: string;
  logger?: ServerLogger;
}

interface ReadCcAppManagedEnvArgs {
  envPath: string;
}

interface CreateCcAppManagedConfigReloaderArgs {
  config: ServerRuntimeConfig;
  hub: NotificationHub;
  logger: ServerLogger;
}

interface ReloadCcAppManagedConfigArgs {
  notify: boolean;
}

export interface CcAppManagedConfigReloader {
  reload(args: ReloadCcAppManagedConfigArgs): Promise<void>;
}

interface ApplyManagedProcessEnvArgs {
  baseEnv: NodeJS.ProcessEnv;
  managedEnv: CcAppManagedEnvConfig;
  managedKeys: Set<string>;
}

function cloneRuntimeConfig(config: ServerRuntimeConfig): ServerRuntimeConfig {
  return { ...config };
}

function replaceRuntimeConfig(
  targetConfig: ServerRuntimeConfig,
  nextConfig: ServerRuntimeConfig,
): void {
  if (nextConfig.appUrl === undefined) {
    delete targetConfig.appUrl;
  }
  Object.assign(targetConfig, nextConfig);
}

function setOptionalAppUrl(
  config: ServerRuntimeConfig,
  value: string | undefined,
): void {
  if (value === undefined) {
    delete config.appUrl;
    return;
  }
  config.appUrl = value;
}

function applyManagedProcessEnv(args: ApplyManagedProcessEnvArgs): void {
  for (const key of args.managedKeys) {
    const baseValue = args.baseEnv[key];
    if (baseValue === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = baseValue;
    }
  }

  args.managedKeys.clear();
  for (const [key, value] of Object.entries(args.managedEnv)) {
    process.env[key] = value;
    args.managedKeys.add(key);
  }
}

export function applyCcAppManagedConfig(
  args: ApplyCcAppManagedConfigArgs,
): void {
  const managedConfig = args.managedConfig.config ?? {};

  args.targetConfig.customModels =
    args.managedConfig.customModels ?? args.baseConfig.customModels;
  args.targetConfig.sharedSkillRoots =
    args.managedConfig.sharedSkillRoots ?? args.baseConfig.sharedSkillRoots;

  setOptionalAppUrl(
    args.targetConfig,
    managedConfig.CC_APP_URL !== undefined
      ? validateOptionalUrl("CC_APP_URL", managedConfig.CC_APP_URL)
      : args.baseConfig.appUrl,
  );
}

async function readCcAppManagedConfig(
  args: ReadCcAppManagedConfigArgs,
): Promise<CcAppManagedConfig> {
  try {
    const rawConfig = await readFile(args.configPath, "utf8");
    return parseCcAppManagedConfig(JSON.parse(rawConfig), {
      logger: args.logger,
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function readCcAppManagedEnv(
  args: ReadCcAppManagedEnvArgs,
): Promise<CcAppManagedEnvFile> {
  try {
    const rawConfig = await readFile(args.envPath, "utf8");
    return ccAppManagedEnvFileSchema.parse(JSON.parse(rawConfig));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function createCcAppManagedConfigReloader(
  args: CreateCcAppManagedConfigReloaderArgs,
): Promise<CcAppManagedConfigReloader> {
  const baseConfig = cloneRuntimeConfig(args.config);
  const baseEnv = { ...process.env };
  const configPath = formatCcAppConfigPath(args.config.dataDir);
  const envPath = formatCcAppEnvPath(args.config.dataDir);
  const managedEnvKeys = new Set<string>();

  async function reload(
    reloadArgs: ReloadCcAppManagedConfigArgs,
  ): Promise<void> {
    const managedConfig = await readCcAppManagedConfig({
      configPath,
      logger: args.logger,
    });
    const managedEnvFile = await readCcAppManagedEnv({ envPath });
    const nextConfig = cloneRuntimeConfig(args.config);
    applyCcAppManagedConfig({
      baseConfig,
      managedConfig,
      targetConfig: nextConfig,
    });
    applyManagedProcessEnv({
      baseEnv,
      managedEnv: managedEnvFile.env ?? {},
      managedKeys: managedEnvKeys,
    });
    replaceRuntimeConfig(args.config, nextConfig);
    if (reloadArgs.notify) {
      args.hub.notifySystem(["config-changed"]);
    }
  }

  try {
    await reload({ notify: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    args.logger.warn(
      { configPath, error: message },
      "Ignoring invalid cc-app managed config during startup",
    );
  }

  return {
    reload,
  };
}
