import { describe, expect, it } from "vitest";
import {
  marketplacePublisherLabel,
  pluginPublisherLabel,
} from "../../../src/services/plugin-catalog/marketplace-publishers.js";
import { BUNDLED_CURATED_MARKETPLACE } from "../../../src/services/plugin-catalog/curated-marketplace.js";

function publisherLabels(
  marketplaces: Array<{ marketplaceName: string; displayName: string }>,
): Map<string, string> {
  return new Map(
    marketplaces.map((marketplace) => [
      marketplace.marketplaceName,
      marketplacePublisherLabel(marketplace),
    ]),
  );
}

describe("marketplace publisher labels", () => {
  it("names each marketplace by its own display name", () => {
    const labels = publisherLabels([
      { marketplaceName: "cc-community", displayName: "CC Community" },
      { marketplaceName: "acme", displayName: "Acme Plugins" },
    ]);

    expect(
      pluginPublisherLabel({
        sourceKind: "git",
        provenance: "catalog",
        catalogMarketplaceName: "cc-community",
        labels,
      }),
    ).toBe("CC Community");
    expect(
      pluginPublisherLabel({
        sourceKind: "npm",
        provenance: "catalog",
        catalogMarketplaceName: "acme",
        labels,
      }),
    ).toBe("Acme Plugins");
  });

  it("refuses a reserved label to a marketplace that is not CC's", () => {
    const labels = publisherLabels([
      { marketplaceName: "acme", displayName: "CC Official" },
    ]);

    expect(
      pluginPublisherLabel({
        sourceKind: "git",
        provenance: "catalog",
        catalogMarketplaceName: "acme",
        labels,
      }),
    ).toBe("acme");
    expect(
      marketplacePublisherLabel({
        marketplaceName: "acme",
        displayName: "CC Community",
      }),
    ).toBe("acme");
    expect(
      marketplacePublisherLabel({
        marketplaceName: "cc-community",
        displayName: "CC Community",
      }),
    ).toBe("CC Community");
  });

  it("keeps a store-installed bundled plugin on CC Official", () => {
    const labels = publisherLabels([
      { marketplaceName: "cc-community", displayName: "CC Community" },
    ]);

    expect(
      pluginPublisherLabel({
        sourceKind: "builtin",
        provenance: "catalog",
        catalogMarketplaceName: "cc-community",
        labels,
      }),
    ).toBe("CC Official");
  });

  it("badges bundled plugins CC Official and user installs not at all", () => {
    const labels = publisherLabels([]);

    expect(
      pluginPublisherLabel({
        sourceKind: "builtin",
        provenance: "builtin",
        catalogMarketplaceName: null,
        labels,
      }),
    ).toBe("CC Official");
    expect(
      pluginPublisherLabel({
        sourceKind: "git",
        provenance: "direct",
        catalogMarketplaceName: null,
        labels,
      }),
    ).toBeNull();
  });

  it("does not reuse CC Official for the marketplace cc curates", () => {
    expect(BUNDLED_CURATED_MARKETPLACE.displayName).toBe("CC Community");
  });
});
