import { useContext } from "react";
import { PluginContext } from "@/components/plugin/plugin-context";

export function usePortalScopeProps(): {
  "data-cc-portaled-overlay": "";
  "data-cc-plugin-root"?: "";
  "data-cc-plugin"?: string;
} {
  const pluginId = useContext(PluginContext);
  return pluginId === null
    ? { "data-cc-portaled-overlay": "" }
    : {
        "data-cc-portaled-overlay": "",
        "data-cc-plugin-root": "",
        "data-cc-plugin": pluginId,
      };
}
