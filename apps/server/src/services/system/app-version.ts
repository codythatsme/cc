import type { SystemVersionResponse } from "@cc/server-contract";
import type { ServerRuntimeConfig } from "../../types.js";

export interface AppVersionService {
  getSystemVersion(args?: {
    forceRefresh?: boolean;
  }): Promise<SystemVersionResponse>;
}

export function createAppVersionService(args: {
  config: Pick<ServerRuntimeConfig, "appVersion" | "isDevelopment">;
}): AppVersionService {
  return {
    async getSystemVersion(): Promise<SystemVersionResponse> {
      return {
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
