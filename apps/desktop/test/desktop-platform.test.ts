import { describe, expect, it } from "vitest";
import { resolveCcDesktopPlatform } from "../src/desktop-platform.js";

describe("resolveCcDesktopPlatform", () => {
  it("names each supported desktop platform", () => {
    expect(resolveCcDesktopPlatform("darwin")).toBe("macos");
    expect(resolveCcDesktopPlatform("linux")).toBe("linux");
    expect(resolveCcDesktopPlatform("win32")).toBe("windows");
  });
});
