import type { CcDesktopInfo } from "@cc/desktop-contract";

export function getDesktopVersion(version: string | undefined): string {
  if (version === undefined || version.length === 0) {
    throw new Error("Desktop version must be injected at build time");
  }
  return version;
}

export function resolveCcDesktopPlatform(
  platform: NodeJS.Platform,
): CcDesktopInfo["platform"] {
  return platform === "darwin" ? "macos" : "linux";
}
