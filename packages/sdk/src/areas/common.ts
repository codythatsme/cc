import type {
  SystemExecutionOptionsQuery,
  SystemExecutionOptionsResponse,
} from "@cc/server-contract";
import type { CcSdkTransport } from "../transport.js";

export interface CreateSdkAreaArgs {
  transport: CcSdkTransport;
}

type SignalRequestOptions = { init: { signal: AbortSignal } };

export function signalRequestArgs(
  signal: AbortSignal | undefined,
): [] | [SignalRequestOptions] {
  return signal === undefined ? [] : [{ init: { signal } }];
}

export async function readExecutionOptions(
  transport: CcSdkTransport,
  input: Omit<SystemExecutionOptionsQuery, "preferCached"> & {
    preferCached?: boolean;
    signal?: AbortSignal;
  },
): Promise<SystemExecutionOptionsResponse> {
  return transport.readJson(
    transport.api.v1.system["execution-options"].$get(
      {
        query: {
          environmentId: input.environmentId,
          hostId: input.hostId,
          projectId: input.projectId,
          providerId: input.providerId,
          selectedModel: input.selectedModel,
          preferCached:
            input.preferCached === undefined
              ? undefined
              : input.preferCached
                ? "true"
                : "false",
        },
      },
      ...signalRequestArgs(input.signal),
    ),
  );
}
