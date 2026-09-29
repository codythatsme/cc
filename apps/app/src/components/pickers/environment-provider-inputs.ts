import type { SystemEnvironmentProvider } from "@cc/server-contract";

export function providerInputsControlRequired(
  provider: SystemEnvironmentProvider,
): boolean {
  return provider.inputs !== null && !provider.acceptsEmptyInputs;
}
