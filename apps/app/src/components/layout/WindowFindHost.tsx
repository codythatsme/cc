import { useCallback } from "react";
import { useAppCommandHandler } from "@/components/commands/AppCommandProvider";
import { getCcDesktopInfo, readWindowFindTopOffset } from "@/lib/cc-desktop";

export function WindowFindHost() {
  const openWindowFind = useCallback((): boolean => {
    const desktop = getCcDesktopInfo();
    if (desktop?.openWindowFind === undefined) {
      return false;
    }
    desktop.openWindowFind({ topOffset: readWindowFindTopOffset() });
    return true;
  }, []);

  useAppCommandHandler("window.find", openWindowFind);

  return null;
}
