# cc application runtime

This private workspace package bundles the cc server, host daemon, web UI, CLI,
and SDK for the desktop app. It is not published to npm.

Install the macOS app:

```sh
brew install --cask codythatsme/tap/cc
open -a cc
```

Update it with `brew upgrade --cask codythatsme/tap/cc`. The cask installs the app;
it does not replace your system C compiler's `cc` command.

For source development, run `pnpm install` and `pnpm start` from the repository
root. Launcher commands are available as `pnpm start config list`,
`pnpm start env list`, and `pnpm start stop`. `pnpm cli --help` exposes the CLI.
Persistent data lives under `~/.cc`, with separate checkout-specific development
state under `~/.cc-dev`.

The packaged app does not fetch npm updates. The launcher still supports source
checkout updates with `pnpm start --in-app-updates`. Remote host enrollment uses
the server's bundled host artifact; it never falls back to an unrelated npm
package.

Remote connect requires your own service configured through `CC_CONNECT_BASE_URL`
or an explicit `cc connect --server <url>` command. Community marketplaces are
opt-in via `CC_MARKETPLACE_URL` or `cc marketplace add`; bundled official plugins
work locally. cc has no usage telemetry or remote crash reporting.

See [configuration](../../docs/configuration.md) and the [main README](../../README.md).
