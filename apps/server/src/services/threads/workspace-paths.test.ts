import { describe, expect, it } from "vitest";
import { isCcManagedWorkspacePath } from "./workspace-paths.js";

const dataDir = "/home/user/.cc";

describe("isCcManagedWorkspacePath", () => {
  it("recognises a worktree under a plugin's host data directory", () => {
    expect(
      isCcManagedWorkspacePath({
        dataDir,
        path: `${dataDir}/plugins/environment-git-worktree/host-data/worktrees/thr_abc-1/repo`,
      }),
    ).toBe(true);
  });

  it("recognises a personal workspace under a plugin's host data directory", () => {
    expect(
      isCcManagedWorkspacePath({
        dataDir,
        path: `${dataDir}/plugins/environment-personal-workspace/host-data/personal-workspaces/thr_abc`,
      }),
    ).toBe(true);
  });

  it("recognises the pre-plugin workspace roots", () => {
    expect(
      isCcManagedWorkspacePath({
        dataDir,
        path: `${dataDir}/worktrees/env_abc/repo`,
      }),
    ).toBe(true);
    expect(
      isCcManagedWorkspacePath({
        dataDir,
        path: `${dataDir}/personal-workspaces/env_abc`,
      }),
    ).toBe(true);
  });

  it("leaves plugin storage that is not process data alone", () => {
    expect(
      isCcManagedWorkspacePath({
        dataDir,
        path: `${dataDir}/plugins/some-plugin/source/index.ts`,
      }),
    ).toBe(false);
    expect(
      isCcManagedWorkspacePath({ dataDir, path: `${dataDir}/plugins` }),
    ).toBe(false);
  });

  it("leaves paths outside the data directory alone", () => {
    expect(
      isCcManagedWorkspacePath({ dataDir, path: "/home/user/code/repo" }),
    ).toBe(false);
    expect(
      isCcManagedWorkspacePath({
        dataDir,
        path: "/home/user/.cc-other/worktrees/env_abc",
      }),
    ).toBe(false);
  });

  it("does not treat a sibling prefix as a managed root", () => {
    expect(
      isCcManagedWorkspacePath({
        dataDir,
        path: `${dataDir}/worktrees-backup/env_abc`,
      }),
    ).toBe(false);
  });
});
