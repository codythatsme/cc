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
        config: { appVersion: "0.44.0", isDevelopment },
      });
      expect(await service.getSystemVersion({ forceRefresh: true })).toEqual({
        currentVersion: "0.44.0",
        latestVersion: null,
        source: "homebrew",
        updateAvailable: false,
        isDevelopment,
        upgradeCommand: "brew upgrade --cask codythatsme/tap/cc",
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});
