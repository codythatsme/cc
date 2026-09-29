import type { ChangedMessage } from "@cc/domain";

export type CcRealtimeUnsubscribe = () => void;

export type CcRealtimeEventName =
  | "thread:changed"
  | "project:changed"
  | "environment:changed"
  | "host:changed"
  | "system:changed"
  | "system:config-changed"
  | "realtime:connection";

export type ThreadRealtimeEvent = Extract<ChangedMessage, { entity: "thread" }>;
export type ProjectRealtimeEvent = Extract<
  ChangedMessage,
  { entity: "project" }
>;
export type EnvironmentRealtimeEvent = Extract<
  ChangedMessage,
  { entity: "environment" }
>;
export type HostRealtimeEvent = Extract<ChangedMessage, { entity: "host" }>;
export type SystemRealtimeEvent = Extract<ChangedMessage, { entity: "system" }>;

export type CcRealtimeConnectionState =
  | "connecting"
  | "connected"
  | "disconnected";

export interface CcRealtimeConnectionEvent {
  reconnectDelayMs: number | null;
  reconnected: boolean;
  state: CcRealtimeConnectionState;
}

export interface CcRealtimeEventMap {
  "thread:changed": ThreadRealtimeEvent;
  "project:changed": ProjectRealtimeEvent;
  "environment:changed": EnvironmentRealtimeEvent;
  "host:changed": HostRealtimeEvent;
  "system:changed": SystemRealtimeEvent;
  "system:config-changed": SystemRealtimeEvent;
  "realtime:connection": CcRealtimeConnectionEvent;
}

export type CcRealtimeCallback<TEventName extends CcRealtimeEventName> = (
  event: CcRealtimeEventMap[TEventName],
) => void;

export interface ThreadRealtimeSubscribeArgs {
  callback: CcRealtimeCallback<"thread:changed">;
  event: "thread:changed";
  threadId?: string;
}

export interface ProjectRealtimeSubscribeArgs {
  callback: CcRealtimeCallback<"project:changed">;
  event: "project:changed";
  projectId?: string;
}

export interface EnvironmentRealtimeSubscribeArgs {
  callback: CcRealtimeCallback<"environment:changed">;
  environmentId?: string;
  event: "environment:changed";
}

export interface HostRealtimeSubscribeArgs {
  callback: CcRealtimeCallback<"host:changed">;
  event: "host:changed";
  hostId?: string;
}

export interface SystemRealtimeSubscribeArgs {
  callback: CcRealtimeCallback<"system:changed">;
  event: "system:changed";
}

export interface SystemConfigRealtimeSubscribeArgs {
  callback: CcRealtimeCallback<"system:config-changed">;
  event: "system:config-changed";
}

export interface RealtimeConnectionSubscribeArgs {
  callback: CcRealtimeCallback<"realtime:connection">;
  event: "realtime:connection";
}

export type CcRealtimeSubscribeArgsUnion =
  | ThreadRealtimeSubscribeArgs
  | ProjectRealtimeSubscribeArgs
  | EnvironmentRealtimeSubscribeArgs
  | HostRealtimeSubscribeArgs
  | SystemRealtimeSubscribeArgs
  | SystemConfigRealtimeSubscribeArgs
  | RealtimeConnectionSubscribeArgs;

export type CcRealtimeSubscribeArgs<
  TEventName extends CcRealtimeEventName = CcRealtimeEventName,
> = Extract<CcRealtimeSubscribeArgsUnion, { event: TEventName }>;

export interface CcRealtime {
  subscribe<TEventName extends CcRealtimeEventName>(
    args: CcRealtimeSubscribeArgs<TEventName>,
  ): CcRealtimeUnsubscribe;
}
