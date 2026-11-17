import { useEffect, useRef, useState } from "react";
import type { CcDesktopBrowserRevealRequest } from "@cc/desktop-contract";
import { getDesktopBrowserApi } from "./cc-desktop";

export function useDesktopBrowserReveal({
  threadId,
  isFocused,
  browserTabs,
  activateTab,
}: {
  threadId: string;
  isFocused: boolean;
  browserTabs: readonly { id: string }[];
  activateTab: (tabId: string) => void;
}) {
  const [pending, setPending] = useState<CcDesktopBrowserRevealRequest | null>(
    null,
  );
  const activatedRef = useRef<CcDesktopBrowserRevealRequest | null>(null);

  useEffect(() => {
    if (!isFocused) return;
    const unsubscribe = getDesktopBrowserApi()?.onReveal?.((request) => {
      if (request.threadId === threadId) setPending(request);
    });
    return () => {
      unsubscribe?.();
      setPending(null);
    };
  }, [isFocused, threadId]);

  useEffect(() => {
    if (
      !isFocused ||
      pending === null ||
      pending === activatedRef.current ||
      pending.threadId !== threadId ||
      !browserTabs.some((tab) => tab.id === pending.tabId)
    )
      return;
    activatedRef.current = pending;
    activateTab(pending.tabId);
  }, [isFocused, threadId, pending, browserTabs, activateTab]);
}
