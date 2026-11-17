import { describe, expect, it } from "vitest";
import {
  fitPathMiddle,
  splitPathForMiddleTruncation,
} from "./truncate-path-middle";

describe("splitPathForMiddleTruncation", () => {
  it.each([
    [
      "~/.cc/plugins/environment-git-worktree/host-data/worktrees/thr_abc-1/cc",
      "~/.cc/plugins/environment-git-worktree/host-data/worktrees",
      "/thr_abc-1/cc",
    ],
    ["~/Code/cc", "~", "/Code/cc"],
    ["/tmp/qa/external-root", "/tmp", "/qa/external-root"],
    ["C:\\Users\\me\\Code\\cc", "C:\\Users\\me", "\\Code\\cc"],
  ])("keeps the last two segments of %s", (path, head, tail) => {
    expect(splitPathForMiddleTruncation(path)).toEqual({ head, tail });
  });

  it.each(["/workspace", "/repo/cc", "cc", "~"])(
    "keeps %s whole when it has no head to shorten",
    (path) => {
      expect(splitPathForMiddleTruncation(path)).toEqual({
        head: "",
        tail: path,
      });
    },
  );
});

describe("fitPathMiddle", () => {
  const measure = (text: string) => text.length;
  const path = "~/.cc/plugins/worktrees/thr_abc-1/cc";

  it("keeps a path that fits", () => {
    expect(fitPathMiddle(path, path.length, measure)).toBe(path);
  });

  it("replaces whole middle segments with an ellipsis segment", () => {
    expect(fitPathMiddle(path, 28, measure)).toBe(
      "~/.cc/plugins/…/thr_abc-1/cc",
    );
    expect(fitPathMiddle(path, 22, measure)).toBe("~/.cc/…/thr_abc-1/cc");
  });

  it("keeps only the last segment once only the root is left", () => {
    expect(fitPathMiddle(path, 10, measure)).toBe("~/…/cc");
  });

  it("cuts the start of the last segment as a final fallback", () => {
    expect(fitPathMiddle("~/a/b/long-segment", 8, measure)).toBe("~/…gment");
  });

  it("keeps the root of paths outside home and on Windows", () => {
    expect(fitPathMiddle("/tmp/qa/run/external-root", 24, measure)).toBe(
      "/tmp/…/run/external-root",
    );
    expect(fitPathMiddle("/tmp/qa/run/external-root", 20, measure)).toBe(
      "/tmp/…/external-root",
    );
    expect(fitPathMiddle("C:\\Users\\me\\Code\\cc", 12, measure)).toBe(
      "C:\\…\\Code\\cc",
    );
  });

  it("start-truncates a path with no head to shorten", () => {
    expect(fitPathMiddle("/repo/very-long-name", 10, measure)).toBe(
      "…long-name",
    );
  });
});
