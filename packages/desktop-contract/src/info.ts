import { z } from "zod";
import type { CcDesktopBrowserApi } from "./browser.js";
import type { CcDesktopWindowFindRequest } from "./find.js";
import { ccDesktopVersionFeedPlatformSchema } from "./version-feed.js";
import type { AppCommandId } from "@cc/domain";

const isoUtcDateTimeSchema = z.iso.datetime();

const ccDesktopDownloadStateSchema = z.enum([
  "idle",
  "downloading",
  "downloaded",
  "failed",
]);

export const ccDesktopInfoSchema = z.object({
  downloadState: ccDesktopDownloadStateSchema.optional(),
  lastCheckedAt: isoUtcDateTimeSchema.nullable(),
  latestVersion: z.string().min(1).nullable(),
  pendingVersion: z.string().min(1).nullable(),
  platform: ccDesktopVersionFeedPlatformSchema,
  serverDaemonLogsAvailable: z.boolean().optional(),
  updateAvailable: z.boolean(),
  updateDownloaded: z.boolean(),
  version: z.string().min(1),
});
export type CcDesktopInfo = z.infer<typeof ccDesktopInfoSchema>;

export const ccDesktopWindowStateSchema = z
  .object({
    isFullScreen: z.boolean(),
  })
  .strict();
export type CcDesktopWindowState = z.infer<typeof ccDesktopWindowStateSchema>;

export const ccDesktopThemeSchema = z.enum(["system", "light", "dark"]);
export type CcDesktopTheme = z.infer<typeof ccDesktopThemeSchema>;

export const ccDesktopZoomCommandSchema = z.enum(["in", "out", "reset"]);
export type CcDesktopZoomCommand = z.infer<typeof ccDesktopZoomCommandSchema>;
export const CC_DESKTOP_MIN_ZOOM_PERCENT = 50;
export const CC_DESKTOP_MAX_ZOOM_PERCENT = 300;

export type CcDesktopInfoChangeHandler = (info: CcDesktopInfo) => void;
export type CcDesktopInfoUnsubscribe = () => void;
export type CcDesktopWindowStateChangeHandler = (
  state: CcDesktopWindowState,
) => void;
export type CcDesktopZoomChangeHandler = (zoomFactor: number) => void;
export type CcDesktopOpenNewTabHandler = () => void;
export type CcDesktopAppCommandHandler = (command: AppCommandId) => void;
export type CcDesktopCloseWindowRequestHandler = () => boolean;

export interface CcDesktopApi extends CcDesktopInfo {
  browser: CcDesktopBrowserApi;
  checkForUpdates(): Promise<CcDesktopInfo>;
  getInfo(): Promise<CcDesktopInfo>;
  getWindowState?(): Promise<CcDesktopWindowState>;
  installUpdate(): Promise<void>;
  onChange(listener: CcDesktopInfoChangeHandler): CcDesktopInfoUnsubscribe;
  onWindowStateChange?(
    listener: CcDesktopWindowStateChangeHandler,
  ): CcDesktopInfoUnsubscribe;
  onZoomChange?(listener: CcDesktopZoomChangeHandler): CcDesktopInfoUnsubscribe;
  zoom?(command: CcDesktopZoomCommand): void;
  onOpenNewTab?(listener: CcDesktopOpenNewTabHandler): CcDesktopInfoUnsubscribe;
  onAppCommand?(listener: CcDesktopAppCommandHandler): CcDesktopInfoUnsubscribe;
  onCloseWindowRequest?(
    listener: CcDesktopCloseWindowRequestHandler,
  ): CcDesktopInfoUnsubscribe;
  openWindowFind?(request: CcDesktopWindowFindRequest): void;
  openDataDirectory?(): Promise<void>;
  openExternalUrl(url: string): void;
  openServerDaemonLogs?(): Promise<void>;
  setSplitNavigationEnabled?(
    enabled: boolean,
    directionalCommands?: readonly AppCommandId[],
  ): void;
  setTheme(theme: CcDesktopTheme): void;
}
