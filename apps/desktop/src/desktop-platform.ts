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
  if (platform === "darwin") {
    return "macos";
  }
  return platform === "win32" ? "windows" : "linux";
}
