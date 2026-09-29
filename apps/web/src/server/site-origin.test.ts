import { describe, expect, it } from "vitest";

import { resolveSiteOrigin } from "./site-origin.js";

describe("resolveSiteOrigin", () => {
  it("keeps production and staging distinct", () => {
    expect(resolveSiteOrigin("https://cc.example.invalid")).toBe("https://cc.example.invalid");
    expect(resolveSiteOrigin("https://cc-staging.example.invalid")).toBe(
      "https://cc-staging.example.invalid",
    );
  });

  it("drops any path so og:image resolves against the root", () => {
    expect(resolveSiteOrigin("https://cc.example.invalid/")).toBe("https://cc.example.invalid");
    expect(resolveSiteOrigin("https://cc.example.invalid/dashboard")).toBe(
      "https://cc.example.invalid",
    );
  });

  it("keeps a non-default port (cloud dev tunnels use one)", () => {
    expect(resolveSiteOrigin("http://cc.localhost:8787")).toBe(
      "http://cc.localhost:8787",
    );
  });

  it("fails the build rather than guessing an origin", () => {
    expect(() => resolveSiteOrigin(undefined)).toThrow(/APP_URL is missing/);
    expect(() => resolveSiteOrigin("   ")).toThrow(/APP_URL is missing/);
    expect(() => resolveSiteOrigin("cc.example.invalid")).toThrow(/not a valid URL/);
  });
});
