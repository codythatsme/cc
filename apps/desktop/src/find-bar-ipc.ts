import { z } from "zod";
import { CC_DESKTOP_MAX_FIND_TEXT_LENGTH } from "@cc/desktop-contract";

export const CC_DESKTOP_FIND_BAR_QUERY_CHANNEL = "cc-desktop:find-bar:query";
export const CC_DESKTOP_FIND_BAR_STEP_CHANNEL = "cc-desktop:find-bar:step";
export const CC_DESKTOP_FIND_BAR_CLOSE_CHANNEL = "cc-desktop:find-bar:close";
export const CC_DESKTOP_FIND_BAR_RESULT_CHANNEL = "cc-desktop:find-bar:result";
export const CC_DESKTOP_FIND_BAR_ACTIVATE_CHANNEL =
  "cc-desktop:find-bar:activate";

export const findBarQueryRequestSchema = z
  .object({
    text: z.string().max(CC_DESKTOP_MAX_FIND_TEXT_LENGTH),
  })
  .strict();
export type FindBarQueryRequest = z.infer<typeof findBarQueryRequestSchema>;

export const findBarStepRequestSchema = z
  .object({
    forward: z.boolean(),
  })
  .strict();
export type FindBarStepRequest = z.infer<typeof findBarStepRequestSchema>;

export const findBarResultSchema = z
  .object({
    activeMatchOrdinal: z.number().int().nonnegative(),
    matches: z.number().int().nonnegative(),
  })
  .strict();
export type FindBarResult = z.infer<typeof findBarResultSchema>;
