import type { CcPluginApi } from "@codythatsme/plugin-sdk";
import { introduction } from "./introduction.js";

export default async function plugin(cc: CcPluginApi) {
  const settings = cc.settings.define({
    introduction: {
      type: "boolean",
      label: "Send CC introduction",
      description:
        "Tell agents about the CC CLI, threads, and clickable links. Applies to new agent sessions.",
      default: true,
    },
    skills: {
      type: "boolean",
      label: "Enable bundled skills",
      description: "Make the selected CC guide skills available to agents.",
      default: true,
    },
    ccCli: {
      type: "boolean",
      label: "CC CLI skill",
      description: "Inspect and manage CC through the CLI.",
      default: true,
    },
    pluginAuthoring: {
      type: "boolean",
      label: "Plugin authoring skill",
      description: "Create and change CC plugins and SDK extensions.",
      default: true,
    },
    skillCreator: {
      type: "boolean",
      label: "Skill creator skill",
      description: "Create and improve CC skills.",
      default: true,
    },
    submitPlugin: {
      type: "boolean",
      label: "Plugin submission skill",
      description:
        "Prepare and submit a CC plugin to the Community marketplace.",
      default: true,
    },
  });
  let current = await settings.get();
  settings.onChange((next) => {
    current = next;
  });
  cc.agents.contributeInstructions(() =>
    current.introduction ? introduction : null,
  );
  cc.agents.configure(() => ({
    tools: [],
    skills: current.skills
      ? [
          ...(current.ccCli ? ["cc-cli"] : []),
          ...(current.pluginAuthoring ? ["cc-plugin-authoring"] : []),
          ...(current.skillCreator ? ["skill-creator"] : []),
          ...(current.submitPlugin ? ["submit-a-plugin"] : []),
        ]
      : [],
  }));
}
