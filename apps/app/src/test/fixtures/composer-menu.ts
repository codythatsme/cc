import { composerCustomization as automations } from "../../../../../plugins/automations/composer";
import guideApp from "../../../../../plugins/cc-guide/app";
import { collectPluginAppRegistrations } from "@/lib/plugin-app-definition";
import { setPluginSlotRegistrations } from "@/lib/plugin-slots";
import { makePluginRegistrationSet } from "./plugins";

export function registerComposerMenuPlugins() {
  setPluginSlotRegistrations(
    "cc-guide",
    makePluginRegistrationSet(collectPluginAppRegistrations(guideApp)),
  );
  setPluginSlotRegistrations(
    "automations",
    makePluginRegistrationSet({
      composerCustomizations: [automations],
    }),
  );
}
