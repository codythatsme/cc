cc is a personal fork of bb with its own app identity, data directories, CLI/API names, and a new cc visual identity.

Usage telemetry, analytics, tracking identifiers, and the controls that could enable reporting have been removed. Upstream hosted services require explicit configuration. Built-in model providers still connect to their respective services when you use them.

Install on Apple Silicon macOS 13 or newer:

```sh
brew tap codythatsme/tap
brew install --cask cc
```

The initial build is not Apple-notarized. If macOS blocks the first launch, approve cc in System Settings → Privacy & Security → Open Anyway. Homebrew does not disable Gatekeeper. Upgrades use `brew upgrade --cask cc`.

The original MIT license is preserved. Source: https://github.com/codythatsme/cc
