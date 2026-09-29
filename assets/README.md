# cc brand assets

The cc mark is original vector artwork in `cc-logo.svg`: two open, rounded c shapes. Desktop tiles use a teal gradient, with plum for development and amber for nightly builds. Light and dark marks share the same geometry.

From the repository root, regenerate all desktop, mobile, web, PWA, and connect-page icons:

```sh
pnpm --filter @cc/app generate:brand-assets
```

The generator uses the existing `sharp` dependency. It creates PNGs and a complete multi-resolution ICNS container directly, so regeneration works without macOS utilities or an image generation service. PWA maskable icons keep the mark within their safe region; monochrome icons have a transparent background. iOS light icons are opaque, while dark appearance icons preserve transparency.

`cc-banner.svg` is the source for the README banner and social sharing card. The banner uses system Helvetica/Arial fonts; PNG text rendering can vary across operating systems. Icons contain no text or fonts and are deterministic for a fixed `sharp` version.

Check the generated PWA variants with:

```sh
pnpm --filter @cc/app generate:pwa-icons:check
```

The old upstream app screenshot was removed because its embedded product names and telemetry UI did not represent this fork.
