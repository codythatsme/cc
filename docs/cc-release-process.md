# Releasing cc

cc is released from `codythatsme/cc` and installed through the Homebrew cask in
`codythatsme/homebrew-tap`. The private `cc-app` workspace package and plugin SDK
are bundled into the application; this fork does not publish them to npm.

1. Keep `packages/cc-app/package.json` and `apps/desktop/package.json` versions
   aligned, update the changelog and `docs/release-notes.md`, and run the relevant
   Turbo typechecks, tests, desktop build, and packaged smoke check.
2. Push a `v<version>` tag matching both package versions. The Release cc workflow
   in `.github/workflows/build-desktop.yml` builds on macOS, creates the versioned
   GitHub release, and updates the `desktop-latest` feed.
3. Copy the generated `cc.rb` cask to `Casks/cc.rb` in
   `codythatsme/homebrew-tap`. Its version, artifact URL, and SHA-256 must match
   the versioned release asset. Validate with `brew audit --cask` and install or
   upgrade from the tap to smoke-test the published artifact.

Users install with `brew install --cask codythatsme/tap/cc` and update with
`brew upgrade --cask codythatsme/tap/cc`. Homebrew installs `cc.app`, without
replacing `/usr/bin/cc` or adding a compiler-shadowing `cc` executable to PATH.

Apple signing and notarization are enabled when the repository's macOS signing
secrets are configured. Preserve the MIT license and upstream attribution in
every distribution. Cloudflare deployment and Expo publishing are separate
self-hosting tasks and require the fork owner's own accounts and configuration.
