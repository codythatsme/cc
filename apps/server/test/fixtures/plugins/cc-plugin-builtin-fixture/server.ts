export default function plugin(cc: any) {
  const globals = globalThis as any;
  globals.__builtinFixtureLoads = (globals.__builtinFixtureLoads ?? 0) + 1;

  cc.cli.register({
    name: "builtin-fixture",
    summary: "Builtin fixture command",
    commands: [],
    run: async () => ({
      exitCode: 0,
      stdout: `builtin ${cc.pluginId}`,
    }),
  });
}
