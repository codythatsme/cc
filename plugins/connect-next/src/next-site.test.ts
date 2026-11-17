import { describe, expect, it } from "vitest";
import { tunnelServerUrl } from "@cc/frp-client";
import { nextSiteForAccount } from "./next-site.js";

describe("nextSiteForAccount", () => {
  it.each([
    [
      "https://cc.example.invalid",
      "next.cc.example.invalid",
      "https://sawyer.next.cc.example.invalid",
      "wss://tunnel.next.cc.example.invalid/~!frp",
    ],
    [
      "https://cc-staging.example.invalid",
      "next.cc-staging.example.invalid",
      "https://sawyer.next.cc-staging.example.invalid",
      "wss://tunnel.next.cc-staging.example.invalid/~!frp",
    ],
    [
      "http://cc.localhost:35067",
      "next.cc.localhost:35067",
      "http://sawyer.next.cc.localhost:35067",
      "ws://tunnel.next.cc.localhost:35067/~!frp",
    ],
  ])("%s → %s", (baseUrl, domain, origin, tunnel) => {
    const site = nextSiteForAccount(baseUrl);
    expect(site.domain).toBe(domain);
    expect(site.origin("sawyer")).toBe(origin);
    expect(tunnelServerUrl(site.tunnelServer)).toBe(tunnel);
  });

  it("dials 443 for an https account", () => {
    expect(nextSiteForAccount("https://cc.example.invalid").tunnelServer).toEqual({
      protocol: "wss",
      host: "tunnel.next.cc.example.invalid",
      port: 443,
    });
  });
});
