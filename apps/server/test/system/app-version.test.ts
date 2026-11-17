import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppVersionService } from "../../src/services/system/app-version.js";

afterEach(() => vi.unstubAllGlobals());

describe("createAppVersionService", () => {
  it.each([false, true])(
    "uses Homebrew without any network lookup (development=%s)",
    async (isDevelopment) => {
      const fetch = vi.fn(() => {
        throw new Error("Unexpected network request");
      });
      vi.stubGlobal("fetch", fetch);
      const service = createAppVersionService({
        installKind: "desktop",
        sourceCommit: null,
        config: { appVersion: "0.49.0", isDevelopment },
      });
      expect(await service.getSystemVersion({ forceRefresh: true })).toEqual({
        currentCommit: null,
        installKind: "desktop",
        currentVersion: "0.49.0",
        latestVersion: null,
        source: "homebrew",
        updateAvailable: false,
        isDevelopment,
        upgradeCommand: "brew upgrade --cask codythatsme/tap/cc",
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("reports the source commit only for source checkouts", async () => {
    const commit = "a".repeat(40);
    const source = createAppVersionService({
      installKind: "source",
      sourceCommit: commit,
      config: { appVersion: "0.49.0", isDevelopment: false },
    });
    const desktop = createAppVersionService({
      installKind: "desktop",
      sourceCommit: commit,
      config: { appVersion: "0.49.0", isDevelopment: false },
    });
    expect((await source.getSystemVersion()).currentCommit).toBe(commit);
    expect((await desktop.getSystemVersion()).currentCommit).toBeNull();
  });
});
