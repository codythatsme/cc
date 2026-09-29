import { createBrowserCcSdk } from "@cc/sdk/browser";

type FetchLike = typeof fetch;

export function createPluginsClient(fetchImpl: FetchLike) {
  const boundFetch: FetchLike = (input, init) =>
    fetchImpl.call(globalThis, input, init);
  return createBrowserCcSdk({ fetch: boundFetch }).plugins;
}
