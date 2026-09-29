import type { CcPluginApi } from "@codythatsme/plugin-sdk";

export default function contentScriptExample(cc: CcPluginApi) {
  cc.log.info("Content script example loaded");
}
