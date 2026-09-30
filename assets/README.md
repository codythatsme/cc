# cc brand assets

Soft Carbon is cc's identity: two sculpted charcoal c forms with rounded edges and soft highlights, paired with a warm ivory canvas. The selected concept is preserved as high-resolution source artwork in `soft-carbon/`:

- `mark.png`: transparent carbon mark for light surfaces.
- `mark-light.png`: transparent pearl mark for dark surfaces, with its own dimensional lighting.
- `app-icon.png`: the carbon mark on an ivory macOS icon tile, transparent outside the tile.

These are the canonical raster sources. Keep their original resolution and transparency. The UI uses compact PNG exports and chooses the appropriate artwork for its current theme; do not flatten the lighting with CSS inversion or brightness filters.

From the repository root, regenerate all desktop, mobile, web, PWA, and connect-page assets:

```sh
pnpm --filter @cc/app generate:brand-assets
```

The generator uses the existing `sharp` dependency to resize and composite the source artwork. It also creates multi-resolution ICNS containers without macOS utilities. The production icon preserves the source tile; nightly and development variants add small amber and plum channel badges. Color-selected PWA icons keep the carbon mark on the selected color tile. Maskable variants keep the mark within their safe region, and monochrome variants use the mark's alpha silhouette. iOS light icons are opaque; dark icons preserve transparency.

`cc-banner.svg` is the layout source for the README banner and social sharing card. Its referenced carbon mark is embedded during PNG export. The layout uses system Helvetica/Arial fonts, so text rendering can vary across operating systems. Icon exports contain no fonts and are deterministic for a fixed `sharp` version and source files.

Check generated assets without writing them:

```sh
node apps/app/scripts/generate-brand-assets.mjs --check
pnpm --filter @cc/app generate:pwa-icons:check
```

The former flat vector mark has been retired. The source artwork, exported icons, and banner are kept together so a release can reproduce the complete identity without calling an image generation service.
