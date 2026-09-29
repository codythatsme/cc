import type {
  CcDesktopInfo,
  CcDesktopInfoChangeHandler,
  CcDesktopInfoUnsubscribe,
} from "@cc/desktop-contract";

const DESKTOP_UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
export const DESKTOP_UPDATE_ACTIVE_MIN_INTERVAL_MS = 15 * 60 * 1000;

export interface DesktopUpdateService {
  checkAfterActive(): Promise<CcDesktopInfo | null>;
  checkForUpdates(): Promise<CcDesktopInfo>;
  getInfo(): CcDesktopInfo;
  start(): void;
  stop(): void;
  subscribe(listener: CcDesktopInfoChangeHandler): CcDesktopInfoUnsubscribe;
}

interface DesktopUpdateScheduler extends DesktopUpdateService {
  updateInfo(nextInfo: CcDesktopInfo): void;
}

interface CreateDesktopUpdateSchedulerArgs {
  enabled: boolean;
  initialInfo: CcDesktopInfo;
  now: () => number;
  runCheck(checkedAt: string): Promise<void>;
  shouldSkipCheck?: () => boolean;
}

function areDesktopInfoValuesEqual(
  left: CcDesktopInfo,
  right: CcDesktopInfo,
): boolean {
  return (
    left.lastCheckedAt === right.lastCheckedAt &&
    left.downloadState === right.downloadState &&
    left.latestVersion === right.latestVersion &&
    left.pendingVersion === right.pendingVersion &&
    left.platform === right.platform &&
    left.updateAvailable === right.updateAvailable &&
    left.updateDownloaded === right.updateDownloaded &&
    left.version === right.version
  );
}

export function createDesktopUpdateScheduler(
  args: CreateDesktopUpdateSchedulerArgs,
): DesktopUpdateScheduler {
  let currentInfo = args.initialInfo;
  let inflight: Promise<CcDesktopInfo> | null = null;
  let intervalHandle: ReturnType<typeof setInterval> | null = null;
  let lastAttemptedAt: number | null = null;
  const listeners = new Set<CcDesktopInfoChangeHandler>();

  function updateInfo(nextInfo: CcDesktopInfo): void {
    if (areDesktopInfoValuesEqual(currentInfo, nextInfo)) {
      return;
    }
    currentInfo = nextInfo;
    for (const listener of listeners) {
      listener(currentInfo);
    }
  }

  async function checkForUpdates(): Promise<CcDesktopInfo> {
    if (!args.enabled) {
      return currentInfo;
    }
    if (args.shouldSkipCheck?.()) {
      return currentInfo;
    }
    if (inflight !== null) {
      return inflight;
    }

    const requestPromise = (async () => {
      lastAttemptedAt = args.now();
      await args.runCheck(new Date(lastAttemptedAt).toISOString());
      return currentInfo;
    })();

    inflight = requestPromise;
    try {
      return await requestPromise;
    } finally {
      if (inflight === requestPromise) {
        inflight = null;
      }
    }
  }

  return {
    async checkAfterActive(): Promise<CcDesktopInfo | null> {
      if (!args.enabled) {
        return null;
      }
      const currentTime = args.now();
      if (
        lastAttemptedAt !== null &&
        currentTime - lastAttemptedAt < DESKTOP_UPDATE_ACTIVE_MIN_INTERVAL_MS
      ) {
        return currentInfo;
      }
      return checkForUpdates();
    },
    checkForUpdates,
    getInfo(): CcDesktopInfo {
      return currentInfo;
    },
    start(): void {
      if (!args.enabled || intervalHandle !== null) {
        return;
      }
      void checkForUpdates();
      intervalHandle = setInterval(() => {
        void checkForUpdates();
      }, DESKTOP_UPDATE_CHECK_INTERVAL_MS);
    },
    stop(): void {
      if (intervalHandle === null) {
        return;
      }
      clearInterval(intervalHandle);
      intervalHandle = null;
    },
    subscribe(listener: CcDesktopInfoChangeHandler): CcDesktopInfoUnsubscribe {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    updateInfo,
  };
}
