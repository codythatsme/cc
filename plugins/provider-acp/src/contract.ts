import { defineRpcContract } from "@codythatsme/plugin-sdk";
import { experimental_nativeRootsHostContract } from "@codythatsme/plugin-sdk/host";
import { experimental_acpAgentProbeSchema } from "@codythatsme/plugin-sdk/provider-bridge/acp";
import { z } from "zod";

export const acpHostContract = defineRpcContract({
  probeAgent: {
    input: z
      .object({
        command: z.string().min(1),
        args: z.array(z.string()),
        env: z.record(z.string(), z.string()),
      })
      .strict(),
    output: experimental_acpAgentProbeSchema,
  },
  ...experimental_nativeRootsHostContract,
});
