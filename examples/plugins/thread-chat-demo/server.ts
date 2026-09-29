import type { CcPluginApi } from "@codythatsme/plugin-sdk";

export default function plugin(cc: CcPluginApi) {
  cc.log.info("thread-chat-demo loaded (frontend-only demo)");
}
