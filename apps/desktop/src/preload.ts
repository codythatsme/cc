import { contextBridge, ipcRenderer, webFrame } from "electron";
import { appCommandIdSchema, type AppCommandId } from "@cc/domain";
import {
  desktopBrowserImportOutcomeSchema,
  desktopBrowserImportSourceSchema,
} from "@cc/host-daemon-contract";
import { z } from "zod";
import {
  ccDesktopBrowserEvaluateResultSchema,
  ccDesktopBrowserFindResultSchema,
  ccDesktopBrowserOpenTabRequestSchema,
  ccDesktopBrowserPageMessageSchema,
  ccDesktopBrowserScopedOpenTabRequestSchema,
  ccDesktopBrowserTabRefSchema,
  ccDesktopBrowserSnapshotSchema,
  ccDesktopBrowserStateSchema,
  ccDesktopBrowserTargetSchema,
  ccDesktopBrowserControlStateSchema,
  ccDesktopBrowserRevealRequestSchema,
  type CcDesktopBrowserControlState,
  type CcDesktopBrowserRevealRequest,
  ccDesktopInfoSchema,
  ccDesktopWindowStateSchema,
  type CcDesktopApi,
  type CcDesktopAppCommandHandler,
  type CcDesktopBrowserApi,
  type CcDesktopBrowserFindResultHandler,
  type CcDesktopWindowFindRequest,
  type CcDesktopBrowserPageMessageHandler,
  type CcDesktopBrowserOpenTabHandler,
  type CcDesktopBrowserScopedOpenTabHandler,
  type CcDesktopBrowserFocusHandler,
  type CcDesktopBrowserSnapshotHandler,
  type CcDesktopBrowserStateHandler,
  type CcDesktopBrowserUnsubscribe,
  type CcDesktopBrowserViewBounds,
  type CcDesktopCloseWindowRequestHandler,
  type CcDesktopInfo,
  type CcDesktopInfoChangeHandler,
  type CcDesktopInfoUnsubscribe,
  type CcDesktopOpenNewTabHandler,
  type CcDesktopTheme,
  type CcDesktopWindowState,
  type CcDesktopWindowStateChangeHandler,
  type CcDesktopZoomChangeHandler,
} from "@cc/desktop-contract";
import {
  CC_DESKTOP_CHECK_FOR_UPDATES_CHANNEL,
  CC_DESKTOP_GET_INFO_CHANNEL,
  CC_DESKTOP_INFO_CHANGED_CHANNEL,
  CC_DESKTOP_INSTALL_UPDATE_CHANNEL,
  CC_DESKTOP_OPEN_EXTERNAL_URL_CHANNEL,
  CC_DESKTOP_SET_THEME_CHANNEL,
  CC_DESKTOP_ZOOM_COMMAND_CHANNEL,
} from "./desktop-update-ipc.js";
import {
  CC_DESKTOP_BROWSER_ATTACH_CHANNEL,
  CC_DESKTOP_BROWSER_TARGET_CHANNEL,
  CC_DESKTOP_BROWSER_GET_CONTROL_CHANNEL,
  CC_DESKTOP_BROWSER_CONTROL_CHANNEL,
  CC_DESKTOP_BROWSER_RELEASE_CONTROL_CHANNEL,
  CC_DESKTOP_BROWSER_REVEAL_CHANNEL,
  CC_DESKTOP_BROWSER_DETACH_CHANNEL,
  CC_DESKTOP_BROWSER_FOCUS_CHANNEL,
  CC_DESKTOP_BROWSER_FOCUSED_CHANNEL,
  CC_DESKTOP_BROWSER_FIND_IN_PAGE_CHANNEL,
  CC_DESKTOP_BROWSER_FIND_RESULT_CHANNEL,
  CC_DESKTOP_BROWSER_GO_BACK_CHANNEL,
  CC_DESKTOP_BROWSER_GO_FORWARD_CHANNEL,
  CC_DESKTOP_BROWSER_NAVIGATE_CHANNEL,
  CC_DESKTOP_BROWSER_OPEN_TAB_CHANNEL,
  CC_DESKTOP_BROWSER_RELOAD_CHANNEL,
  CC_DESKTOP_BROWSER_SCOPED_OPEN_TAB_CHANNEL,
  CC_DESKTOP_BROWSER_SET_BOUNDS_CHANNEL,
  CC_DESKTOP_BROWSER_SET_VISIBLE_CHANNEL,
  CC_DESKTOP_BROWSER_SET_VISIBLE_WITHOUT_FOCUS_CHANNEL,
  CC_DESKTOP_BROWSER_SNAPSHOT_CHANNEL,
  CC_DESKTOP_BROWSER_STATE_CHANNEL,
  CC_DESKTOP_BROWSER_STOP_CHANNEL,
  CC_DESKTOP_BROWSER_STOP_FIND_IN_PAGE_CHANNEL,
  CC_DESKTOP_BROWSER_LIST_IMPORT_SOURCES_CHANNEL,
  CC_DESKTOP_BROWSER_IMPORT_COOKIES_CHANNEL,
  CC_DESKTOP_BROWSER_OPEN_FULL_DISK_ACCESS_SETTINGS_CHANNEL,
  CC_DESKTOP_BROWSER_EVALUATE_CHANNEL,
  CC_DESKTOP_BROWSER_PAGE_MESSAGE_CHANNEL,
} from "./desktop-browser-ipc.js";
import {
  CC_DESKTOP_APP_COMMAND_CHANNEL,
  CC_DESKTOP_OPEN_WINDOW_FIND_CHANNEL,
  CC_DESKTOP_SET_SPLIT_NAVIGATION_ENABLED_CHANNEL,
  CC_DESKTOP_CLOSE_WINDOW_REQUEST_CHANNEL,
  CC_DESKTOP_CLOSE_WINDOW_RESPONSE_CHANNEL,
  CC_DESKTOP_GET_WINDOW_STATE_CHANNEL,
  CC_DESKTOP_OPEN_NEW_TAB_CHANNEL,
  CC_DESKTOP_OPEN_DATA_DIRECTORY_CHANNEL,
  CC_DESKTOP_OPEN_SERVER_DAEMON_LOGS_CHANNEL,
  CC_DESKTOP_WINDOW_STATE_CHANGED_CHANNEL,
} from "./desktop-window-command-ipc.js";
import {
  getDesktopVersion,
  resolveCcDesktopPlatform,
} from "./desktop-platform.js";
import { STARTUP_ACTION_CHANNEL } from "./local-view.js";

function createInitialDesktopInfo(): CcDesktopInfo {
  return {
    downloadState: "idle",
    lastCheckedAt: null,
    latestVersion: null,
    pendingVersion: null,
    platform: resolveCcDesktopPlatform(process.platform),
    updateAvailable: false,
    updateDownloaded: false,
    version: getDesktopVersion(process.env.CC_DESKTOP_VERSION),
  };
}

function createInitialDesktopWindowState(): CcDesktopWindowState {
  return {
    isFullScreen: false,
  };
}

const listeners = new Set<CcDesktopInfoChangeHandler>();
const appCommandListeners = new Set<CcDesktopAppCommandHandler>();
const windowStateListeners = new Set<CcDesktopWindowStateChangeHandler>();
let currentInfo = createInitialDesktopInfo();
let currentWindowState = createInitialDesktopWindowState();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener(currentInfo);
  }
}

function notifyWindowStateListeners(): void {
  for (const listener of windowStateListeners) {
    listener(currentWindowState);
  }
}

function applyDesktopInfoPayload(payload: unknown): CcDesktopInfo | null {
  const parsed = ccDesktopInfoSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }
  currentInfo = parsed.data;
  notifyListeners();
  return currentInfo;
}

function applyDesktopWindowStatePayload(
  payload: unknown,
): CcDesktopWindowState | null {
  const parsed = ccDesktopWindowStateSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }
  currentWindowState = parsed.data;
  notifyWindowStateListeners();
  return currentWindowState;
}

async function invokeDesktopInfo(channel: string): Promise<CcDesktopInfo> {
  try {
    const payload: unknown = await ipcRenderer.invoke(channel);
    return applyDesktopInfoPayload(payload) ?? currentInfo;
  } catch {
    return currentInfo;
  }
}

async function invokeDesktopWindowState(): Promise<CcDesktopWindowState> {
  try {
    const payload: unknown = await ipcRenderer.invoke(
      CC_DESKTOP_GET_WINDOW_STATE_CHANNEL,
    );
    return applyDesktopWindowStatePayload(payload) ?? currentWindowState;
  } catch {
    return currentWindowState;
  }
}

async function invokeInstallUpdate(): Promise<void> {
  try {
    await ipcRenderer.invoke(CC_DESKTOP_INSTALL_UPDATE_CHANNEL);
  } catch {
    return;
  }
}

const browserStateListeners = new Set<CcDesktopBrowserStateHandler>();
const browserControlListeners = new Set<
  (state: CcDesktopBrowserControlState) => void
>();
const browserRevealListeners = new Set<
  (request: CcDesktopBrowserRevealRequest) => void
>();
const browserOpenTabListeners = new Set<CcDesktopBrowserOpenTabHandler>();
const browserScopedOpenTabListeners =
  new Set<CcDesktopBrowserScopedOpenTabHandler>();
const browserFocusListeners = new Set<CcDesktopBrowserFocusHandler>();
const browserPageMessageListeners =
  new Set<CcDesktopBrowserPageMessageHandler>();
const browserSnapshotListeners = new Set<CcDesktopBrowserSnapshotHandler>();
const browserFindResultListeners = new Set<CcDesktopBrowserFindResultHandler>();
const closeWindowRequestListeners =
  new Set<CcDesktopCloseWindowRequestHandler>();
const openNewTabListeners = new Set<CcDesktopOpenNewTabHandler>();
const zoomListeners = new Set<CcDesktopZoomChangeHandler>();
let lastZoomFactor = webFrame.getZoomFactor();

function notifyZoomChangeIfChanged(): void {
  const zoomFactor = webFrame.getZoomFactor();
  if (zoomFactor === lastZoomFactor) {
    return;
  }
  lastZoomFactor = zoomFactor;
  for (const listener of zoomListeners) {
    listener(zoomFactor);
  }
}

function addListener<T>(listeners: Set<T>, listener: T): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function forwardParsed<T>(
  channel: string,
  schema: z.ZodType<T>,
  listeners: Set<(value: T) => void>,
): void {
  ipcRenderer.on(channel, (_event, payload: unknown) => {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return;
    }
    for (const listener of listeners) {
      listener(parsed.data);
    }
  });
}

function browserViewBoundsAtWindowScale(
  bounds: CcDesktopBrowserViewBounds,
): CcDesktopBrowserViewBounds {
  const zoomFactor = webFrame.getZoomFactor();
  if (zoomFactor === 1) {
    return bounds;
  }
  const x = Math.round(bounds.x * zoomFactor);
  const y = Math.round(bounds.y * zoomFactor);
  return {
    x,
    y,
    width: Math.max(0, Math.round((bounds.x + bounds.width) * zoomFactor) - x),
    height: Math.max(
      0,
      Math.round((bounds.y + bounds.height) * zoomFactor) - y,
    ),
  };
}

const ccBrowserApi: CcDesktopBrowserApi = {
  async getTarget() {
    return ccDesktopBrowserTargetSchema
      .nullable()
      .parse(await ipcRenderer.invoke(CC_DESKTOP_BROWSER_TARGET_CHANNEL));
  },
  async getControl(tabId) {
    return ccDesktopBrowserControlStateSchema.nullable().parse(
      await ipcRenderer.invoke(CC_DESKTOP_BROWSER_GET_CONTROL_CHANNEL, {
        tabId,
      }),
    );
  },
  releaseControl(tabId) {
    ipcRenderer.send(CC_DESKTOP_BROWSER_RELEASE_CONTROL_CHANNEL, { tabId });
  },
  onControl(listener) {
    return addListener(browserControlListeners, listener);
  },
  onReveal(listener) {
    return addListener(browserRevealListeners, listener);
  },
  async evaluate(request) {
    return ccDesktopBrowserEvaluateResultSchema.parse(
      await ipcRenderer.invoke(CC_DESKTOP_BROWSER_EVALUATE_CHANNEL, request),
    );
  },
  onPageMessage(listener) {
    return addListener(browserPageMessageListeners, listener);
  },
  attach(request): void {
    ipcRenderer.send(CC_DESKTOP_BROWSER_ATTACH_CHANNEL, {
      ...request,
      bounds: browserViewBoundsAtWindowScale(request.bounds),
    });
  },
  detach(tabId): void {
    ipcRenderer.send(CC_DESKTOP_BROWSER_DETACH_CHANNEL, { tabId });
  },
  navigate(request): void {
    ipcRenderer.send(CC_DESKTOP_BROWSER_NAVIGATE_CHANNEL, request);
  },
  goBack(tabId): void {
    ipcRenderer.send(CC_DESKTOP_BROWSER_GO_BACK_CHANNEL, { tabId });
  },
  goForward(tabId): void {
    ipcRenderer.send(CC_DESKTOP_BROWSER_GO_FORWARD_CHANNEL, { tabId });
  },
  reload(tabId): void {
    ipcRenderer.send(CC_DESKTOP_BROWSER_RELOAD_CHANNEL, { tabId });
  },
  stop(tabId): void {
    ipcRenderer.send(CC_DESKTOP_BROWSER_STOP_CHANNEL, { tabId });
  },
  focus(tabId): void {
    ipcRenderer.send(CC_DESKTOP_BROWSER_FOCUS_CHANNEL, { tabId });
  },
  setBounds(request): void {
    ipcRenderer.send(CC_DESKTOP_BROWSER_SET_BOUNDS_CHANNEL, {
      ...request,
      bounds: browserViewBoundsAtWindowScale(request.bounds),
    });
  },
  setVisible(request): void {
    ipcRenderer.send(CC_DESKTOP_BROWSER_SET_VISIBLE_CHANNEL, request);
  },
  setVisibleWithoutFocus(request): void {
    ipcRenderer.send(
      CC_DESKTOP_BROWSER_SET_VISIBLE_WITHOUT_FOCUS_CHANNEL,
      request,
    );
  },
  onState(listener): CcDesktopBrowserUnsubscribe {
    return addListener(browserStateListeners, listener);
  },
  onOpenTab(listener): CcDesktopBrowserUnsubscribe {
    return addListener(browserOpenTabListeners, listener);
  },
  onScopedOpenTab(listener): CcDesktopBrowserUnsubscribe {
    return addListener(browserScopedOpenTabListeners, listener);
  },
  onFocus(listener): CcDesktopBrowserUnsubscribe {
    return addListener(browserFocusListeners, listener);
  },
  onSnapshot(listener): CcDesktopBrowserUnsubscribe {
    return addListener(browserSnapshotListeners, listener);
  },
  findInPage(request): void {
    ipcRenderer.send(CC_DESKTOP_BROWSER_FIND_IN_PAGE_CHANNEL, request);
  },
  stopFindInPage(request): void {
    ipcRenderer.send(CC_DESKTOP_BROWSER_STOP_FIND_IN_PAGE_CHANNEL, request);
  },
  onFindResult(listener): CcDesktopBrowserUnsubscribe {
    return addListener(browserFindResultListeners, listener);
  },
  async listImportSources() {
    const payload: unknown = await ipcRenderer.invoke(
      CC_DESKTOP_BROWSER_LIST_IMPORT_SOURCES_CHANNEL,
    );
    return z
      .object({ sources: z.array(desktopBrowserImportSourceSchema) })
      .parse(payload);
  },
  async importCookies(request) {
    const payload: unknown = await ipcRenderer.invoke(
      CC_DESKTOP_BROWSER_IMPORT_COOKIES_CHANNEL,
      request,
    );
    return desktopBrowserImportOutcomeSchema.parse(payload);
  },
  openFullDiskAccessSettings() {
    ipcRenderer.send(CC_DESKTOP_BROWSER_OPEN_FULL_DISK_ACCESS_SETTINGS_CHANNEL);
  },
};

const ccDesktopApi: CcDesktopApi = {
  browser: ccBrowserApi,
  get lastCheckedAt() {
    return currentInfo.lastCheckedAt;
  },
  get latestVersion() {
    return currentInfo.latestVersion;
  },
  get pendingVersion() {
    return currentInfo.pendingVersion;
  },
  platform: resolveCcDesktopPlatform(process.platform),
  get serverDaemonLogsAvailable() {
    return currentInfo.serverDaemonLogsAvailable;
  },
  get updateAvailable() {
    return currentInfo.updateAvailable;
  },
  get updateDownloaded() {
    return currentInfo.updateDownloaded;
  },
  version: currentInfo.version,
  checkForUpdates() {
    return invokeDesktopInfo(CC_DESKTOP_CHECK_FOR_UPDATES_CHANNEL);
  },
  getInfo() {
    return invokeDesktopInfo(CC_DESKTOP_GET_INFO_CHANNEL);
  },
  getWindowState() {
    return invokeDesktopWindowState();
  },
  installUpdate() {
    return invokeInstallUpdate();
  },
  onChange(listener: CcDesktopInfoChangeHandler): CcDesktopInfoUnsubscribe {
    return addListener(listeners, listener);
  },
  onWindowStateChange(
    listener: CcDesktopWindowStateChangeHandler,
  ): CcDesktopInfoUnsubscribe {
    return addListener(windowStateListeners, listener);
  },
  onZoomChange(listener): CcDesktopInfoUnsubscribe {
    return addListener(zoomListeners, listener);
  },
  zoom(command): void {
    ipcRenderer.send(CC_DESKTOP_ZOOM_COMMAND_CHANNEL, command);
  },
  onOpenNewTab(listener): CcDesktopInfoUnsubscribe {
    return addListener(openNewTabListeners, listener);
  },
  onAppCommand(listener): CcDesktopInfoUnsubscribe {
    return addListener(appCommandListeners, listener);
  },
  onCloseWindowRequest(listener): CcDesktopInfoUnsubscribe {
    return addListener(closeWindowRequestListeners, listener);
  },
  openWindowFind(request): void {
    ipcRenderer.send(CC_DESKTOP_OPEN_WINDOW_FIND_CHANNEL, {
      topOffset: Math.round(request.topOffset * webFrame.getZoomFactor()),
    } satisfies CcDesktopWindowFindRequest);
  },
  async openDataDirectory(): Promise<void> {
    await ipcRenderer.invoke(CC_DESKTOP_OPEN_DATA_DIRECTORY_CHANNEL);
  },
  openExternalUrl(url: string): void {
    ipcRenderer.send(CC_DESKTOP_OPEN_EXTERNAL_URL_CHANNEL, url);
  },
  async openServerDaemonLogs(): Promise<void> {
    await ipcRenderer.invoke(CC_DESKTOP_OPEN_SERVER_DAEMON_LOGS_CHANNEL);
  },
  setSplitNavigationEnabled(
    enabled: boolean,
    directionalCommands?: readonly AppCommandId[],
  ): void {
    ipcRenderer.send(
      CC_DESKTOP_SET_SPLIT_NAVIGATION_ENABLED_CHANNEL,
      enabled,
      directionalCommands,
    );
  },
  setTheme(theme: CcDesktopTheme): void {
    ipcRenderer.send(CC_DESKTOP_SET_THEME_CHANNEL, theme);
  },
};

ipcRenderer.on(CC_DESKTOP_INFO_CHANGED_CHANNEL, (_event, payload: unknown) => {
  applyDesktopInfoPayload(payload);
});

ipcRenderer.on(
  CC_DESKTOP_WINDOW_STATE_CHANGED_CHANNEL,
  (_event, payload: unknown) => {
    applyDesktopWindowStatePayload(payload);
  },
);

ipcRenderer.on(CC_DESKTOP_OPEN_NEW_TAB_CHANNEL, () => {
  for (const listener of openNewTabListeners) {
    listener();
  }
});

forwardParsed(
  CC_DESKTOP_APP_COMMAND_CHANNEL,
  appCommandIdSchema,
  appCommandListeners,
);

ipcRenderer.on(CC_DESKTOP_CLOSE_WINDOW_REQUEST_CHANNEL, () => {
  let handled = false;
  for (const listener of closeWindowRequestListeners) {
    handled = listener() || handled;
  }
  ipcRenderer.send(CC_DESKTOP_CLOSE_WINDOW_RESPONSE_CHANNEL, handled);
});

forwardParsed(
  CC_DESKTOP_BROWSER_STATE_CHANNEL,
  ccDesktopBrowserStateSchema,
  browserStateListeners,
);

forwardParsed(
  CC_DESKTOP_BROWSER_CONTROL_CHANNEL,
  ccDesktopBrowserControlStateSchema,
  browserControlListeners,
);

forwardParsed(
  CC_DESKTOP_BROWSER_REVEAL_CHANNEL,
  ccDesktopBrowserRevealRequestSchema,
  browserRevealListeners,
);

ipcRenderer.on(
  CC_DESKTOP_BROWSER_FOCUSED_CHANNEL,
  (_event, payload: unknown) => {
    const parsed = ccDesktopBrowserTabRefSchema.safeParse(payload);
    if (!parsed.success) {
      return;
    }
    for (const listener of browserFocusListeners) {
      listener(parsed.data.tabId);
    }
  },
);

forwardParsed(
  CC_DESKTOP_BROWSER_OPEN_TAB_CHANNEL,
  ccDesktopBrowserOpenTabRequestSchema,
  browserOpenTabListeners,
);

forwardParsed(
  CC_DESKTOP_BROWSER_SCOPED_OPEN_TAB_CHANNEL,
  ccDesktopBrowserScopedOpenTabRequestSchema,
  browserScopedOpenTabListeners,
);

forwardParsed(
  CC_DESKTOP_BROWSER_SNAPSHOT_CHANNEL,
  ccDesktopBrowserSnapshotSchema,
  browserSnapshotListeners,
);

forwardParsed(
  CC_DESKTOP_BROWSER_PAGE_MESSAGE_CHANNEL,
  ccDesktopBrowserPageMessageSchema,
  browserPageMessageListeners,
);

forwardParsed(
  CC_DESKTOP_BROWSER_FIND_RESULT_CHANNEL,
  ccDesktopBrowserFindResultSchema,
  browserFindResultListeners,
);

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("resize", notifyZoomChangeIfChanged);
  window.addEventListener("DOMContentLoaded", () => {
    for (const button of document.querySelectorAll<HTMLElement>(
      "[data-startup-action]",
    )) {
      button.addEventListener("click", () => {
        ipcRenderer.send(STARTUP_ACTION_CHANNEL, button.dataset.startupAction);
      });
    }
  });
}

void invokeDesktopInfo(CC_DESKTOP_GET_INFO_CHANNEL);
void invokeDesktopWindowState();

contextBridge.exposeInMainWorld("ccDesktop", ccDesktopApi);
