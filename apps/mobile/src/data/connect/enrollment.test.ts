import { ConnectMachineRedeemError } from "@cc/connect-client";
import { describe, expect, it, vi } from "vitest";
import {
  accountServerProfile,
  describeEnrollmentError,
  redeemEnrollment,
} from "./enrollment";

describe("redeemEnrollment", () => {
  it("redeems at the apex and shapes a connect profile labelled by handle", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        credential: "bbcm_secret",
        machineId: "m1",
        handle: "account",
        serverUrl: "https://bee.cc.example.invalid",
      }),
    );
    const result = await redeemEnrollment(
      {
        apexUrl: "https://cc.example.invalid",
        code: "ABCD-EFGH",
        deviceName: "Pixel 9 Pro",
      },
      fetchImpl,
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://cc.example.invalid/api/connect/redeem-machine",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          code: "ABCD-EFGH",
          deviceName: "Pixel 9 Pro",
          kind: "mobile",
        }),
      }),
    );
    expect(result.profile).toEqual({
      mode: "connect",
      serverUrl: "https://bee.cc.example.invalid",
      handle: "bee",
      credential: "bbcm_secret",
      label: "bee",
    });
    expect(result.credential.handle).toBe("bee");
  });

  it("maps the apex's wire errors to user copy, including the machine cap", async () => {
    const limit = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        Response.json({ error: "machine-limit" }, { status: 409 }),
      );
    await expect(
      redeemEnrollment(
        {
          apexUrl: "https://cc.example.invalid",
          code: "X-1",
          deviceName: "Pixel 9 Pro",
        },
        limit,
      ),
    ).rejects.toBeInstanceOf(ConnectMachineRedeemError);
    const failure = await redeemEnrollment(
      { apexUrl: "https://cc.example.invalid", code: "X-1", deviceName: "Pixel 9 Pro" },
      limit,
    ).catch((error: unknown) => describeEnrollmentError(error));
    expect(failure).toMatchObject({ code: "machine_limit" });
    expect(failure).toHaveProperty(
      "message",
      expect.stringContaining("cc.example.invalid dashboard"),
    );

    for (const [status, wire, code] of [
      [404, "invalid-code", "invalid_code"],
      [410, "expired", "expired"],
      [409, "already-used", "already_used"],
    ] as const) {
      const failed = await redeemEnrollment(
        {
          apexUrl: "https://cc.example.invalid",
          code: "X-1",
          deviceName: "Pixel 9 Pro",
        },
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(Response.json({ error: wire }, { status })),
      ).catch((error: unknown) => describeEnrollmentError(error));
      expect(failed).toMatchObject({ code });
    }
    expect(
      describeEnrollmentError(new TypeError("Network request failed")),
    ).toMatchObject({ code: "network" });
  });
});

describe("accountServerProfile", () => {
  it("reuses the account-scoped credential for another server on the account", () => {
    expect(
      accountServerProfile(
        {
          serverUrl: "https://bee.cc.example.invalid",
          handle: "bee",
          credential: "bbcm_1",
        },
        { handle: "lab", name: "  ", url: "https://lab.cc.example.invalid" },
      ),
    ).toEqual({
      mode: "connect",
      serverUrl: "https://lab.cc.example.invalid",
      handle: "lab",
      credential: "bbcm_1",
      label: "lab",
    });
  });
});
