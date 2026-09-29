import {
  CcHttpError,
  CcRequestTimeoutError,
  ThreadWaitTimeoutError,
  ThreadWaitUnreachableError,
  createNodeCcSdk,
  type CcSdk,
  type CreateNodeCcSdkArgs,
} from "@cc/sdk/node";
import type {
  CcRealtimeSubscribeArgs,
  CcRealtimeSocket,
  CcRealtimeSocketFactory,
  CcRealtimeSocketMessageEvent,
  ThreadGetResult,
  ThreadStatusArgs,
} from "@cc/sdk/node";

export {
  CcHttpError,
  CcRequestTimeoutError,
  ThreadWaitTimeoutError,
  ThreadWaitUnreachableError,
};
export type * from "@cc/sdk/node";
export type {
  GitBranchSelection,
  JsonValue,
  PermissionMode,
  PromptInput,
  PromptTextMention,
  ReasoningLevel,
  ServiceTier,
  ThreadStatus,
} from "@cc/sdk/node";
export type {
  CreateExecutionInputSources,
  EnvironmentArgs,
  ExistingThreadExecutionInputSources,
  UnmanagedBranchSpec,
  WorkspaceArgs,
} from "@cc/sdk/node";
export type { CallerExecutionInputSource as ExecutionInputSource } from "@cc/sdk/node";

export type CCSdkOptions = CreateNodeCcSdkArgs;
export type CCSdkRealtimeSubscribeArgs = CcRealtimeSubscribeArgs;
export type CCSdkRealtimeSocket = CcRealtimeSocket;
export type CCSdkRealtimeSocketFactory = CcRealtimeSocketFactory;
export type CCSdkRealtimeSocketMessageEvent = CcRealtimeSocketMessageEvent;
export type CCSdkStatusArea = CcSdk["status"];
export type CCSdkSkillsArea = CcSdk["skills"];
export type CCSdkTerminalsArea = CcSdk["terminals"];
export type CCSdkThread = ThreadGetResult;
export type CCSdkThreadsArea = CcSdk["threads"];
export type ThreadIdArgs = ThreadStatusArgs;
export type CcHttpErrorConstructor = typeof CcHttpError;
export type CcRequestTimeoutErrorConstructor = typeof CcRequestTimeoutError;
export type ThreadWaitTimeoutErrorConstructor = typeof ThreadWaitTimeoutError;
export type ThreadWaitUnreachableErrorConstructor =
  typeof ThreadWaitUnreachableError;

export class CCSdk implements CcSdk {
  readonly environments: CcSdk["environments"];
  readonly experimental_desktopBrowsers: CcSdk["experimental_desktopBrowsers"];
  readonly experimental_server: CcSdk["experimental_server"];
  readonly files: CcSdk["files"];
  readonly guide: CcSdk["guide"];
  readonly hosts: CcSdk["hosts"];
  readonly plugins: CcSdk["plugins"];
  readonly projects: CcSdk["projects"];
  readonly providers: CcSdk["providers"];
  readonly skills: CcSdk["skills"];
  readonly status: CcSdk["status"];
  readonly system: CcSdk["system"];
  readonly terminals: CcSdk["terminals"];
  readonly theme: CcSdk["theme"];
  readonly threadSections: CcSdk["threadSections"];
  readonly threads: CcSdk["threads"];
  readonly subscribe: CcSdk["subscribe"];

  constructor(options: CCSdkOptions = {}) {
    const sdk = createNodeCcSdk(options);
    this.environments = sdk.environments;
    this.experimental_desktopBrowsers = sdk.experimental_desktopBrowsers;
    this.experimental_server = sdk.experimental_server;
    this.files = sdk.files;
    this.guide = sdk.guide;
    this.hosts = sdk.hosts;
    this.plugins = sdk.plugins;
    this.projects = sdk.projects;
    this.providers = sdk.providers;
    this.skills = sdk.skills;
    this.status = sdk.status;
    this.system = sdk.system;
    this.terminals = sdk.terminals;
    this.theme = sdk.theme;
    this.threadSections = sdk.threadSections;
    this.threads = sdk.threads;
    this.subscribe = sdk.subscribe;
  }
}

export function createCCSdk(options: CCSdkOptions = {}): CCSdk {
  return new CCSdk(options);
}
