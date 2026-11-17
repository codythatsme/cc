import type { FeatureFlags } from "@cc/domain";
import type { AppInstallKind, AppSourceOrigin } from "./app-install.js";
import type { AppSurface } from "./app-surface.js";
import type { AppUpdateMode } from "./app-update.js";
import {
  loadCommonConfig,
  type CommonConfig,
  type LoadCommonConfigArgs,
} from "./common.js";
import { loadDatabaseConfig, type DatabaseConfig } from "./database.js";
import { loadDevAppConfig } from "./dev-app.js";
import {
  readEnvVarWithDefault,
  readOptionalEnvVar,
  resolveEnvLoader,
} from "./env.js";
import {
  CC_APP_INSTALL_KIND_ENV,
  CC_APP_SOURCE_COMMIT_ENV,
  CC_APP_SOURCE_ORIGIN_ENV,
  CC_APP_URL_ENV,
  CC_APP_SURFACE_ENV,
  CC_APP_VERSION_ENV,
  CC_CONNECT_GATE_KEYS_URL_ENV,
  CC_EXTERNAL_URL_ENV,
  CC_INHERITED_SKILLS_ROOTS_ENV,
  CC_MARKETPLACE_URL_ENV,
  CC_SERVER_BIND_HOST_ENV,
  CC_SERVER_LAUNCH_ID_ENV,
  CC_APP_UPDATE_MODE_ENV,
  CC_CLI_LAUNCHER_ENV,
  CC_PERF_DIAGNOSTICS_ENV,
  CC_QUERY_PLAN_AUDIT_ENV,
  CC_SKIP_ONBOARDING_ENV,
  CC_SETUP_GUIDE_VARIANT_ENV,
  DEFAULT_CC_APP_URL,
  DEFAULT_CC_APP_SURFACE,
  DEFAULT_CC_APP_VERSION,
  DEFAULT_CC_CONNECT_GATE_KEYS_URL,
  DEFAULT_CC_EXTERNAL_URL,
  DEFAULT_CC_MARKETPLACE_URL,
  DEFAULT_CC_SERVER_BIND_HOST,
  parseServerBindHost,
  type ServerBindHost,
  type SetupGuideVariant,
} from "./env-vars.js";
import { loadFeatureFlags } from "./feature-flags.js";
import { assignIfDefined } from "./objects.js";
import { loadHostDaemonPortValue } from "./ports.js";
import { loadServerPortConfig, type ServerPortConfig } from "./server-port.js";

export interface ServerConfig
  extends CommonConfig, DatabaseConfig, ServerPortConfig {
  CC_APP_INSTALL_KIND?: AppInstallKind;
  CC_APP_SOURCE_COMMIT?: string;
  CC_APP_SOURCE_ORIGIN?: AppSourceOrigin;
  CC_APP_URL: string;
  CC_APP_SURFACE: AppSurface;
  CC_APP_VERSION: string;
  CC_CONNECT_GATE_KEYS_URL: string;
  CC_DEV_APP_PORT?: number;
  CC_EXTERNAL_URL: string;
  CC_HOST_DAEMON_PORT: number;
  CC_INHERITED_SKILLS_ROOTS: string[];
  CC_MARKETPLACE_URL: string;
  CC_SERVER_BIND_HOST: ServerBindHost;
  CC_SERVER_LAUNCH_ID?: string;
  CC_APP_UPDATE_MODE?: AppUpdateMode;
  CC_CLI_LAUNCHER?: string;
  CC_PERF_DIAGNOSTICS: boolean;
  CC_QUERY_PLAN_AUDIT: boolean;
  CC_SKIP_ONBOARDING: boolean;
  CC_SETUP_GUIDE_VARIANT?: SetupGuideVariant;
  featureFlags: FeatureFlags;
}

type LoadServerConfigArgs = LoadCommonConfigArgs;

export { parseServerBindHost };
export type { ServerBindHost };

export function loadServerConfig(
  args: LoadServerConfigArgs = {},
): ServerConfig {
  const loader = resolveEnvLoader(args);
  const commonConfig = loadCommonConfig({
    env: loader.env,
    homeDir: loader.context.homeDir,
    mode: loader.mode,
    repoRoot: args.repoRoot,
  });
  const databaseConfig = loadDatabaseConfig({
    commonConfig,
    env: loader.env,
    homeDir: loader.context.homeDir,
    mode: loader.mode,
    repoRoot: args.repoRoot,
  });
  const serverPortConfig = loadServerPortConfig({
    env: loader.env,
    homeDir: loader.context.homeDir,
    mode: loader.mode,
    repoRoot: args.repoRoot,
  });
  const devAppConfig = loadDevAppConfig({
    env: loader.env,
    homeDir: loader.context.homeDir,
    mode: loader.mode,
  });
  const config: ServerConfig = {
    ...commonConfig,
    ...databaseConfig,
    ...serverPortConfig,
    CC_APP_URL: readEnvVarWithDefault({
      context: loader.context,
      defaultValue: DEFAULT_CC_APP_URL,
      definition: CC_APP_URL_ENV,
      env: loader.env,
    }),
    CC_APP_SURFACE: readEnvVarWithDefault({
      context: loader.context,
      defaultValue: DEFAULT_CC_APP_SURFACE,
      definition: CC_APP_SURFACE_ENV,
      env: loader.env,
    }),
    CC_APP_VERSION: readEnvVarWithDefault({
      context: loader.context,
      defaultValue: DEFAULT_CC_APP_VERSION,
      definition: CC_APP_VERSION_ENV,
      env: loader.env,
    }),
    CC_CONNECT_GATE_KEYS_URL: readEnvVarWithDefault({
      context: loader.context,
      defaultValue: DEFAULT_CC_CONNECT_GATE_KEYS_URL,
      definition: CC_CONNECT_GATE_KEYS_URL_ENV,
      env: loader.env,
    }),
    CC_EXTERNAL_URL: readEnvVarWithDefault({
      context: loader.context,
      defaultValue: DEFAULT_CC_EXTERNAL_URL,
      definition: CC_EXTERNAL_URL_ENV,
      env: loader.env,
    }),
    CC_HOST_DAEMON_PORT: loadHostDaemonPortValue({
      env: loader.env,
      homeDir: loader.context.homeDir,
      mode: loader.mode,
      repoRoot: args.repoRoot,
    }),
    CC_INHERITED_SKILLS_ROOTS: readEnvVarWithDefault({
      context: loader.context,
      defaultValue: [],
      definition: CC_INHERITED_SKILLS_ROOTS_ENV,
      env: loader.env,
    }),
    CC_MARKETPLACE_URL: readEnvVarWithDefault({
      context: loader.context,
      defaultValue: DEFAULT_CC_MARKETPLACE_URL,
      definition: CC_MARKETPLACE_URL_ENV,
      env: loader.env,
    }),
    CC_SERVER_BIND_HOST: readEnvVarWithDefault({
      context: loader.context,
      defaultValue: DEFAULT_CC_SERVER_BIND_HOST,
      definition: CC_SERVER_BIND_HOST_ENV,
      env: loader.env,
    }),
    CC_PERF_DIAGNOSTICS: readEnvVarWithDefault({
      context: loader.context,
      definition: CC_PERF_DIAGNOSTICS_ENV,
      env: loader.env,
      defaultValue: false,
    }),
    CC_QUERY_PLAN_AUDIT: readEnvVarWithDefault({
      context: loader.context,
      definition: CC_QUERY_PLAN_AUDIT_ENV,
      env: loader.env,
      defaultValue: false,
    }),
    CC_SKIP_ONBOARDING: readEnvVarWithDefault({
      context: loader.context,
      definition: CC_SKIP_ONBOARDING_ENV,
      env: loader.env,
      defaultValue: false,
    }),
    featureFlags: loadFeatureFlags({
      env: loader.env,
      homeDir: loader.context.homeDir,
      mode: loader.mode,
    }),
  };

  assignIfDefined({
    key: "CC_DEV_APP_PORT",
    target: config,
    value: devAppConfig.CC_DEV_APP_PORT,
  });
  assignIfDefined({
    key: "CC_APP_UPDATE_MODE",
    target: config,
    value: readOptionalEnvVar({
      context: loader.context,
      definition: CC_APP_UPDATE_MODE_ENV,
      env: loader.env,
    }),
  });
  assignIfDefined({
    key: "CC_CLI_LAUNCHER",
    target: config,
    value: readOptionalEnvVar({
      context: loader.context,
      definition: CC_CLI_LAUNCHER_ENV,
      env: loader.env,
    }),
  });
  assignIfDefined({
    key: "CC_APP_INSTALL_KIND",
    target: config,
    value: readOptionalEnvVar({
      context: loader.context,
      definition: CC_APP_INSTALL_KIND_ENV,
      env: loader.env,
    }),
  });
  assignIfDefined({
    key: "CC_APP_SOURCE_ORIGIN",
    target: config,
    value: readOptionalEnvVar({
      context: loader.context,
      definition: CC_APP_SOURCE_ORIGIN_ENV,
      env: loader.env,
    }),
  });
  assignIfDefined({
    key: "CC_APP_SOURCE_COMMIT",
    target: config,
    value: readOptionalEnvVar({
      context: loader.context,
      definition: CC_APP_SOURCE_COMMIT_ENV,
      env: loader.env,
    }),
  });
  assignIfDefined({
    key: "CC_SETUP_GUIDE_VARIANT",
    target: config,
    value: readOptionalEnvVar({
      context: loader.context,
      definition: CC_SETUP_GUIDE_VARIANT_ENV,
      env: loader.env,
    }),
  });
  assignIfDefined({
    key: "CC_SERVER_LAUNCH_ID",
    target: config,
    value: readOptionalEnvVar({
      context: loader.context,
      definition: CC_SERVER_LAUNCH_ID_ENV,
      env: loader.env,
    }),
  });

  return config;
}
