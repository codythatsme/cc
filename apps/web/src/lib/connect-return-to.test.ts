import { describe, expect, it } from "vitest";

import { connectReturnTo } from "./connect-return-to";

describe("connect return-to URLs", () => {
  it("accepts immediate connect subdomains for the current app domain", () => {
    expect(
      connectReturnTo(
        "https://sawyer.cc.example.invalid/projects?tab=threads",
        "https://cc.example.invalid",
      ),
    ).toBe("https://sawyer.cc.example.invalid/projects?tab=threads");
  });

  it("accepts staging connect subdomains", () => {
    expect(
      connectReturnTo(
        "https://sawyer.cc-staging.example.invalid/",
        "https://cc-staging.example.invalid",
      ),
    ).toBe("https://sawyer.cc-staging.example.invalid/");
  });

  it("accepts local Cloud handles under the shared cookie domain", () => {
    expect(
      connectReturnTo(
        "http://sawyer.cc.localhost:42745/threads/thr_1",
        "http://cc.localhost:42745",
      ),
    ).toBe("http://sawyer.cc.localhost:42745/threads/thr_1");
  });

  it("rejects nested subdomains and off-domain return targets", () => {
    expect(
      connectReturnTo("https://a.b.cc.example.invalid/", "https://cc.example.invalid"),
    ).toBeNull();
    expect(
      connectReturnTo("https://evil.test/", "https://cc.example.invalid"),
    ).toBeNull();
  });

  it("rejects protocol downgrades", () => {
    expect(
      connectReturnTo("http://sawyer.cc.example.invalid/", "https://cc.example.invalid"),
    ).toBeNull();
  });

  it("treats absent and the literal 'null'/'undefined' strings as no return target", () => {
    expect(connectReturnTo(null, "https://cc.example.invalid")).toBeNull();
    expect(connectReturnTo(undefined, "https://cc.example.invalid")).toBeNull();
    expect(connectReturnTo("", "https://cc.example.invalid")).toBeNull();
    expect(connectReturnTo("null", "https://cc.example.invalid")).toBeNull();
    expect(connectReturnTo("undefined", "https://cc.example.invalid")).toBeNull();
  });
});
