export const GITHUB_URL = "https://github.com/codythatsme/cc";
export const DISCORD_URL = "https://github.com/codythatsme/cc/issues";
export const X_URL = "https://github.com/codythatsme/cc";
export const DOWNLOAD_FALLBACK_URL =
  "https://github.com/codythatsme/cc/releases/latest";
export const DOWNLOAD_RELEASE_ASSET_BASE_URL =
  "https://github.com/codythatsme/cc/releases/download/v0.44.0";

export type DesktopPlatform = "macos" | "linux";

export const DEFAULT_DESKTOP_PLATFORM: DesktopPlatform = "macos";

export type DesktopDownload = {
  label: string;
  buttonLabel: string;
  note: string;
  installerExtension: string;
  versionFeedUrl: string;
  redirectPath: string;
};

export const DESKTOP_DOWNLOADS: Record<DesktopPlatform, DesktopDownload> = {
  macos: {
    label: "macOS",
    buttonLabel: "Download for macOS",
    note: "Apple Silicon",
    installerExtension: ".dmg",
    versionFeedUrl: `${DOWNLOAD_RELEASE_ASSET_BASE_URL}/desktop-version.json`,
    redirectPath: "/download/macos",
  },
  linux: {
    label: "Linux",
    buttonLabel: "Download for Linux",
    note: "x64 AppImage, alpha",
    installerExtension: ".AppImage",
    versionFeedUrl: `${DOWNLOAD_RELEASE_ASSET_BASE_URL}/desktop-version-linux.json`,
    redirectPath: "/download/linux",
  },
};
export const SUBSCRIBE_PATH = "/api/subscribe";
export const CLI_COMMAND = "brew install --cask codythatsme/tap/cc";

export function downloadHref(platform: DesktopPlatform): string {
  return DESKTOP_DOWNLOADS[platform].redirectPath;
}

declare const __SITE_ORIGIN__: string;
const SITE_URL = __SITE_ORIGIN__;
export const SITE_TITLE = "cc: the IDE that builds itself";
export const SITE_DESCRIPTION =
  "cc can control, customize, and automate itself, laying the groundwork for your own software factory. Fully open source and local-first, with Claude Code, Codex, Cursor, Pi, OpenCode, Grok, omp, and Hermes.";
export const OG_DESCRIPTION =
  "cc can control, customize, and automate itself, laying the groundwork for your own software factory.";

export function unfurlMeta(
  title: string,
  description: string,
  path: string,
  image = {
    path: "/og.png",
    width: 2400,
    height: 1260,
    alt: "cc logo — The IDE that builds itself. Free, open source, and local-first.",
  },
) {
  return [
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `${SITE_URL}${path}` },
    { property: "og:site_name", content: "cc" },
    { property: "og:image", content: `${SITE_URL}${image.path}` },
    { property: "og:image:width", content: String(image.width) },
    { property: "og:image:height", content: String(image.height) },
    {
      property: "og:image:alt",
      content: image.alt,
    },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: `${SITE_URL}${image.path}` },
  ];
}
