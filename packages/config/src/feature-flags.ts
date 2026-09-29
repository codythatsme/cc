import type { FeatureFlags } from "@cc/domain";
import {
  readEnvVarWithDefault,
  resolveEnvLoader,
  type EnvLoaderArgs,
} from "./env.js";
import {
  CC_FF_PLACEHOLDER_ENV,
  CC_FF_TIMELINE_WINDOW_EVENT_BUDGET_ENV,
  DEFAULT_CC_FF_PLACEHOLDER,
  DEFAULT_CC_FF_TIMELINE_WINDOW_EVENT_BUDGET,
} from "./env-vars.js";

type LoadFeatureFlagsArgs = EnvLoaderArgs;

export function loadFeatureFlags(
  args: LoadFeatureFlagsArgs = {},
): FeatureFlags {
  const loader = resolveEnvLoader(args);
  return {
    placeholder: readEnvVarWithDefault({
      context: loader.context,
      defaultValue: DEFAULT_CC_FF_PLACEHOLDER,
      definition: CC_FF_PLACEHOLDER_ENV,
      env: loader.env,
    }),
    timelineWindowEventBudget: readEnvVarWithDefault({
      context: loader.context,
      defaultValue: DEFAULT_CC_FF_TIMELINE_WINDOW_EVENT_BUDGET,
      definition: CC_FF_TIMELINE_WINDOW_EVENT_BUDGET_ENV,
      env: loader.env,
    }),
  };
}
