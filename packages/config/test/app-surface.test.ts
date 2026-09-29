import { describe, expect, it } from "vitest";
import { parseAppSurface } from "../src/app-surface.js";

describe("app surface parsing", () => {
  it("accepts desktop and rejects non-launcher surfaces", () => {
    expect(parseAppSurface("mobile")).toBeUndefined();
    expect(parseAppSurface("api")).toBeUndefined();
    expect(parseAppSurface("desktop")).toBe("desktop");
  });

  it("rejects unknown and empty values ", () => {
    expect(parseAppSurface("")).toBeUndefined();
  });
});
