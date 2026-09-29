import { useEffect, useState } from "react";
import type { CcDesktopWindowState } from "@cc/desktop-contract";
import {
  DEFAULT_DESKTOP_WINDOW_STATE,
  getCcDesktopInfo,
} from "@/lib/cc-desktop";

export function useDesktopWindowState(): CcDesktopWindowState {
  const [windowState, setWindowState] = useState<CcDesktopWindowState>(
    DEFAULT_DESKTOP_WINDOW_STATE,
  );

  useEffect(() => {
    const desktopApi = getCcDesktopInfo();
    let cancelled = false;

    const unsubscribe = desktopApi?.onWindowStateChange?.((nextState) => {
      setWindowState(nextState);
    });

    void desktopApi?.getWindowState?.().then((nextState) => {
      if (!cancelled) {
        setWindowState(nextState);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return windowState;
}
