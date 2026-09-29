import { describe, expect, it } from "vitest";
import { installSessionCookie, sessionCookieSpec } from "./cookie-store";

const session = {
  cookie: {
    name: "__Secure-cc-connect.desktop_session",
    value: "abc.def",
    domain: ".cc.example.invalid",
    expiresAt: Date.UTC(2026, 7, 18, 11),
  },
};

describe("sessionCookieSpec", () => {
  it("marks the cookie Secure only for https servers", () => {
    expect(sessionCookieSpec(session, "https://bee.cc.example.invalid")).toEqual({
      name: "__Secure-cc-connect.desktop_session",
      value: "abc.def",
      domain: ".cc.example.invalid",
      path: "/",
      secure: true,
      httpOnly: true,
      expires: "2026-08-18T11:00:00.000Z",
    });
    expect(
      sessionCookieSpec(
        { cookie: { ...session.cookie, domain: "127.0.0.1" } },
        "http://127.0.0.1:42998",
      ),
    ).toMatchObject({ secure: false, domain: "127.0.0.1" });
  });

  it("rejects a cookie domain the server host does not domain-match", () => {
    const rogue = "https://bee.cc.example.invalid.evil.example";
    for (const domain of ["bee.cc.example.invalid", ".cc.example.invalid", "cc.example.invalid"]) {
      expect(() =>
        sessionCookieSpec({ cookie: { ...session.cookie, domain } }, rogue),
      ).toThrow(/does not match bee\.cc\.example\.invalid\.evil\.example/u);
    }
    expect(() =>
      sessionCookieSpec(
        { cookie: { ...session.cookie, domain: "ant.cc.example.invalid" } },
        "https://bee.cc.example.invalid",
      ),
    ).toThrow(/does not match/u);
    expect(() =>
      sessionCookieSpec(
        { cookie: { ...session.cookie, domain: "ee.cc.example.invalid" } },
        "https://bee.cc.example.invalid",
      ),
    ).toThrow(/does not match/u);
  });

  it("accepts the host itself and any parent domain", () => {
    for (const domain of [
      "bee.cc.example.invalid",
      ".bee.cc.example.invalid",
      ".cc.example.invalid",
      "cc.example.invalid",
      "GetCC.app",
    ]) {
      expect(
        sessionCookieSpec(
          { cookie: { ...session.cookie, domain } },
          "https://bee.cc.example.invalid",
        ),
      ).toMatchObject({ domain });
    }
  });

  it("installs into the shared jar and the WebKit store", async () => {
    const calls: { url: string; secure: boolean; useWebKit: boolean }[] = [];
    await installSessionCookie(
      {
        set: async (url, cookie, useWebKit) => {
          calls.push({ url, secure: cookie.secure, useWebKit });
        },
      },
      "https://bee.cc.example.invalid",
      session,
    );
    expect(calls).toEqual([
      { url: "https://bee.cc.example.invalid", secure: true, useWebKit: false },
      { url: "https://bee.cc.example.invalid", secure: true, useWebKit: true },
    ]);
  });
});
