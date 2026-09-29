import type {
  CcDesktopApi,
  CcDesktopBrowserApi,
  CcDesktopInfo,
} from "@cc/desktop-contract";

export function createNoopDesktopBrowserApi(): CcDesktopBrowserApi {
  return {
    attach() {},
    detach() {},
    navigate() {},
    goBack() {},
    goForward() {},
    reload() {},
    stop() {},
    focus() {},
    setBounds() {},
    setVisible() {},
    setVisibleWithoutFocus() {},
    onState() {
      return () => {};
    },
    onOpenTab() {
      return () => {};
    },
    onFocus() {
      return () => {};
    },
  };
}

export function createCcDesktopApi(
  info: CcDesktopInfo,
  browser: CcDesktopBrowserApi = createNoopDesktopBrowserApi(),
): CcDesktopApi {
  return {
    ...info,
    browser,
    async checkForUpdates() {
      return info;
    },
    async getInfo() {
      return info;
    },
    async installUpdate() {},
    onChange() {
      return () => {};
    },
    setTheme() {},
    openExternalUrl() {},
  };
}
