import {
  createCcSdk,
  createBuiltinPlanCommandTextInput,
  type CcSdk,
  type CcSdkAreas,
} from "./core.js";
import { createHttpTransport } from "./transport-http.js";
import type {
  CcRealtimeSocketFactory,
  CcSdkContext,
  CcSdkTransport,
} from "./transport.js";

export interface CreateBrowserTransportArgs {
  baseUrl?: string;
  fetch?: typeof fetch;
  realtimeUrl?: string;
  websocket?: CcRealtimeSocketFactory;
}

export interface CreateBrowserCcSdkArgs extends CreateBrowserTransportArgs {
  context?: CcSdkContext;
}

export type BrowserCcSdk = CcSdkAreas;

export function createBrowserTransport(
  args: CreateBrowserTransportArgs = {},
): CcSdkTransport {
  return createHttpTransport({
    baseUrl: args.baseUrl,
    fetch: args.fetch,
    realtimeUrl: args.realtimeUrl,
    runtime: "browser",
    websocket: args.websocket,
  });
}

export function createBrowserCcSdk(
  args: CreateBrowserCcSdkArgs = {},
): BrowserCcSdk {
  return createCcSdk({
    context: args.context,
    transport: createBrowserTransport(args),
  });
}

export { CcHttpError, CcRequestTimeoutError } from "./response.js";
export type { CcHttpErrorArgs } from "./response.js";
export { createCcSdk, createBuiltinPlanCommandTextInput, createHttpTransport };
export type { CcSdk, CcSdkAreas, CcSdkContext, CcSdkTransport };
export type * from "./areas/skills.js";
export type * from "./public-types.js";
