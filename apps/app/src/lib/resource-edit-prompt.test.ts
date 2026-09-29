import { describe, expect, it } from "vitest";
import {
  buildPluginEditThreadPrompt,
  buildSkillEditThreadPrompt,
} from "@cc/shared-ui/resource-edit-prompt";

describe("resource edit thread prompts", () => {
  it("gives the thread an unambiguous writable resource locator", () => {
    expect(
      buildPluginEditThreadPrompt({
        name: "Pattern Atlas",
        path: "/Users/me/plugins/pattern-atlas",
      }),
    ).toBe(
      'Edit the cc plugin "Pattern Atlas" at /Users/me/plugins/pattern-atlas. I want to ',
    );
    expect(
      buildSkillEditThreadPrompt({
        id: "skill_abc123",
        name: "Review PR",
        path: "/Users/me/.cc/skills/review-pr/SKILL.md",
      }),
    ).toBe(
      'Edit the cc skill "Review PR" (ID skill_abc123) at /Users/me/.cc/skills/review-pr/SKILL.md. Inspect it with cc skill show skill_abc123 --json and pass that revision to cc skill update when saving. I want to ',
    );
  });
});
