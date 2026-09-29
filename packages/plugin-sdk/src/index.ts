/**
 * `@codythatsme/plugin-sdk` — the typed facade plugin authors compile against.
 *
 * The root export carries the side-effect-free app and host-contract types
 * plus the backend contract (`CcPluginApi`, the
 * `server.ts` factory argument — types only, implemented by the CC server).
 * The `./app` subpath adds the runtime bindings that `cc plugin build` shims
 * to the host's shared runtime.
 */
export * from "./app-contract.js";
export * from "./backend-contract.js";
export * from "./cli-spec.js";
export * from "./host-contract.js";
export type * from "./json-value.js";
export * from "./rpc-contract.js";
export type {
  ExperimentalDesktopBrowsersArea,
  ExperimentalDesktopBrowserScope,
  ExperimentalDesktopBrowserLease,
  ExperimentalDesktopBrowserCreateInput,
  ExperimentalDesktopBrowserAcquireInput,
} from "@cc/sdk";

export type * from "./machine-bootstrap.js";
