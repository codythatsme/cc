import { describe, expect, it } from "vitest";
import { rewriteLocalhostLinkHref } from "../src/localhost-link-rewrite.js";

describe("rewriteLocalhostLinkHref", () => {
  it("rewrites localhost and 127.0.0.1 http links to the current page hostname", () => {
    expect(
      rewriteLocalhostLinkHref({
        currentHostname: "100.64.158.8",
        enabled: true,
        href: "http://localhost:5173/app?debug=1#ready",
      }),
    ).toBe("http://100.64.158.8:5173/app?debug=1#ready");

    expect(
      rewriteLocalhostLinkHref({
        currentHostname: "100.64.158.8",
        enabled: true,
        href: "https://127.0.0.1:8443/",
      }),
    ).toBe("https://100.64.158.8:8443/");
  });

  it("leaves visible hrefs unchanged when disabled or not a localhost http link", () => {
    expect(
      rewriteLocalhostLinkHref({
        currentHostname: "100.64.158.8",
        enabled: false,
        href: "http://localhost:5173/",
      }),
    ).toBe("http://localhost:5173/");

    for (const href of [
      "https://example.com/docs",
      "mailto:hi@example.com",
      "/projects/proj_123",
      "file:///workspace/app.ts",
      "not a url",
      undefined,
    ]) {
      expect(
        rewriteLocalhostLinkHref({
          currentHostname: "100.64.158.8",
          enabled: true,
          href,
        }),
      ).toBe(href);
    }
  });

  it("leaves localhost links alone on cc.example.invalid hosts", () => {
    for (const currentHostname of [
      "sawyer.cc.example.invalid",
      "sawyer--8000.cc.example.invalid",
      "cc.example.invalid",
      "SAWYER.GETBB.APP",
    ]) {
      expect(
        rewriteLocalhostLinkHref({
          currentHostname,
          enabled: true,
          href: "http://localhost:5173/app",
        }),
      ).toBe("http://localhost:5173/app");
    }
  });

  it("does not produce a Connect hostname with the localhost port", () => {
    expect(
      rewriteLocalhostLinkHref({
        currentHostname: "asdf.cc.example.invalid",
        enabled: true,
        href: "http://localhost:5173/app",
      }),
    ).toBe("http://localhost:5173/app");
  });

  it("does not ignore unrelated hostnames", () => {
    for (const currentHostname of [
      "notcc.example.invalid",
      "sawyer.localhost",
      "sawyer--8000.localhost",
      "sawyer.cc.localhost",
    ]) {
      expect(
        rewriteLocalhostLinkHref({
          currentHostname,
          enabled: true,
          href: "http://localhost:5173/app",
        }),
      ).toBe(`http://${currentHostname}:5173/app`);
    }
  });

  it("preserves cc Connect share links", () => {
    for (const href of [
      "https://sawyer--5173.cc.example.invalid/app",
      "http://sawyer--5173.localhost:59332/app",
    ]) {
      expect(
        rewriteLocalhostLinkHref({
          currentHostname: "100.64.158.8",
          enabled: true,
          href,
        }),
      ).toBe(href);
    }
  });
});
