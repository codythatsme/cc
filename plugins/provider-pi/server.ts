import type { CcPluginApi } from "@codythatsme/plugin-sdk";
import { piProviderDeclaration } from "./src/declaration.js";

export default function plugin(cc: CcPluginApi): void {
  const registered = cc.providers.register(piProviderDeclaration());
  cc.onDispose(() => {
    registered.dispose();
  });
}
