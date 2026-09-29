import { createNodeCcSdk, type CcSdk } from "@cc/sdk/node";
import type { Dispatcher } from "undici";

type CliRequestInit = RequestInit & { dispatcher?: Dispatcher };

export function cliFetch(
  input: RequestInfo | URL,
  init?: CliRequestInit,
): Promise<Response> {
  return fetch(input, init);
}

export function createCliCcSdk(baseUrl: string): CcSdk {
  return createNodeCcSdk({ baseUrl, fetch: cliFetch });
}
