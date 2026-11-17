# Configuration

Install and update the desktop app through `codythatsme/tap/cc` with Homebrew.
Commands written as `pnpm start` below run from a source checkout; no `cc-app` npm
package is published. The cask does not install a global `cc` command.

The packaged `pnpm start` flow stores persistent package settings under
`~/.cc/config.json`, provider environment values under `~/.cc/env.json`, and
client SSH target mappings under `~/.cc/client.json`.

Use `cc-app config` for non-secret cc settings and `cc-app env` for provider
credentials and provider-specific environment:

```bash
pnpm start config set CC_APP_URL https://<machine>.<tailnet>.ts.net
pnpm start config list
pnpm start config unset CC_APP_URL
pnpm start config refresh
pnpm start env set OPENAI_API_KEY <key>
pnpm start env list
pnpm start env unset OPENAI_API_KEY
```

`cc-app config list` shows non-secret values. `cc-app env list` redacts every
value and only shows whether a key is set. When targeting a non-default
running instance, pass the same `--data-dir` and `--server-port` to
`cc-app config` or `cc-app env` so they write the right file and refresh the
right server.

Launcher status output is plain when stdout is redirected, including in CI.
Set `FORCE_COLOR=1` to request color or `NO_COLOR=1` to disable it; `NO_COLOR`
takes precedence. In-place progress updates require a stdout TTY.

## Outbound proxies and trusted certificates

The packaged server and daemon launchers start cc's own Node processes with
`--use-system-ca` and `--use-env-proxy`, and cc's forked workers and provider
bridge workers inherit them.
The flags are not exported as environment variables, so terminals, provider
CLIs, and agent shells keep the Node networking defaults of the user's
environment. `--use-system-ca` adds OS-managed certificate authorities to Node's
bundled roots; `NODE_EXTRA_CA_CERTS` still adds a PEM bundle. Set
`NODE_USE_SYSTEM_CA=0` or `NODE_USE_ENV_PROXY=0` before launch to opt out.

Set `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` (or their lowercase forms) in the
launch environment or with `cc-app env set`. Proxy URLs need an `http://` or
`https://` scheme: when any `HTTP_PROXY`/`HTTPS_PROXY` variable (either case)
lacks one, such as `proxy.corp:3128`, cc starts that Node process without
`--use-env-proxy` and prints a `CC_INVALID_PROXY_ENV` warning instead of letting
Node fail at startup. cc checks this against each process's final environment,
including forked and provider bridge workers that inherit the flag. When a
process keeps `--use-env-proxy` with a proxy set, cc appends
`localhost,127.0.0.1,::1,[::1]` to its existing `NO_PROXY`/`no_proxy` values
(a `*` entry is left as is), so local cc connections stay direct; that process's
children inherit those entries. Restart cc after changing these settings;
existing sockets and workers keep their startup configuration.

Built-in proxy support requires Node 22.21+ or 24.5+ (or Node 26); on older
supported Node releases the launcher omits `--use-env-proxy`. The daemon's
server WebSocket and cc connect tunnel use Node's global agents, so they follow
the same proxy and `NO_PROXY` settings. Libraries that create their own agents
or sockets can still bypass Node's global proxy support; these launch defaults
do not configure those libraries or the OS proxy settings.

## Host executable discovery

Core process launches and the Plugin SDK process helpers share one resolver.
It reads the user's login-shell PATH (or Windows user/machine registry PATH),
and adds the running Node's directory and standard user tool directories to
every child PATH. When the PATH is the one cc started with, the login-shell
PATH comes first; when a caller passes a different PATH, its entries come first
and the login-shell PATH and standard directories follow. Native provider
installs in `~/.local/bin` and
mise/asdf shim directories are available to services as well as terminal launches.
Shell network settings are read alongside PATH; unrelated shell variables are
not copied into child environments. Discovery runs in the background, bounded to
three seconds per probe; launches use the latest completed snapshot and never
wait for a probe. The server, daemon, and packaged desktop app start discovery
at launch; the `cc` CLI does not.

Missing-command errors and exit 127 start a background refresh, and later
launches use its result; commands are never replayed automatically because an
exit 127 can happen after an installation has already changed files. An
unavailable running Node path is re-resolved before launching a worker, and
replacement runtimes must match its native-module ABI and Electron/Node family.
Scripts with a `#!/usr/bin/env node` line run with the `node` found on PATH.
`npm` and `npx` run as found on PATH. Daemon self-update instead runs npm's
JavaScript entry point with the Node installation that owns it, which avoids
version-manager wrapper post-hooks; inside the Electron desktop runtime, cc
never substitutes its own runtime for npm.

Standalone machine bootstrap installers run before the shared runtime is
installed, so their initial Node/package acquisition remains self-contained.

## Repository worktree hooks

Commit `.cc-env-setup.sh` when a managed worktree needs repository setup.
Commit `.cc-env-teardown.sh` when cc must release external resources before it
removes that worktree. See [Worktrees, setup scripts, and teardown
scripts](worktrees.md) for the lifecycle, environment, timeout, and failure
contracts.

## Precedence

Configuration is resolved in this order:

1. Explicit launcher flags, such as `--data-dir`, `--server-port`, or
   `--server-bind-host`.
2. Persistent `cc-app config`, `cc-app env`, and client values.
3. Ambient shell environment.
4. Built-in defaults.

For the packaged app, prefer `cc-app config`, `cc-app env`, and launcher flags
over shell variables. Source-development commands still load `.env` files
(see [Source Development](#source-development)).

After `cc-app config` writes `~/.cc/config.json` or `cc-app env` writes
`~/.cc/env.json`, it asks the running local server to reload. If cc is not
running, the new values apply on the next start. If you edit either file by
hand, run `pnpm start config refresh` to apply it to a running server.

The live reload applies the `CC_APP_URL` config key, `customModels`,
`sharedSkillRoots`, and provider env values. `CC_APP_URL` stored with
`cc-app env` instead of `cc-app config` is startup-only.

These entries are startup-only:

- `CC_APP_SURFACE`, `CC_APP_URL` (when set through `cc-app env`),
  `CC_DATA_DIR`, `CC_DEV_APP_PORT`, and `CC_EXTERNAL_URL`
- `CC_HOST_DAEMON_PORT` and `CC_INHERITED_SKILLS_ROOTS`
- `CC_CONNECT_GATE_KEYS_URL`, `CC_LOG_LEVEL`,
  `CC_MANAGED_DEV_BUILTIN_PLUGIN_HOT_RELOAD`, `CC_MARKETPLACE_URL`,
  `CC_PERF_DIAGNOSTICS`, and `CC_QUERY_PLAN_AUDIT`
- `CC_SERVER_BIND_HOST`, `CC_SERVER_PORT`, and all `CC_FF_*` feature flags

Setting or unsetting one still reloads any other pending changes, but running
processes keep their current values until a full launcher restart
(`cc-app stop && cc-app start`) or a desktop app restart. In particular,
changing or unsetting `CC_SERVER_BIND_HOST` does not close an existing
`0.0.0.0` listener until that restart. `cc-app config refresh` names any
startup-only keys present in `config.json` or `env.json`.

## Stopping A Running cc

A running `cc-app start` writes `<dataDir>/cc-app-runtime.json` (launcher
process id, server URL, version, start time, and launch mode) and removes it on
exit. Do not edit it. `pnpm start stop` uses it to stop the cc that owns the
data directory; pass the same `--data-dir` you started with when it is not the
default `~/.cc/`. The macOS desktop app uses it to offer stopping a cc it did
not start. Both verify the recorded process is a cc launcher before signalling
it, so a stale file cannot stop an unrelated process.

## The cc Command On PATH

Settings → General → Command line has an **Install** button that installs the
cc CLI for use outside cc: it puts the `cc` command on your PATH, so you, a
script, or an agent running outside cc (such as Claude Code or Codex) can
control cc with `cc thread list` and every other CLI command. Threads in cc
already have `cc` on their PATH and need nothing. **Remove** takes it off again. Nothing changes your PATH until
you choose Install. The CLI equivalent is `cc settings cli-command` (show),
`cc settings cli-command install`, and `cc settings cli-command remove`; the
SDK methods are `system.experimental_cliCommand()`,
`system.experimental_installCliCommand()`, and
`system.experimental_removeCliCommand()`, over
`GET /api/v1/system/cli-command` and `POST .../install` and `.../remove`.

- Every start of an installed cc (`pnpm start` or the desktop app) writes a
  small launcher to `<dataDir>/bin/cc` (`cc.cmd` on Windows). It runs the cc
  CLI of the install that started last, with that install's own Node runtime,
  so the desktop app needs no separate Node. After cc moves or updates, start
  it once to refresh the launcher. Source checkouts (`pnpm start`, `pnpm dev`)
  write no launcher and do not show the setting.
- Install acts on the computer that runs the cc server. On macOS and Linux it
  links the launcher into the first usable folder of `/opt/homebrew/bin` and
  `/usr/local/bin` (macOS only), `~/.local/bin`, and `~/bin`, preferring one
  already on your PATH. If the folder is not on your PATH, the setting says so.
  On Windows it appends `<dataDir>\bin` to your user PATH.
- cc never replaces another `cc`. If one already comes first on your PATH
  (most often the system C compiler at `/usr/bin/cc`, or the `~/.local/bin/cc`
  a cc machine install added), the setting names it and Install is refused with
  `409 cli_command_blocked`. Run the launcher directly or add a shell alias with
  another name instead.
- Remove deletes only links that point at a cc launcher, or the
  `<dataDir>\bin` PATH entry on Windows.
- Machine credentials cannot install or remove the command.

`CC_CLI_LAUNCHER` is an internal path the launcher passes to its server child;
do not set it yourself.

## In-App Updates

In-app updates are on when you start cc with `pnpm start` (or a global
`cc-app`) or with `pnpm start` from a source checkout. cc runs under a small
update shim, so Settings → Updates and `cc updates app apply` can update cc
without a terminal. Pass `--no-in-app-updates` to turn them off: cc then starts
without the shim and Settings → Updates shows the npm upgrade command for
release installs. `--in-app-updates`, which earlier releases needed, is still
accepted and changes nothing. Source checkouts show their
Git revision, or a labeled build version when unavailable, and are never compared
with npm releases. Without the update shim, no freshness indicator is shown.
Failed checks report “Latest unknown”; release checks can be retried in the UI,
with `sdk.system.version({ force: true })`, or by rerunning `cc updates`.
`GET /api/v1/system/version` and `sdk.system.version()` expose nullable
`installKind` (`desktop`, `npm`, or `source`) and `currentCommit` fields.

- **npm installs** download the release into
  `<dataDir>/app-versions/<version>/` and restart into it. The shim runs
  whichever is newer, that install or the launched `npx` copy; `--bundled`
  always runs the launched copy. cc keeps the running and previous versions.
  Stable installs follow the `latest` dist-tag and nightly builds `nightly`.
- **Source checkouts** update only from a clean `main` that fast-forwards to
  `origin/main`; cc fast-forwards, runs `pnpm install --frozen-lockfile`,
  rebuilds, and restarts. The sidebar badges a source update once the server
  is more than 30 commits behind `origin/main`, or six hours after the oldest
  missing commit was committed. `available.behindSince` in
  `GET /api/v1/system/app-update` and `cc updates app` report that commit time.

cc does not roll back an update; a version that fails to start runs again on
the next start, and an older release may not open a database the new version
migrated. The outcome is recorded in `<dataDir>/cc-app-update.json` (do not
edit it). Only one launcher manages updates for a data directory; a second
`cc-app start` on it runs with in-app updates off. `pnpm dev`, `cc-server`, and a standalone
`cc-host-daemon` do not offer in-app updates. `CC_APP_UPDATE_MODE`,
`CC_APP_INSTALL_KIND`, `CC_APP_SOURCE_ORIGIN`, and `CC_APP_SOURCE_COMMIT` are
internal markers the launcher passes to its server child; do not set them. See
`cc guide machines` for the `cc updates` commands.

Settings → Updates shows the **Server** row for both standalone servers and servers
hosted by the desktop app. **Update** downloads the release and restarts the
server, using the hosting desktop's native updater when applicable. It asks
before interrupting running threads and checks again when the download finishes.
A separate **Desktop** row appears when the viewing desktop needs attention and
is not the desktop hosting the server. The same server update is available with
`cc updates app apply` and `sdk.system.applyAppUpdate`.

Desktop update capability is an additive `desktopUpdateSupported: true` field in
`SystemAppUpdateStatus`. The legacy `support` value remains
`{ kind: "unsupported", reason: "desktop" }`, so previously shipped clients can
still parse the response and keep their existing desktop update path. New clients
use the capability to offer the shared server controls. If an updater request
fails, confirmed support is retained and installation is blocked until a retry
succeeds. Desktop/server IPC stays within the bundled process tree and does not
change the host-daemon protocol.

## Common Keys

| Key                            | Set with                                           | When to set             | Used for                                                                                                                                                                                                                                                                                                                            |
| ------------------------------ | -------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CC_APP_URL`                   | `cc-app config`                                    | Optional for remote use | Human-facing app URL used for generated links, allowed browser origins, and the allowed DNS hostname for requests. Leave empty for local-only use. Live when set with `cc-app config`.                                                                                                                                              |
| `CC_EXTERNAL_URL`              | `cc-app env`, or environment                       | Startup-only            | Internet-facing HTTPS base URL for generated public links; the fallback for `machineServerUrl`.                                                                                                                                                                                                                                     |
| `CC_MARKETPLACE_URL`           | `cc-app env`, or environment                       | Startup-only testing    | Manifest URL of the reserved `cc-community` marketplace. Default `https://cc.example.invalid/marketplace/v2/marketplace.json` (falls back to v1 on 404); a custom URL is requested without fallback. Changes only `cc-community`.                                                                                                            |
| `CC_CONNECT_GATE_KEYS_URL`     | `cc-app env`, or environment                       | Startup-only testing    | Public key set the cc connect next tunnel ingress verifies gate assertions with. Default `https://cc.example.invalid/.well-known/cc-connect-gate-keys.json`. See [connect-next.md](connect-next.md).                                                                                                                                         |
| `CC_SERVER_URL`                | `cc-app config`                                    | Remote CLI/host use     | Server targeted by the standalone `cc` CLI and `host-daemon` commands on this machine. Defaults to `http://127.0.0.1:38886`. It does not change where `pnpm start` binds.                                                                                                                                                           |
| `CC_SERVER_BIND_HOST`          | `cc-app env`, environment, or `--server-bind-host` | Startup-only            | Server listener host: `127.0.0.1` (default) or `0.0.0.0`. Not a `cc-app config` key. See [Startup Flags](#startup-flags).                                                                                                                                                                                                           |
| `CC_SERVER_PORT`               | `cc-app env`, environment, or `--server-port`      | Startup-only            | HTTP listener port. Defaults to `38886`.                                                                                                                                                                                                                                                                                            |
| `CC_HOST_DAEMON_PORT`          | `cc-app env`, environment, or `--host-daemon-port` | Startup-only            | Local host-daemon API port. Defaults to `38887`.                                                                                                                                                                                                                                                                                    |
| `CC_LOG_LEVEL`                 | `cc-app config`                                    | Startup-only debugging  | `trace`, `debug`, `info`, `warn`, `error`, or `fatal`.                                                                                                                                                                                                                                                                              |
| `CC_SKIP_ONBOARDING`           | Environment                                        | Startup-only            | Default false. `1` marks first-run setup completed at startup when it is not yet, so the setup screen is skipped. Settings → General can still replay it. `pnpm dev`, `pnpm start:worktree`, and `pnpm desktop:worktree` default it to `1`; an explicit `0` retains setup.                                                          |
| `CC_SETUP_GUIDE_VARIANT`       | Environment                                        | Startup-only QA         | `control` or `new` forces the first-run setup guide variant. Unset by default. See [General settings](#general-settings).                                                                                                                                             |
| `CC_PERF_DIAGNOSTICS`          | `cc-app env`, environment, or `--perf-diagnostics` | Startup-only            | Default false. Permits the `performanceDiagnostics` experiment; see [Experiments](#experiments).                                                                                                                                                                                                                                    |
| `CC_QUERY_PLAN_AUDIT`          | Environment                                        | Startup-only debugging  | Default false. `1` logs `Slow SQLite query plan` for each query whose plan walks a large table or picks a weaker index; see [diagnostics](debugging-and-qa.md#slow-sqlite-query-plans). `pnpm dev`, `pnpm start:worktree`, and `pnpm desktop:worktree` default it to `1`. The `performanceDiagnostics` experiment also turns it on. |
| `CC_CLI_ERROR_LOG`             | Environment of the `cc` process                    | Optional                | `0` stops the CLI recording failed invocations (command path, error code, no argument values) to `<dataDir>/logs/cli-errors.jsonl`. See `cc guide overview`.                                                                                                                                                                        |
| `CC_ACCOUNT_POOL_PARENT_URL`   | Set automatically by a parent cc server            | Nested cc servers       | Account Pooler hub of the cc server whose thread launched this one. When present the Account Pooler plugin is enabled on first run and proxies to that parent; `cc pool parent isolate` opts out. Not a `cc-app config` key.                                                                                                        |
| `CC_ACCOUNT_POOL_PARENT_TOKEN` | Set automatically by a parent cc server            | Nested cc servers       | Machine token this nested server presents to the parent hub. Both parent variables must be well formed or proxying stays off.                                                                                                                                                                                                       |

CC accepts request hosts that are `localhost`, IP addresses (including LAN and
Tailscale IPs), or the hostname in `CC_APP_URL`. For a custom DNS name or
reverse proxy, set `CC_APP_URL` (for example `https://cc.example.com`) before
connecting, including from the CLI or SDK; a matching `Host`/`Origin` or
`X-Forwarded-Host` cannot authorize an unconfigured name. A proxy can preserve
the configured host or forward to localhost. cc connect needs no additional
configuration.

## General settings

`idleProviderSessionTimeoutMinutes` (default `30`) sets how long an agent can sit idle after its last turn before every machine stops its provider process to free memory. Allowed values are `0` (ASAP), `5`, `10`, `30`, and `60`. Use Settings → Providers → Configuration → Release idle agent sessions, `cc settings general idleProviderSessionTimeoutMinutes 5`, or SDK `system.updateGeneralSettings({ ...config.generalSettings, idleProviderSessionTimeoutMinutes: 5 })`. Read `config` with `system.config()` or inspect the value with `cc settings show`. Changes apply live and on reconnect. Machines check every five minutes, so release can take up to five minutes beyond the timeout. Only restorable sessions without active, pending, or background work are eligible; threads keep their history and resume on the next message. Manual `cc thread stop` still works. This is not a memory or loaded-process limit.

Server-wide preferences, stored in the cc database and applied live to every
client. Set them in Settings, with `cc settings general <key> <value>`, or with
SDK `system.updateGeneralSettings`, which takes the full settings object (read
the current `generalSettings` and change one key). See `cc guide customization`
for the command surface.

| Key                                                                        | Default                             | Effect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `showDiagnosticEvents`                                                     | `false` in all builds               | Settings → General → Privacy & diagnostics → Show diagnostic events. Shows provider environment resolution and raw provider events cc does not yet understand in the timeline. Warnings, errors, and model fallback stay visible. Hidden diagnostics do not count toward timeline event or byte limits.                                                                                                                                                                                                                                        |
| `steerActiveThreadOnEnter`                                                 | `true`                              | Settings → General → Default thread followup behavior, when no typeahead suggestion is active. `true` ("Steer"): Enter sends to the agent during its current run and Mod+Enter queues the message until the agent stops; `false` ("Queue") swaps them. Installs with saved settings or work from before the setting were migrated once to `false`.                                                                                                                                                                                             |
| `confirmThreadArchive`                                                     | `true`                              | Settings → General → Thread archive confirmation. `false` archives a thread and its children in the app without a confirmation popup; the toast still offers Undo. CLI and SDK archives never prompt.                                                                                                                                                                                                                                                                                                                                          |
| `keepHistoryAfterContextClear`                                             | `false`                             | Settings → General → Show messages from before a context clear. When `false`, a thread's timeline, conversation outline, and message lookup start at its latest `Context cleared` boundary; `true` keeps earlier messages, which load on scroll and appear in the outline and `cc thread log --message`. Clearing always starts a fresh provider conversation and resets the context meter.                                                                                                                                                    |
| `summarizeShellCommands`                                                   | `true`                              | Settings → General → Summarize shell commands. `true` titles a shell command that runs `ls`, `find`, `grep`, `rg`, `cat`, `head`, `tail`, `nl`, or `sed -n` with a summary such as `Searched for X`, and the row does not expand. `false` titles every shell command row with its command (`Running …`, `Ran …`), expands it to the command and its output, and counts it as a command in step summaries. Native read and search tool rows keep their titles.                                                                                  |
| `streamerMode`                                                             | `false`                             | Settings → General. Hides every `customModels` entry from the web and mobile pickers, `cc provider models`, and `sdk.providers.models`, for example before a screen share. Entries stay in `config.json`; a thread that names a hidden model still runs, and default model resolution keeps the full list, so a provider whose only models are custom still starts. A composer whose stored selection is hidden falls back to the provider default and records it on the next send; reselect the custom model after turning streamer mode off. |
| `allowFastServiceTier`                                                     | `true`                              | Settings → Providers. `false` hides the service tier control and runs every new turn at the default tier, including explicit requests for another tier (`fast`, Codex `ultrafast`, or any tier a provider lists), automations, and queued messages. Completed turns and project defaults saved while off keep the default tier.                                                                                                                                                                                                                |
| `managedBranchPrefix`                                                      | `cc/`                               | Settings → General → New branch prefix. Prefix for branches cc creates for worktrees and new checkout branches (`cc/fix-login-flow-thr_ab12cd34ef`); empty for none. At most 64 characters and must start a valid git branch name (no space or leading `-`). Existing branches and worktrees keep their names.                                                                                                                                                                                                                                 |
| `providerOrder`                                                            | `[]`                                | Settings → Providers (move a provider up or down). JSON list of provider ids that lead the picker, such as `'["claude-code","codex"]'`; unlisted ids follow in plugin install order and unknown ids are ignored.                                                                                                                                                                                                                                                                                                                               |
| `defaultProviderId`                                                        | `null`                              | Settings → Providers. Provider for new threads when neither caller nor project chose one; `null` means the first available provider in picker order.                                                                                                                                                                                                                                                                                                                                                                                           |
| `earlyAdopter`                                                             | `false`                             | Settings → Experiments → Become an early adopter. Turns on experiments marked Early adopter unless you set them yourself; see [Experiments](#experiments).                                                                                                                                                                                                                                                                                                                                                                                     |
| `machineServerUrl`, `defaultMachineAccess`, `machineGitCredentialsEnabled` | See [Multi-machine](#multi-machine) | Machine access and credential forwarding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**Terminal clipboard.** Settings → General → Terminals → Copy on select
(`terminalCopyOnSelect`, default `true`) copies completed terminal selections
exactly and shows a "Selection copied" notification. Selections in messages,
files, and prompt editors are unchanged. Disable it with
`cc settings general terminalCopyOnSelect off` or SDK
`system.updateGeneralSettings`, preserving the other general settings.
The server persists it across windows and restarts; older clients that omit it
preserve the saved value. Explicit Copy/Paste remain available when it is off.
On Linux browsers with native primary-selection support, middle-click focuses
the terminal and pastes the primary selection independently of this setting.
Unsupported browsers never substitute unrelated regular clipboard contents.

Older clients that omit `keepHistoryAfterContextClear`,
`summarizeShellCommands`, or `earlyAdopter` preserve the saved value. The
former Show Git changes and Commit button switch is now
[plugin settings](#git-and-github-pr-status-plugins), and the general-settings
API rejects an update that still sends `showGitChanges`. For older SDK callers, the
general-settings API still accepts and returns `showUnhandledProviderEvents` as
a deprecated alias of `showDiagnosticEvents`, and an existing value is
preserved; when a read-modify-write payload contains conflicting values, the one
changed from the saved setting wins. Codex memory and native subagents live on
the Codex provider plugin; Claude Code's options are under
[Claude Code provider](#claude-code-provider).

**Composer keys.** The prompt box uses plain-text editing; Markdown delimiters
stay visible. Outside an open typeahead menu, Shift+Enter inserts a newline. On
coarse-pointer touch devices, the software-keyboard Return inserts a newline
and the submit button sends; iPadOS WebKit keeps the Enter and Command+Enter
shortcuts for a connected Magic Keyboard.

**Completed turn display.** The "Collapse finished turns" switches in Settings
→ Providers store `providerCompletedTurnDisplay`, a map of provider id to
`collapse` (finished work folds into one "Worked for" row and the final answer
stays visible) or `flat` (every step stays visible, as while the turn ran). A
provider without an entry uses its registration's `completedTurnDisplay`
default: Claude Code is `flat`, other first-party providers `collapse`. It
applies to existing threads, the outline, and `cc thread log`. Set it with
`cc settings completed-turns <provider-id> <collapse|flat|default>`, where
`default` removes the entry; `cc settings completed-turns` lists every
provider's current display.

**Setup guide.** A new install opens a first-run setup guide (connect an agent,
add projects, pick plugins, set up devices). `onboardingCompletedAt` records
when it was finished or skipped; `cc settings replay-onboarding`, or Settings →
General → Setup guide, clears it so the guide shows again. The projects step
lists what `cc project discover` and
`cc.sdk.hosts.experimental_discoverRepos({ hostId })` return.
The guide shown is `control` (current) or `new` (redesign), from the app's
`GET /api/v1/system/setup-guide` request (`{ variant }`). It is `control` unless
`CC_SETUP_GUIDE_VARIANT` forces a variant for QA; cc runs no experiments.

**Privacy.** cc sends no usage telemetry, analytics events, or installation
identifiers, and has no setting that enables them. See [Privacy](privacy.md).

## AI services

Thread titles (and the branch names built from them), commit messages, and
voice transcripts come from AI services that plugins register. Each task
(`thread-title`, `commit-message`, `voice`) is `automatic` (default), `off`,
or a service id; set it in Settings → AI services or with
`cc settings ai-services set <task> <value> [--plugin <plugin-id>]` (see
`cc guide customization`). Automatic tries cc cloud (the `cc-ai` plugin, for a
signed-in cc account) first, then every other registered service supporting
the task in lexicographic order of plugin id and service id; unavailable
services and failed requests fall through. A picked service is used alone; if
it fails, titles fall back to the start of the prompt and commits to
`cc: automated commit`. `cc ai off|on` turns cc cloud off and on; see the
`cc-cloud-ai` skill.

The removed `CC_INFERENCE`, `CC_INFERENCE_FALLBACK`, and `CC_TRANSCRIPTION`
keys are ignored with a warning in `~/.cc/config.json`, and `cc-app config set`
refuses them.

cc accepts voice recordings up to 25 MB; a service may set a lower limit, and
Codex transcribes up to 20 MB and cc cloud up to 10 MB. With a ChatGPT
subscription login, Codex transcription can be blocked by Cloudflare bot
protection on some networks; run `codex login --with-api-key` on the primary
machine or pick another voice service.

Open microphone preferences by right-clicking the composer microphone, pressing
Shift+F10 while it is focused, or clicking the Microphone control in Settings →
Voice Input; desktop uses an anchored popover and mobile a drawer. Preferences
are available only while idle; the recording row contains only cancel, stop,
and send. Opening preferences starts a local microphone preview with the
recording waveform and a list of inputs; the preview is not saved or
transcribed, and closing preferences releases it.

The microphone preference is client-local: localStorage
`cc.voiceInput.audioInputDeviceId` holds the selected browser `MediaDevices`
device id. Select System default to follow system microphone changes; the
choice does not change which service transcribes. Recording tries the
preferred device, then the system default, then other available inputs for
missing or unreadable devices; permission denials do not trigger fallback. A
disconnect during recording switches the input into the same recorder,
preserving audio captured before the disconnect. A reconnected preferred
microphone is used again from the next recording; it does not interrupt the
current fallback recording.

A missing preferred microphone alone does not block recording or show a
warning. Capture failures, interrupted input, or no available inputs after
access was granted show a decorative warning badge on the idle microphone;
clicking it then opens preferences. During capture, five seconds of
near-silent audio produces a warning in the open preview or an accessible
status in the recording row. Silence warnings clear when audio returns and
never stop recording or switch microphones automatically.

## Themes

`cc theme` controls CSS-variable overrides for the app palette and typography
(see `cc guide customization`). Custom themes live at
`<cc-data-dir>/theme/<name>/theme.css`, with optional `pierre-dark.json` and
`pierre-light.json` code themes.

The typography tokens are mode-independent and belong in the `:root, .light`
block:

- `--font-sans` controls app UI and body text.
- `--font-mono` controls code blocks, diffs, file paths, and previews.
- `--font-serif` controls serif prose.
- `--font-terminal` controls the integrated terminal's font family.

Always end font stacks with a generic fallback such as `sans-serif` or
`monospace`. The complete theme token reference is in the cc-cli skill's
`references/theming.md`.

## Keyboard Shortcuts

Settings → Keyboard, `cc settings keyboard set|reset`, and SDK
`system.updateKeyboardSettings` store per-command overrides in the server
database, applied live to every window, including desktop menu accelerators.
Reset removes an override so future releases can update the default; `disabled`
unbinds a command. Overrides may be scoped to `mac`, `windows`, or `linux`. Plugin
commands bind as `plugin:<plugin-id>/<command-id>`. See
`cc guide customization` for scoping and plugin-binding rules.

`showKeyboardHints` (default `true`; `cc settings keyboard hints <true|false>`)
shows delayed shortcut badges while the modifier is held; shortcuts work
either way.

`Mod` means Command on macOS and Control on Windows/Linux. Numbered thread and
pane shortcuts follow Slack's browser-safe convention: web uses
`Control+1…9` on macOS and `Ctrl+Shift+1…9` on Windows/Linux, while desktop
uses `Mod+1…9`. The web aliases leave native browser `Mod+1…9` tab switching
untouched. Previous and next thread use `Mod+Shift+[/]` on desktop and
`Control+Shift+[/]` on the web; they follow the sidebar order.

`history.back` / `history.forward` (Go back / Go forward) do the same thing
as the sidebar's back and forward arrows: they move through the pages opened
in the current window, like browser history. They use `Mod+[` / `Mod+]` on
desktop and the web; in the browser, cc handles the key instead of the
browser's own Back while it has somewhere to go. At either end the desktop app
does nothing, while the web app leaves the key to the browser's own Back or
Forward. The commands appear in the command palette only when there is
somewhere to go, and they don't run while the in-app browser has focus.
Hovering an arrow shows its current shortcut.

On macOS, `panel.previousTab` / `panel.nextTab` default to
`Command+Control+ArrowLeft/Right` (cycling visible right-panel tabs and each
pane's New tab button), `panel.previousNewTabItem` / `panel.nextNewTabItem`
to `Command+Control+ArrowUp/Down` (on a New tab page), and
`pane.focus.left|right|up|down` to `Command+Control+Shift+Arrow…` (spatial
chat-pane focus). These start unassigned on Windows/Linux to preserve native
Control-arrow editing. `pane.focus.previous` / `pane.focus.next` and
`panel.fullScreen.toggle` start unassigned.

`thread.rename`, `thread.archive`, `thread.markRead`, and `thread.pin` start
unassigned and act on the focused pane's open thread; Mark read and Pin toggle
like the matching thread menu item.

| Area      | Command                                      | Default                     | Availability             |
| --------- | -------------------------------------------- | --------------------------- | ------------------------ |
| Palette   | Quick palette                                | `Mod+Shift+P`               | All clients              |
| Window    | Back to app (from Settings, Plugins, Skills) | `Escape`                    | All clients              |
| Threads   | New thread                                   | `Mod+N` / `Mod+Shift+O`     | Desktop / web            |
| Threads   | Search threads                               | `Mod+K`                     | All clients              |
| Threads   | Rename focused thread                        | Unassigned                  | Thread view              |
| Threads   | Archive focused thread                       | Unassigned                  | Thread view              |
| Threads   | Mark focused thread read or unread           | Unassigned                  | Thread view              |
| Threads   | Pin or unpin focused thread                  | Unassigned                  | Thread view              |
| Threads   | Previous / next thread                       | Surface defaults above      | Desktop / web            |
| Threads   | Open visible thread 1–9                      | Platform defaults above     | Web / desktop            |
| Layout    | Previous / next chat pane                    | Unassigned                  | While split              |
| Layout    | Focus chat pane 1–8                          | Platform defaults above     | Split (web / desktop)    |
| Layout    | Maximize / restore chat pane                 | `Mod+Shift+E`               | While split              |
| Layout    | Close focused chat pane                      | `Mod+Shift+X`               | While split              |
| Layout    | Toggle sidebar                               | `Mod+\`                     | All clients              |
| Window    | New window                                   | `Mod+Shift+N`               | Desktop                  |
| Window    | Find in window                               | `Mod+F`                     | Desktop                  |
| Window    | Settings                                     | `Mod+,`                     | All clients              |
| Window    | Open data directory                          | Unassigned                  | Desktop                  |
| Window    | Open local logs                              | Unassigned                  | Desktop                  |
| Window    | Show all notifications                       | Unassigned                  | All clients              |
| Plugins   | Turn plugin safe mode on / off               | Unassigned                  | All clients              |
| Panel     | New tab / close tab / toggle                 | `Mod+T` / `Mod+W` / `Mod+J` | All clients              |
| Panel     | Reopen closed tab                            | `Mod+Shift+T`               | Desktop                  |
| Workspace | Quick open file / toggle diff                | `Mod+P` / `Mod+D`           | All clients              |
| Workspace | Open terminal                                | `Mod+Shift+Enter`           | All clients              |
| Terminal  | Find in scrollback                           | `Cmd+F` / `Ctrl+Shift+F`    | Terminal focus           |
| Workspace | Open in preferred app                        | `Mod+O`                     | All clients              |
| Composer  | Focus composer                               | `Mod+Shift+C`               | All clients              |
| Composer  | Toggle model picker                          | `Mod+Shift+M`               | All clients              |
| Composer  | Cycle model forward / backward               | `Alt+M` / `Alt+Shift+M`     | All clients              |
| Composer  | Cycle provider forward / backward            | `Alt+P` / `Alt+Shift+P`     | All clients              |
| Composer  | Cycle reasoning effort forward / backward    | `Alt+T` / `Alt+Shift+T`     | All clients              |
| Browser   | Focus location / reload / find in page       | `Mod+L` / `Mod+R` / `Mod+F` | Desktop embedded browser |
| Questions | Choose visible answer 1–9                    | `1` … `9`                   | While a question is open |
| Questions | Next question or submit answers              | `Mod+Enter`                 | While a question is open |
| Questions | Previous / next question                     | `ArrowLeft` / `ArrowRight`  | Focus in a question card |
| Questions | Cancel question                              | `Mod+.`                     | While a question is open |

Question shortcuts act on the open question card in the focused pane. They
skip text fields outside the card, so the composer keeps its own keys;
`Mod+Enter` and `Mod+.` also work from the card's own answer field, where
`Enter` goes to the next question or submits and `Shift+Enter` adds a line.
Previous / next need focus in the card, outside its answer field.

Cycle shortcuts act only from the active composer or an open picker; other
editable controls keep their Option-composed input. Reasoning cycles through
the current model's supported efforts from low to high.

## Client SSH Targets

`~/.cc/client.json` is local to the machine showing the UI; the remote server
does not read it. It maps a server and work host to an SSH target (the value
that works after `ssh`, such as `devbox`, `user@devbox`, or a `Host` entry in
`~/.ssh/config`) so the local helper can open remote paths in local editors and
terminals. Without a helper, local editor actions are unavailable.

```bash
pnpm start client ssh-target set https://cc.example.test devbox --host-id host_abc
pnpm start client ssh-target list
pnpm start client ssh-target remove https://cc.example.test --host-id host_abc
```

Use `--host-id` (from `cc machine list`) when the server has more than one
machine. Without it, `set` auto-selects the single machine and `remove` removes
every mapping for that server.

```json
{
  "servers": {
    "https://cc.example.test": {
      "hosts": {
        "host_abc": {
          "sshAuthority": "devbox"
        }
      }
    }
  }
}
```

## Provider availability

The core `disabledProviderIds` list disables individual providers by id. Change
it from a provider row's menu in Settings → Providers, `cc provider
disable|enable <id>`, or `sdk.providers.setEnabled`; a general-settings save
cannot change it. A disabled provider is hidden from pickers and
`cc provider list`, and new turns, sessions, queued messages, and automations
on it are rejected; its plugin, sibling providers, CLI, and threads are kept.
Enable removes the id, restoring automatic discovery, and enables the
supplying plugin if needed. Uninstalling a plugin forgets its providers'
disabled state. See `cc guide providers`.

## Custom ACP Agents

Add your own ACP agent through the ACP providers plugin's `customAgents`
setting, a JSON array, in Settings → Plugins → ACP providers or:

```bash
cc plugin config provider-acp set customAgents '[
  {"id": "amp", "displayName": "Amp", "command": "amp", "args": ["acp"]}
]'
```

Each entry needs `id` (lowercase letters, digits, and dashes), `displayName`,
and `command`. cc derives the provider id `acp-<id>`, which never changes once
a thread has used it. `cursor` is reserved; an entry with an id cc lists only
where the agent is installed (`opencode`, `omp`, `grok`, `hermes-agent`)
replaces the shipped agent and keeps its `nativeSkillRoots` unless it sets its
own. Optional fields: `args`, `env`, `cwd`, `modelCli` (CLI model listing and
selection), `reasoningCli` (launch-time reasoning flags), `nativeReasoning`
(ACP `session/set_config_option` reasoning), `nativeSkillRoots`
(`{"user": [...], "project": [...]}` relative paths; an entry is a path or
`{"path": ..., "recursive": true, "ancestors": true}`), `permissionCli`
(permission-mode launch flags), `supportsManualCompaction` (cc hides
`/compact` otherwise), `providerUsage`, and `dialect` (`cursor`, `opencode`,
`omp`, or `grok`).

Changes apply immediately, with no restart. A custom agent's command is local
code execution and only works with a co-located daemon. The `customAcpAgents`
key in `config.json` is no longer read. Known agents, OpenCode launch settings,
and OpenCode Go usage are covered by the `acp-provider` skill.

Agents from the official ACP registry can be added in the same settings
section or with `cc acp registry`, `cc acp add <agent-id>`, and
`cc acp remove <agent-id>`. An added agent is a `customAgents` entry running
the registry's `npx` or `uvx` package on the thread's host.

## Custom Models

Register extra picker models with top-level `customModels` in
`~/.cc/config.json`, for a model the provider accepts but does not list. There
is no set/unset CLI: edit the JSON, then run `pnpm start config refresh` or
restart cc. `cc-app config list` prints the entries.

```json
{
  "customModels": [
    { "providerId": "claude-code", "model": "claude-example-preview" },
    {
      "providerId": "acp-my-agent",
      "model": "my-proxy/my-model",
      "displayName": "My Proxy Model"
    }
  ]
}
```

`providerId` accepts `codex`, `claude-code`, `pi`, `acp-cursor`, or any
`acp-*` provider id. `displayName` is optional. cc skips an invalid entry with
a warning. Entries appear after the provider's own catalog in the model picker
and `cc provider models`; the provider catalog wins on an id collision, and
`streamerMode` hides them. An entry only makes the id selectable:
`claude-code` and `codex` accept unlisted ids, an ACP agent can reject one at
session start, and OpenCode rejects ids outside its own catalog, so add
OpenCode models (and default agents) to the OpenCode config instead.

## Agent Instructions

cc appends user-level and workspace-level instructions to every
provider-backed thread's system prompt when a provider session starts:

- `<dataDir>/AGENTS.md` for defaults across projects.
- `<workspace>/.cc/AGENTS.md` for repo-specific guidance.

When both exist, the data-dir file comes first. An empty or whitespace-only
file is treated as absent. cc injects these itself, so they apply to every
provider; provider-native files such as a repo-root `AGENTS.md` or `CLAUDE.md`
remain separate. See `cc guide agent-configuration`.

## Skills

User-level skills live under `<dataDir>/skills/<name>/SKILL.md` (usually
`~/.cc/skills`). Project skills live under
`<workspace>/.cc/skills/<name>/SKILL.md`. Enabled plugins contribute
`skills/<name>/SKILL.md` (relocatable with the manifest's `cc.skills` field).
Project skills override user skills, which override plugin skills, by name.

All skill discovery uses the shared skills index. User roots, skill directories,
and `SKILL.md` entries may be symlinks. Project skills and Markdown commands may
follow links only within their workspace (or the repository boundary for an
ancestor root). Traversal resolves real paths and stops cycles. Each recursive
skill root reads at most 1,000 folders and each command root at most 1,000
entries; files inside skill folders do not count. Supporting files in an
injected skill tree must remain ordinary files and directories; linking the root
or `SKILL.md` is supported.

`cc skill list`, the SDK, and the Skills page collapse registrations that share a
name and identical `SKILL.md` bytes, preferring provider-neutral and user-wide
registrations. Different contents with the same name, and identical contents under
different names, remain distinct. Previously issued registration IDs still address
their original registration. Linked registrations are read-only in cc. Runtime
catalogs collapse skills with the same name and identical trees, and Claude Code
omits injected copies already visible under the same name in its native user or
project roots. Selected Codex skills are sent as structured skill inputs with the
path from Codex's active catalog, matched by catalog name or skill directory name,
for both starting and steering a turn; a selected skill missing from that
catalog is sent as plain text only.

Top-level `sharedSkillRoots` in `~/.cc/config.json` adds one provider-neutral
skill collection: `{"user": [...], "project": [...]}` relative paths, resolved
from the home directory and the workspace. cc indexes them read-only and
injects selected skills into every provider; cc user and project skills win on
a name collision. Apply edits with `pnpm start config refresh`.

cc also indexes each provider's native skill roots for that provider's `/`
menu, the Skills page, and `cc skill list`. The shipped provider plugins
declare:

| Provider     | User roots                                                                                               | Project roots                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Codex        | `~/.agents/skills`, `$CODEX_HOME/skills`                                                                 | `.agents/skills` from the repository root to the current directory, plus `.codex/skills`                     |
| Claude Code  | `$CLAUDE_CONFIG_DIR/skills` or `~/.claude/skills`, plus enabled plugin skills                            | `.claude/skills` from the repository root to the current directory, plus enabled plugin skills               |
| Pi           | `~/.pi/agent/skills`, `~/.agents/skills`                                                                 | `.pi/skills` in the workspace; `.agents/skills` from the repository root to the current directory            |
| Cursor       | `~/.cursor/skills`, `~/.agents/skills`, `~/.claude/skills`, `~/.codex/skills`                            | The same four roots in the workspace                                                                         |
| OpenCode     | `~/.config/opencode/skills`, `~/.claude/skills`, `~/.agents/skills`                                      | `.opencode/skills`, `.claude/skills`, and `.agents/skills` from the repository root to the current directory |
| omp          | The active `~/.omp/.../agent` roots and supported Pi, Agents, Claude, Codex, and OpenCode roots          | `.omp/skills` and the supported compatibility roots from the repository root to the current directory        |
| Grok Build   | `$GROK_HOME/skills` or `~/.grok/skills`, plus `~/.agents/skills`, `~/.claude/skills`, `~/.cursor/skills` | The same four roots from the repository root to the current directory                                        |
| Hermes Agent | `$HERMES_HOME/skills` or `~/.hermes/skills`                                                              | None                                                                                                         |

OpenCode also uses `$OPENCODE_CONFIG_DIR/skills`. Pi and omp use
`$PI_CODING_AGENT_DIR`; omp selects its profile with `$OMP_PROFILE` or
`$PI_PROFILE`. Cursor and Hermes roots are scanned recursively, and Pi finds
skills at any depth under its roots. Pi settings
and packages, omp's `skills.customDirectories`, Hermes' `skills.external_dirs`,
and Grok's `[skills].paths` in `config.toml` add paths; Grok also reads enabled
Grok and Claude-compatible plugin skills.

## Multi-machine

Multi-machine execution lets this server dispatch work to host daemons on
other machines; it is independent of browser access (Tailscale, cc connect).
Add, rename, and remove machines in Settings → Machines; see
`cc guide machines` for the CLI.

**Permission ceiling.** Each machine has `maxPermissionMode` (default `full`).
Every thread on that machine is resolved down to the ceiling, and a provider
that supports no mode under it is refused there. Only an owner session sets it,
on the machine's page in Settings → Machines; it is deliberately absent from
the SDK and CLI, and machine credentials cannot change it. Read it with
`cc machine list --json`.

**Machine server access.** `machineServerUrl` (Settings → Machines → Server URL
reachable by machines; HTTP or HTTPS without embedded credentials) falls back
to `CC_EXTERNAL_URL` when unset. `defaultMachineAccess` selects the access
provider; unset selects cc connect, and `direct` (Manual) uses your own URL.
An explicit provider must be installed and available. Set them with
`cc settings general machineServerUrl <url-or-null>` and
`cc settings general defaultMachineAccess <provider-id-or-null>`.

**Daemon updates.** Machines install the host package from the owning server
(falling back to npm only when the server has no package route) under the
machine's cc data directory, so enrollment needs no `sudo`. Installed services
run with `--auto-update`: daemons follow newer server protocols, never
downgrade, and retry failures with backoff from 5 seconds to 5 minutes. Remove
the flag from the launchd plist or systemd user unit and reload the service to
opt out.

### Machine installer

`CC_DATA_DIR` on the installer selects the machine's state directory instead of
`~/.cc-machines/<server-host>`. Enrollment refuses the default `~/.cc` unless its
`host-id` already names this machine.

On Linux the installer installs a persistent systemd user service, retrying with
the runtime path from `loginctl` when the user bus is unavailable and failing
before enrollment if it still cannot reach it. In containers and on machines
without systemd as init it runs a detached daemon instead. Set
`CC_INSTALL_SKIP_SERVICE=1` on the installer command only when running without a
service is intentional; nothing then restarts the daemon after a reboot.

The installer writes these `config.json` fields; they are managed by cc, not
user knobs. Do not copy, edit, or commit them, and re-add the machine instead of
changing them:

- `serverUrl`: the server this machine belongs to.
- `serverHeaders`: private request headers from the access provider, passed to
  the daemon and its bundled `cc` CLI through `CC_SERVER_HEADERS` (a JSON
  string map) for enrollment, HTTP, WebSocket, and proxy requests.
- `machineCredential` and `connectMachineId`: the legacy cc connect form;
  `machineCredential` is sent as the `x-cc-connect-machine` header.

These secret fields are omitted from `cc-app config list`.

The Settings → Machines installer assigns each standalone daemon a stable local
API port, persisted in the machine data directory; its command accepts
`--host-daemon-port <port>` when an explicit port is needed.

### Machine environment

Settings → Environment variables (scope All projects or one project) and
Project settings → Advanced settings edit encrypted environment variables for
machines. Global values sync into every host daemon, including the primary
host. Project values follow the project across machines and worktrees and are
passed only to operations core runs for that project: agent turns, source
clones, setup/teardown hooks, and new terminals. Plugin host calls receive
global values only.

Precedence: built-in credentials, then global variables, then project
variables; agent-provider contributions win over all of them. An empty string
is an explicit override; deleting a project override restores the inherited
value. Existing terminals keep their launch environment, and agent turns pick
up changes on their next turn.

Values are encrypted with the key in `<dataDir>/machine-environment-key`; back
it up with the database. Names and notes are public metadata, and settings
APIs never return values. CLI: `cc machine env list|set|unset [--project <id>]`
(set reads the value from stdin); SDK: `sdk.system.machineEnvironment` and the
matching `sdk.projects` methods. See `cc guide machines`.

**GitHub credential forwarding.** `machineGitCredentialsEnabled` (default
`true`; the automatic GH_TOKEN switch in Settings → Environment variables)
forwards the server's `gh` login to non-primary hosts as `GH_TOKEN`, a Git
credential helper and SSH URL rewrites for github.com, and author/committer
identity, without installing helper files or global Git config. The primary
host keeps its local Git authentication; a server without a local host daemon
has no primary host, so every machine receives the token. An explicit global or
project `GH_TOKEN` overrides the built-in token. Changes apply to new turns,
setup commands, and terminals.

## Sidebar preferences

Core sidebar and Info panel layout preferences live in a server-side keyed registry shared by every
window, device, and the CLI. Each key has a typed schema, a default, and a
revision; a write that names a stale revision gets `409
ui_preference_conflict`. Read and write them with `cc settings ui
list|get|set|reset` or `sdk.system.uiPreferences` (see
`cc guide customization`).

| Key                           | Value                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sidebar.threadListProvider`  | Plugin key or `__automatic__` (default): the first installed thread list plugin other than the bundled `thread-list/thread-list`, else the bundled one    |
| `sidebar.navigationProvider`  | Plugin key or `__automatic__` (default): the first navigation from a plugin other than the bundled Navigation plugin, else its `navigation/rail`          |
| `sidebar.pluginPanelOrder`    | Navigation destination order                                                                                                                              |
| `sidebar.visiblePluginPanels` | Navigation destinations shown, or `null` for every destination                                                                                            |
| `sidebar.footerOrder`         | Footer action order                                                                                                                                       |
| `sidebar.hiddenFooterItems`   | Footer actions moved into More                                                                                                                            |
| `threadContextCard.pinned`    | `true` (default) keeps a thread pane's thread context card open beside the transcript when the pane is wide enough; `false` opens it only from the header |
| `infoPanel.collapsedSections` | Collapsed thread Info panel sections (`commits`, `uncommittedChanges`, `childThreads`, `forks`, `threadStorage`, or `<pluginId>/<sectionId>`)             |

A legacy `__builtin__` thread list selection resolves to the bundled plugin.
Footer IDs are `builtin:settings` (top list layout only), `builtin:mobile`,
`builtin:report-bug`, and
`plugin:<encoded pluginId>/<encoded registrationId>`; unknown and
disabled-plugin IDs are retained, and new actions default to visible. The
footer can also be edited from its More menu or Settings → Appearance → Sidebar
footer.

The bundled Navigation plugin draws the navigation. Its default layout,
`navigation/rail`, is a vertical rail on the left edge of the sidebar that holds Home (the last thread),
the visible destinations (Plugins, Skills, plugin panels), More (hidden
destinations and Customize navigation), and Settings at the bottom. New thread sits
in the sidebar header and cannot be hidden from the rail. The list beside the rail swaps
between the thread list, Plugins, Skills, and Settings; collapsing the sidebar
leaves only the rail. On narrow windows and phones the rail sits inside the
drawer. In the macOS desktop app, wide windows add a title bar with the window
controls, Back and Forward, and the sidebar toggle.

With `sidebar.navigationProvider` set to `navigation/top-list` (Settings →
Appearance → Navigation), there is no rail. The visible destinations, New
thread among them, and More (hidden destinations and Customize navigation) are
labeled rows above the thread list, with plugin panel badges at the end of
their row. New thread can be reordered and hidden like any other row.
Settings is a footer action, and the Settings, Plugins, and Skills lists start
with a Back to app row. Collapsing hides the whole sidebar, and the macOS
desktop app keeps the window controls over the sidebar instead of a separate
title bar. A navigation plugin gets the rail or list layout its registration
declares, and a list navigation can bring its own controls beside the sidebar
toggle; legacy `__builtin__` and `navigation/navigation` read as
`__automatic__`. Disabling the Navigation plugin with no other navigation
plugin installed leaves the list layout with no destinations; Settings stays
in the footer.

The layout keys `sidebar.organizationMode`, `sidebar.threadGrouping.environment`,
`sidebar.chronologicalSort`, `sidebar.sortDirection`, the three section-order
keys, and `sidebar.hiddenGroups` are legacy: the
bundled Thread list plugin copies non-default values once and then keeps its
own preferences ([Thread list plugin](#thread-list-plugin)).

Sidebar width and open state stay in each browser tab or desktop window; a new
window starts from the most recent choice in that browser. The command
palette's Active/Archived filter is browser-local and has no CLI/SDK setting.

## Experiments

Experimental surfaces are changed in Settings → Experiments or with
`cc settings experiment <key> <true|false>`. All experiments start off.
cc stores only the experiments you set; the others follow the shipped default.

The `earlyAdopter` general setting (the Become an early adopter banner on
Settings → Experiments, `cc settings general earlyAdopter on`) switches the
shipped default to the early adopter default: experiments marked Early adopter
(currently `agentCpuPriority`, `compactExpiredCache`, `dismissReadNotifications`,
`pluginUpdates`, `skipFocusedThreadNotifications`, `threadRowMetadata`, and
`updateWhenIdle`) turn on, and the rest stay off. An experiment you set yourself keeps your value
either way.
`/system/config` and `sdk.system.config()` return the resolved values in
`experiments`.

- `agentCpuPriority` keeps cc responsive when agents saturate the CPU. The
  host daemon starts provider processes and environment setup and teardown
  scripts at nice 10 (below-normal on Windows), inherited by
  the builds and tests they run; terminals keep normal priority. On macOS the
  launcher also starts the server and daemon with application scheduling
  (`taskpolicy -a`). Turning it on or off takes effect after restarting cc,
  including the restart an update performs: running provider processes serve
  new threads too, and a lowered process cannot be raised again. See
  [slow database operations](debugging-and-qa.md#slow-database-operations).
- `compactExpiredCache` (on for early adopters) reports `compactionOfferAt` on a thread's context
  usage (timeline `contextWindowUsage` and `cc thread context`) once the
  provider has reported a prompt-cache lifetime, the provider supports manual
  compaction, and the context holds at least 100k tokens. After that time the
  composer shows a Compact chip beside the context meter; while it is on, the
  next send passes `compactFirst` so the server runs `/compact` and queues the
  message behind it. Clicking the chip keeps the full history for that one
  send.
- `dismissReadNotifications` (on for early adopters) makes the push-notifications plugin remove a
  thread's notifications once the thread is read on any client (opened, marked
  read, or sent a message). Registered phones and tablets get a silent push
  (`{"kind":"dismiss","threadId":…}`; `_contentAvailable` on iOS, data-only on
  Android) that the mobile app's background task uses to remove that thread's
  delivered notifications, and open web and desktop clients close the system
  notification they are showing for it. Phones need a mobile app version with
  the background task; an older Android app in the foreground would list the
  silent push as a blank notification.
  The plugin reads it on each delivery and read, so a toggle applies live.
- `serverMove` enables Move server here in Settings → Machines,
  `cc server move`, `cc server export`, and old server copy deletion; while off
  those routes return 403 `server_move_experiment_disabled` (status and cancel
  stay available). See `cc guide machines`.
- `performanceDiagnostics` turns on server performance diagnostics: slow
  database, API, and event-loop logging, slow SQLite query plan warnings,
  periodic performance samples, and continuous V8 CPU profiles written every
  30 seconds to
  `<dataDir>/logs/performance/`. Profiles are kept for 12 hours with a 1 GB
  total cap (oldest first), and a profile over 12 MiB is discarded. It needs
  startup permission from `CC_PERF_DIAGNOSTICS=1` or the launcher flag
  `--perf-diagnostics` (`pnpm start`, `pnpm start:worktree`, `cc-app`), which
  requires a restart; without it the toggle is hidden and cannot start
  collection. The experiment itself applies live; turning it off restores
  normal logging and flushes the in-flight profile, keeping saved files. See
  [diagnostics](debugging-and-qa.md#opt-in-server-performance-diagnostics).
- `pluginUpdates` (on for early adopters) adds a Plugins section to
  Settings → Updates: one row per tracking plugin with an update (installed →
  candidate version and an Update button), Update all for compatible updates,
  and candidates blocked by `engines.cc` or `engines.ccPluginSdk` with the
  reason. Opening the page re-checks tracking sources, and the sidebar updates
  badge counts plugin updates. While it is off, the six-hourly background check,
  `cc plugin outdated`, `cc plugin update`, and Settings → Installed plugins
  work as before.
- `resumeThreadsAfterRestart` resumes threads a
  restart cut off. When a machine's daemon comes back as a new process (cc
  quit, crashed, or updated, or the machine restarted), the server marks the
  turns it was running as interrupted (`host-daemon-restarted`) and the
  background tasks it was tracking as stopped, as before, and then queues a
  retry with reason "cc restarted", scheduled 5 seconds out (the queue sweep
  sends it on its next pass after that), for:
  - each running turn it cut off;
  - each idle thread with background work the restart stopped, such as a
    background command its agent was waiting on (the retry re-runs the
    thread's latest turn).

  The retry is the same row as `cc thread retry`, titled "Resume after cc
  restarted" in the app's queue and in `cc thread queue list`. When the provider had
  accepted the turn's input, it sends an agent-only message instead of
  "Please continue.": it says cc restarted, names the command the turn was
  running and any background work the restart stopped (command and
  description, one per line when there are several, up to ten), says the
  restart, not the user, cut them off, and asks the agent to check their
  effects before continuing or rerunning them. Otherwise it sends the original input. A message you send
  (or Send now) before it goes out overtakes it. Turns stopped by the user,
  threads waiting on a question or approval, and archived threads are not
  resumed, and a turn is not retried again once its retry chain reaches
  attempt 4 (three restarts in a row). A child thread that resumes does not notify its parent
  that it was interrupted; the parent hears when the child finishes.
  `cc thread wait` keeps waiting on a thread whose resume is queued.
  Updating cc counts as a restart, so threads that Update now (or
  `cc updates app apply --yes`) cuts resume after the update. With the
  experiment on, the Update now dialog, the CLI prompt, and the
  `threads_running` error say "Updating restarts cc, and they resume after
  the update" instead of "interrupts them".
  The experiment also makes every queued retry, including `cc thread retry` and
  provider-retry ones, go first: a new retry row is placed at the front of the
  thread's queue, and while a live retry (not Not sent, not exhausted) is
  queued, the queue does not automatically send the thread's other rows; one
  that comes up is re-queued as `thread-busy` and sends after the retry's turn
  ends. That is what keeps messages queued or steered while the daemon was down
  behind the resume. Without the experiment, a `--send-at` message or a row a
  plugin releases can go out ahead of a retry scheduled for later (for example
  a provider-retry row waiting hours for a subscription window) and overtake
  it; with it, those rows wait for the retry.

- `threadContextCard` moves a running thread's
  details into the thread context card at the upper-right of its pane: cc's parent
  thread and child threads, the Git plugin's changes, which open the Diff tab,
  and GitHub PR Status's pull request. The context row above the
  composer drops those segments and keeps other plugins' segments; the
  project, environment, and branch stay below the composer, side chats keep
  their context row, and a new thread's composer is unchanged.
  A header button opens the card or pins it: a pinned card sits beside the
  transcript in a wide pane and moves the transcript aside in a medium one,
  and a narrow pane or window keeps the context row above the composer and
  opens the card over the transcript. Phones keep the context row above the
  composer and show no card. Plugins read how a pane
  shows thread context with `experimental_useThreadContextKind()`.
- `threadRowMetadata` (on for early adopters) adds Metadata to the built-in
  thread list's Organize → Rows menu. With it checked (`showRowMetadata`), plugins draw details such as
  GitHub PR Status's pull request number on a line under each thread title.
  While the experiment is off the sidebar ignores `showRowMetadata`. Plugins
  read it with `experimental_useExperiment("threadRowMetadata")`.
- `skipFocusedThreadNotifications` (on for early adopters) makes the
  push-notifications plugin skip the web and desktop system notification for a
  thread that is open in a visible, focused cc window or browser tab of the same
  origin. Each such window holds a shared Web Lock for its thread, so the window
  that claims a notification also sees threads focused in other windows. Other
  threads, notifications without a thread, and mobile push are unaffected. The
  plugin reads it with
  `experimental_useExperiment("skipFocusedThreadNotifications")` and follows a
  toggle live.
- `updateWhenIdle` (on for early adopters) lets cc update itself once no
  thread is running instead of interrupting them. Settings → Updates gains an
  "Restart and update cc automatically" switch ("Restart and update the server
  automatically" when the desktop app talks to a separate server), saved as the `autoAppUpdate` app
  setting and off until you turn it on; `cc updates app auto on|off` does the
  same. While it is on, cc checks for an update right away, 30 seconds after the
  server starts, and every hour (a `git fetch` of origin/main in source
  mode, the npm registry, or the desktop updater) and installs what it finds
  once no thread is running; turning it off stops the checks and drops a
  waiting update. The Server row then reads "Updates when all threads are
  idle", with Update now (which still asks before interrupting) and Skip this
  version in its menu. Skip this version (or `cc updates app cancel`) skips that
  version (stored as the `skippedAppUpdate` app setting) until a newer one
  appears, and the automatic check also skips a version whose last update
  attempt failed; Update still installs a skipped version.
  `cc updates app apply --when-idle` waits for threads once, without the
  switch, so an agent can update cc from its own thread. cc starts a waiting
  update after running threads stay at zero for five seconds and waits again if
  a thread starts before it restarts. From the moment cc decides to restart
  into an update (Update, Update now, a waiting update, or
  `cc updates app apply`) until it
  stops, new sends, including Send now and retries, wait in the thread's queue
  as "Sending after cc restarts to update" (`app-update` in `cc thread queue`)
  instead of starting turns the restart would cut. cc sends them when it starts
  again, after any resume `resumeThreadsAfterRestart` queues, in order; if the
  update is deferred, cancelled, or fails, it sends them at once. While the
  experiment is off, the schedule and automatic update routes return 403
  `update_when_idle_experiment_disabled`, the CLI commands print how to turn it
  on, and turning it off drops a waiting update. See `cc guide machines`.
- `walCheckpointWorker` moves SQLite WAL checkpoints for `cc.db` and plugin
  `data.db` files off the server's main thread. A background worker thread
  opens its own connection to each database and runs `wal_checkpoint(PASSIVE)`
  every 100 ms, and right away again while the WAL holds 4,096 frames or more
  and is still growing; the server's own connections set
  `wal_autocheckpoint=0`, so a commit no longer copies the WAL into the
  database file and fsyncs it. If sustained writes grow the WAL past 16,384
  frames across two worker passes, the server checkpoints the small remaining
  tail itself between tasks and logs "Sustained writes outpaced the WAL
  checkpoint worker". The hourly incremental vacuum waits for a worker pass
  around each chunk instead of checkpointing inline. If the worker exits or
  cannot open a database, those connections go back to checkpointing on
  commit and cc logs a warning; a worker that had started restarts after
  10 seconds. The experiment applies live: turning it off stops the worker
  after a final checkpoint and restores `wal_autocheckpoint=1000`.

## Thread Timeline Window

`CC_FF_TIMELINE_WINDOW_EVENT_BUDGET` (default 1500) guides how many
conversation groups a timeline page selects and caps the content leaves it
returns. It is a server-start operator setting, not a hard limit on query
bytes, events, or CPU: one large turn can need substantially more work. Pages
target 4 MiB of rendered rows. The API and SDK contract is in
[timeline-pagination.md](timeline-pagination.md).

When you open a thread whose turn finished while you were away, the NEW
divider sits above the turn's answer: its final assistant message, or the
error that ended it. The turn's tool calls and in-between notes stay above the
divider. A message that started a new turn keeps the divider above it, a turn
that is still running or has no answer puts it above the first row after your
read point, and the divider never lands on your own message.

Timeline builds slower than 150 ms log `Thread timeline build blocked the event
loop` with main-thread CPU time and context-switch counts, and event-loop
stalls over 500 ms log `Event loop stalled`, both at `info`.

## Plugins

Plugins are on by default. Builtin plugins ship with cc; the official plugins
(GitHub, Docs, Memory, Tasks) ship bundled in the app, install from that copy
without network access, and update with cc releases. See `cc guide plugins` for
installing, sources, updates, and marketplaces, and the `cc-plugin-authoring`
skill for manifests and `engines` ranges. Plugins are full-trust code running
inside the cc server process.

Plugin state lives under the data dir:

```
<dataDir>/plugins/<id>/data.db     Per-plugin SQLite database (when it uses
                                   incremental auto-vacuum, cc returns its
                                   free pages to disk hourly)
<dataDir>/plugins/snapshots/<id>/  Rollback copy of a plugin's state taken
                                   before an update; deleted once the update
                                   settles, or at the next restart after a
                                   rollback
<dataDir>/plugins/<id>/secrets/    Secret settings and the plugin HTTP token
<dataDir>/plugins/<id>/logs/       cc.log output (plugin.log, JSONL, rotated
                                   at 5MB; read with `cc plugin logs <id>`)
<dataDir>/plugins/git/, npm/       Managed installs for git:/npm: sources
<dataDir>/marketplaces/staging/    Throwaway checkouts for git: marketplace
                                   refreshes
<dataDir>/skills-generated/        Server-generated skills (the
                                   plugin-commands skill)
```

Marketplace catalogs live in the cc database. The reserved `cc-community`
marketplace comes from `CC_MARKETPLACE_URL`. A `git:` marketplace reads
`marketplace.json` from the repository root, or from the directory saved with
`cc marketplace add --subdirectory <relative-path>`. The server checks installed
plugins for updates every 6 hours but never applies them.

Plugin settings are changed on the plugin's page under Settings → Installed
plugins, with `cc plugin config <id> set <key> <value>`, or with SDK
`plugins.updateSettings({ pluginId, values })`. Running plugins receive changes
live.

### Multi-plugin repositories

An optional `.cc/plugins.json` collection manifest at a repository root
indexes several plugins, each a directory with its own `package.json` and `cc`
manifest:

```json
{
  "$schema": "https://raw.githubusercontent.com/codythatsme/cc/main/apps/web/public/schemas/plugins.schema.json",
  "schemaVersion": 1,
  "name": "acme-plugins",
  "plugins": [
    { "name": "notes", "source": "./plugins/notes" },
    { "name": "status", "source": "./plugins/status" }
  ]
}
```

The file is strict: `schemaVersion` must be `1`, names match
`^[a-z0-9][a-z0-9-]*$`, unknown fields and duplicate names are rejected, and
each `source` is a repository-relative directory starting with `./` (absolute
paths, `..`, empty segments, and the repository root are refused). An invalid
file is rejected whole. It is an index only and never overrides a plugin's
identity, branding, entry points, or engine ranges. Select an entry with
`cc plugin install … --plugin <name>`.

### CC guide

CC guide is installed and enabled by default. Its boolean settings, all
default `true`, are `introduction` (the CC introduction), `skills` (all four
bundled skills), and `ccCli`, `pluginAuthoring`, `skillCreator`, and
`submitPlugin` (individual skills). They apply the next time agent
configuration is assembled. Disabling the plugin removes its introduction and
skills.

### Claude Code provider

| Setting                      | Default | Effect                                                                                                                                                                                                                                                                |
| ---------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `subagentsDisabled`          | `false` | Removes native Agent, Task, and ListAgents tools from the model context. Changes restart Claude before the next turn, preserving the conversation.                                                                                                                    |
| `disable1MContext`           | `false` | Sets `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` (`0` when off).                                                                                                                                                                                                               |
| `chromeEnabled`              | `false` | Starts Claude Code with `--chrome` for Claude in Chrome tools, which cc otherwise leaves off even when the interactive `claude` CLI enables them; the host needs the extension and a claude.ai login (API-key sessions stay off).                                     |
| `artifactsEnabled`           | `false` | Sets `CLAUDE_CODE_ARTIFACT=1` so Claude Code loads its Artifact tools (read, publish, and edit claude.ai artifacts), which it withholds from SDK sessions by default; when off, cc leaves any inherited value alone. Claude may publish private pages without asking. |
| `sandboxEnabled`             | `true`  | Runs Bash in Claude Code's sandbox in Accept Edits and Approve for me modes; `false` uses Claude Code's own approvals and sandbox settings.                                                                                                                           |
| `fullAccessApprovalsEnabled` | `false` | Shows Claude Code's own prompts in Full Access (`permissions.ask` rules, PreToolUse hooks that answer `ask`, and built-in safety checks); `false` approves every request. Applies from the next turn without a restart.                                               |
| `commandDescriptionsEnabled` | `false` | Titles Bash command rows with Claude's short description of the command instead of the command itself; approval prompts and the expanded row still show the command. Takes effect from each thread's next message; existing rows keep their titles.                   |

Set them with `cc plugin config provider-claude-code set <key> <value>`. Unless
noted, a change restarts the thread's Claude process before its next turn,
keeping the conversation. Memory, native subagents, and the Workflow tool are toggled on
the plugin's page in Settings → Plugins → Claude Code provider (see `cc guide providers`).

Two host-daemon environment variables reach the Claude Code bridge:
`CC_CLAUDE_CODE_EXECUTABLE` picks the `claude` binary, and
`CLAUDE_CODE_OAUTH_TOKEN` authenticates a machine with no interactive login,
such as a CI runner (mint it with `claude setup-token`). See the
`claude-code-provider` skill.

### Account Pooler [Experimental]

The builtin Account Pooler plugin pools Claude and Codex accounts behind the cc
server. It is disabled on fresh installations (`cc plugin enable
account-pool`), except that a nested server with `CC_ACCOUNT_POOL_PARENT_URL`
enables it. Account tokens and per-machine hub tokens are 0600 files under
`<dataDir>/plugins/account-pool/secrets/accounts/`.

| Setting                    | Default                                 | Effect                                                                                                                                             |
| -------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `switchThreshold`          | `0.98`                                  | Shared or model-family quota fraction from which other accounts are preferred; the account still serves matching traffic until upstream refuses it |
| `anthropicUpstreamBaseUrl` | `https://api.anthropic.com`             | Upstream for Claude traffic; only for tests and QA with a fake upstream                                                                            |
| `codexUpstreamBaseUrl`     | `https://chatgpt.com/backend-api/codex` | Upstream for Codex traffic; only for tests and QA with a fake upstream                                                                             |

Inspect and change them with `cc pool config` and
`cc pool config set <key> <value>`. Values stored through `cc.settings` by
older builds are not migrated. Provider routing is persisted per provider and
defaults on; `cc pool routing <claude|codex> --off` stops it. See the
`account-pool` skill for accounts, ordering, and routing.

### Concurrency limit

The builtin Concurrency limit plugin caps running threads. The overall limit is
unlimited by default; each host defaults to Auto (one thread per available
processor), a blank host field restores Auto, and `0` pauses new work for that
scope. Configure it on its autosaving plugin page or with
`cc concurrency-limit status|global|host`; see the `concurrency-limit` skill.

### GitHub Star

The builtin GitHub Star plugin (`cc--github-star`) asks once for a star on
GitHub after more than five prompts, when the window has been idle for 30
seconds. The server records that it asked, so no other window or device asks
again. Disable the plugin to never be asked.

### Keep Awake

The builtin Keep Awake plugin prevents idle system sleep on selected macOS and
Windows hosts while cc runs; on macOS it runs
`/usr/bin/caffeinate -i -w <worker-pid>`. Closing the lid or choosing Sleep
still sleeps the machine. Its settings are an enable switch and an
all-or-selected host list, set on its autosaving plugin page or with
`cc keep-awake status|enable|disable` and `cc keep-awake hosts all|<host-id>...`
(each accepts `--json`).

### Push notifications

The builtin Push notifications plugin's `mobileEnabled`, `webEnabled`, and
`desktopEnabled` booleans default to `true`. `expoPushUrl` (default
`https://exp.host/--/api/v2/push/send`) is the relay URL, read on every send.
`defaultLevel` (default `all`) and `childLevel` (default `input-only`) set
top-level and child thread levels. Set them with
`cc plugin config push-notifications set <key> <value>`. Web and desktop
notifications need an open cc tab or window, HTTPS or localhost, and
per-device permission; the plugin's settings page offers permission and test
controls. See the `push-notifications` skill for levels, devices, and
`cc push-notifications test|thread`.

### Storage & retention

The bundled Storage & retention plugin is disabled by default
(`cc plugin enable cc--storage-retention`). Configure it in its sidebar panel,
where every setting saves immediately, or with `cc storage retention`, which
previews until `--save --yes`. It keeps its policy and latest run in its own
storage; there are no general app settings for retention.

| Setting                                              | Default | Flag                                                                          |
| ---------------------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| Archive after / delete after                         | Never   | `--archive-after <days\|never>`, `--delete-after <days\|never>` (1–3650 days) |
| Delete thread storage on archive                     | Off     | `--delete-storage-on-archive <true\|false>`                                   |
| Delete development data when its checkout is removed | Off     | `--delete-dev-data-on-checkout-removal <true\|false>`                         |

Archive eligibility uses each affected member's `updatedAt`; deletion requires
every lifecycle member to have been archived past the cutoff. The plugin uses
the SDK thread listing and archive/delete APIs, accepting changes between
inspection and mutation, and disabling it stops retention without losing the
saved policy. Development-data cleanup stores no removal history in the core
database. The plugin owns the disk scanner, cached reports, classification,
and host-worker file operations behind `cc storage usage` and the cleanup
commands; background cleanup started from the page survives navigation and
reconnects. See the
[plugin skill](../plugins/storage-retention/skills/storage-retention/SKILL.md).

### Git and GitHub PR Status plugins

The builtin Git plugin's settings page has two switches:

- `showGitChanges` (default `true`), Show Git changes above the composer.
  `false` hides the untracked, uncommitted, and committed file summary,
  expanded file list, and merge-base picker above every thread composer.
- `showCommitButton` (default `false`), Show Commit button. `true` shows the
  Commit action in the thread header and overflow menu when the workspace has
  uncommitted changes.

The builtin GitHub PR Status plugin's `showPullRequest` (default `true`) is
Show pull request above the composer on its plugin page. `false` hides the pull
request status, Mark ready and merge actions above every thread composer; the
Info tab's Pull request row stays. Thread relationships and workspace warnings
stay visible either way.

```bash
cc plugin config cc--git set showGitChanges false
cc plugin config cc--git set showCommitButton true
cc plugin config cc--github-pr-status set showPullRequest false
```

Upgrading copies the former Settings → General switch's saved value into
`showGitChanges` and `showPullRequest`. The Commit button starts off for
everyone.

### Ask User Question plugin

The builtin Ask User Question plugin keeps an unanswered question card open for
30 minutes by default. When it expires, the agent receives a timeout result and
the card closes. Choose `1 hour`, `4 hours`, `8 hours`, `24 hours`, `3 days`, or
`7 days` under the plugin settings, or configure it from the CLI:

```bash
cc plugin config ask-user-question set questionTimeout "24 hours"
```

The setting applies to questions asked after it changes. A server restart still
closes every open card.

### Provider retry plugin

The builtin Provider retry plugin is enabled on fresh installations. It queues
a retry after Codex and Claude Code subscription-window limits that report a
reset time, and retries provider overloads with backoff. `maximumWait`
(`6 hours` default, `24 hours`, or `No limit`) skips scheduling resets beyond
that horizon:

```bash
cc plugin config provider-retry set maximumWait "24 hours"
```

Disable it with `cc plugin disable provider-retry`. See the `provider-retry`
skill.

### Workflows plugin

The builtin Workflows plugin is disabled on fresh installations
(`cc plugin enable workflows`). Its settings are bounded integers:

| Key                    |    Default |       Allowed range | Behavior                                               |
| ---------------------- | ---------: | ------------------: | ------------------------------------------------------ |
| `maxActiveRuns`        |        `4` |            `1`–`32` | Concurrent runs across the plugin; changes apply live. |
| `maxConcurrentAgents`  |        `8` |            `1`–`64` | Concurrent agent calls within one run.                 |
| `maxAgentCalls`        |      `100` |          `1`–`1000` | Total agent calls within one run.                      |
| `totalRunTimeoutMs`    | `86400000` | `60000`–`604800000` | Maximum total run duration in milliseconds.            |
| `retentionDays`        |        `7` |          `1`–`3650` | Days to retain completed workflow data.                |
| `maxNotificationBytes` |    `16384` |     `1024`–`262144` | Maximum UTF-8 size of a completion notification.       |

The settings other than `maxActiveRuns` are snapshotted into each new run. See
the `workflows` skill.

### Thread list plugin

The bundled Thread list plugin owns the sidebar thread list layout, synced to
every window. Change it from the list header's Organize and Filter menus, a
row's Customize actions, or `cc thread-list prefs get|set|reset <key>`
(`set` takes JSON; a bare word is a string). See the `thread-list` skill.

| Key                   | Default                           | Values                                                                                                                                      |
| --------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `organizationMode`    | `chronological`                   | `project`, `chronological` (Custom), or `machine`                                                                                           |
| `environmentGrouping` | `auto`                            | `true` collapses sibling threads sharing a worktree into one row, `false` never does, `auto` groups except in `chronological`               |
| `groupByReadStatus`   | `false`                           | Lists unread threads above the rest; exclusive with environment grouping                                                                    |
| `chronologicalSort`   | `updated`                         | Sort field for `chronological`                                                                                                              |
| `sortDirection`       | `default`                         | `default`, `ascending`, or `descending`                                                                                                     |
| `sectionOrder`        | `["pinned","projects","threads"]` | Top-level order by project; `manualSectionOrder` and `machineSectionOrder` cover the other modes                                            |
| `hiddenGroups`        | `[]`                              | Groups moved into More: `threads`, `project:<id>`, `section:<id>`, `machine:<hostId>` (`machine:no-machine`); `set` replaces the whole list |
| `threadLifecycles`    | `["active"]`                      | `["active"]`, `["archived"]`, or both; empty and duplicate values are rejected                                                              |
| `rowActions`          | `["cc--core/archive"]`            | Up to three thread action keys in display order; see below                                                                                  |
| `showProviderIcons`   | `false`                           | Shows the provider icon before each thread title                                                                                            |
| `showRowMetadata`     | `false`                           | Shows plugins' metadata on a line under each thread title; needs the `threadRowMetadata` experiment                                         |
| `showEmptyProjects`   | `true`                            | `false` hides project groups with no visible threads when organized by project                                                              |
| `collapsed*`          | `[]`                              | Collapsed sections, projects, threads, environments, custom sections, and machines                                                          |

`rowActions` keys are `cc--core/<id>` (`split`, `newThreadInEnvironment`,
`copyLink`, `read`, `pin`, `rename`, `archive`, `delete`), `thread-list/move`,
or a plugin's `<pluginId>/<actionId>`. Bare legacy ids and `core/<id>` keys
migrate to current keys. A key whose action is hidden for a row, or whose
plugin is not installed, is skipped on that row.

Cmd/Ctrl+Shift-click toggles a row in a multi-thread selection (starting from
the open thread), Shift-click selects the visible range from the last clicked
row, and a plain click, Cmd/Ctrl-click, Escape, or a click outside the sidebar
clears the selection. Right-clicking a selected row offers Mark read/unread,
Pin/Unpin, Notifications, Move to section, Archive (Unarchive when every
selected thread is archived), and Delete for the whole selection. Archive and
Delete ask once for the whole selection, counting child threads that are not
selected, and act on the topmost selected threads; Archive skips the question
when the Archive confirmation setting is off. Dragging a selected row moves
every selected thread onto a section, under a thread, or into Pinned, or drops
them onto a composer as one mention per thread. Cmd/Ctrl-click still opens a
thread in a split.

### Connect and cc account

Remote access makes this server reachable at `https://<handle>.cc.example.invalid` once
it is signed in to a cc.example.invalid account. The builtin cc account plugin holds the
server credential in its plugin KV (in `cc.db`); the builtin connect plugin
holds the tunnel while the server runs. See the `cc-account` skill for signing
in and the `share-server-links` skill for `cc connect` and port shares.

| Connect setting          | Default | Effect                                                                                                                 |
| ------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| `remoteAccess`           | `true`  | The Remote access switch; `false` closes the tunnel and machine shares without signing out. Also `cc connect off\|on`. |
| `sendRemoteInstructions` | `true`  | "Tell agents about remote access"; `false` suppresses Connect's remote-use agent message without disabling sharing.    |

`cc plugin disable connect` cuts off all remote access. `--server` and
`--base-url` on `cc connect` and `cc account login` accept only
`https://cc.example.invalid` and `https://cc-staging.example.invalid` (plus
`http://cc.localhost:<port>` in a development build).

Settings → Mobile links the iOS TestFlight and Android APK downloads and pairs
the cc mobile app (`cc connect machine-code`, see `cc guide machines`). Mobile
builds, the optional `GOOGLE_SERVICES_JSON` Firebase config, and publishing
are documented in [`apps/mobile/README.md`](../apps/mobile/README.md).

### Connect next (beta)

The builtin connect-next plugin is disabled by default. Enabled
(`cc plugin enable cc--connect-next`) and switched on, it also makes this server
reachable at `https://<label>.next.cc.example.invalid` through the Fly gate, next to
its connect address. The domain follows the cc account: `next.<host of the
account's base URL>` (`next.cc-staging.example.invalid` on staging). While it is on,
every enrolled machine's daemon also serves the ports shared from it with
`cc connect expose <port> --host <machine>` at
`https://<machine-label>--<port>.next.cc.example.invalid`, downloading `frpc` into
`<daemon data dir>/connect-next/frp/`. See the `connect-next` skill and
[`connect-next.md`](connect-next.md).

| Connect next setting | Default | Effect                                                                      |
| -------------------- | ------- | --------------------------------------------------------------------------- |
| `enabled`            | `true`  | "Reach this cc at its next address (beta)". Also `cc connect-next on\|off`. |

The realtime client WebSocket (`/ws`) negotiates `permessage-deflate`, so
messages of 1 KB or more, such as timeline pushes, are compressed (about 4x for
timeline JSON). It helps clients that reach the server over a network,
including connect next; the cc connect relay re-frames messages and does not
carry it. Terminal, host daemon, and plugin WebSockets are never compressed.

| Variable                 | Effect                                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `CC_CONNECT_FRPC`        | Path of an `frpc` binary to run instead of the frp 0.71.0 release the plugin (or a host daemon) downloads and verifies.           |
| `CC_CONNECT_NEXT_SERVER` | `ws://host:port` or `wss://host:port` of the frp server to dial instead of `wss://tunnel.<next domain>` derived from the account. |

### Modal machines

The Modal sandbox plugin creates machines on Modal. Its settings:
`tokenId` and `tokenSecret` (secret; a Modal API token), `appName` (default
`cc-sandboxes`), and `idleMinutes` (default 15; `0` disables idle suspension,
maximum 1440). Sandboxes run for at most Modal's 24-hour sandbox lifetime.
Without a size preset, a new machine reserves 1 CPU and 2 GiB. The plugin page
also holds named image definitions (the bundled Standard Dockerfile, extra
Dockerfiles, or Modal image IDs) and CPU/memory presets; a saved image applies
to the next new machine. See the `modal-sandboxes` skill.

### Browser Automation

The Browser Automation plugin installs its pinned `dev-browser` release on
first use on each browser host, under the plugin's host storage directory; it
never modifies the user's global npm installation. See the
`browser-automation` skill and `plugins/browser-automation/README.md`. For
isolated development smoke tests only, `DEV_BROWSER_SMOKE_BINARY` and
`DEV_BROWSER_SMOKE_CHROME` select absolute binary and Chrome paths.

### MCP server

The bundled MCP server plugin is disabled by default; enable it with
`cc plugin enable cc--mcp`. It serves a Model Context Protocol endpoint at
`/mcp` on the cc connect address and at `/api/v1/plugins/cc--mcp/http/mcp` on
loopback (`cc mcp status` prints both). Remote apps sign in through the cc
account, and an approved app can run any `cc` command; `cc mcp clients` lists
them and `cc mcp revoke <grant-id>` disconnects one. The loopback address needs
no sign-in and has the same trust as the local `cc` CLI. See the `mcp` skill.

## Desktop browser cookie discovery

The desktop app discovers Chromium and Firefox cookie stores of registered web
browsers with no setting. On Linux, an absolute `XDG_CONFIG_HOME` in the
desktop process environment replaces `~/.config` for discovery (relative values
are ignored), and Flatpak and Snap data directories are also searched. See
`cc guide browser` for the import commands.

## Startup Flags

Use launcher flags for per-run startup details:

```bash
pnpm start --data-dir ~/.cc-test --server-port 48886 --host-daemon-port 48887
```

The server listens on `127.0.0.1` by default. Set
`--server-bind-host 0.0.0.0` (or `CC_SERVER_BIND_HOST=0.0.0.0`) only when a
trusted network boundary must reach the listener directly: the public API is
unauthenticated and permits command execution and file reads. The only
accepted bind hosts are `127.0.0.1` and `0.0.0.0` (IPv4 only); containers must
also publish the port. With wildcard binding the startup `Server listening`
and `app` lines show `http://0.0.0.0:<port>`.

The data directory holds all cc-managed state: the SQLite database, logs, host
identity, thread storage, custom themes, and plugins. It defaults to `~/.cc/`
for the packaged app. Use `--data-dir` for fully isolated instances.

Other launcher flags: `--no-in-app-updates` ([In-App Updates](#in-app-updates))
and `--perf-diagnostics` ([Experiments](#experiments)).

## Source Development

`pnpm mobile:apk:dev` builds the standalone Android development app, **cc dev**,
with orange icons and package `io.github.codythatsme.cc.mobile.dev`. Output is
`apps/mobile/build-output/cc-dev.apk`; append `-- x86_64` for an Intel emulator.
The build command sets `CC_MOBILE_VARIANT=dev` for Expo configuration. Direct
Expo commands accept `CC_MOBILE_VARIANT=production` (the default) or `dev`;
other values fail validation. The dev variant omits production Firebase and
HTTPS app-link registration. See [mobile build instructions](../apps/mobile/README.md#android-local-apk-and-verification).

For source development only, `pnpm dev`, `pnpm start:worktree`,
`pnpm start:worktree-remote`, and `pnpm start` load the repo-root
[dotenv-cli](https://github.com/entropitor/dotenv-cli) cascade. Add a repo-root
`.env` only to override the defaults above.

- `pnpm dev` loads `.env`, `.env.local`, `.env.development`, and
  `.env.development.local`, then overrides `CC_DATA_DIR`, the server URL and
  port, the host-daemon port, and the Vite port with values derived from the
  checkout path. The data directory is `~/.cc-dev/<checkout-instance>/`, where
  the instance id is the sanitized checkout path relative to your home
  directory plus a short hash. The server and Vite bind to loopback; an
  explicit `CC_DEV_APP_HOST` overrides the Vite listener, and remote HTTP dev
  through it also needs `CC_SERVER_BIND_HOST=0.0.0.0` for realtime updates.
  It defaults `CC_SKIP_ONBOARDING` to `1`, so new instances skip the first-run
  setup screen; set `CC_SKIP_ONBOARDING=0` to retain setup or replay it from Settings.
- `pnpm start:worktree` loads the same cascade and checkout-specific data
  directory and ports, builds production artifacts, and serves the bundle from
  the main server (no Vite or hot reload). First-run setup is skipped, as with `pnpm dev`. Its data
  directory, ports, inherited skills, and listener host take
  precedence over that instance's `config.json` or `env.json`.
- `pnpm start:worktree-remote` does the same but binds the main server to
  `0.0.0.0`; protect the port with a trusted network boundary.
- `pnpm start` loads `.env`, `.env.local`, `.env.production`, and
  `.env.production.local`, and uses the packaged launcher policy with build
  outputs from `apps/app`, `apps/server`, and `apps/host-daemon`.
- `--dryrun` on `pnpm start` or `pnpm start:worktree` prepares through Turbo,
  prints the resolved ports and paths, and exits without starting services or
  migrating data. See [Prepared Worktree
  Restarts](debugging-and-qa.md#prepared-worktree-restarts).

`pnpm dev` injects `CC_DEV_CONNECT_BASE_URL=http://cc.localhost:<worktree-cloud-port>`
(`pnpm dev --staging` injects `https://cc-staging.example.invalid`). With
`NODE_ENV=development`, the cc account plugin uses it as the sign-in default
and the connect plugin for its signed-out dashboard link. It is
launcher-managed, not a `cc-app config` setting, and packaged builds keep
`https://cc.example.invalid`.

`pnpm cc`, `pnpm cc:dev`, and `pnpm reset` wrap `@cc/scripts` and force
`NODE_ENV` to the intended mode. `pnpm reset` and `pnpm reset:dev` clear
cc-managed state in a data directory, not provider credentials.

`CC_PROVIDER_BRIDGE_RECORD_DIR=<dir>` in the host daemon's environment records
every provider bridge's wire traffic as NDJSON under
`<dir>/<providerId>/<threadId>/`; it is off by default and never reaches a
provider child. Recordings can contain secrets; redact them with
`scripts/provider-recordings/redact.mjs` before sharing. See
[provider-bridge-protocol.md](provider-bridge-protocol.md) and
[debugging-and-qa.md](debugging-and-qa.md).

App production builds cache React Compiler output at
`<git-common-dir>/cc-cache/react-compiler`; it has no configuration and can be
deleted while no build runs.

Desktop Settings → Server → **Show This Mac** (or **Show This Computer** off macOS)
defaults to checked and is disabled while This Mac/Computer is selected.
Unchecking hides the built-in server from server choices
while another server is active and alternatives exist. It stays listed when
active or when it is the only choice. This setting does not stop the local
runtime or change the active server.

The desktop stores `showBuiltinServer: false` in `<userData>/server-target.json`;
missing means shown, and saving the default omits the field. Other top-level
metadata is preserved. This is a desktop-local preference, with no server
settings CLI/SDK endpoint. Builds with tolerant readers ignore the field and
may drop it on save; older strict readers can reject the whole file, so keep a
backup before rolling back to a build predating the tolerant-reader fix #5286.

## App links

Explicit Markdown links such as `[Review note](reflect://note/Project%20X)`
and links plugins open through `navigate.openUrl` open in their apps, for
example `linear://` and `slack://`. Bare custom-scheme text is not auto-linked.
The shared web UI asks before opening an app on the viewing device; choose
Always allow to remember that URL scheme. All clients save approvals in
localStorage for this CC site on this device. They do not sync between devices,
browsers, app profiles, or server addresses. Settings → General → Links → App links lists
saved schemes; the trash button next to a scheme revokes it.
The Plugin SDK can list and revoke through the same implementation; it cannot
grant approval. There is no server-side or local-desktop-profile approval store.

Desktop and mobile validate the URL again and hand it to the OS after the web
UI approves it. Native code does not show a second confirmation or store
permissions. Failed native launches do not save new approvals. Resetting
approvals invalidates pending remember choices. Old native clients show an
update message. Web browsers control their own handoff and may show a second
prompt; CC cannot reliably detect missing apps in a browser. Executable web
schemes, local-file launch schemes, and reserved editor-action schemes remain
blocked.
