import type { AppInstallKind } from "@cc/config/app-install";
import type { SystemVersionResponse } from "@cc/server-contract";
import type { ServerRuntimeConfig } from "../../types.js";

export interface AppVersionService {
  getSystemVersion(args?: {
    forceRefresh?: boolean;
  }): Promise<SystemVersionResponse>;
}

/**
 * cc ships through Homebrew, so the server never polls a package registry
 * for newer versions. The response only describes the running build.
 */
export function createAppVersionService(args: {
  installKind: AppInstallKind | null;
  sourceCommit: string | null;
  config: Pick<ServerRuntimeConfig, "appVersion" | "isDevelopment">;
}): AppVersionService {
  return {
    async getSystemVersion(): Promise<SystemVersionResponse> {
      return {
        currentCommit:
          args.installKind === "source" ? args.sourceCommit : null,
        installKind: args.installKind,
        currentVersion: args.config.appVersion,
        latestVersion: null,
        source: "homebrew",
        updateAvailable: false,
        isDevelopment: args.config.isDevelopment,
        upgradeCommand: "brew upgrade --cask codythatsme/tap/cc",
      };
    },
  };
}
