import { describe, expect, it } from "vitest";
import { normalizeTerminalTitle } from "./thread-terminal-title";

describe("terminal title normalization", () => {
  it("returns null for blank titles", () => {
    expect(normalizeTerminalTitle({ title: "  " })).toBeNull();
  });

  it("trims ordinary titles without changing their content", () => {
    expect(normalizeTerminalTitle({ title: "  Edited title  " })).toBe(
      "Edited title",
    );
  });

  it("does not split an astral character at the title limit", () => {
    const prefix = "x".repeat(199);
    expect(normalizeTerminalTitle({ title: `${prefix}𠮷tail` })).toBe(prefix);
  });

  it("ignores shell path titles without changing the terminal title", () => {
    expect(
      normalizeTerminalTitle({
        title:
          "michael@Michaels-MacBook-Pro:~/.cc-dev/worktrees/env_gj4ep9emi8/cc",
      }),
    ).toBeNull();
  });

  it("ignores shell path titles with whitespace after the host separator", () => {
    expect(
      normalizeTerminalTitle({
        title: "root@do-1: ~/.cc/worktrees/env_4gfkk8evua/cc",
      }),
    ).toBeNull();
  });

  it("ignores short shell path titles", () => {
    expect(
      normalizeTerminalTitle({
        title: "michael@host:~/cc",
      }),
    ).toBeNull();
  });
});
