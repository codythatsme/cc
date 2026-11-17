import { describe, expect, it } from "vitest";
import { readJson } from "../helpers/json.js";
import { withTestHarness } from "../helpers/test-app.js";

describe("setup guide route", () => {
  it("serves the configured guide variant without any experiment lookup", async () => {
    await withTestHarness(async (harness) => {
      const response = await harness.app.request("/api/v1/system/setup-guide");

      expect(response.status).toBe(200);
      await expect(readJson(response)).resolves.toEqual({ variant: "control" });
    });
  });

  it("has no telemetry event endpoint", async () => {
    await withTestHarness(async (harness) => {
      const response = await harness.app.request(
        "/api/v1/system/telemetry/events",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "onboarding_exposed",
            properties: { entry: "first_run" },
          }),
        },
      );

      expect(response.status).toBe(404);
    });
  });
});
