import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONNECT_BASE_URL,
  resolveDefaultConnectBaseUrl,
} from "../src/index.js";

describe("resolveDefaultConnectBaseUrl", () => {
  it("uses the local Cloud origin only in development", () => {
    expect(
      resolveDefaultConnectBaseUrl({
        NODE_ENV: "development",
        CC_DEV_CONNECT_BASE_URL: "http://cc.localhost:42745/",
      }),
    ).toBe("http://cc.localhost:42745");
    expect(
      resolveDefaultConnectBaseUrl({
        NODE_ENV: "production",
        CC_DEV_CONNECT_BASE_URL: "http://cc.localhost:42745",
      }),
    ).toBe(DEFAULT_CONNECT_BASE_URL);
    expect(resolveDefaultConnectBaseUrl({ NODE_ENV: "development" })).toBe(
      DEFAULT_CONNECT_BASE_URL,
    );
    expect(
      resolveDefaultConnectBaseUrl({
        NODE_ENV: "development",
        CC_DEV_CONNECT_BASE_URL: "https://cc-staging.example.invalid/",
      }),
    ).toBe("https://cc-staging.example.invalid");
  });

  it("rejects non-local or non-origin development values", () => {
    for (const value of [
      "https://cc.localhost:42745",
      "http://cc.example.invalid:42745",
      "http://cc.localhost:42745/dashboard",
      "http://cc-staging.example.invalid",
      "https://sawyer.cc-staging.example.invalid",
      "https://cc-staging.example.invalid/dashboard",
      "not a url",
    ]) {
      expect(() =>
        resolveDefaultConnectBaseUrl({
          NODE_ENV: "development",
          CC_DEV_CONNECT_BASE_URL: value,
        }),
      ).toThrow(
        "CC_DEV_CONNECT_BASE_URL must be an http://cc.localhost:<port> origin or https://cc-staging.example.invalid",
      );
    }
  });
});
