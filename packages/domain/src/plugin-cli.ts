export const RESERVED_CC_CLI_COMMANDS: readonly string[] = [
  "browser",
  "diagnostics",
  "environment",
  "file",
  "guide",
  "help",
  "machine",
  "marketplace",
  "plugin",
  "project",
  "prompt-history",
  "provider",
  "server",
  "settings",
  "skill",
  "status",
  "terminal",
  "theme",
  "thread",
  "updates",
  "voice",
];

export function pluginCliCall(pluginId: string, name: string): string {
  if (RESERVED_CC_CLI_COMMANDS.includes(name))
    return `cc plugin run ${pluginId}`;
  return `cc ${name}`;
}
