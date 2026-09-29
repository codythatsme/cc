import { z } from "zod";
import { delimiter } from "node:path";
import { defaultFeatureFlags } from "@cc/domain";
import { DEFAULTS } from "./defaults.js";
import {
  APP_UPDATE_MODE_ENV_NAME,
  appUpdateModeSchema,
  type AppUpdateMode,
} from "./app-update.js";
import { defineEnvVar, type EnvVarParseArgs } from "./env.js";
import {
  APP_SURFACE_ENV_NAME,
  APP_SURFACE_WEB,
  formatAppSurfaceValues,
  parseAppSurface,
  type AppSurface,
} from "./app-surface.js";
import { validateLogLevel } from "./log-level.js";
import { validateOptionalUrl, validateRequiredUrl } from "./public-url.js";
import { CC_LOOPBACK_HOST, parsePortValue } from "./runtime.js";
import { toOptionalString } from "./strings.js";

export type ServerBindHost = "127.0.0.1" | "0.0.0.0";

function parseBooleanEnvValue(args: EnvVarParseArgs): boolean {
  const normalizedValue = args.value.trim().toLowerCase();
  if (
    normalizedValue === "true" ||
    normalizedValue === "1" ||
    normalizedValue === "yes" ||
    normalizedValue === "y"
  ) {
    return true;
  }
  if (
    normalizedValue === "false" ||
    normalizedValue === "0" ||
    normalizedValue === "no" ||
    normalizedValue === "n"
  ) {
    return false;
  }

  throw new Error(`${args.name} must be a boolean`);
}

function parseAppSurfaceEnvValue(args: EnvVarParseArgs): AppSurface {
  const parsed = parseAppSurface(args.value);
  if (parsed !== undefined) {
    return parsed;
  }
  throw new Error(`${args.name} must be one of ${formatAppSurfaceValues()}`);
}

function parseAppUpdateModeEnvValue(args: EnvVarParseArgs): AppUpdateMode {
  const parsed = appUpdateModeSchema.safeParse(args.value);
  if (parsed.success) {
    return parsed.data;
  }
  throw new Error(
    `${args.name} must be one of ${appUpdateModeSchema.options.join(", ")}`,
  );
}

function parseOptionalPortEnvValue(args: EnvVarParseArgs): number | undefined {
  if (args.value === "0") {
    return undefined;
  }

  return parsePortValue({
    name: args.name,
    rawPort: args.value,
  });
}

function parseOptionalTrimmedStringEnvValue(
  args: EnvVarParseArgs,
): string | undefined {
  return toOptionalString(args.value);
}

function parseStringEnvValue(args: EnvVarParseArgs): string {
  return args.value;
}

function parsePathListEnvValue(args: EnvVarParseArgs): string[] {
  return args.value
    .split(delimiter)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parseNonEmptyStringEnvValue(args: EnvVarParseArgs): string {
  if (args.value.length === 0) {
    throw new Error(`${args.name} must not be empty`);
  }

  return args.value;
}

function parsePortEnvValue(args: EnvVarParseArgs): number {
  return parsePortValue({
    name: args.name,
    rawPort: args.value,
  });
}

export function parseServerBindHost(value: string): ServerBindHost {
  const trimmedValue = value.trim();
  if (trimmedValue === "127.0.0.1" || trimmedValue === "0.0.0.0") {
    return trimmedValue;
  }

  throw new Error('CC_SERVER_BIND_HOST must be "127.0.0.1" or "0.0.0.0"');
}

function parseServerBindHostEnvValue(args: EnvVarParseArgs): ServerBindHost {
  return parseServerBindHost(args.value);
}

function parsePositiveIntegerEnvValue(args: EnvVarParseArgs): number {
  const parsed = Number(args.value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${args.name} must be a positive integer`);
  }
  return parsed;
}

function parseRequiredUrlEnvValue(args: EnvVarParseArgs): string {
  return validateRequiredUrl(args.name, args.value);
}

function parseOptionalUrlEnvValue(args: EnvVarParseArgs): string {
  return validateOptionalUrl(args.name, args.value);
}

function parseLogLevelValue(args: EnvVarParseArgs): string {
  return validateLogLevel(args.value);
}

export const CC_LOG_LEVEL_ENV = defineEnvVar<string>({
  description: "Log level: trace, debug, info, warn, error, fatal",
  name: "CC_LOG_LEVEL",
  parse: parseLogLevelValue,
});

export const CC_SERVER_PORT_ENV = defineEnvVar<number>({
  description: "HTTP port for the server",
  name: "CC_SERVER_PORT",
  parse: parsePortEnvValue,
});

export const CC_SERVER_BIND_HOST_ENV = defineEnvVar<ServerBindHost>({
  description: "HTTP bind host for the server",
  name: "CC_SERVER_BIND_HOST",
  parse: parseServerBindHostEnvValue,
});

export const CC_HOST_DAEMON_PORT_ENV = defineEnvVar<number>({
  description: "Port the host daemon listens on for local API requests",
  name: "CC_HOST_DAEMON_PORT",
  parse: parsePortEnvValue,
});

export const CC_SERVER_URL_ENV = defineEnvVar<string>({
  description: "URL of the cc server",
  name: "CC_SERVER_URL",
  parse: parseRequiredUrlEnvValue,
});

export const CC_APP_VERSION_ENV = defineEnvVar<string>({
  description:
    "Version of the running cc-app package. The cc-app launcher sets this from packages/cc-app/package.json; defaults to a sentinel for dev/source runs.",
  name: "CC_APP_VERSION",
  parse: parseNonEmptyStringEnvValue,
});

export const CC_SERVER_LAUNCH_ID_ENV = defineEnvVar<string>({
  description:
    "Internal per-spawn identity the cc-app launcher hands its server child. The server echoes it on /health so the launcher can tell its own child apart from another cc server that already owns the port.",
  name: "CC_SERVER_LAUNCH_ID",
  parse: parseNonEmptyStringEnvValue,
});

export const CC_APP_UPDATE_MODE_ENV = defineEnvVar<AppUpdateMode>({
  description:
    "Internal marker the cc-app launcher hands its server child when it runs under the in-app update shim: npm for package installs, source for pnpm start checkouts. The server offers in-app updates only when it is set.",
  name: APP_UPDATE_MODE_ENV_NAME,
  parse: parseAppUpdateModeEnvValue,
});

export const CC_APP_SURFACE_ENV = defineEnvVar<AppSurface>({
  description:
    "Internal launcher marker identifying the application surface. Set by cc-app and desktop launchers.",
  name: APP_SURFACE_ENV_NAME,
  parse: parseAppSurfaceEnvValue,
});

export const CC_APP_URL_ENV = defineEnvVar<string>({
  description:
    "Human-facing app/server base URL used for generated links and allowed browser origins. Does not control which host or port the server binds to.",
  name: "CC_APP_URL",
  parse: parseOptionalUrlEnvValue,
});

export const CC_EXTERNAL_URL_ENV = defineEnvVar<string>({
  description:
    "Internet-facing HTTPS base URL used for generated public links. Does not control which host or port the server binds to.",
  name: "CC_EXTERNAL_URL",
  parse: parseOptionalUrlEnvValue,
});

export const CC_MARKETPLACE_URL_ENV = defineEnvVar<string>({
  description:
    "Optional manifest URL of the cc-community plugin marketplace. Empty by default; no remote catalog is contacted unless configured.",
  name: "CC_MARKETPLACE_URL",
  parse: parseOptionalUrlEnvValue,
});

export const CC_FF_PLACEHOLDER_ENV = defineEnvVar<boolean>({
  description:
    "Permanent placeholder feature flag. Non-functional keep-alive so the flag system has at least one entry; do not gate behavior on it.",
  name: "CC_FF_PLACEHOLDER",
  parse: parseBooleanEnvValue,
});

export const CC_FF_TIMELINE_WINDOW_EVENT_BUDGET_ENV = defineEnvVar<number>({
  description:
    "Max events one thread-timeline window may span. Raise far above the default to restore unbounded windows.",
  name: "CC_FF_TIMELINE_WINDOW_EVENT_BUDGET",
  parse: parsePositiveIntegerEnvValue,
});

export const CC_DEV_APP_HOST_ENV = defineEnvVar<string>({
  description:
    "Development-only Vite bind host override for apps/app. Defaults to 127.0.0.1 when unset.",
  name: "CC_DEV_APP_HOST",
  parse: parseStringEnvValue,
});

export const CC_DEV_APP_PORT_ENV = defineEnvVar<number | undefined>({
  description: "Development-only Vite port for apps/app.",
  name: "CC_DEV_APP_PORT",
  parse: parseOptionalPortEnvValue,
});

export const CC_CLI_DIR_ENV = defineEnvVar<string | undefined>({
  description:
    "Directory containing the cc CLI executable to inject into runtime shells",
  name: "CC_CLI_DIR",
  parse: parseOptionalTrimmedStringEnvValue,
});

export const CC_INHERITED_SKILLS_ROOTS_ENV = defineEnvVar<string[]>({
  description:
    "Development-only path list of lower-priority inherited cc skill roots",
  name: "CC_INHERITED_SKILLS_ROOTS",
  parse: parsePathListEnvValue,
});

export const CC_BRIDGE_DIR_ENV = defineEnvVar<string | undefined>({
  description:
    "Directory containing provider bridge bundles for the host daemon runtime",
  name: "CC_BRIDGE_DIR",
  parse: parseOptionalTrimmedStringEnvValue,
});

export const CC_SERVER_HEADERS_ENV = defineEnvVar<Record<string, string>>({
  description: "Private JSON headers attached to machine server requests",
  name: "CC_SERVER_HEADERS",
  parse: ({ value }) => {
    try {
      return z.record(z.string(), z.string()).parse(JSON.parse(value));
    } catch {
      throw new Error(
        "CC_SERVER_HEADERS must be a JSON object with string values",
      );
    }
  },
});

export const CC_CONNECT_MACHINE_CREDENTIAL_ENV = defineEnvVar<
  string | undefined
>({
  description:
    "Daemon-managed cc connect credential for traversing the public machine gate",
  name: "CC_CONNECT_MACHINE_CREDENTIAL",
  parse: parseOptionalTrimmedStringEnvValue,
});

export const CC_HOST_ENROLL_KEY_ENV = defineEnvVar<string | undefined>({
  description:
    "One-time enrollment token used to bootstrap a host daemon with the cc server",
  name: "CC_HOST_ENROLL_KEY",
  parse: parseOptionalTrimmedStringEnvValue,
});

export const CC_HOST_DAEMON_AUTO_UPDATE_ENV = defineEnvVar<boolean>({
  description:
    "Allow a remote host daemon to install the exact cc-app package served by its server on a newer protocol mismatch",
  name: "CC_HOST_DAEMON_AUTO_UPDATE",
  parse: parseBooleanEnvValue,
});

export const CC_HOST_ID_ENV = defineEnvVar<string | undefined>({
  description:
    "Preferred host ID to persist for the daemon instead of generating one locally",
  name: "CC_HOST_ID",
  parse: parseOptionalTrimmedStringEnvValue,
});

export const CC_HOST_NAME_ENV = defineEnvVar<string | undefined>({
  description:
    "Preferred host name to report instead of detecting the local hostname",
  name: "CC_HOST_NAME",
  parse: parseOptionalTrimmedStringEnvValue,
});

export const DEFAULT_CC_APP_VERSION = DEFAULTS.appVersion;
export const DEFAULT_CC_APP_SURFACE = APP_SURFACE_WEB;
export const DEFAULT_CC_APP_URL = "";
export const DEFAULT_CC_SERVER_BIND_HOST: ServerBindHost = CC_LOOPBACK_HOST;
export const DEFAULT_CC_EXTERNAL_URL = "";
export const DEFAULT_CC_DEV_APP_HOST = "";
export const DEFAULT_CC_MARKETPLACE_URL = "";
export const DEFAULT_CC_FF_PLACEHOLDER = defaultFeatureFlags.placeholder;
export const DEFAULT_CC_FF_TIMELINE_WINDOW_EVENT_BUDGET =
  defaultFeatureFlags.timelineWindowEventBudget;
