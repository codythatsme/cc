export const TUNNEL_TARGET_HEADER = "x-cc-tunnel-target";
export const MACHINE_CREDENTIAL_HEADER = "x-cc-connect-machine";
export const GATE_AUTH_HEADER = "x-cc-gate-auth";
export const GATE_MACHINE_ID_HEADER = "x-cc-gate-machine-id";
export const GATE_OWNER_HEADER = "x-cc-gate-owner";
export const RELAY_HEADER = "x-cc-relay";
export const RELAY_METHOD_HEADER = "x-cc-relay-method";
export const RELAY_HAS_BODY_HEADER = "x-cc-relay-has-body";
export const RELAY_CONTENT_LENGTH_HEADER = "x-cc-relay-content-length";

export const HOP_HEADERS: ReadonlySet<string> = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "expect",
  "host",
  "sec-websocket-key",
  "sec-websocket-version",
  "sec-websocket-extensions",
  TUNNEL_TARGET_HEADER,
  GATE_OWNER_HEADER,
  RELAY_HEADER,
  RELAY_METHOD_HEADER,
  RELAY_HAS_BODY_HEADER,
  RELAY_CONTENT_LENGTH_HEADER,
]);
