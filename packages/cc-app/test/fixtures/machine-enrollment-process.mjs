import { enrollMachine } from "../../../../apps/cli/src/commands/machine-enrollment.ts";

const env = {
  CC_DATA_DIR: process.env.CC_DATA_DIR,
  CC_ENROLLMENT: process.env.CC_ENROLLMENT,
  PATH: "/nonexistent",
};

await enrollMachine(
  { bootstrapEnv: "CC_ENROLLMENT" },
  {
    env,
    fetchFn: async () =>
      Response.json(
        { hostId: "host_synthetic", hostKey: "synthetic-host-key" },
        { status: 201 },
      ),
    homeDir: process.env.CC_DATA_DIR,
  },
);
