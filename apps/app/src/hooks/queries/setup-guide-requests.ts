import {
  systemSetupGuideResponseSchema,
  type SystemSetupGuideResponse,
} from "@cc/server-contract";

export async function fetchSetupGuideAssignment(
  signal: AbortSignal,
): Promise<SystemSetupGuideResponse> {
  const response = await fetch("/api/v1/system/setup-guide", {
    signal,
  });
  if (!response.ok) {
    throw new Error(`Setup guide request failed (${response.status})`);
  }
  return systemSetupGuideResponseSchema.parse(await response.json());
}
