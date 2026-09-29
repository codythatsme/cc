import type { CcPluginApi } from "@codythatsme/plugin-sdk";
import { publishCommentsChanged, type TasksApiStore } from "../api";
import type { TaskThread, TaskThreadLiveStatus } from "../db";
import { createSystemComment, publishThreadsChanged } from "../delegate";
import { errorMessage } from "../shared/errors";

const TERMINAL_LIVE_STATUSES = new Set<TaskThreadLiveStatus>(["completed"]);

type SdkThread = Awaited<ReturnType<CcPluginApi["sdk"]["threads"]["get"]>>;

function liveStatusFromThread(thread: SdkThread): TaskThreadLiveStatus {
  if (thread.status === "error") return "failed";
  if (thread.deletedAt !== null) return "completed";

  switch (thread.status) {
    case "pending":
    case "starting":
      return "starting";
    case "active":
    case "stopping":
      return "working";
    case "idle":
      return "idle";
  }
}

function trackedThreads(store: TasksApiStore): TaskThread[] {
  const tracked: TaskThread[] = [];
  for (const task of store.tasks.listTasks()) {
    for (const thread of store.tasks.listTaskThreads(task.id)) {
      tracked.push(thread);
    }
  }
  return tracked;
}

function statusCommentBody(
  thread: TaskThread,
  liveStatus: Extract<TaskThreadLiveStatus, "completed" | "failed">,
): string {
  const outcome =
    liveStatus === "completed" ? "completed — final message posted" : "failed";
  return `Thread "${thread.title}" ${outcome} · ${thread.threadId}`;
}

function sdkErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}

function transitionThread(
  cc: CcPluginApi,
  store: TasksApiStore,
  thread: TaskThread,
  liveStatus: TaskThreadLiveStatus,
): void {
  if (
    thread.liveStatus === liveStatus ||
    TERMINAL_LIVE_STATUSES.has(thread.liveStatus)
  ) {
    return;
  }

  store.transaction(() => {
    store.tasks.updateTaskThreadStatus(thread.id, liveStatus);
    if (liveStatus === "completed" || liveStatus === "failed") {
      createSystemComment(store.tasks, {
        taskId: thread.taskId,
        presetName: thread.presetName,
        threadId: thread.threadId,
        body: statusCommentBody(thread, liveStatus),
      });
    }
  });

  publishThreadsChanged(cc, thread.taskId);
  publishCommentsChanged(cc, thread.taskId);
}

function transitionTrackedThread(
  cc: CcPluginApi,
  store: TasksApiStore,
  threadId: string,
  liveStatus: TaskThreadLiveStatus,
): void {
  for (const thread of store.tasks.listTaskThreadsByThreadId(threadId)) {
    transitionThread(cc, store, thread, liveStatus);
  }
}

async function reconcileTrackedThread(
  cc: CcPluginApi,
  store: TasksApiStore,
  trackedThread: TaskThread,
): Promise<void> {
  try {
    const thread = await cc.sdk.threads.get({
      threadId: trackedThread.threadId,
    });
    transitionThread(cc, store, trackedThread, liveStatusFromThread(thread));
  } catch (error) {
    if (sdkErrorCode(error) === "thread_not_found") {
      transitionThread(cc, store, trackedThread, "completed");
      return;
    }
    cc.log.warn(
      `Could not reconcile task thread ${trackedThread.threadId}: ${errorMessage(
        error,
      )}`,
    );
  }
}

async function reconcileTrackedThreads(
  cc: CcPluginApi,
  store: TasksApiStore,
): Promise<void> {
  const nonTerminalThreads = trackedThreads(store).filter(
    (thread) => !TERMINAL_LIVE_STATUSES.has(thread.liveStatus),
  );

  for (const trackedThread of nonTerminalThreads) {
    await reconcileTrackedThread(cc, store, trackedThread);
  }
}

export async function registerLifecycle(
  cc: CcPluginApi,
  store: TasksApiStore,
): Promise<void> {
  cc.events.on("thread.created", ({ thread }) => {
    transitionTrackedThread(cc, store, thread.id, liveStatusFromThread(thread));
  });
  cc.events.on("thread.active", ({ thread }) => {
    transitionTrackedThread(cc, store, thread.id, "working");
  });
  cc.events.on("thread.idle", ({ thread }) => {
    transitionTrackedThread(cc, store, thread.id, "idle");
  });
  cc.events.on("thread.failed", ({ thread }) => {
    transitionTrackedThread(cc, store, thread.id, "failed");
  });
  cc.events.on("thread.deleted", ({ thread }) => {
    transitionTrackedThread(cc, store, thread.id, "completed");
  });

  await reconcileTrackedThreads(cc, store);
}
