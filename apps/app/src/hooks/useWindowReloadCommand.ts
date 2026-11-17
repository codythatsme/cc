import { useAppCommandHandler } from "@/components/commands/AppCommandProvider";
import { getCcDesktopInfo } from "@/lib/cc-desktop";

export function useWindowReloadCommand(): void {
  const desktopApi = getCcDesktopInfo();
  const reloadWindow = desktopApi?.reloadWindow;

  useAppCommandHandler(
    "window.reload",
    () => {
      if (reloadWindow === undefined) {
        return false;
      }
      reloadWindow.call(desktopApi);
      return true;
    },
    0,
    reloadWindow !== undefined,
  );
}
