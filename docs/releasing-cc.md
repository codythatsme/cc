# Releasing cc

The supported binary is the Apple Silicon desktop app for macOS 13+. The fork is
published at `codythatsme/cc`, and the cask at `codythatsme/homebrew-tap`.
The bundled runtime and plugin SDK are built from this repository; an npm package
named `cc-app` is not published or required for desktop installation.

## Build and verify

Use Node 22.19+ and pnpm 9.15.0, matching `.nvmrc` and `packageManager`.

```sh
pnpm install --frozen-lockfile
TURBO_TELEMETRY_DISABLED=1 pnpm exec turbo run typecheck test --filter=@cc/desktop --filter=cc-app --concurrency=3
CSC_IDENTITY_AUTO_DISCOVERY=false TURBO_TELEMETRY_DISABLED=1 pnpm exec turbo run desktop:build --filter=@cc/desktop --concurrency=3
pnpm exec turbo run smoke:packaged --filter=@cc/desktop
pnpm --dir apps/desktop run desktop:version-feed
node scripts/generate-homebrew-cask.mjs apps/desktop/release
```

The cask generator hashes the actual zip and uses an immutable versioned release
URL. Never overwrite versioned release archives once a cask has shipped.

## Publish and update the tap

Keep `apps/desktop/package.json` and `packages/cc-app/package.json` versions in
sync. Commit all changes, create a `vX.Y.Z` tag, and push it. The Release cc workflow
builds, checks, and publishes the archives, update feed, and `cc.rb` on GitHub.
A manual workflow run builds artifacts without publishing.

Download `cc.rb` from that versioned release, copy it to `Casks/cc.rb` in
`codythatsme/homebrew-tap`, review it, then commit and push the tap change.
Only the published archive's SHA-256 belongs in the cask. Verify with:

```sh
brew update
brew info --cask codythatsme/tap/cc
brew fetch --cask codythatsme/tap/cc
brew upgrade --cask codythatsme/tap/cc
```

The cask installs only `cc.app`; no `cc` executable is linked over the C compiler.
Use the app's CLI setup or `pnpm cc` from a source checkout for CLI commands.

## Apple signing

Initial releases are not Apple-notarized and may need first-launch approval in
System Settings → Privacy & Security. The cask never removes quarantine or
disables Gatekeeper. To sign and notarize future builds, configure the fork's
`MACOS_CERTIFICATE_P12`, `MACOS_CERTIFICATE_PASSWORD`, `APPLE_ID`,
`APPLE_APP_PASSWORD`, and `APPLE_TEAM_ID` GitHub Actions secrets. An optional
`MACOS_CERTIFICATE_NAME` selects the identity. The existing build wrapper validates
that the signing credentials are complete before using them.

## Upstream provenance

Initial fork base: `get-bb/bb` commit
`66bbc1a2d80bdaba936d9df6cd583953a5f23937` (desktop version 0.44.0).
The original MIT license and copyright are retained. Git history preserves the
upstream project history. The fork has its own package names, app identity,
release feeds, and data directory.
