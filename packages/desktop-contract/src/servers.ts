import { z } from "zod";

export const ccDesktopServerChoiceSchema = z
  .object({
    id: z.string().min(1).max(256),
    name: z.string().min(1),
    origin: z.url(),
    kind: z.enum(["local", "account", "custom"]),
    active: z.boolean(),
  })
  .strict();
export const ccDesktopServerChoicesSchema = z.array(
  ccDesktopServerChoiceSchema,
);
export type CcDesktopServerChoice = z.infer<typeof ccDesktopServerChoiceSchema>;
