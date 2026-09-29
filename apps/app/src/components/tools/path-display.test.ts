import { describe, expect, it } from "vitest";
import { formatHomePathForDisplay } from "@cc/shared-ui/lib/utils";

describe("formatHomePathForDisplay", () => {
  it.each([
    ["/Users/you", "~"],
    ["/Users/you/.cc/plugins/github", "~/.cc/plugins/github"],
    ["/home/u/.cc/skills/review", "~/.cc/skills/review"],
    ["/root/.cc/automations/run.sh", "~/.cc/automations/run.sh"],
    ["C:\\Users\\you\\.cc\\plugins", "~\\.cc\\plugins"],
  ])("compacts a conventional home path %s", (path, expected) => {
    expect(formatHomePathForDisplay(path)).toBe(expected);
  });

  it.each([
    "/managed/plugins/github",
    "/Volumes/work/plugins/github",
    "skills.sh/example/writing-voice",
    "SKILL.md",
  ])("preserves a path outside a conventional home %s", (path) => {
    expect(formatHomePathForDisplay(path)).toBe(path);
  });
});
