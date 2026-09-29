import {
  readOptionalEnvVar,
  resolveEnvLoader,
  type EnvLoaderArgs,
} from "./env.js";
import {
  CC_SERVER_HEADERS_ENV,
  CC_BRIDGE_DIR_ENV,
  CC_CLI_DIR_ENV,
  CC_CONNECT_MACHINE_CREDENTIAL_ENV,
  CC_HOST_ENROLL_KEY_ENV,
  CC_HOST_DAEMON_AUTO_UPDATE_ENV,
  CC_HOST_ID_ENV,
  CC_HOST_NAME_ENV,
} from "./env-vars.js";
import { assignIfDefined } from "./objects.js";

export interface HostDaemonEntrypointConfig {
  CC_BRIDGE_DIR?: string;
  CC_CLI_DIR?: string;
  CC_SERVER_HEADERS?: Record<string, string>;
  CC_HOST_ENROLL_KEY?: string;
  CC_HOST_DAEMON_AUTO_UPDATE?: boolean;
  CC_HOST_ID?: string;
  CC_HOST_NAME?: string;
}

type LoadHostDaemonEntrypointConfigArgs = EnvLoaderArgs;

export function loadHostDaemonEntrypointConfig(
  args: LoadHostDaemonEntrypointConfigArgs = {},
): HostDaemonEntrypointConfig {
  const loader = resolveEnvLoader(args);
  const config: HostDaemonEntrypointConfig = {};
  const bridgeDir = readOptionalEnvVar({
    context: loader.context,
    definition: CC_BRIDGE_DIR_ENV,
    env: loader.env,
  });
  const cliDir = readOptionalEnvVar({
    context: loader.context,
    definition: CC_CLI_DIR_ENV,
    env: loader.env,
  });
  const enrollKey = readOptionalEnvVar({
    context: loader.context,
    definition: CC_HOST_ENROLL_KEY_ENV,
    env: loader.env,
  });
  const autoUpdate = readOptionalEnvVar({
    context: loader.context,
    definition: CC_HOST_DAEMON_AUTO_UPDATE_ENV,
    env: loader.env,
  });
  const machineCredential = readOptionalEnvVar({
    context: loader.context,
    definition: CC_CONNECT_MACHINE_CREDENTIAL_ENV,
    env: loader.env,
  });
  const serverHeaders =
    readOptionalEnvVar({
      context: loader.context,
      definition: CC_SERVER_HEADERS_ENV,
      env: loader.env,
    }) ??
    (machineCredential === undefined
      ? undefined
      : { "x-cc-connect-machine": machineCredential });
  const hostId = readOptionalEnvVar({
    context: loader.context,
    definition: CC_HOST_ID_ENV,
    env: loader.env,
  });
  const hostName = readOptionalEnvVar({
    context: loader.context,
    definition: CC_HOST_NAME_ENV,
    env: loader.env,
  });

  assignIfDefined({
    key: "CC_BRIDGE_DIR",
    target: config,
    value: bridgeDir,
  });
  assignIfDefined({
    key: "CC_CLI_DIR",
    target: config,
    value: cliDir,
  });
  assignIfDefined({
    key: "CC_SERVER_HEADERS",
    target: config,
    value: serverHeaders,
  });
  assignIfDefined({
    key: "CC_HOST_DAEMON_AUTO_UPDATE",
    target: config,
    value: autoUpdate,
  });
  assignIfDefined({
    key: "CC_HOST_ENROLL_KEY",
    target: config,
    value: enrollKey,
  });
  assignIfDefined({
    key: "CC_HOST_ID",
    target: config,
    value: hostId,
  });
  assignIfDefined({
    key: "CC_HOST_NAME",
    target: config,
    value: hostName,
  });
  return config;
}
