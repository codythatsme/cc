import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppCommandId } from "@cc/domain";
import type {
  CcDesktopApi,
  CcDesktopBrowserFindResult,
  CcDesktopBrowserOpenTabRequest,
  CcDesktopBrowserScopedOpenTabRequest,
  CcDesktopBrowserSnapshot,
  CcDesktopBrowserState,
  CcDesktopInfo,
  CcDesktopWindowState,
} from "@cc/desktop-contract";
import {
  CC_DESKTOP_CHECK_FOR_UPDATES_CHANNEL,
  CC_DESKTOP_GET_INFO_CHANNEL,
  CC_DESKTOP_INFO_CHANGED_CHANNEL,
  CC_DESKTOP_INSTALL_UPDATE_CHANNEL,
  CC_DESKTOP_SET_THEME_CHANNEL,
} from "../src/desktop-update-ipc.js";
import {
  CC_DESKTOP_BROWSER_ATTACH_CHANNEL,
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
} from "../src/desktop-browser-ipc.js";
import {
  CC_DESKTOP_APP_COMMAND_CHANNEL,
  CC_DESKTOP_CLOSE_WINDOW_REQUEST_CHANNEL,
  CC_DESKTOP_CLOSE_WINDOW_RESPONSE_CHANNEL,
  CC_DESKTOP_GET_WINDOW_STATE_CHANNEL,
  CC_DESKTOP_OPEN_NEW_TAB_CHANNEL,
  CC_DESKTOP_OPEN_SERVER_DAEMON_LOGS_CHANNEL,
  CC_DESKTOP_WINDOW_STATE_CHANGED_CHANNEL,
} from "../src/desktop-window-command-ipc.js";
const electronMock = vi.hoisted(() => {
  interface IpcRendererEvent {}

  interface SendCall {
    channel: string;
    payload: unknown;
  }

  type IpcRendererListener = (
    event: IpcRendererEvent,
    payload: unknown,
  ) => void;

  const desktopInfo: CcDesktopInfo = {
    lastCheckedAt: null,
    latestVersion: null,
    pendingVersion: null,
    platform: "macos",
    updateAvailable: false,
    updateDownloaded: false,
    version: "0.0.0-test",
  };
  const desktopWindowState: CcDesktopWindowState = {
    isFullScreen: false,
  };
  const invokeCalls: string[] = [];
  const listeners = new Map<string, IpcRendererListener>();
  const sendCalls: SendCall[] = [];
  let exposedApi: CcDesktopApi | null = null;
  let exposedName: string | null = null;
  let zoomFactor = 1;

  return {
    get exposedApi() {
      return exposedApi;
    },
    get exposedName() {
      return exposedName;
    },
    invokeCalls,
    listeners,
    sendCalls,
    reset(): void {
      exposedApi = null;
      exposedName = null;
      invokeCalls.length = 0;
      listeners.clear();
      sendCalls.length = 0;
      zoomFactor = 1;
    },
    setZoomFactor(nextZoomFactor: number): void {
      zoomFactor = nextZoomFactor;
    },
    contextBridge: {
      exposeInMainWorld(name: string, api: unknown): void {
        if (name === "ccDesktop") {
          exposedName = name;
          exposedApi = api as CcDesktopApi;
        }
      },
    },
    ipcRenderer: {
      invoke(channel: string): Promise<CcDesktopInfo | CcDesktopWindowState> {
        invokeCalls.push(channel);
        if (channel === "cc-desktop:get-window-state") {
          return Promise.resolve(desktopWindowState);
        }
        return Promise.resolve(desktopInfo);
      },
      on(channel: string, listener: IpcRendererListener): void {
        listeners.set(channel, listener);
      },
      send(channel: string, payload: unknown): void {
        sendCalls.push({ channel, payload });
      },
    },
    webFrame: {
      getZoomFactor(): number {
        return zoomFactor;
      },
    },
  };
});

vi.mock("electron", () => ({
  contextBridge: electronMock.contextBridge,
  ipcRenderer: electronMock.ipcRenderer,
  webFrame: electronMock.webFrame,
}));

interface EmitIpcPayloadArgs {
  channel: string;
  payload: unknown;
}

async function loadPreload(): Promise<CcDesktopApi> {
  electronMock.reset();
  vi.resetModules();
  process.env.CC_DESKTOP_VERSION = "0.0.0-test";
  await import("../src/preload.js");
  const api = electronMock.exposedApi;
  expect(electronMock.exposedName).toBe("ccDesktop");
  expect(api).not.toBeNull();
  if (api === null) {
    throw new Error("Expected preload to expose window.ccDesktop.");
  }
  return api;
}

function emitIpcPayload(args: EmitIpcPayloadArgs): void {
  const listener = electronMock.listeners.get(args.channel);
  expect(listener).toBeDefined();
  if (listener === undefined) {
    throw new Error(`Expected listener for ${args.channel}.`);
  }
  listener({}, args.payload);
}

describe("desktop preload browser API", () => {
  let api: CcDesktopApi;

  beforeEach(async () => {
    api = await loadPreload();
  }, 30_000);

  it("exposes only the typed browser commands and forwards them over fixed channels", async () => {
    const attachRequest = {
      threadId: "thread-1",
      existingOnly: true as const,
      tabId: "browser:a",
      url: "http://localhost:5173/",
      bounds: { x: 0, y: 0, width: 800, height: 600 },
      visible: true,
    };
    const navigateRequest = {
      tabId: "browser:a",
      url: "https://example.com/",
    };
    const boundsRequest = {
      tabId: "browser:a",
      bounds: { x: 10, y: 20, width: 300, height: 200 },
    };
    const visibleRequest = {
      tabId: "browser:a",
      visible: false,
    };
    const findRequest = {
      tabId: "browser:a",
      text: "needle",
      forward: true,
      newSession: true,
    };
    const stopFindRequest = {
      tabId: "browser:a",
      action: "clearSelection" as const,
    };

    expect(Object.keys(api.browser).sort()).toEqual([
      "attach",
      "detach",
      "evaluate",
      "findInPage",
      "focus",
      "getControl",
      "getTarget",
      "goBack",
      "goForward",
      "importCookies",
      "listImportSources",
      "navigate",
      "onControl",
      "onFindResult",
      "onFocus",
      "onOpenTab",
      "onPageMessage",
      "onReveal",
      "onScopedOpenTab",
      "onSnapshot",
      "onState",
      "openFullDiskAccessSettings",
      "releaseControl",
      "reload",
      "setBounds",
      "setVisible",
      "setVisibleWithoutFocus",
      "stop",
      "stopFindInPage",
    ]);
    expect(api.browser).not.toHaveProperty("send");
    expect(api.browser).not.toHaveProperty("invoke");

    api.browser.attach(attachRequest);
    api.browser.detach("browser:a");
    api.browser.navigate(navigateRequest);
    api.browser.goBack("browser:a");
    api.browser.goForward("browser:a");
    api.browser.reload("browser:a");
    api.browser.stop("browser:a");
    api.browser.focus?.("browser:a");
    api.browser.setBounds(boundsRequest);
    api.browser.setVisible(visibleRequest);
    api.browser.setVisibleWithoutFocus?.(visibleRequest);
    api.browser.findInPage?.(findRequest);
    api.browser.stopFindInPage?.(stopFindRequest);
    api.setTheme("dark");
    await api.checkForUpdates();
    await expect(api.getWindowState?.()).resolves.toEqual({
      isFullScreen: false,
    });
    await api.installUpdate();

    expect(electronMock.sendCalls).toEqual([
      { channel: CC_DESKTOP_BROWSER_ATTACH_CHANNEL, payload: attachRequest },
      {
        channel: CC_DESKTOP_BROWSER_DETACH_CHANNEL,
        payload: { tabId: "browser:a" },
      },
      {
        channel: CC_DESKTOP_BROWSER_NAVIGATE_CHANNEL,
        payload: navigateRequest,
      },
      {
        channel: CC_DESKTOP_BROWSER_GO_BACK_CHANNEL,
        payload: { tabId: "browser:a" },
      },
      {
        channel: CC_DESKTOP_BROWSER_GO_FORWARD_CHANNEL,
        payload: { tabId: "browser:a" },
      },
      {
        channel: CC_DESKTOP_BROWSER_RELOAD_CHANNEL,
        payload: { tabId: "browser:a" },
      },
      {
        channel: CC_DESKTOP_BROWSER_STOP_CHANNEL,
        payload: { tabId: "browser:a" },
      },
      {
        channel: CC_DESKTOP_BROWSER_FOCUS_CHANNEL,
        payload: { tabId: "browser:a" },
      },
      {
        channel: CC_DESKTOP_BROWSER_SET_BOUNDS_CHANNEL,
        payload: boundsRequest,
      },
      {
        channel: CC_DESKTOP_BROWSER_SET_VISIBLE_CHANNEL,
        payload: visibleRequest,
      },
      {
        channel: CC_DESKTOP_BROWSER_SET_VISIBLE_WITHOUT_FOCUS_CHANNEL,
        payload: visibleRequest,
      },
      {
        channel: CC_DESKTOP_BROWSER_FIND_IN_PAGE_CHANNEL,
        payload: findRequest,
      },
      {
        channel: CC_DESKTOP_BROWSER_STOP_FIND_IN_PAGE_CHANNEL,
        payload: stopFindRequest,
      },
      { channel: CC_DESKTOP_SET_THEME_CHANNEL, payload: "dark" },
    ]);
    expect(electronMock.invokeCalls).toContain(CC_DESKTOP_GET_INFO_CHANNEL);
    expect(electronMock.invokeCalls).toContain(
      CC_DESKTOP_CHECK_FOR_UPDATES_CHANNEL,
    );
    expect(electronMock.invokeCalls).toContain(
      CC_DESKTOP_GET_WINDOW_STATE_CHANNEL,
    );
    expect(electronMock.invokeCalls).toContain(
      CC_DESKTOP_INSTALL_UPDATE_CHANNEL,
    );
  }, 10_000);

  it("converts zoomed renderer bounds to native window coordinates", () => {
    electronMock.setZoomFactor(1.25);

    api.browser.attach({
      threadId: "thread-1",
      tabId: "browser:zoomed",
      url: "https://example.com/",
      bounds: { x: 800, y: 40, width: 400, height: 600 },
      visible: false,
    });
    api.browser.setBounds({
      tabId: "browser:zoomed",
      bounds: { x: 801, y: 41, width: 399, height: 599 },
    });

    expect(electronMock.sendCalls).toEqual([
      {
        channel: CC_DESKTOP_BROWSER_ATTACH_CHANNEL,
        payload: {
          threadId: "thread-1",
          tabId: "browser:zoomed",
          url: "https://example.com/",
          bounds: { x: 1000, y: 50, width: 500, height: 750 },
          visible: false,
        },
      },
      {
        channel: CC_DESKTOP_BROWSER_SET_BOUNDS_CHANNEL,
        payload: {
          tabId: "browser:zoomed",
          bounds: { x: 1001, y: 51, width: 499, height: 749 },
        },
      },
    ]);
  });

  it("validates browser event payloads before notifying renderer listeners", () => {
    const states: CcDesktopBrowserState[] = [];
    const openTabs: CcDesktopBrowserOpenTabRequest[] = [];
    const scopedOpenTabs: CcDesktopBrowserScopedOpenTabRequest[] = [];
    const focusedTabs: string[] = [];
    const snapshots: CcDesktopBrowserSnapshot[] = [];
    const findResults: CcDesktopBrowserFindResult[] = [];
    let closeWindowRequestCount = 0;
    let openNewTabCount = 0;
    const appCommands: AppCommandId[] = [];
    const windowStates: CcDesktopWindowState[] = [];
    const state: CcDesktopBrowserState = {
      tabId: "browser:a",
      url: "https://example.com/",
      title: "Example",
      isLoading: false,
      canGoBack: false,
      canGoForward: true,
      errorText: null,
    };
    const openTab: CcDesktopBrowserOpenTabRequest = {
      url: "https://example.com/popup",
    };
    const scopedOpenTab: CcDesktopBrowserScopedOpenTabRequest = {
      tabId: "browser:a",
      url: "https://example.com/scoped-popup",
    };
    const snapshot: CcDesktopBrowserSnapshot = {
      tabId: "browser:a",
      dataUrl: null,
    };
    const findResult: CcDesktopBrowserFindResult = {
      tabId: "browser:a",
      requestId: 3,
      activeMatchOrdinal: 1,
      matches: 4,
      finalUpdate: true,
    };

    api.browser.onState((nextState) => {
      states.push(nextState);
    });
    api.browser.onOpenTab((request) => {
      openTabs.push(request);
    });
    api.browser.onScopedOpenTab?.((request) => {
      scopedOpenTabs.push(request);
    });
    api.browser.onFocus?.((tabId) => {
      focusedTabs.push(tabId);
    });
    api.browser.onSnapshot?.((nextSnapshot) => {
      snapshots.push(nextSnapshot);
    });
    api.browser.onFindResult?.((result) => {
      findResults.push(result);
    });
    api.onOpenNewTab?.(() => {
      openNewTabCount += 1;
    });
    api.onAppCommand?.((command) => {
      appCommands.push(command);
    });
    api.onCloseWindowRequest?.(() => {
      closeWindowRequestCount += 1;
      return true;
    });
    api.onWindowStateChange?.((windowState) => {
      windowStates.push(windowState);
    });

    emitIpcPayload({
      channel: CC_DESKTOP_BROWSER_STATE_CHANNEL,
      payload: { ...state, extra: true },
    });
    emitIpcPayload({
      channel: CC_DESKTOP_BROWSER_OPEN_TAB_CHANNEL,
      payload: { url: "" },
    });
    emitIpcPayload({
      channel: CC_DESKTOP_BROWSER_SCOPED_OPEN_TAB_CHANNEL,
      payload: { tabId: "", url: "https://example.com/scoped-popup" },
    });
    emitIpcPayload({
      channel: CC_DESKTOP_BROWSER_FOCUSED_CHANNEL,
      payload: { tabId: "", extra: true },
    });
    emitIpcPayload({
      channel: CC_DESKTOP_BROWSER_SNAPSHOT_CHANNEL,
      payload: { tabId: "browser:a", dataUrl: 42 },
    });
    emitIpcPayload({
      channel: CC_DESKTOP_BROWSER_FIND_RESULT_CHANNEL,
      payload: { ...findResult, matches: -1 },
    });
    emitIpcPayload({
      channel: CC_DESKTOP_BROWSER_FIND_RESULT_CHANNEL,
      payload: { ...findResult, selectionArea: {} },
    });
    emitIpcPayload({
      channel: CC_DESKTOP_WINDOW_STATE_CHANGED_CHANNEL,
      payload: { isFullScreen: false, extra: true },
    });
    emitIpcPayload({
      channel: CC_DESKTOP_BROWSER_STATE_CHANNEL,
      payload: state,
    });
    emitIpcPayload({
      channel: CC_DESKTOP_BROWSER_OPEN_TAB_CHANNEL,
      payload: openTab,
    });
    emitIpcPayload({
      channel: CC_DESKTOP_BROWSER_SCOPED_OPEN_TAB_CHANNEL,
      payload: scopedOpenTab,
    });
    emitIpcPayload({
      channel: CC_DESKTOP_BROWSER_FOCUSED_CHANNEL,
      payload: { tabId: "browser:a" },
    });
    emitIpcPayload({
      channel: CC_DESKTOP_BROWSER_SNAPSHOT_CHANNEL,
      payload: snapshot,
    });
    emitIpcPayload({
      channel: CC_DESKTOP_BROWSER_FIND_RESULT_CHANNEL,
      payload: findResult,
    });
    emitIpcPayload({
      channel: CC_DESKTOP_WINDOW_STATE_CHANGED_CHANNEL,
      payload: { isFullScreen: true },
    });
    emitIpcPayload({
      channel: CC_DESKTOP_OPEN_NEW_TAB_CHANNEL,
      payload: null,
    });
    emitIpcPayload({
      channel: CC_DESKTOP_APP_COMMAND_CHANNEL,
      payload: "not-a-command",
    });
    emitIpcPayload({
      channel: CC_DESKTOP_APP_COMMAND_CHANNEL,
      payload: "thread.new",
    });
    emitIpcPayload({
      channel: CC_DESKTOP_CLOSE_WINDOW_REQUEST_CHANNEL,
      payload: null,
    });

    expect(states).toEqual([state]);
    expect(openTabs).toEqual([openTab]);
    expect(scopedOpenTabs).toEqual([scopedOpenTab]);
    expect(focusedTabs).toEqual(["browser:a"]);
    expect(snapshots).toEqual([snapshot]);
    expect(findResults).toEqual([findResult]);
    expect(windowStates).toEqual([{ isFullScreen: true }]);
    expect(closeWindowRequestCount).toBe(1);
    expect(openNewTabCount).toBe(1);
    expect(appCommands).toEqual(["thread.new"]);
    expect(electronMock.sendCalls).toContainEqual({
      channel: CC_DESKTOP_CLOSE_WINDOW_RESPONSE_CHANNEL,
      payload: true,
    });
  });

  it("routes the log viewer request to main and mirrors its availability", async () => {
    await api.openServerDaemonLogs?.();
    expect(electronMock.invokeCalls).toContain(
      CC_DESKTOP_OPEN_SERVER_DAEMON_LOGS_CHANNEL,
    );

    expect(api.serverDaemonLogsAvailable).toBeUndefined();
    emitIpcPayload({
      channel: CC_DESKTOP_INFO_CHANGED_CHANNEL,
      payload: {
        lastCheckedAt: null,
        latestVersion: null,
        pendingVersion: null,
        platform: "macos",
        serverDaemonLogsAvailable: true,
        updateAvailable: false,
        updateDownloaded: false,
        version: "0.0.0-test",
      },
    });
    expect(api.serverDaemonLogsAvailable).toBe(true);
  });

  it("answers unhandled close-window requests so main closes the window", () => {
    emitIpcPayload({
      channel: CC_DESKTOP_CLOSE_WINDOW_REQUEST_CHANNEL,
      payload: null,
    });

    expect(electronMock.sendCalls).toContainEqual({
      channel: CC_DESKTOP_CLOSE_WINDOW_RESPONSE_CHANNEL,
      payload: false,
    });
  });
});
