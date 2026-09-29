import { describe, expect, it } from "vitest";
import { Command } from "commander";
import { renderTemplate } from "@cc/templates";
import { registerMarketplaceCommands } from "../commands/marketplace.js";
import { registerPluginCommands } from "../commands/plugin.js";

function buildGroupCommand(name: "plugin" | "marketplace"): Command {
  const program = new Command();
  registerPluginCommands(program, () => "http://localhost");
  registerMarketplaceCommands(program, () => "http://localhost");
  const group = program.commands.find((command) => command.name() === name);
  expect(group).toBeDefined();
  if (group === undefined) throw new Error(`missing "${name}" command group`);
  return group;
}

function buildPluginCommand(): Command {
  return buildGroupCommand("plugin");
}

describe("plugins guide chapter", () => {
  it("mentions every cc plugin subcommand", () => {
    const plugin = buildPluginCommand();
    const names = plugin.commands.map((command) => command.name());
    expect(names.length).toBeGreaterThan(0);

    const guide = renderTemplate("ccGuidePlugins", {});
    for (const name of names) {
      const pattern = new RegExp(`cc plugin (?:[a-z-]+\\|)*${name}\\b`);
      expect(
        guide,
        `"cc plugin ${name}" is not documented in cc-guide-plugins.md`,
      ).toMatch(pattern);
    }
  });

  it("mentions every declared cc plugin option flag", () => {
    const plugin = buildPluginCommand();
    const guide = renderTemplate("ccGuidePlugins", {});
    let optionCount = 0;
    for (const command of plugin.commands) {
      for (const option of command.options) {
        optionCount += 1;
        const forms = [option.long, option.short].filter(
          (form): form is string => typeof form === "string",
        );
        expect(forms.length).toBeGreaterThan(0);
        expect(
          forms.some((form) => guide.includes(form)),
          `"cc plugin ${command.name()}" flag "${option.flags}" is not documented in cc-guide-plugins.md`,
        ).toBe(true);
      }
    }
    expect(optionCount).toBeGreaterThan(0);
  });

  it("mentions every cc marketplace subcommand", () => {
    const marketplace = buildGroupCommand("marketplace");
    const names = marketplace.commands.map((command) => command.name());
    expect(names.length).toBeGreaterThan(0);

    const guide = renderTemplate("ccGuidePlugins", {});
    for (const name of names) {
      expect(
        guide,
        `"cc marketplace ${name}" is not documented in cc-guide-plugins.md`,
      ).toMatch(new RegExp(`cc marketplace ${name}\\b`));
    }
  });
});
