import type { CcDesktopApi } from "@cc/desktop-contract";

declare global {
  interface Window {
    ccDesktop?: CcDesktopApi;
  }
}

export {};
