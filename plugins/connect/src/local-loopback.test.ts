import { describe, expect, it } from "vitest";
import { resolveLocalCloudLoopbackUrl } from "./local-loopback.js";

describe("resolveLocalCloudLoopbackUrl", () => {
  it("targets Vite only for a source-development pairing with local or staging Cloud", () => {
    expect(
      resolveLocalCloudLoopbackUrl("http://sawyer.localhost:8787", "11001"),
    ).toBe("http://127.0.0.1:11001");
    expect(
      resolveLocalCloudLoopbackUrl(
        "https://sawyer-chinamax.cc-staging.example.invalid",
        "11001",
      ),
    ).toBe("http://127.0.0.1:11001");
    expect(
      resolveLocalCloudLoopbackUrl("http://sawyer.cc-staging.example.invalid", "11001"),
    ).toBeNull();
    expect(
      resolveLocalCloudLoopbackUrl(
        "https://sawyer.cc-staging.example.invalid",
        undefined,
      ),
    ).toBeNull();
    expect(
      resolveLocalCloudLoopbackUrl("https://sawyer.cc.example.invalid", "11001"),
    ).toBeNull();
    expect(
      resolveLocalCloudLoopbackUrl("http://sawyer.localhost:8787", undefined),
    ).toBeNull();
  });
});
