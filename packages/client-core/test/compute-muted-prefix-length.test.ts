import { describe, expect, it } from "vitest";
import { computeMutedPrefixLength } from "../src/timeline/compute-muted-prefix-length.js";

describe("computeMutedPrefixLength", () => {
  it("returns 0 for user-initiated text", () => {
    expect(computeMutedPrefixLength("user", "[cc system]\n\nhello")).toBe(0);
  });

  it("returns 0 when text does not start with [cc", () => {
    expect(computeMutedPrefixLength("system", "hello world")).toBe(0);
    expect(computeMutedPrefixLength("agent", "[other] body")).toBe(0);
  });

  it("returns 0 when there is no closing ]", () => {
    expect(computeMutedPrefixLength("system", "[cc system unclosed")).toBe(0);
  });

  it("eats \\n\\n after ] for block-form messages", () => {
    const text = "[cc system]\n\nWelcome!";
    expect(computeMutedPrefixLength("system", text)).toBe(13);
    expect(text.slice(13)).toBe("Welcome!");
  });

  it("eats a single space after ] for inline-form messages", () => {
    const text = "[cc system] Thread completed.";
    expect(computeMutedPrefixLength("system", text)).toBe(12);
    expect(text.slice(12)).toBe("Thread completed.");
  });

  it("returns text.length when the entire text is the prefix", () => {
    const text = "[cc system]";
    expect(computeMutedPrefixLength("system", text)).toBe(text.length);
  });

  it("handles the agent prefix shape", () => {
    const prefix = "[cc message from thread:thr_sender]";
    const text = `${prefix}\n\nHi`;
    expect(computeMutedPrefixLength("agent", text)).toBe(prefix.length + 2);
    expect(text.slice(prefix.length + 2)).toBe("Hi");
  });
});
