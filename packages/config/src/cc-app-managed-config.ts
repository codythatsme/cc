import { join } from "node:path";
import { providerNativeSkillRootsSchema } from "@cc/domain";
import { z } from "zod";

const BUNDLED_PROVIDER_IDS = [
  "codex",
  "claude-code",
  "pi",
  "acp-cursor",
] as const;

const CC_APP_CONFIG_FILE_NAME = "config.json";
const CC_APP_ENV_FILE_NAME = "env.json";

export type CcAppManagedConfigKey = "CC_APP_URL" | "CC_LOG_LEVEL";

export const CC_APP_MANAGED_CONFIG_KEYS: CcAppManagedConfigKey[] = [
  "CC_APP_URL",
  "CC_LOG_LEVEL",
];

export const REMOVED_AI_SERVICE_CONFIG_KEYS: readonly string[] = [
  "CC_INFERENCE",
  "CC_INFERENCE_FALLBACK",
  "CC_TRANSCRIPTION",
];

export const REMOVED_AI_SERVICE_CONFIG_MESSAGE =
  "CC_INFERENCE, CC_INFERENCE_FALLBACK, and CC_TRANSCRIPTION were removed. Choose AI services in Settings → AI services or with `cc settings ai-services set <task> <automatic|off|service>`.";

export const PORTABLE_ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const REMOVED_CUSTOM_ACP_AGENTS_CONFIG_KEY = "customAcpAgents";
const REMOVED_CUSTOM_ACP_AGENTS_MESSAGE =
  "customAcpAgents in config.json is no longer read. Declare the agents with `cc plugin config provider-acp set customAgents '<json>'`.";

interface CcAppManagedConfigWarningLogger {
  warn(fields: Record<string, unknown>, message: string): void;
}

interface ParseCcAppManagedConfigOptions {
  logger?: CcAppManagedConfigWarningLogger;
}

const ccAppManagedConfigValuesSchema = z
  .object({
    CC_APP_URL: z.string().optional(),
    CC_LOG_LEVEL: z.string().optional(),
  })
  .strict();

const ACP_PROVIDER_ID_PATTERN = /^acp-[a-z0-9][a-z0-9-]*$/u;

const customModelProviderIdSchema = z.union([
  z.enum(BUNDLED_PROVIDER_IDS),
  z.string().regex(ACP_PROVIDER_ID_PATTERN),
]);

export const customProviderModelSchema = z
  .object({
    providerId: customModelProviderIdSchema,
    model: z.string().min(1),
    displayName: z.string().min(1).optional(),
  })
  .strict();

const ccAppManagedEnvNameSchema = z.string().regex(PORTABLE_ENV_NAME_PATTERN);

const ccAppManagedEnvConfigSchema = z.record(
  ccAppManagedEnvNameSchema,
  z.string(),
);

const ccAppManagedConfigBoundarySchema = z
  .object({
    config: ccAppManagedConfigValuesSchema.optional(),
    customModels: z.array(z.unknown()).optional(),
    sharedSkillRoots: providerNativeSkillRootsSchema.optional(),
    serverHeaders: z.record(z.string(), z.string()).optional(),
    machineCredential: z.string().min(1).optional(),
    connectMachineId: z.string().min(1).optional(),
    serverUrl: z.string().min(1).optional(),
  })
  .strict();

export const ccAppManagedEnvFileSchema = z
  .object({
    env: ccAppManagedEnvConfigSchema.optional(),
  })
  .strict();

export type CcAppManagedConfigValues = z.infer<
  typeof ccAppManagedConfigValuesSchema
>;
export type CustomProviderModel = z.infer<typeof customProviderModelSchema>;
export type CcAppManagedConfig = Omit<
  z.infer<typeof ccAppManagedConfigBoundarySchema>,
  "customModels"
> & {
  customModels?: CustomProviderModel[];
};
export type CcAppManagedEnvConfig = z.infer<typeof ccAppManagedEnvConfigSchema>;
export type CcAppManagedEnvFile = z.infer<typeof ccAppManagedEnvFileSchema>;

function parseCustomModels(
  entries: readonly unknown[] | undefined,
  options: ParseCcAppManagedConfigOptions,
): CustomProviderModel[] | undefined {
  if (entries === undefined) {
    return undefined;
  }

  const customModels: CustomProviderModel[] = [];
  for (const [index, entry] of entries.entries()) {
    const result = customProviderModelSchema.safeParse(entry);
    if (!result.success) {
      options.logger?.warn(
        { error: result.error.message, index },
        "Ignoring invalid custom model config entry",
      );
      continue;
    }
    customModels.push(result.data);
  }

  return customModels;
}

function withoutRemovedAiServiceConfig(
  rawConfig: unknown,
  options: ParseCcAppManagedConfigOptions,
): unknown {
  if (typeof rawConfig !== "object" || rawConfig === null) return rawConfig;
  const values: unknown = Reflect.get(rawConfig, "config");
  if (typeof values !== "object" || values === null) return rawConfig;
  const removed = REMOVED_AI_SERVICE_CONFIG_KEYS.filter((key) =>
    Object.hasOwn(values, key),
  );
  if (removed.length === 0) return rawConfig;
  options.logger?.warn({ keys: removed }, REMOVED_AI_SERVICE_CONFIG_MESSAGE);
  return {
    ...rawConfig,
    config: Object.fromEntries(
      Object.entries(values).filter(([key]) => !removed.includes(key)),
    ),
  };
}

function withoutRemovedCustomAcpAgents(
  rawConfig: unknown,
  options: ParseCcAppManagedConfigOptions,
): unknown {
  if (
    typeof rawConfig !== "object" ||
    rawConfig === null ||
    !Object.hasOwn(rawConfig, REMOVED_CUSTOM_ACP_AGENTS_CONFIG_KEY)
  ) {
    return rawConfig;
  }
  options.logger?.warn(
    { key: REMOVED_CUSTOM_ACP_AGENTS_CONFIG_KEY },
    REMOVED_CUSTOM_ACP_AGENTS_MESSAGE,
  );
  return Object.fromEntries(
    Object.entries(rawConfig).filter(
      ([key]) => key !== REMOVED_CUSTOM_ACP_AGENTS_CONFIG_KEY,
    ),
  );
}

export function parseCcAppManagedConfig(
  rawConfig: unknown,
  options: ParseCcAppManagedConfigOptions = {},
): CcAppManagedConfig {
  const parsed = ccAppManagedConfigBoundarySchema.parse(
    withoutRemovedCustomAcpAgents(
      withoutRemovedAiServiceConfig(rawConfig, options),
      options,
    ),
  );
  const customModels = parseCustomModels(parsed.customModels, options);
  const config: CcAppManagedConfig = {};
  if (parsed.config !== undefined) {
    config.config = parsed.config;
  }
  if (customModels !== undefined) {
    config.customModels = customModels;
  }
  if (parsed.sharedSkillRoots !== undefined) {
    config.sharedSkillRoots = parsed.sharedSkillRoots;
  }
  if (parsed.serverUrl !== undefined) {
    config.serverUrl = parsed.serverUrl;
  }
  if (parsed.serverHeaders !== undefined) {
    config.serverHeaders = parsed.serverHeaders;
  }
  if (parsed.machineCredential !== undefined) {
    config.machineCredential = parsed.machineCredential;
  }
  if (parsed.connectMachineId !== undefined) {
    config.connectMachineId = parsed.connectMachineId;
  }
  return config;
}

export function formatCcAppConfigPath(dataDir: string): string {
  return join(dataDir, CC_APP_CONFIG_FILE_NAME);
}

export function formatCcAppEnvPath(dataDir: string): string {
  return join(dataDir, CC_APP_ENV_FILE_NAME);
}
