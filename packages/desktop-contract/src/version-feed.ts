import { z } from "zod";

const isoUtcDateTimeSchema = z.iso.datetime();

const ccDesktopVersionFeedFileSchema = z.object({
  url: z.string().min(1),
  sha512: z.string().min(1),
  size: z.number().int().nonnegative(),
});

export const ccDesktopVersionFeedPlatformSchema = z.enum(["macos", "linux"]);
export type CcDesktopVersionFeedPlatform = z.infer<
  typeof ccDesktopVersionFeedPlatformSchema
>;

export const ccDesktopVersionFeedSchema = z.object({
  schemaVersion: z.literal(1),
  channel: z.enum(["latest", "nightly"]),
  platform: ccDesktopVersionFeedPlatformSchema,
  version: z.string().min(1),
  releaseDate: isoUtcDateTimeSchema,
  releaseName: z.string().min(1),
  releaseNotes: z.string().nullable(),
  minimumSystemVersion: z.string().min(1).nullable(),
  files: z.array(ccDesktopVersionFeedFileSchema).min(1),
  path: z.string().min(1),
  sha512: z.string().min(1),
  stagingPercentage: z.number().min(0).max(100).nullable(),
});
export type CcDesktopVersionFeed = z.infer<typeof ccDesktopVersionFeedSchema>;

const CC_DESKTOP_VERSION_FEED_FILE_NAMES = {
  linux: "desktop-version-linux.json",
  macos: "desktop-version.json",
} as const satisfies Record<CcDesktopVersionFeedPlatform, string>;

export function createCcDesktopVersionFeedFileName(
  platform: CcDesktopVersionFeedPlatform,
): string {
  return CC_DESKTOP_VERSION_FEED_FILE_NAMES[platform];
}
