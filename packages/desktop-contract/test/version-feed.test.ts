import { describe, expect, it } from "vitest";
import {
  ccDesktopInfoSchema,
  ccDesktopThemeSchema,
  ccDesktopVersionFeedSchema,
  ccDesktopWindowStateSchema,
  createCcDesktopVersionFeedFileName,
} from "../src/index.js";

const checkedAt = "2026-05-21T00:00:00.000Z";

describe("desktop info schema", () => {
  it("accepts the desktop update info payload", () => {
    expect(
      ccDesktopInfoSchema.safeParse({
        lastCheckedAt: checkedAt,
        latestVersion: "0.0.2",
        pendingVersion: null,
        platform: "macos",
        updateAvailable: true,
        updateDownloaded: false,
        version: "0.0.1",
      }).success,
    ).toBe(true);
  });

  it("accepts the desktop theme values", () => {
    expect(ccDesktopThemeSchema.safeParse("dark").success).toBe(true);
    expect(ccDesktopThemeSchema.safeParse("light").success).toBe(true);
    expect(ccDesktopThemeSchema.safeParse("system").success).toBe(true);
    expect(
      ccDesktopThemeSchema.safeParse({
        canvasColor: "oklch(0.195 0 0)",
        inkColor: "oklch(0.81 0 0)",
        mode: "dark",
      }).success,
    ).toBe(false);
  });

  it("accepts strict desktop window state payloads", () => {
    expect(
      ccDesktopWindowStateSchema.safeParse({ isFullScreen: true }).success,
    ).toBe(true);
    expect(
      ccDesktopWindowStateSchema.safeParse({
        isFullScreen: true,
        extra: true,
      }).success,
    ).toBe(false);
  });
});

describe("desktop version feed schema", () => {
  it("accepts a valid desktop-version.json payload", () => {
    expect(
      ccDesktopVersionFeedSchema.safeParse({
        channel: "latest",
        files: [
          {
            sha512: "BASE64_SHA512_FROM_ELECTRON_BUILDER",
            size: 123456789,
            url: "cc-0.0.2-universal.zip",
          },
        ],
        minimumSystemVersion: null,
        path: "cc-0.0.2-universal.zip",
        platform: "macos",
        releaseDate: checkedAt,
        releaseName: "cc desktop 0.0.2",
        releaseNotes: null,
        schemaVersion: 1,
        sha512: "BASE64_SHA512_FROM_ELECTRON_BUILDER",
        stagingPercentage: null,
        version: "0.0.2",
      }).success,
    ).toBe(true);
  });

  it("accepts the isolated nightly desktop channel", () => {
    expect(
      ccDesktopVersionFeedSchema.safeParse({
        channel: "nightly",
        files: [
          {
            sha512: "BASE64_SHA512_FROM_ELECTRON_BUILDER",
            size: 123456789,
            url: "cc-nightly-0.0.2-nightly.1.1-arm64.zip",
          },
        ],
        minimumSystemVersion: null,
        path: "cc-nightly-0.0.2-nightly.1.1-arm64.zip",
        platform: "macos",
        releaseDate: checkedAt,
        releaseName: "cc Nightly desktop 0.0.2-nightly.1.1",
        releaseNotes: null,
        schemaVersion: 1,
        sha512: "BASE64_SHA512_FROM_ELECTRON_BUILDER",
        stagingPercentage: null,
        version: "0.0.2-nightly.1.1",
      }).success,
    ).toBe(true);
  });

  it("accepts a Linux AppImage version feed payload", () => {
    expect(
      ccDesktopVersionFeedSchema.safeParse({
        channel: "latest",
        files: [
          {
            sha512: "BASE64_SHA512_FROM_ELECTRON_BUILDER",
            size: 123456789,
            url: "cc-0.0.2-x86_64.AppImage",
          },
        ],
        minimumSystemVersion: null,
        path: "cc-0.0.2-x86_64.AppImage",
        platform: "linux",
        releaseDate: checkedAt,
        releaseName: "cc desktop 0.0.2",
        releaseNotes: null,
        schemaVersion: 1,
        sha512: "BASE64_SHA512_FROM_ELECTRON_BUILDER",
        stagingPercentage: null,
        version: "0.0.2",
      }).success,
    ).toBe(true);
  });

  it("keeps the macOS feed file name unsuffixed so shipped builds keep updating", () => {
    expect(createCcDesktopVersionFeedFileName("macos")).toBe(
      "desktop-version.json",
    );
    expect(createCcDesktopVersionFeedFileName("linux")).toBe(
      "desktop-version-linux.json",
    );
  });

  it("rejects malformed version feed payloads", () => {
    expect(
      ccDesktopVersionFeedSchema.safeParse({
        channel: "latest",
        files: [],
        minimumSystemVersion: null,
        path: "cc-0.0.2-universal.zip",
        platform: "macos",
        releaseDate: checkedAt,
        releaseName: "cc desktop 0.0.2",
        releaseNotes: null,
        schemaVersion: 1,
        sha512: "BASE64_SHA512_FROM_ELECTRON_BUILDER",
        stagingPercentage: null,
        version: "0.0.2",
      }).success,
    ).toBe(false);
  });
});
