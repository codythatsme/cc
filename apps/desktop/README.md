# @cc/desktop

macOS and Linux Electron shell for cc. The desktop app loads the existing cc
web UI and uses the packaged `cc-app` launcher for server and host-daemon
lifecycle.

## Development

From the repo root, run `pnpm dev` in one terminal for the source server and
live UI updates. In a second terminal, start the Electron shell:

```bash
pnpm exec turbo run dev --filter=@cc/desktop
```

The dev script builds `cc-app`, compiles the Electron main/preload files, and
opens Electron directly. By default it uses the same checkout-scoped
`~/.cc-dev/<checkout-instance>` data directory and deterministic high ports as
`pnpm dev`; it prints the resolved data dir, server URL, and
Electron user-data dir at startup. It intentionally overwrites inherited
`CC_DATA_DIR`, `CC_SERVER_PORT`, `CC_SERVER_URL`, and `CC_HOST_DAEMON_PORT` so a
desktop dev run launched from an existing cc session still targets the current
checkout. Set `CC_DESKTOP_USER_DATA_DIR` to override only Electron's user-data
directory.

The launcher probes the checkout's Vite app port at startup and adapts:

- **`pnpm dev` is already running** (Vite reachable): the shell loads the Vite
  dev URL, so you get live source and HMR for `@cc/app` changes — no rebuild
  needed. It still attaches to the same running server/daemon for all API/WS
  traffic. The launcher prints `app <url> (Vite dev server — live reload)`. This
  is the fast loop for iterating on the desktop UI.
- **`pnpm dev` is not running**: the shell starts its own `cc-app` runtime and
  loads the built UI it serves, so you must rebuild (re-run this task) to pick up
  source changes. The launcher prints `app (own cc-app runtime — …)`.

The override is plumbed via `CC_DESKTOP_APP_URL`, which the launcher only sets
when Vite is confirmed reachable; it is never set in packaged builds, so
production always loads the server's own built UI.

To run the slower unpacked Electron Builder app, which more closely matches the
packaged runtime and keeps native dependencies rebuilt for Electron's bundled
Node runtime:

```bash
pnpm exec turbo run start --filter=@cc/desktop
```

Electron is pinned to `44.3.0`. macOS builds require macOS 13 (Ventura) or
newer. The bundled `cc-app` runtime uses `better-sqlite3@13.0.3`, whose N-API
binaries work with Electron without an ABI-specific rebuild. The packaging
hook opens an in-memory database with Electron before accepting the packaged
SQLite module; older ABI-specific modules still use the prebuild fallback.

## Validation

```bash
pnpm exec turbo run typecheck --filter=@cc/desktop --filter=cc-app
pnpm exec turbo run build --filter=@cc/desktop
pnpm exec turbo run test --filter=@cc/desktop --filter=cc-app --force
pnpm exec turbo run dev --filter=@cc/desktop
```

The desktop tests include an Electron startup smoke that opens a real window.
On Linux it runs only when `DISPLAY` is set; on a headless host, wrap the test
command in `xvfb-run -a`, as CI does.

## Packaging

```bash
pnpm exec turbo run desktop:build --filter=@cc/desktop
pnpm exec turbo run smoke:packaged --filter=@cc/desktop
```

Artifacts are written under `apps/desktop/release/`. The macOS build is Apple
Silicon arm64-only; Intel Macs are not a target. Without signing secrets, local builds
sign with a code-signing identity auto-discovered from the keychain and skip
notarization. A valid signature matters even for local builds: macOS
provenance-tracks unsigned apps, forcing syspolicyd to evaluate every exec in
the app's process tree, which can stall process launches system-wide. On
machines with no keychain identity (or with `CSC_IDENTITY_AUTO_DISCOVERY=false`,
as CI sets for workflow-artifact-only builds), artifacts remain unsigned and
macOS shows the normal Gatekeeper warning on first launch.

For local verification without publishing, use
`pnpm exec turbo run package --filter=@cc/desktop` on macOS, or
`pnpm exec turbo run package:linux --filter=@cc/desktop` on Linux.

npm's bundled dependencies are copied through an explicit `files` entry into
`node_modules/npm/node_modules`, including nested dependency versions. pnpm's
dependency listing omits this bundled tree, and electron-builder's dependency
copier excludes nested `node_modules`. `asarUnpack` alone cannot preserve files
that the collector never selected. The explicit file set enters both ASAR's
file index and its unpacked resources before signing.

Packaging runs an offline npm smoke check in `afterPack`, before signing or
publishing. This requires a native target host (macOS arm64 or Linux x64).
`smoke:packaged` repeats it against the resulting artifact. To run only npm
verification without opening a desktop window:

```bash
pnpm exec turbo run smoke:packaged-npm --filter=@cc/desktop
pnpm exec turbo run smoke:packaged-npm --filter=@cc/desktop -- /absolute/path/to/cc.app/Contents/MacOS/cc
```

On Linux, the optional argument is the executable inside `linux-unpacked/` or
an extracted AppImage. The check resolves npm from packaged `cc-app`, audits
required dependency edges and version ranges in npm's entire bundled tree using
both CJS and ESM resolution, rejects paths outside packaged resources, imports npm's ESM display
dependencies, and verifies its version. It then uses bundled Electron and npm
to pack, install, and update a disposable plugin's dependency from 1.0.0 to
2.0.0, verifying the lockfile and importing the plugin's ESM entry after each
install. It uses the plugin install flags, an empty PATH, offline mode, a fresh
HOME/cache/config, and disabled lifecycle scripts. No system Node/npm or user
store is used by the child processes. It also hashes ASAR and unpacked resources
before and after to reject bundle mutations. Fixtures are removed afterward.

The cc-app tarball smoke covers a different packaging pipeline and cannot
detect Electron artifact omissions. A source build or `npm --version` alone
does not verify a desktop plugin dependency install.

### Linux (AppImage, x64)

Linux packaging targets x64 glibc-based distributions. Install `python3`,
`make`, and `g++` so node-gyp can build node-pty during dependency installation.

From the repo root, build an unpacked app, an AppImage distribution, or smoke
test the current packaged output with:

```bash
pnpm exec turbo run package:linux --filter=@cc/desktop
pnpm exec turbo run desktop:build:linux --filter=@cc/desktop
pnpm exec turbo run smoke:packaged --filter=@cc/desktop
```

Running an AppImage normally requires FUSE and, on some distributions, the
`libfuse2` compatibility package. If FUSE is unavailable, launch it with
`--appimage-extract-and-run` instead.

Linux users whose window manager supplies all window controls can remove the
native Electron title bar with `--no-window-frame`:

```bash
./cc-x86_64.AppImage --no-window-frame
```

The native frame remains the default. Changing this startup option requires a
full desktop app restart.

Linux users can opt into a transparent Electron window with
`--transparent-window`:

```bash
./cc-x86_64.AppImage --transparent-window
```

The window remains opaque by default. Transparency also requires a compositor
that supports it, and Electron documents limitations including unsupported
window shaping and unreliable resize behavior on some platforms. The flag can
be combined with `--no-window-frame`, and changing it requires a full desktop
app restart.

CI builds Linux artifacts on the pinned `ubuntu-22.04` runner. The AppImage
links against the build machine's glibc, so that pin sets the oldest
distribution that can run a published build. Raise it deliberately.

Linux gets both update paths, but they are not equivalent:

- The JSON version feed (`desktop-version-linux.json`) is polled on every Linux
  install and reports that a newer release exists.
- Self-installing auto-update runs only inside an AppImage whose directory the
  app can write to. electron-updater detects the AppImage through the `APPIMAGE`
  environment variable, and its install step unlinks the running file _before_
  moving the replacement in — so a read-only directory would delete the app and
  leave nothing behind. Both the startup check and the install handler verify
  write and search access on the parent directory first.
- Everything else — an extracted directory, a distribution package, or an
  AppImage in a read-only location — reports new versions without installing
  them.

The Linux AppImage is unsigned, and electron-updater performs no signature
check on Linux: it verifies only the SHA-512 recorded in the update metadata
that ships beside it. macOS installs through Squirrel, which additionally
requires the replacement to satisfy the running app's code-signing
requirement. Write access to the release assets is therefore sufficient to
push code to Linux clients. Treat the release token accordingly.

## Releasing

`cc-app` and `@cc/desktop` versions are LOCKED in lockstep. The desktop package
depends on `cc-app: workspace:*`, and the displayed release version string must
match `packages/cc-app/package.json`.

To bump for a release:

```bash
node scripts/bump-version.mjs <new-version>
```

Then commit and ship through the normal `sawyer-next` → `main` flow. You can also
use `--patch`, `--minor`, or `--major` instead of an explicit version.

CI enforces this lockstep. Direct edits that leave
`packages/cc-app/package.json` and `apps/desktop/package.json` with different
versions fail the build. Never edit either package version directly for a
release; use `scripts/bump-version.mjs` so both files move together.

The desktop release tag uses the locked version: `desktop-v<version>` for
immutable releases and `desktop-latest` for the moving pointer.

`build-desktop.yml` builds macOS and Linux in parallel jobs, then publishes
both from one job. The moving release resets all of its assets on each publish,
so a single publisher is what keeps one platform from deleting the other's
binaries. Each platform has its own update feed file inside the same release
tag:

| Platform | Artifacts              | electron-updater metadata | Version feed                 |
| -------- | ---------------------- | ------------------------- | ---------------------------- |
| macOS    | `.dmg`, `.zip` (arm64) | `latest-mac.yml`          | `desktop-version.json`       |
| Linux    | `.AppImage` (x64)      | `latest-linux.yml`        | `desktop-version-linux.json` |

macOS keeps the unsuffixed feed name because released macOS builds already
request it. Linux artifacts are unsigned; only the macOS binaries wait on the
Apple signing secrets.

## Nightly channel

The scheduled `publish-cc-app.yml` workflow runs from `main` every day at
3:00 AM Pacific (`America/Los_Angeles`, including daylight-saving changes). It
derives a unique version such as `0.34.1-nightly.<run-id>.<attempt>` without
committing that version, publishes `cc-app` with the npm `nightly` dist-tag,
and builds the desktop app from that same lockstep version.

To publish or dry-run the channel manually from `main`, dispatch the same
workflow with `npm_tag=nightly`. A non-dry run publishes both npm and desktop;
a dry run validates only the npm package path.

A stable release also refreshes the channel. A non-dry `npm_tag=latest` run
publishes the release, then derives the next nightly version from the release
commit and publishes npm and desktop nightly again. Without this step the
nightly channel stays below `latest` until the next scheduled run.

The nightly desktop is a separate installation:

- product name: `cc Nightly`
- bundle identifier: `io.github.codythatsme.cc.nightly`
- Linux binary name: `cc-nightly`, so it never shadows stable `cc` on PATH
- app/update release: `desktop-nightly`
- update metadata: `nightly-mac.yml` and `nightly-linux.yml`
- version feeds: `desktop-version.json` (macOS) and
  `desktop-version-linux.json` (Linux)
- icon: `assets/icon-nightly.icns` and `assets/icon-nightly.png`

Download it from
[`desktop-nightly`](https://github.com/codythatsme/cc/releases/tag/desktop-nightly)
or run the CLI build with:

```bash
npx cc-app@nightly
```

Stable and nightly desktop bundles can coexist. Electron-owned preferences,
window state, and process supervision use separate application data
directories; the embedded cc runtime still uses the normal `~/.cc` data and
default server port unless the corresponding environment variables are
overridden.

Nightly builds set `CC_DESKTOP_RELEASE_CHANNEL=nightly` at build time. The value
is baked into the Electron main/preload bundles and selects the nightly product
identity, yellow icon, and update URLs. Omit the variable (or set it to
`latest`) for stable and local builds.

## About panel

The app menu's About item opens a message box listing the facts a bug report
needs: version, build type, commit, build date and how old that build is
("3 days old"), plugin SDK version, Electron version, and OS. Its **Copy**
button puts that whole block on the clipboard. The age is computed when the
dialog opens, so a long-running session still reports it correctly.

The native About panel is populated too, minus the age, since Electron takes
those options once at startup. `scripts/build.mjs` bakes the build-time half of
the facts into the bundles:

| Variable                | Default when unset                                    |
| ----------------------- | ----------------------------------------------------- |
| `CC_DESKTOP_COMMIT`     | `GITHUB_SHA`, else `git rev-parse HEAD`, else unknown |
| `CC_DESKTOP_BUILD_DATE` | The build's own timestamp, ISO 8601                   |

The plugin SDK version is read from `packages/plugin-sdk/package.json` at build
time. A checkout with no git metadata reports `Commit: unknown` rather than
failing the build.

## macOS signing + notarization

The desktop package is ready for Developer ID signing and Apple notarization.
Local builds with no secrets sign via keychain auto-discovery and skip
notarization. To activate signed and notarized release artifacts, add these
GitHub Actions secrets:

| Secret                       | Value                                                                                                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MACOS_CERTIFICATE_P12`      | Base64-encoded `.p12` exported from Keychain Access for a `Developer ID Application` certificate and its private key. On macOS: `base64 -i DeveloperID.p12 -o certificate.base64.txt`. |
| `MACOS_CERTIFICATE_PASSWORD` | Password used when exporting the `.p12`.                                                                                                                                               |
| `MACOS_CERTIFICATE_NAME`     | Optional certificate common name, without the `Developer ID Application:` prefix. Leave unset when the `.p12` contains a single usable identity and electron-builder can derive it.    |
| `APPLE_ID`                   | Apple ID email for the Developer Program account.                                                                                                                                      |
| `APPLE_APP_PASSWORD`         | App-specific password from `appleid.apple.com` under Sign-In and Security.                                                                                                             |
| `APPLE_TEAM_ID`              | Developer Team ID from `developer.apple.com/account` membership details.                                                                                                               |

Once those secrets are present, the next `Build Desktop` workflow run with
`publish=true` and `release_channel=stable` signs the `.app`, notarizes it, and
publishes the signed `.dmg` / `.zip` assets to `desktop-latest`. If no required
signing secrets are configured, the workflow still builds unsigned artifacts, but
the release job publishes only `desktop-version.json` and withholds unsigned
binaries from `desktop-latest`. If only some required signing secrets are set,
the workflow fails before packaging so a misconfigured release cannot silently
produce unsigned or signed-but-not-notarized artifacts.

## Auto-update

The renderer update toast keeps using `desktop-version.json` as the lightweight
feature surface. The installer path uses `electron-updater` against the same
`desktop-latest` release asset directory and reads `latest-mac.yml`. These
checks run in parallel on launch, hourly, and when the app becomes active: the
JSON feed can show "update available" even when CI has published metadata only,
while the Electron updater only flips the toast to "ready to install" after a
signed update has actually downloaded. Local dev builds skip Electron auto-update
unless `CC_DESKTOP_AUTO_UPDATE=1` is set.

`cc Nightly` follows the equivalent isolated `desktop-nightly` release and
`nightly-mac.yml`; it never reads or moves the stable feed. The scheduled
workflow requires the complete signing/notarization secret set before
publishing nightly desktop assets.

To verify a downloaded or unpacked build:

```bash
spctl --assess --verbose /path/to/cc.app
codesign --verify --deep --strict --verbose=2 /path/to/cc.app
```

## Debugging

Use the View menu to toggle DevTools. To open them automatically on launch, set
`CC_DESKTOP_OPEN_DEVTOOLS=1`:

```bash
CC_DESKTOP_OPEN_DEVTOOLS=1 apps/desktop/release/mac-arm64/cc.app/Contents/MacOS/cc
```

When the desktop app spawns `cc-app`, server and daemon logs land under
`~/.cc/logs/` or `$CC_DATA_DIR/logs/` when `CC_DATA_DIR` is set.

To verify attach-if-found manually, start a compatible cc first, then launch the
desktop app:

```bash
npx cc-app@latest
pnpm exec turbo run dev --filter=@cc/desktop
```

The desktop supervisor handles normal quits plus `SIGINT` and `SIGTERM`, and it
writes a PID file so the next launch can reap a stale Electron-owned `cc-app`
launcher. Hard crashes such as process aborts, segfaults, or kernel-level kills
cannot run cleanup in the crashing process; the startup PID-file reap is the
recovery path for those cases.

### Saved servers

Use **cc → Desktop Settings → Server → Add Server…** to save and switch to
another machine's HTTP(S) cc server URL. **Window → Server** opens the same
menu. Saved URLs remain in the menu across restarts; adding an existing URL
selects it without creating a duplicate. **This Mac** on macOS or **This
Computer** on Linux switches back to the built-in server without removing
saved entries.

**Set Server URL…** edits the last selected custom server. Clearing its URL removes
that entry and switches an active custom target to the built-in server. Other
saved servers and Connect discovery remain available. Existing single-server preferences are
loaded automatically into the saved list in `<userData>/server-target.json`.

### Server moves

After `cc server move`, the old computer's data dir (`~/.cc` or
`$CC_DATA_DIR`) contains `server-moved.json`. The desktop app reads it at
startup, whenever the built-in server target loads, and while that target is active.
While the target is active, the app watches the data dir. If `fs.watch` fails,
for example with `ENOSPC`, the app checks the file every 2 seconds instead
(`src/server-moved.ts`). The server writes the lock before the new machine
takes over and removes it if the move is rolled back, so the app acts only on a
committed move. A move is committed when the local server address answers
`/health` with 410 `code: "server_moved"`, or when nothing listens there and no
launcher process is alive. The app checks once when it starts or loads the
built-in server. When a move finishes while the app is open, the app checks every
second for up to 120 seconds. It stops if the lock disappears. The first time the app
sees a committed lock for a `moveId`, it switches the server target once:

- `mode: "connect"` selects `connectHandle` with `serverUrl`.
- `mode: "direct"` sets the custom server URL. When a move finishes while
  the app is open, the app waits up to 60 seconds for the new `/health`
  endpoint before it switches the window.

The app shows "Your cc server moved to <toHostName>" once for each `moveId`
(`<userData>/server-move-notice.json`). It still starts its own `cc-app`
launcher unless another cc process answers the local server port. The launcher
runs this computer as a regular machine, and quitting the app stops it. If the
app has no stored cc Connect credential, it signs in to a connect target with
the `x-cc-connect-machine` header that the move wrote to the data dir's
`config.json`. The app logs a warning and ignores an invalid lock.

On startup, a saved built-in server choice also switches to the moved server;
it never starts the old copy automatically. A different saved remote server
choice remains selected. Explicitly picking the built-in server while the move
lock exists shows "cc moved to <toHostName>" with **Open <toHostName>** and
**Choose server…**. The screen explains whether the old copy is locked or was
deleted. Selecting the built-in server does not unlock the old copy or remove
its background machine service.

Startup error screens list their actions as buttons. Any screen where
retrying can help shows **Try again**. **Choose server…** opens the Server menu,
where the user can select the built-in server if needed. A cc Connect
`unauthorized` error has no **Try again**, because the same credential fails
the same way. **Reconnect** opens account sign-in in a desktop
window. The app clears its old account sign-in, waits for a new session, then
retries the selected server. A valid account session can mint and renew the
desktop session when a machine credential is rejected. Closing the sign-in
window leaves the error screen available. Fatal errors have no buttons. The renderer sends the chosen
action on `cc-desktop:startup-action`. The main process accepts only actions
from the error page that is currently loaded in an app window's main frame.
