import type { CcPluginApi } from "@codythatsme/plugin-sdk";

export interface QueuedRetry {
  id: string;
  threadId: string;
  sendAt: number | null;
}

export async function listQueuedRetries(
  cc: CcPluginApi,
  threadId?: string,
): Promise<QueuedRetry[]> {
  const rows = await cc.sdk.threads.queue.list(
    threadId === undefined ? {} : { threadId },
  );
  return rows
    .filter((row) => row.payload.kind === "retry")
    .map((row) => ({
      id: row.id,
      threadId: row.threadId,
      sendAt: row.sendAt,
    }));
}

export async function findQueuedRetry(
  cc: CcPluginApi,
  threadId: string,
): Promise<QueuedRetry | null> {
  const rows = await listQueuedRetries(cc, threadId);
  return rows[0] ?? null;
}
