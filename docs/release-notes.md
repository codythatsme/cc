cc 0.49.0 brings the fork up to date with upstream development through November 16, 2026. That covers the upstream 0.45 through 0.49 releases and later fixes: native Windows support, a navigation rail, reusable prompts, Settings search, an MCP server, diff review, faster loading, lighter live updates, and a long list of reliability fixes. See the changelog for details.

Privacy is unchanged: cc sends no usage telemetry, analytics events, installation identifiers, or crash reports. This release removes the reporting that upstream added since the last sync: the client event endpoint, setup-guide and website experiments, plugin-use and initiator events, and website download tracking. Better Auth's reporting package is patched to be inert at its new version, and cc still disables analytics and OpenTelemetry for the Claude Code and Codex processes it launches.

New mobile, splash, and brand artwork uses the Soft Carbon identity. Upstream hosted services require explicit configuration. Built-in model providers still connect to their own services when you use them.

Install on Apple Silicon macOS 13 or newer:

```sh
brew tap codythatsme/tap
brew install --cask cc
```

Upgrade with `brew upgrade --cask cc`. This build is not Apple-notarized. If macOS blocks the first launch, approve cc in System Settings → Privacy & Security → Open Anyway. Homebrew does not disable Gatekeeper.

The original MIT license is preserved. Source: https://github.com/codythatsme/cc
