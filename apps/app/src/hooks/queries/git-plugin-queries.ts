import { GIT_PLUGIN_ID } from "@cc/domain";
import {
  formatWorkspaceCheckoutDisplay,
  type WorkspaceCheckoutDisplay,
} from "@cc/shared-ui/lib/workspace-checkout-display";
import { gitRpcContract } from "cc-plugin-cc--git/rpc-contract";
import {
  createGitStatusHook,
  type GitStatusKeyedQuery,
} from "cc-plugin-cc--git/status-state";
import { usePluginFrontendsSettled } from "@/lib/plugin-frontend-boot-state";
import { usePluginFrontendRegistered } from "@/lib/plugin-slots";
import {
  experimental_useRpcKeyedQuery as useRpcKeyedQuery,
} from "@/lib/plugin-sdk-hooks";

const useGitStatusQuery: GitStatusKeyedQuery = (args) => {
  const frontendsSettled = usePluginFrontendsSettled();
  const gitPluginRegistered = usePluginFrontendRegistered(GIT_PLUGIN_ID);
  const gitPluginOff = frontendsSettled && !gitPluginRegistered;
  return useRpcKeyedQuery({
    pluginId: GIT_PLUGIN_ID,
    contract: gitRpcContract,
    method: "status",
    keys: gitPluginOff ? [] : args.keys,
    enabled: args.enabled && !gitPluginOff,
  });
};

const useGitWorkspaceStatus = createGitStatusHook(useGitStatusQuery);

export function useEnvironmentCheckoutDisplay(
  environmentId: string | null,
): WorkspaceCheckoutDisplay | undefined {
  const workspace = useGitWorkspaceStatus(environmentId).workspace;
  return workspace === undefined
    ? undefined
    : formatWorkspaceCheckoutDisplay({ checkout: workspace.checkout });
}
