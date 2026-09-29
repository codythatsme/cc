import { describe, expect, it, vi } from "vitest";
import {
  setupCommandOutputTestEnvironment,
  collectLogLines,
  runCommand,
} from "../helpers/command-output-harness.js";
import type { CommandRegistrar } from "../helpers/command-output-harness.js";
import { registerManagerCommands } from "../../commands/manager.js";

describe("cc manager command output", () => {
  setupCommandOutputTestEnvironment();

  const register: CommandRegistrar = (program) =>
    registerManagerCommands(program);

  it("cc manager exits with a parent-thread replacement message", async () => {
    await expect(runCommand(["manager"], register)).rejects.toThrow(
      "process.exit:1",
    );

    const error = collectLogLines(vi.mocked(console.error)).join("\n");
    expect(error).toContain("Manager threads were replaced by parent threads.");
    expect(error).toContain("cc thread spawn --parent-thread <id>");
  });

  it("cc manager subcommands exit with the same replacement message", async () => {
    await expect(
      runCommand(["manager", "list", "project-123"], register),
    ).rejects.toThrow("process.exit:1");

    const error = collectLogLines(vi.mocked(console.error)).join("\n");
    expect(error).toContain("Manager threads were replaced by parent threads.");
    expect(error).toContain("cc thread list --parent-thread <id>");
  });
});
