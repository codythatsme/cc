import { describe, expect, it } from "vitest";
import { parseVisitorHost, validateLabel } from "../src/index.js";

describe("validateLabel", () => {
  it("accepts well-formed handles", () => {
    for (const h of ["sawyer", "abc", "a1b2", "my-server", "x".repeat(30)]) {
      expect(validateLabel(h)).toBeNull();
    }
  });

  it("rejects malformed and reserved handles", () => {
    expect(validateLabel("ab")).toBe("too-short");
    expect(validateLabel("x".repeat(31))).toBe("too-long");
    expect(validateLabel("-lead")).toBe("invalid-format");
    expect(validateLabel("Upper")).toBe("invalid-format");
    expect(validateLabel("has space")).toBe("invalid-format");
    expect(validateLabel("has_underscore")).toBe("invalid-format");
    expect(validateLabel("foo--bar")).toBe("invalid-format");
    expect(validateLabel("a--b")).toBe("invalid-format");
    for (const h of [
      "api",
      "www",
      "docs",
      "admin",
      "oauth",
      "origin",
      "production",
    ]) {
      expect(validateLabel(h)).toBe("reserved");
    }
  });
});

describe("parseVisitorHost", () => {
  it("extracts a bare handle", () => {
    expect(parseVisitorHost("sawyer.cc.example.invalid", "cc.example.invalid")).toEqual({
      handle: "sawyer",
      target: null,
    });
    expect(parseVisitorHost("Sawyer.cc.example.invalid", "cc.example.invalid")).toEqual({
      handle: "sawyer",
      target: null,
    });
  });

  it("extracts handle--port share hosts", () => {
    expect(parseVisitorHost("sawyer--8000.cc.example.invalid", "cc.example.invalid")).toEqual({
      handle: "sawyer",
      target: "8000",
    });
    expect(parseVisitorHost("Sawyer--5173.cc.example.invalid", "cc.example.invalid")).toEqual({
      handle: "sawyer",
      target: "5173",
    });
  });

  it("rejects invalid share targets as unroutable", () => {
    expect(parseVisitorHost("sawyer--0.cc.example.invalid", "cc.example.invalid")).toBeNull();
    expect(parseVisitorHost("sawyer--99999.cc.example.invalid", "cc.example.invalid")).toBeNull();
    expect(parseVisitorHost("sawyer--08000.cc.example.invalid", "cc.example.invalid")).toBeNull();
    expect(parseVisitorHost("sawyer--x.cc.example.invalid", "cc.example.invalid")).toBeNull();
    expect(parseVisitorHost("foo--80--00.cc.example.invalid", "cc.example.invalid")).toBeNull();
  });

  it("rejects the apex, multi-label, and foreign hosts", () => {
    expect(parseVisitorHost("cc.example.invalid", "cc.example.invalid")).toBeNull();
    expect(parseVisitorHost("a.b.cc.example.invalid", "cc.example.invalid")).toBeNull();
    expect(parseVisitorHost("evil.com", "cc.example.invalid")).toBeNull();
    expect(parseVisitorHost("cc.example.invalid.evil.com", "cc.example.invalid")).toBeNull();
  });
});
