cc 0.44.1 introduces the Soft Carbon identity: sculpted charcoal lettering on a warm ivory app tile, with matching branding across desktop, mobile, web, and social-sharing assets. Dark surfaces use a pearl version with the same dimensional finish.

This release also fixes a package-file ordering issue that blocked automated release checks. The plugin SDK remains bundled with cc.

Usage telemetry, analytics, tracking identifiers, and the controls that could enable reporting have been removed. Upstream hosted services require explicit configuration. Built-in model providers still connect to their respective services when you use them.

Install on Apple Silicon macOS 13 or newer:

```sh
brew tap codythatsme/tap
brew install --cask cc
```

This build is not Apple-notarized. If macOS blocks the first launch, approve cc in System Settings → Privacy & Security → Open Anyway. Homebrew does not disable Gatekeeper. Upgrades use `brew upgrade --cask cc`.

The original MIT license is preserved. Source: https://github.com/codythatsme/cc
