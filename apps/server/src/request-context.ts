import { getConnInfo } from "@hono/node-server/conninfo";
import {
  CALLER_THREAD_HEADER_NAME,
  CLI_REQUEST_HEADER_NAME,
} from "@cc/config/app-surface";
import type { Context } from "hono";
import {
  PLUGIN_RPC_CALLER_HEADER,
  type PluginRpcCallerResolution,
} from "./services/plugins/plugin-rpc-caller.js";

export const TRUSTED_REMOTE_ADDRESS_CONTEXT_KEY = "ccTrustedRemoteAddress";
const GATE_AUTH_HEADER_NAME = "x-cc-gate-auth";
const GATE_MACHINE_ID_HEADER_NAME = "x-cc-gate-machine-id";
type GateAuthKind = "machine" | "session";

export interface RequestHeaderReader {
  req: { header(name: string): string | undefined };
}

interface TrustedRemoteAddressReader {
  get(key: typeof TRUSTED_REMOTE_ADDRESS_CONTEXT_KEY): string | undefined;
}

declare module "hono" {
  interface ContextVariableMap {
    [TRUSTED_REMOTE_ADDRESS_CONTEXT_KEY]: string | undefined;
  }
}

const tunnelIngressRequests = new WeakSet<object>();

export function markTunnelIngressRequest(incoming: object): void {
  tunnelIngressRequests.add(incoming);
}

function isTunnelIngressContext(context: Context): boolean {
  const env: unknown = context.env;
  if (typeof env !== "object" || env === null || !("incoming" in env)) {
    return false;
  }
  const incoming = env.incoming;
  return (
    typeof incoming === "object" &&
    incoming !== null &&
    tunnelIngressRequests.has(incoming)
  );
}

export function captureTrustedRemoteAddress(context: Context): void {
  if (isTunnelIngressContext(context)) {
    context.set(TRUSTED_REMOTE_ADDRESS_CONTEXT_KEY, undefined);
    return;
  }
  try {
    context.set(
      TRUSTED_REMOTE_ADDRESS_CONTEXT_KEY,
      getConnInfo(context).remote.address,
    );
  } catch {
    context.set(TRUSTED_REMOTE_ADDRESS_CONTEXT_KEY, undefined);
  }
}

export function getTrustedRemoteAddress(
  context: TrustedRemoteAddressReader,
): string | undefined {
  return context.get(TRUSTED_REMOTE_ADDRESS_CONTEXT_KEY);
}

export function getGateAuthKind(
  context: RequestHeaderReader,
): GateAuthKind | null {
  const value = context.req.header(GATE_AUTH_HEADER_NAME);
  return value === "machine" || value === "session" ? value : null;
}

export function getGateMachineId(context: RequestHeaderReader): string | null {
  const value = context.req.header(GATE_MACHINE_ID_HEADER_NAME)?.trim();
  return value ? value : null;
}

export type RequestSource =
  | { kind: "plugin"; pluginId: string }
  | { kind: "cli"; callerThreadId: string | null }
  | { kind: "api" };

export type ResolvePluginRpcCaller = (
  token: string | undefined,
) => PluginRpcCallerResolution;

export function resolveRequestSource(
  context: RequestHeaderReader,
  resolvePluginCaller: ResolvePluginRpcCaller,
): RequestSource {
  const pluginCaller = resolvePluginCaller(
    context.req.header(PLUGIN_RPC_CALLER_HEADER),
  );
  if (pluginCaller.ok && pluginCaller.caller.kind === "plugin") {
    return { kind: "plugin", pluginId: pluginCaller.caller.pluginId };
  }
  if (context.req.header(CLI_REQUEST_HEADER_NAME) !== undefined) {
    return {
      kind: "cli",
      callerThreadId: context.req.header(CALLER_THREAD_HEADER_NAME) ?? null,
    };
  }
  return { kind: "api" };
}
