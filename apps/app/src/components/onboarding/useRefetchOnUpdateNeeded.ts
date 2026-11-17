import { useEffect } from "react";
import type { ProviderCliStatusResponse } from "@cc/host-daemon-contract";
import type { SystemProviderState } from "@cc/server-contract";

export function useRefetchOnUpdateNeeded({
  enabled,
  states,
  statesUpdatedAt,
  cliStatus,
  refetch,
}: {
  enabled: boolean;
  states: readonly SystemProviderState[] | undefined;
  statesUpdatedAt: number;
  cliStatus: ProviderCliStatusResponse | undefined;
  refetch: () => void;
}): void {
  const cliStatusBehind =
    enabled &&
    cliStatus !== undefined &&
    (states ?? []).some((state) => {
      const cli = cliStatus[state.providerId];
      return (
        state.status === "unsupported_version" &&
        cli !== undefined &&
        !cli.versionUnsupported
      );
    });
  useEffect(() => {
    if (cliStatusBehind) refetch();
  }, [cliStatusBehind, statesUpdatedAt, refetch]);
}
