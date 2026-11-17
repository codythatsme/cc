import type { CcPluginApi } from "@codythatsme/plugin-sdk";
export async function readThreads(cc: CcPluginApi, signal?: AbortSignal) {
  const rows: Awaited<ReturnType<typeof cc.sdk.threads.list>> = [];
  for (let offset = 0; ; offset += 500) {
    signal?.throwIfAborted();
    const page = await cc.sdk.threads.list({
      includeHidden: true,
      limit: 500,
      offset,
      signal,
    });
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
export async function readThreadsById(
  cc: CcPluginApi,
  threadIds: readonly string[],
  signal?: AbortSignal,
) {
  const rows: Awaited<ReturnType<typeof cc.sdk.threads.list>> = [];
  for (let offset = 0; offset < threadIds.length; offset += 200) {
    signal?.throwIfAborted();
    rows.push(
      ...(await cc.sdk.threads.list({
        includeHidden: true,
        threadIds: threadIds.slice(offset, offset + 200),
        signal,
      })),
    );
  }
  return new Map(rows.map((thread) => [thread.id, thread]));
}
export async function readThreadsInEnvironments(
  cc: CcPluginApi,
  environmentIds: readonly string[],
  signal?: AbortSignal,
) {
  const pages = await Promise.all(
    environmentIds.map((environmentId) =>
      cc.sdk.threads.list({ environmentId, includeHidden: true, signal }),
    ),
  );
  return pages.flat();
}
