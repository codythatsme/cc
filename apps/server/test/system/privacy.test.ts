import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAppSettings } from "@cc/domain";
import { appSettingsValues, getAppSettings } from "@cc/db";
import { withTestHarness } from "../helpers/test-app.js";

const require = createRequire(import.meta.url);
const authRequire = createRequire(require.resolve("better-auth"));
const authReportingDirectory = dirname(
  authRequire.resolve("@better-auth/telemetry"),
);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("privacy boundary", () => {
  it.each(["node.mjs", "index.mjs"])(
    "removes reporting from Better Auth's %s runtime even when explicitly enabled",
    async (entry) => {
      const fetchSpy = vi.fn();
      const customTrack = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      vi.stubEnv("BETTER_AUTH_TELEMETRY", "true");
      vi.stubEnv(
        "BETTER_AUTH_TELEMETRY_ENDPOINT",
        "https://collector.example/events",
      );
      const dependency: unknown = await import(
        pathToFileURL(join(authReportingDirectory, entry)).href
      );
      if (
        typeof dependency !== "object" ||
        dependency === null ||
        !("createTelemetry" in dependency) ||
        typeof dependency.createTelemetry !== "function"
      )
        throw new Error(
          "Better Auth reporting API changed; re-audit the patch",
        );
      const tracker: unknown = await dependency.createTelemetry(
        { telemetry: { enabled: true }, baseURL: "http://localhost" },
        { customTrack, skipTestCheck: true },
      );
      if (
        typeof tracker !== "object" ||
        tracker === null ||
        !("publish" in tracker) ||
        typeof tracker.publish !== "function"
      )
        throw new Error(
          "Better Auth reporting API changed; re-audit the patch",
        );
      await tracker.publish({
        type: "user_event",
        payload: { privateData: "test" },
      });
      expect(customTrack).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it("ignores legacy stored opt-ins and rejects attempts to enable reporting through settings", async () => {
    await withTestHarness(async (harness) => {
      harness.db
        .insert(appSettingsValues)
        .values({
          key: "telemetryEnabled",
          value: "true",
          updatedAt: Date.now(),
        })
        .run();
      expect(getAppSettings(harness.db)).not.toHaveProperty("telemetryEnabled");
      const response = await harness.app.request("/api/v1/settings/general", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...defaultAppSettings, telemetryEnabled: true }),
      });
      expect(response.status).toBe(400);
      expect(getAppSettings(harness.db)).not.toHaveProperty("telemetryEnabled");
    });
  });
});
