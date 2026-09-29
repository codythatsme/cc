import { z } from "zod";
import {
  desktopBrowserImportSelectionSchema,
  desktopBrowserProfileSchema,
  type DesktopBrowserImportOutcome,
  type DesktopBrowserImportSource,
} from "@cc/host-daemon-contract";

export const CC_DESKTOP_BROWSER_MAX_URL_LENGTH = 4096;
export const CC_DESKTOP_BROWSER_MAX_TITLE_LENGTH = 1024;

export const ccDesktopBrowserTargetSchema = z
  .object({
    hostId: z.string().min(1),
    instanceId: z.string().min(1),
    generation: z.string().min(1),
  })
  .strict();
export type CcDesktopBrowserTarget = z.infer<
  typeof ccDesktopBrowserTargetSchema
>;

export const ccDesktopBrowserControlSchema = z
  .object({
    leaseId: z.string().min(1),
    controllerLabel: z.string().min(1),
    expiresAt: z.number().int().positive(),
  })
  .strict();
export type CcDesktopBrowserControl = z.infer<
  typeof ccDesktopBrowserControlSchema
>;
export const ccDesktopBrowserControlStateSchema = z
  .object({
    tabId: z.string().min(1),
    threadId: z.string().min(1),
    control: ccDesktopBrowserControlSchema.nullable(),
  })
  .strict();
export type CcDesktopBrowserControlState = z.infer<
  typeof ccDesktopBrowserControlStateSchema
>;
export const ccDesktopBrowserRevealRequestSchema = z
  .object({
    tabId: z.string().min(1),
    threadId: z.string().min(1),
    desktopTarget: ccDesktopBrowserTargetSchema,
  })
  .strict();
export type CcDesktopBrowserRevealRequest = z.infer<
  typeof ccDesktopBrowserRevealRequestSchema
>;

const ccDesktopBrowserViewBoundsSchema = z
  .object({
    x: z.number().int(),
    y: z.number().int(),
    width: z.number().int().nonnegative(),
    height: z.number().int().nonnegative(),
  })
  .strict();
export type CcDesktopBrowserViewBounds = z.infer<
  typeof ccDesktopBrowserViewBoundsSchema
>;

export interface CcDesktopBrowserViewportBounds {
  width: number;
  height: number;
}

interface ClampIntegerToRangeArgs {
  max: number;
  min: number;
  value: number;
}

interface ClampCcDesktopBrowserViewBoundsArgs {
  bounds: CcDesktopBrowserViewBounds;
  viewport: CcDesktopBrowserViewportBounds;
}

function clampIntegerToRange(args: ClampIntegerToRangeArgs): number {
  return Math.min(Math.max(args.value, args.min), args.max);
}

export function clampCcDesktopBrowserViewBounds(
  args: ClampCcDesktopBrowserViewBoundsArgs,
): CcDesktopBrowserViewBounds {
  const viewportRight = Math.max(0, Math.round(args.viewport.width));
  const viewportBottom = Math.max(0, Math.round(args.viewport.height));
  const x = clampIntegerToRange({
    value: args.bounds.x,
    min: 0,
    max: viewportRight,
  });
  const y = clampIntegerToRange({
    value: args.bounds.y,
    min: 0,
    max: viewportBottom,
  });
  const right = clampIntegerToRange({
    value: args.bounds.x + args.bounds.width,
    min: x,
    max: viewportRight,
  });
  const bottom = clampIntegerToRange({
    value: args.bounds.y + args.bounds.height,
    min: y,
    max: viewportBottom,
  });

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}

export const ccDesktopBrowserAttachRequestSchema = z
  .object({
    tabId: z.string().min(1),
    threadId: z.string().min(1),
    url: z.string().max(CC_DESKTOP_BROWSER_MAX_URL_LENGTH),
    existingOnly: z.literal(true).optional(),
    bounds: ccDesktopBrowserViewBoundsSchema,
    visible: z.boolean(),
  })
  .strict();
export type CcDesktopBrowserAttachRequest = z.infer<
  typeof ccDesktopBrowserAttachRequestSchema
>;

export const ccDesktopBrowserNavigateRequestSchema = z
  .object({
    tabId: z.string().min(1),
    url: z.string().min(1).max(CC_DESKTOP_BROWSER_MAX_URL_LENGTH),
  })
  .strict();
export type CcDesktopBrowserNavigateRequest = z.infer<
  typeof ccDesktopBrowserNavigateRequestSchema
>;

export const ccDesktopBrowserSetBoundsRequestSchema = z
  .object({
    tabId: z.string().min(1),
    bounds: ccDesktopBrowserViewBoundsSchema,
  })
  .strict();
export type CcDesktopBrowserSetBoundsRequest = z.infer<
  typeof ccDesktopBrowserSetBoundsRequestSchema
>;

export const ccDesktopBrowserSetVisibleRequestSchema = z
  .object({
    tabId: z.string().min(1),
    visible: z.boolean(),
  })
  .strict();
export type CcDesktopBrowserSetVisibleRequest = z.infer<
  typeof ccDesktopBrowserSetVisibleRequestSchema
>;

export const ccDesktopBrowserTabRefSchema = z
  .object({
    tabId: z.string().min(1),
  })
  .strict();
export type CcDesktopBrowserTabRef = z.infer<
  typeof ccDesktopBrowserTabRefSchema
>;

export const ccDesktopBrowserStateSchema = z
  .object({
    tabId: z.string().min(1),
    url: z.string().max(CC_DESKTOP_BROWSER_MAX_URL_LENGTH),
    title: z.string().max(CC_DESKTOP_BROWSER_MAX_TITLE_LENGTH).nullable(),
    isLoading: z.boolean(),
    canGoBack: z.boolean(),
    canGoForward: z.boolean(),
    errorText: z.string().max(CC_DESKTOP_BROWSER_MAX_TITLE_LENGTH).nullable(),
  })
  .strict();
export type CcDesktopBrowserState = z.infer<typeof ccDesktopBrowserStateSchema>;

export const ccDesktopBrowserOpenTabRequestSchema = z
  .object({
    url: z.string().min(1).max(CC_DESKTOP_BROWSER_MAX_URL_LENGTH),
  })
  .strict();
export type CcDesktopBrowserOpenTabRequest = z.infer<
  typeof ccDesktopBrowserOpenTabRequestSchema
>;

export const ccDesktopBrowserScopedOpenTabRequestSchema = z
  .object({
    tabId: z.string().min(1),
    url: z.string().min(1).max(CC_DESKTOP_BROWSER_MAX_URL_LENGTH),
  })
  .strict();
export type CcDesktopBrowserScopedOpenTabRequest = z.infer<
  typeof ccDesktopBrowserScopedOpenTabRequestSchema
>;

const CC_DESKTOP_BROWSER_MAX_SNAPSHOT_DATA_URL_LENGTH = 8_388_608;

export const ccDesktopBrowserSnapshotSchema = z
  .object({
    tabId: z.string().min(1),
    dataUrl: z
      .string()
      .max(CC_DESKTOP_BROWSER_MAX_SNAPSHOT_DATA_URL_LENGTH)
      .nullable(),
  })
  .strict();
export type CcDesktopBrowserSnapshot = z.infer<
  typeof ccDesktopBrowserSnapshotSchema
>;

export const CC_DESKTOP_BROWSER_MAX_FIND_TEXT_LENGTH = 1024;

export const ccDesktopBrowserFindInPageRequestSchema = z
  .object({
    tabId: z.string().min(1),
    text: z.string().min(1).max(CC_DESKTOP_BROWSER_MAX_FIND_TEXT_LENGTH),
    forward: z.boolean(),
    newSession: z.boolean(),
  })
  .strict();
export type CcDesktopBrowserFindInPageRequest = z.infer<
  typeof ccDesktopBrowserFindInPageRequestSchema
>;

export const ccDesktopBrowserStopFindInPageRequestSchema = z
  .object({
    tabId: z.string().min(1),
    action: z.enum(["clearSelection", "keepSelection", "activateSelection"]),
  })
  .strict();
export type CcDesktopBrowserStopFindInPageRequest = z.infer<
  typeof ccDesktopBrowserStopFindInPageRequestSchema
>;

export const ccDesktopBrowserFindResultSchema = z
  .object({
    tabId: z.string().min(1),
    requestId: z.number().int(),
    activeMatchOrdinal: z.number().int().nonnegative(),
    matches: z.number().int().nonnegative(),
    finalUpdate: z.boolean(),
  })
  .strict();
export type CcDesktopBrowserFindResult = z.infer<
  typeof ccDesktopBrowserFindResultSchema
>;

export const CC_DESKTOP_BROWSER_MAX_PAGE_EXPRESSION_LENGTH = 4_000_000;
export const CC_DESKTOP_BROWSER_MAX_PAGE_CHANNEL_LENGTH = 256;

export const ccDesktopBrowserPageWorldSchema = z.enum(["main", "isolated"]);
export type CcDesktopBrowserPageWorld = z.infer<
  typeof ccDesktopBrowserPageWorldSchema
>;

export const ccDesktopBrowserEvaluateRequestSchema = z
  .object({
    tabId: z.string().min(1),
    expression: z
      .string()
      .min(1)
      .max(CC_DESKTOP_BROWSER_MAX_PAGE_EXPRESSION_LENGTH),
    world: ccDesktopBrowserPageWorldSchema,
    channel: z.string().min(1).max(CC_DESKTOP_BROWSER_MAX_PAGE_CHANNEL_LENGTH),
  })
  .strict();
export type CcDesktopBrowserEvaluateRequest = z.infer<
  typeof ccDesktopBrowserEvaluateRequestSchema
>;

export const ccDesktopBrowserEvaluateResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), value: z.json() }).strict(),
  z.object({ ok: z.literal(false), error: z.string() }).strict(),
]);
export type CcDesktopBrowserEvaluateResult = z.infer<
  typeof ccDesktopBrowserEvaluateResultSchema
>;

export const ccDesktopBrowserPageMessageSchema = z
  .object({
    tabId: z.string().min(1),
    channel: z.string().min(1).max(CC_DESKTOP_BROWSER_MAX_PAGE_CHANNEL_LENGTH),
    data: z.json(),
  })
  .strict();
export type CcDesktopBrowserPageMessage = z.infer<
  typeof ccDesktopBrowserPageMessageSchema
>;
export type CcDesktopBrowserPageMessageHandler = (
  message: CcDesktopBrowserPageMessage,
) => void;

export type CcDesktopBrowserStateHandler = (
  state: CcDesktopBrowserState,
) => void;
export type CcDesktopBrowserOpenTabHandler = (
  request: CcDesktopBrowserOpenTabRequest,
) => void;
export type CcDesktopBrowserScopedOpenTabHandler = (
  request: CcDesktopBrowserScopedOpenTabRequest,
) => void;
export type CcDesktopBrowserSnapshotHandler = (
  snapshot: CcDesktopBrowserSnapshot,
) => void;
export type CcDesktopBrowserFocusHandler = (tabId: string) => void;
export type CcDesktopBrowserFindResultHandler = (
  result: CcDesktopBrowserFindResult,
) => void;
export type CcDesktopBrowserUnsubscribe = () => void;

export const ccDesktopBrowserImportCookiesRequestSchema =
  desktopBrowserImportSelectionSchema
    .extend({ profile: desktopBrowserProfileSchema })
    .strict();
export type CcDesktopBrowserImportCookiesRequest = z.infer<
  typeof ccDesktopBrowserImportCookiesRequestSchema
>;
export type CcDesktopBrowserImportSourcesResult = {
  sources: DesktopBrowserImportSource[];
};
export type CcDesktopBrowserImportCookiesResult = DesktopBrowserImportOutcome;

export interface CcDesktopBrowserApi {
  listImportSources?(): Promise<CcDesktopBrowserImportSourcesResult>;
  importCookies?(
    request: CcDesktopBrowserImportCookiesRequest,
  ): Promise<CcDesktopBrowserImportCookiesResult>;
  openFullDiskAccessSettings?(): void;
  getTarget?(): Promise<CcDesktopBrowserTarget | null>;
  getControl?(tabId: string): Promise<CcDesktopBrowserControlState | null>;
  releaseControl?(tabId: string): void;
  onControl?(
    listener: (state: CcDesktopBrowserControlState) => void,
  ): CcDesktopBrowserUnsubscribe;
  onReveal?(
    listener: (request: CcDesktopBrowserRevealRequest) => void,
  ): CcDesktopBrowserUnsubscribe;
  attach(request: CcDesktopBrowserAttachRequest): void;
  detach(tabId: string): void;
  navigate(request: CcDesktopBrowserNavigateRequest): void;
  goBack(tabId: string): void;
  goForward(tabId: string): void;
  reload(tabId: string): void;
  stop(tabId: string): void;
  focus?(tabId: string): void;
  setBounds(request: CcDesktopBrowserSetBoundsRequest): void;
  setVisible(request: CcDesktopBrowserSetVisibleRequest): void;
  setVisibleWithoutFocus?(request: CcDesktopBrowserSetVisibleRequest): void;
  onState(listener: CcDesktopBrowserStateHandler): CcDesktopBrowserUnsubscribe;
  onOpenTab(
    listener: CcDesktopBrowserOpenTabHandler,
  ): CcDesktopBrowserUnsubscribe;
  onScopedOpenTab?(
    listener: CcDesktopBrowserScopedOpenTabHandler,
  ): CcDesktopBrowserUnsubscribe;
  onFocus?(listener: CcDesktopBrowserFocusHandler): CcDesktopBrowserUnsubscribe;
  onSnapshot?(
    listener: CcDesktopBrowserSnapshotHandler,
  ): CcDesktopBrowserUnsubscribe;
  findInPage?(request: CcDesktopBrowserFindInPageRequest): void;
  stopFindInPage?(request: CcDesktopBrowserStopFindInPageRequest): void;
  onFindResult?(
    listener: CcDesktopBrowserFindResultHandler,
  ): CcDesktopBrowserUnsubscribe;
  evaluate?(
    request: CcDesktopBrowserEvaluateRequest,
  ): Promise<CcDesktopBrowserEvaluateResult>;
  onPageMessage?(
    listener: CcDesktopBrowserPageMessageHandler,
  ): CcDesktopBrowserUnsubscribe;
}
