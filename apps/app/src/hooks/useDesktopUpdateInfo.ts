import { useEffect, useState } from "react";
import type { CcDesktopApi, CcDesktopInfo } from "@cc/desktop-contract";
import { getCcDesktopInfo } from "@/lib/cc-desktop";

interface DesktopUpdateInfo {
  desktopApi: CcDesktopApi | null;
  desktopInfo: CcDesktopInfo | null;
  isDesktop: boolean;
}

export function useDesktopUpdateInfo(): DesktopUpdateInfo {
  const [desktopApi] = useState<CcDesktopApi | null>(() => getCcDesktopInfo());
  const [desktopInfo, setDesktopInfo] = useState<CcDesktopInfo | null>(null);

  useEffect(() => {
    const api = getCcDesktopInfo();
    if (api === null) {
      return;
    }

    let mounted = true;
    void api
      .getInfo()
      .then((info) => {
        if (mounted) {
          setDesktopInfo(info);
        }
      })
      .catch(() => undefined);
    const unsubscribe = api.onChange((info) => {
      setDesktopInfo(info);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return { desktopApi, desktopInfo, isDesktop: desktopApi !== null };
}
