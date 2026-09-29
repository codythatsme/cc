import { BrowserWindow, ipcMain, type IpcMainEvent } from "electron";
import type { z } from "zod";
import {
  ccDesktopBrowserAttachRequestSchema,
  ccDesktopBrowserEvaluateRequestSchema,
  ccDesktopBrowserFindInPageRequestSchema,
  ccDesktopBrowserNavigateRequestSchema,
  ccDesktopBrowserSetBoundsRequestSchema,
  ccDesktopBrowserSetVisibleRequestSchema,
  ccDesktopBrowserStopFindInPageRequestSchema,
  ccDesktopBrowserTabRefSchema,
  type CcDesktopBrowserEvaluateResult,
} from "@cc/desktop-contract";
import {
  CC_DESKTOP_BROWSER_ATTACH_CHANNEL,
  CC_DESKTOP_BROWSER_DETACH_CHANNEL,
  CC_DESKTOP_BROWSER_EVALUATE_CHANNEL,
  CC_DESKTOP_BROWSER_FOCUS_CHANNEL,
  CC_DESKTOP_BROWSER_FIND_IN_PAGE_CHANNEL,
  CC_DESKTOP_BROWSER_GO_BACK_CHANNEL,
  CC_DESKTOP_BROWSER_GO_FORWARD_CHANNEL,
  CC_DESKTOP_BROWSER_NAVIGATE_CHANNEL,
  CC_DESKTOP_BROWSER_RELOAD_CHANNEL,
  CC_DESKTOP_BROWSER_SET_BOUNDS_CHANNEL,
  CC_DESKTOP_BROWSER_SET_VISIBLE_CHANNEL,
  CC_DESKTOP_BROWSER_SET_VISIBLE_WITHOUT_FOCUS_CHANNEL,
  CC_DESKTOP_BROWSER_STOP_CHANNEL,
  CC_DESKTOP_BROWSER_STOP_FIND_IN_PAGE_CHANNEL,
} from "./desktop-browser-ipc.js";
import type { DesktopBrowserViewManager } from "./desktop-browser-view.js";

function hostWindowFromBrowserIpcEvent(
  event: IpcMainEvent,
): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender);
}

function registerRequestCommand<T>(
  channel: string,
  schema: z.ZodType<T>,
  run: (args: { hostWindow: BrowserWindow; request: T }) => void,
): void {
  ipcMain.on(channel, (event, payload: unknown) => {
    const hostWindow = hostWindowFromBrowserIpcEvent(event);
    if (hostWindow === null) {
      return;
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return;
    }
    run({ hostWindow, request: parsed.data });
  });
}

export function registerDesktopBrowserIpc(
  manager: DesktopBrowserViewManager,
): void {
  registerRequestCommand(
    CC_DESKTOP_BROWSER_ATTACH_CHANNEL,
    ccDesktopBrowserAttachRequestSchema,
    (args) => manager.attach(args),
  );
  registerRequestCommand(
    CC_DESKTOP_BROWSER_NAVIGATE_CHANNEL,
    ccDesktopBrowserNavigateRequestSchema,
    (args) => manager.navigate(args),
  );
  registerRequestCommand(
    CC_DESKTOP_BROWSER_SET_BOUNDS_CHANNEL,
    ccDesktopBrowserSetBoundsRequestSchema,
    (args) => manager.setBounds(args),
  );
  registerRequestCommand(
    CC_DESKTOP_BROWSER_SET_VISIBLE_CHANNEL,
    ccDesktopBrowserSetVisibleRequestSchema,
    (args) => manager.setVisible(args),
  );
  registerRequestCommand(
    CC_DESKTOP_BROWSER_SET_VISIBLE_WITHOUT_FOCUS_CHANNEL,
    ccDesktopBrowserSetVisibleRequestSchema,
    (args) => manager.setVisibleWithoutFocus(args),
  );
  registerRequestCommand(
    CC_DESKTOP_BROWSER_FIND_IN_PAGE_CHANNEL,
    ccDesktopBrowserFindInPageRequestSchema,
    (args) => manager.findInPage(args),
  );
  registerRequestCommand(
    CC_DESKTOP_BROWSER_STOP_FIND_IN_PAGE_CHANNEL,
    ccDesktopBrowserStopFindInPageRequestSchema,
    (args) => manager.stopFindInPage(args),
  );
  registerRequestCommand(
    CC_DESKTOP_BROWSER_DETACH_CHANNEL,
    ccDesktopBrowserTabRefSchema,
    ({ hostWindow, request }) =>
      manager.detach({ hostWindow, tabId: request.tabId }),
  );
  registerRequestCommand(
    CC_DESKTOP_BROWSER_FOCUS_CHANNEL,
    ccDesktopBrowserTabRefSchema,
    ({ hostWindow, request }) =>
      manager.focus({ hostWindow, tabId: request.tabId }),
  );
  registerRequestCommand(
    CC_DESKTOP_BROWSER_GO_BACK_CHANNEL,
    ccDesktopBrowserTabRefSchema,
    ({ hostWindow, request }) =>
      manager.goBack({ hostWindow, tabId: request.tabId }),
  );
  registerRequestCommand(
    CC_DESKTOP_BROWSER_GO_FORWARD_CHANNEL,
    ccDesktopBrowserTabRefSchema,
    ({ hostWindow, request }) =>
      manager.goForward({ hostWindow, tabId: request.tabId }),
  );
  registerRequestCommand(
    CC_DESKTOP_BROWSER_RELOAD_CHANNEL,
    ccDesktopBrowserTabRefSchema,
    ({ hostWindow, request }) =>
      manager.reload({ hostWindow, tabId: request.tabId }),
  );
  registerRequestCommand(
    CC_DESKTOP_BROWSER_STOP_CHANNEL,
    ccDesktopBrowserTabRefSchema,
    ({ hostWindow, request }) =>
      manager.stop({ hostWindow, tabId: request.tabId }),
  );
  ipcMain.handle(
    CC_DESKTOP_BROWSER_EVALUATE_CHANNEL,
    async (
      event,
      payload: unknown,
    ): Promise<CcDesktopBrowserEvaluateResult> => {
      const hostWindow = BrowserWindow.fromWebContents(event.sender);
      if (hostWindow === null) {
        return { ok: false, error: "Browser host window is not available" };
      }
      const parsed = ccDesktopBrowserEvaluateRequestSchema.safeParse(payload);
      if (!parsed.success) {
        return { ok: false, error: "Invalid browser page evaluation request" };
      }
      return manager.evaluate({ hostWindow, request: parsed.data });
    },
  );
}
