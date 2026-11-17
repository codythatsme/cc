import { createStorage } from "./storage.js";
import type { CcPluginApi } from "@codythatsme/plugin-sdk";
import { storageRpc, type Policy } from "./contract.js";
import { createService } from "./service.js";
import { registerCli } from "./cli.js";

export default function plugin(cc: CcPluginApi) {
  const service = createService(cc);
  const devCleanupEnabled = async () =>
    (await service.state()).policy.deleteDevDataOnCheckoutRemoval;
  const cleanupEnabled = async () =>
    (await service.state()).policy.deleteStorageOnArchive;
  const storage = createStorage(cc, devCleanupEnabled, cleanupEnabled);
  const configure = async (policy: Policy) => {
    const before = (await service.state()).policy.deleteStorageOnArchive;
    const state = await service.configure(policy);
    if (!before && state.policy.deleteStorageOnArchive)
      void storage.backfillArchivedStorage();
    return state;
  };
  cc.events.on("experimental_environment.removed", ({ removal }) =>
    removal.hostId === null
      ? undefined
      : storage.cleanDevelopmentStorage(removal.hostId),
  );
  cc.background.schedule(
    "development-storage-cleanup",
    "0 * * * *",
    storage.reconcileDevelopmentStorage,
  );
  cc.background.service("development-storage-recovery", {
    async start(signal) {
      if (signal.aborted) return;
      const unsubscribe = cc.sdk.subscribe({
        event: "host:changed",
        callback: (event) => {
          if (event.changes.includes("host-connected"))
            void (event.id === undefined
              ? storage.reconcileDevelopmentStorage()
              : storage.reconcileHostDevelopmentStorage(event.id));
          if (
            event.changes.includes("host-connected") ||
            event.changes.includes("host-disconnected")
          )
            cc.realtime.publish("changed", null);
        },
      });
      const unsubscribeConnection = cc.sdk.subscribe({
        event: "realtime:connection",
        callback: (event) => {
          if (event.state === "connected" && event.reconnected)
            void storage.reconcileDevelopmentStorage();
        },
      });
      try {
        await storage.reconcileDevelopmentStorage();
        await new Promise<void>((resolve) => {
          if (signal.aborted) resolve();
          else
            signal.addEventListener("abort", () => resolve(), { once: true });
        });
      } finally {
        unsubscribe();
        unsubscribeConnection();
      }
    },
  });
  cc.events.on("thread.archived", async ({ thread }) => {
    if (
      thread.archivedAt === null ||
      thread.pinnedAt !== null ||
      !(await cleanupEnabled())
    )
      return;
    storage.queueArchivedStorage(thread.id, thread.archivedAt);
    await storage.clearPendingArchives(cleanupEnabled);
  });
  for (const event of ["thread.idle", "thread.failed"] as const)
    cc.events.on(event, () => storage.clearPendingArchives(cleanupEnabled));
  for (const event of ["thread.unarchived", "thread.deleted"] as const)
    cc.events.on(event, ({ thread }) =>
      storage.cancelArchivedStorage(thread.id),
    );
  cc.background.schedule("archive-storage-cleanup", "* * * * *", () =>
    storage.clearPendingArchives(cleanupEnabled),
  );
  cc.rpc.register(storageRpc, {
    startEntryCleanup: storage.startEntryCleanup,
    startCleanup: storage.startCleanup,
    hosts: () => storage.hosts(),
    host: storage.host,
    scanHost: storage.scanHost,
    scanAll: () => storage.scanAll(),
    removeOrphans: (input) => storage.removeOrphans(input),
    clearLargeFiles: storage.clearLargeFiles,
    startClearLargeFiles: storage.startClearLargeFiles,
    retryWorktreeCleanup: (input) =>
      storage.retryWorktreeCleanup({ ...input, interruptedOnly: false }),
    clearThread: storage.clearThread,
    clearArchivedFiles: storage.clearArchivedFiles,
    startClearArchivedFiles: storage.startClearArchivedFiles,
    removeDevInstances: (input) => storage.removeDevInstances(input),
    removeExternalWorktrees: (input) => storage.removeExternalWorktrees(input),
    startRemoveExternalWorktree: storage.startRemoveExternalWorktree,
    state: () => service.state(),
    preview: (policy) => service.preview(policy),
    configure,
  });
  registerCli(cc, { ...service, configure }, storage);
  cc.background.schedule("retention", "0 * * * *", () => service.sweep());
  cc.background.schedule("leftover-worktree-recovery", "15 * * * *", () =>
    storage.recoverInterruptedWorktrees(),
  );
  cc.background.schedule("archived-storage-backfill", "30 * * * *", () =>
    storage.backfillArchivedStorage(),
  );
}
