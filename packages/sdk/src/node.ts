import { loadCliConfig, type CliConfig } from "@cc/config/cli";
import {
  createHostDaemonLocalClient,
  DEFAULT_HOST_DAEMON_LOCAL_BIND_HOST,
} from "@cc/host-daemon-contract";
import { createGuideArea } from "./areas/guide.js";
import { createCcSdk, type CcSdk, type CcSdkAreas } from "./core.js";
import { createNodeWebsocketFactory } from "./node-websocket.js";
import {
  createRequestTimeoutFetch,
  DEFAULT_CC_REQUEST_TIMEOUT_MS,
  type FetchImplementation,
} from "./response.js";
import { createHttpTransport } from "./transport-http.js";
import type {
  CcRealtimeSocketFactory,
  CcSdkContext,
  CcSdkTransport,
} from "./transport.js";

export interface CreateNodeTransportArgs {
  baseUrl?: string;
  cliConfig?: CliConfig;
  fetch?: FetchImplementation;
  realtimeUrl?: string;
  timeoutMs?: number;
  websocket?: CcRealtimeSocketFactory;
}

export interface CreateNodeCcSdkArgs extends CreateNodeTransportArgs {
  context?: CcSdkContext;
}

export interface FetchLocalHostIdArgs {
  cliConfig?: CliConfig;
  hostDaemonUrl?: string;
}

function resolveCliConfig(cliConfig?: CliConfig): CliConfig {
  return cliConfig ?? loadCliConfig();
}

function resolveHostDaemonUrl(cliConfig?: CliConfig): string {
  const config = resolveCliConfig(cliConfig);
  return `http://${DEFAULT_HOST_DAEMON_LOCAL_BIND_HOST}:${config.CC_HOST_DAEMON_PORT}`;
}

export function createNodeTransport(
  args: CreateNodeTransportArgs = {},
): CcSdkTransport {
  return createHttpTransport({
    baseUrl: args.baseUrl ?? resolveCliConfig(args.cliConfig).CC_SERVER_URL,
    fetch:
      args.fetch ??
      createRequestTimeoutFetch({
        timeoutMs: args.timeoutMs ?? DEFAULT_CC_REQUEST_TIMEOUT_MS,
      }),
    realtimeUrl: args.realtimeUrl,
    runtime: "node",
    websocket: args.websocket ?? createNodeWebsocketFactory(),
  });
}

export function createNodeCcSdk(args: CreateNodeCcSdkArgs = {}): CcSdk {
  return createCcSdk({
    context: args.context,
    guide: createGuideArea(),
    transport: createNodeTransport(args),
  });
}

export async function fetchLocalHostId(
  args: FetchLocalHostIdArgs = {},
): Promise<string | null> {
  try {
    const client = createHostDaemonLocalClient(
      args.hostDaemonUrl ?? resolveHostDaemonUrl(args.cliConfig),
    );
    const response = await client.status.$get();
    if (!response.ok) {
      return null;
    }
    const body = await response.json();
    return body.hostId;
  } catch {
    return null;
  }
}

export {
  createCcSdk,
  createHttpTransport,
  createRequestTimeoutFetch,
  DEFAULT_CC_REQUEST_TIMEOUT_MS,
};
export { CcHttpError, CcRequestTimeoutError } from "./response.js";
export {
  pluginMutationResponseSchema,
  type PluginMutationResponse,
} from "./areas/plugins.js";
export { createBuiltinPlanCommandTextInput } from "./core.js";
export { createGuideArea } from "./areas/guide.js";
export {
  DEFAULT_THREAD_WAIT_POLL_INTERVAL_MS,
  DEFAULT_THREAD_WAIT_TIMEOUT_MS,
  ThreadWaitTimeoutError,
  ThreadWaitUnreachableError,
} from "./areas/threads.js";
export type {
  CcSdk,
  CcSdkAreas,
  CcSdkContext,
  CcSdkTransport,
  FetchImplementation,
};
export type * from "./areas/skills.js";
export type {
  CcRealtimeSocket,
  CcRealtimeSocketFactory,
  CcRealtimeSocketMessageEvent,
} from "./transport.js";
export type { CcHttpErrorArgs } from "./response.js";
export type * from "./public-types.js";
