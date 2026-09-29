import { join } from "node:path";
import {
  acpNativeReasoningSchema,
  acpReasoningCliSchema,
  providerNativeSkillRootsSchema,
} from "@cc/domain";
import { z } from "zod";

const BUNDLED_PROVIDER_IDS = [
  "codex",
  "claude-code",
  "pi",
  "acp-cursor",
] as const;

const RESERVED_ACP_PROVIDER_IDS: ReadonlySet<string> = new Set(
  BUNDLED_PROVIDER_IDS,
);

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
const CUSTOM_ACP_AGENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;
const CUSTOM_ACP_AGENT_LOGO_PATTERN = /\.(?:svg|png|webp)$/iu;

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

export function formatCustomAcpAgentProviderId(id: string): string {
  return `acp-${id}`;
}

const customAcpAgentModelCliSchema = z
  .object({
    listArgs: z.array(z.string()).default([]),
    selectFlag: z.string().min(1).optional(),
    primaryModels: z.array(z.string()).default([]),
  })
  .strict()
  .transform((modelCli) =>
    modelCli.listArgs.length > 0 ? modelCli : undefined,
  );

const customAcpAgentSchema = z
  .object({
    id: z.string().regex(CUSTOM_ACP_AGENT_ID_PATTERN),
    displayName: z.string().min(1),
    command: z.string().min(1),
    logo: z
      .string()
      .min(1)
      .regex(
        CUSTOM_ACP_AGENT_LOGO_PATTERN,
        "Custom ACP agent logo must be an .svg, .png, or .webp file.",
      )
      .optional(),
    args: z.array(z.string()).default([]),
    env: z.record(ccAppManagedEnvNameSchema, z.string()).default({}),
    cwd: z.string().min(1).optional(),
    modelCli: customAcpAgentModelCliSchema.optional(),
    reasoningCli: acpReasoningCliSchema.optional(),
    nativeReasoning: acpNativeReasoningSchema.optional(),
    nativeSkillRoots: providerNativeSkillRootsSchema.optional(),
    supportsManualCompaction: z.boolean().default(false),
  })
  .strict()
  .superRefine((agent, context) => {
    const providerId = formatCustomAcpAgentProviderId(agent.id);
    if (RESERVED_ACP_PROVIDER_IDS.has(providerId)) {
      context.addIssue({
        code: "custom",
        message: `Custom ACP agent id "${agent.id}" resolves to built-in provider "${providerId}".`,
        path: ["id"],
      });
    }
  })
  .transform(({ modelCli, ...agent }) => {
    return modelCli === undefined ? agent : { ...agent, modelCli };
  });

const ccAppManagedConfigBoundarySchema = z
  .object({
    config: ccAppManagedConfigValuesSchema.optional(),
    customAcpAgents: z.array(z.unknown()).optional(),
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
export type CustomAcpAgent = z.infer<typeof customAcpAgentSchema>;
export type CustomProviderModel = z.infer<typeof customProviderModelSchema>;
export type CcAppManagedConfig = Omit<
  z.infer<typeof ccAppManagedConfigBoundarySchema>,
  "customAcpAgents" | "customModels"
> & {
  customAcpAgents?: CustomAcpAgent[];
  customModels?: CustomProviderModel[];
};
export type CcAppManagedEnvConfig = z.infer<typeof ccAppManagedEnvConfigSchema>;
export type CcAppManagedEnvFile = z.infer<typeof ccAppManagedEnvFileSchema>;

function warnInvalidCustomAcpAgent(
  logger: CcAppManagedConfigWarningLogger | undefined,
  fields: Record<string, unknown>,
): void {
  logger?.warn(fields, "Ignoring invalid custom ACP agent config entry");
}

function parseCustomAcpAgents(
  entries: readonly unknown[] | undefined,
  options: ParseCcAppManagedConfigOptions,
): CustomAcpAgent[] | undefined {
  if (entries === undefined) {
    return undefined;
  }

  const agents: CustomAcpAgent[] = [];
  const seenProviderIds = new Set<string>();
  for (const [index, entry] of entries.entries()) {
    const result = customAcpAgentSchema.safeParse(entry);
    if (!result.success) {
      warnInvalidCustomAcpAgent(options.logger, {
        error: result.error.message,
        index,
      });
      continue;
    }

    const providerId = formatCustomAcpAgentProviderId(result.data.id);
    if (seenProviderIds.has(providerId)) {
      warnInvalidCustomAcpAgent(options.logger, {
        error: `Duplicate custom ACP agent provider id "${providerId}".`,
        index,
        providerId,
      });
      continue;
    }

    seenProviderIds.add(providerId);
    agents.push(result.data);
  }

  return agents;
}

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

export function parseCcAppManagedConfig(
  rawConfig: unknown,
  options: ParseCcAppManagedConfigOptions = {},
): CcAppManagedConfig {
  const parsed = ccAppManagedConfigBoundarySchema.parse(
    withoutRemovedAiServiceConfig(rawConfig, options),
  );
  const customAcpAgents = parseCustomAcpAgents(parsed.customAcpAgents, options);
  const customModels = parseCustomModels(parsed.customModels, options);
  const config: CcAppManagedConfig = {};
  if (parsed.config !== undefined) {
    config.config = parsed.config;
  }
  if (customAcpAgents !== undefined) {
    config.customAcpAgents = customAcpAgents;
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
