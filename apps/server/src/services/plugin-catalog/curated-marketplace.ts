import type { MarketplaceManifest } from "./marketplace-manifest.js";
import { CURATED_PLUGIN_MARKETPLACE_NAME } from "@cc/server-contract";

export const BUNDLED_CURATED_MARKETPLACE: MarketplaceManifest = {
  schemaVersion: 1,
  name: CURATED_PLUGIN_MARKETPLACE_NAME,
  displayName: "CC Community",
  description: "Add a marketplace to browse community plugins.",
  plugins: [],
};
