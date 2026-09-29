import { runNativeModulePreflight } from "./start-cc.mjs";

const { runCcApp, runLauncherEntry } =
  await import("../packages/cc-app/src/launcher.ts");

runLauncherEntry(() =>
  runCcApp(process.argv.slice(2), {
    beforeServerStart: () => runNativeModulePreflight({ checkOnly: true }),
    worktreePolicy: null,
  }),
);
