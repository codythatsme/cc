import {
  readEnvVarWithDefault,
  readOptionalEnvVar,
  resolveEnvLoader,
  type EnvLoaderArgs,
} from "./env.js";
import {
  CC_DEV_APP_HOST_ENV,
  CC_DEV_APP_PORT_ENV,
  DEFAULT_CC_DEV_APP_HOST,
} from "./env-vars.js";
import { assignIfDefined } from "./objects.js";

interface DevAppConfig {
  CC_DEV_APP_HOST: string;
  CC_DEV_APP_PORT?: number;
}

type LoadDevAppConfigArgs = EnvLoaderArgs;

export function loadDevAppConfig(
  args: LoadDevAppConfigArgs = {},
): DevAppConfig {
  const loader = resolveEnvLoader(args);
  const config: DevAppConfig = {
    CC_DEV_APP_HOST: readEnvVarWithDefault({
      context: loader.context,
      defaultValue: DEFAULT_CC_DEV_APP_HOST,
      definition: CC_DEV_APP_HOST_ENV,
      env: loader.env,
    }),
  };
  const appPort = readOptionalEnvVar({
    context: loader.context,
    definition: CC_DEV_APP_PORT_ENV,
    env: loader.env,
  });

  assignIfDefined({
    key: "CC_DEV_APP_PORT",
    target: config,
    value: appPort,
  });

  return config;
}
