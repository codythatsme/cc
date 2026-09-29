import { useEffect, type ReactNode } from "react";
import type {
  CcDesktopApi,
  CcDesktopBrowserApi,
  CcDesktopBrowserState,
  CcDesktopInfo,
} from "@cc/desktop-contract";

const STORY_DESKTOP_INFO: CcDesktopInfo = {
  lastCheckedAt: null,
  latestVersion: null,
  pendingVersion: null,
  platform: "macos",
  updateAvailable: false,
  updateDownloaded: false,
  version: "0.0.0-story",
};

function createStoryDesktopBrowserApi(
  initialState: CcDesktopBrowserState | null,
): CcDesktopBrowserApi {
  return {
    attach() {},
    detach() {},
    navigate() {},
    goBack() {},
    goForward() {},
    reload() {},
    stop() {},
    setBounds() {},
    setVisible() {},
    onState(listener) {
      let subscribed = true;
      if (initialState !== null) {
        queueMicrotask(() => {
          if (subscribed) listener(initialState);
        });
      }
      return () => {
        subscribed = false;
      };
    },
    onOpenTab() {
      return () => {};
    },
  };
}

function createStoryDesktopApi(
  browserState: CcDesktopBrowserState | null,
): CcDesktopApi {
  return {
    ...STORY_DESKTOP_INFO,
    browser: createStoryDesktopBrowserApi(browserState),
    async checkForUpdates() {
      return STORY_DESKTOP_INFO;
    },
    async getInfo() {
      return STORY_DESKTOP_INFO;
    },
    async installUpdate() {},
    onChange() {
      return () => {};
    },
    setTheme() {},
    openExternalUrl() {},
  };
}

interface WithDesktopBrowserProps {
  browserState?: CcDesktopBrowserState | null;
  children: ReactNode;
}

export function WithDesktopBrowser({
  browserState = null,
  children,
}: WithDesktopBrowserProps) {
  if (typeof window !== "undefined" && window.ccDesktop === undefined) {
    window.ccDesktop = createStoryDesktopApi(browserState);
  }
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        delete window.ccDesktop;
      }
    };
  }, []);
  return <>{children}</>;
}
