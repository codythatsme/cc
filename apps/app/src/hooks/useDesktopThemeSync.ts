import { useEffect } from "react";
import { getCcDesktopInfo } from "@/lib/cc-desktop";
import { useThemePreference } from "./useTheme";

export function useDesktopThemeSync(): void {
  const themePreference = useThemePreference();
  useEffect(() => {
    const desktopApi = getCcDesktopInfo();
    desktopApi?.setTheme(themePreference);
  }, [themePreference]);
}
