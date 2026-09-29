declare const __CC_PLUGIN_ID__: string | undefined;

export function usePortalScopeProps(): {
  "data-cc-portaled-overlay": "";
  "data-cc-plugin-root"?: "";
  "data-cc-plugin"?: string;
} {
  const pluginId =
    typeof __CC_PLUGIN_ID__ === "string" ? __CC_PLUGIN_ID__ : undefined;
  return {
    "data-cc-portaled-overlay": "",
    "data-cc-plugin-root": "",
    ...(pluginId !== undefined ? { "data-cc-plugin": pluginId } : {}),
  };
}
