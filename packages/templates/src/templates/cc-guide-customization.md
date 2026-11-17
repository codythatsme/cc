---
kind: instruction
title: cc Guide — Customization
summary: Command reference for the cc app theme, server-backed settings, keyboard shortcuts, sidebar preferences, host files, and voice transcription.
intent: Explain the CLI theme surface, server-backed app settings, and the remaining app-wide customization commands.
editingNotes: Keep flags accurate against the CLI implementation. Theme details live in the cc-cli skill's references/theming.md. Bundled plugins document their settings in the plugins chapter and their skills, not here.
---

Customization commands

Bundled plugins such as Keep Awake, Concurrency limit, Thread list, and Push
notifications own their settings and commands; run `cc guide plugins`.

Theming — the app-wide palette and typography

`cc theme` controls a set of CSS-variable overrides for the app palette and
typography, persisted server-side and applied live to every open window.
Light/dark mode is a separate per-client setting the theme layers on top of.
Custom themes live on
disk, one folder per theme, at <cc-data-dir>/theme/<name>/theme.css (the packaged
app uses ~/.cc/theme/…). The folder name is the theme id.

cc theme list Built-in and custom themes; shows the active one
cc theme dir Print the custom-theme directory (where to author)
cc theme set <id> [--favicon-color <color>]
Activate a theme (built-ins: default, nord,
dracula, solarized, gruvbox, catppuccin),
preserving the favicon color unless the flag
supplies the complete selection
cc theme show [id] [--css] Print the active palette, or resolve <id> without
activating it; --css dumps the CSS
cc theme reset Back to the default theme; preserve favicon color
cc theme favicon set <color> Set favicon color; preserve the active theme
cc theme favicon reset Reset favicon color; preserve the active theme

To author a custom theme, run `cc theme dir`, write <that-dir>/<name>/theme.css,
then `cc theme set <name>`. A name has at most 64 characters, starts with a
letter or digit, then uses letters, digits, `.`, `_`, or `-`; avoid built-in
ids. Optional `pierre-dark.json` / `pierre-light.json`
(or a `theme.json` `codeTheme` field) ship the matching code colors. Built-in
palettes use the matching Shiki pair. The full design-token reference is in
the cc-cli skill (references/theming.md).

Theme CSS can override typography as well as colors. `--font-terminal` controls
the integrated terminal's font family independently of `--font-mono`; set it in
the theme's `:root, .light` block and end the stack with a generic fallback.

Favicon colors are `default`, `red`, `orange`, `yellow`, `green`, `teal`,
`blue`, `purple`, and `pink`. Theme and favicon-only commands carry the other
appearance value forward explicitly.

Hovering a palette in Settings → Appearance previews it live in that window
without saving; `cc theme show <id>` is the CLI counterpart.

Add --json to any theme command for machine-readable output.

Server-backed settings

Settings stored server-side apply to every window and survive restarts.

cc settings show
cc settings ai-services
cc settings ai-services set <thread-title|commit-message|voice> <automatic|off|service-id> [--plugin <plugin-id>]
cc settings ai-services test <thread-title|commit-message>
cc settings general <key> <value>
cc settings replay-onboarding
cc settings completed-turns [provider-id] [collapse|flat|default]
cc settings experiment <key> <value>
cc settings usage [--machine <id-or-name>] [--refresh]
cc settings cli-command [install|remove]
cc settings version [--force]
cc settings reload Reload cc-managed configuration

AI services: `cc settings ai-services` shows which AI service writes thread
titles (and so branch names), commit messages, and voice transcripts, plus
every service a plugin registers and whether it is ready. `set` picks
`automatic` (cc cloud first, then all other compatible services by plugin id
and service id in lexicographic order, including third-party plugins), `off`,
or one service id; a picked service is never swapped for another. A service is
identified by its plugin and its id, so two plugins may use the same id; pass
`--plugin <plugin-id>` when they do. `test` runs a sample title or commit
message through the current choice. Settings → AI services has the same
controls. Each plugin chooses its own model. The removed `CC_INFERENCE`,
`CC_INFERENCE_FALLBACK`, and `CC_TRANSCRIPTION` variables are ignored with a
warning in `~/.cc/config.json`, and `cc-app config set` refuses them.

General keys: `cc settings general` accepts any key from `generalSettings` in
`cc settings show`; an unknown key or wrongly shaped value is rejected with the
list of known keys. Boolean preferences take `true`, `false`, `on`, or `off`,
and `null` clears a preference that can be unset. Most appear in Settings →
General. Machine-related keys (`machineServerUrl`, `defaultMachineAccess`,
`machineGitCredentialsEnabled`) are covered in `cc guide machines`.

- `showDiagnosticEvents` (default false) shows provider environment resolution
  and unhandled provider events in the timeline. Warnings, errors, and model
  fallback stay visible either way.
- `steerActiveThreadOnEnter` (default true for a new install; an earlier
  install with saved settings or work keeps false): when on, Enter steers a
  running thread and Command+Enter queues a follow-up; when off, those are
  reversed. Shift+Enter inserts a newline.
- Git changes above the composer, the Commit button (off by default) and the
  pull request above the composer are plugin settings:
  `cc plugin config cc--git set showGitChanges false`,
  `cc plugin config cc--git set showCommitButton true` and
  `cc plugin config cc--github-pr-status set showPullRequest false`.
- `keepHistoryAfterContextClear` (default false; Settings → General → Show
  messages from before a context clear): true keeps a cleared thread's earlier
  messages above the `Context cleared` boundary in the timeline, outline, and
  message lookups. The next prompt still starts a fresh provider conversation,
  and the context meter still resets.
- `summarizeShellCommands` (default true; Settings → General → Summarize shell
  commands): false stops titling shell commands that read, list, or search files
  with a summary such as `Searched for X`. Each command row then shows its
  command and expands to the command and its output.
- `confirmThreadArchive` (default true): set false to archive parent and child
  threads in the app without the confirmation popup; the toast still offers
  Undo. CLI and SDK archive calls are always non-interactive.
- `terminalCopyOnSelect` (default true; Settings → General → Terminals → Copy
  on select) copies completed terminal selections exactly and shows "Selection
  copied". Text elsewhere in the app is unchanged. Set it with
  `cc settings general terminalCopyOnSelect <true|false|on|off>` or SDK
  `system.updateGeneralSettings`. Explicit Copy/Paste work when off. Supported
  Linux browsers use native primary selection for middle-click paste,
  independently of this preference, never the regular clipboard as a fallback.
- `streamerMode` (default false) hides every `customModels` entry from
  `~/.cc/config.json` in all model lists (pickers, `cc provider models`, and
  the SDK) during a screen share. The entries stay in the config file; a
  request that names a hidden model still runs with it, and default model
  resolution still sees the full list.
- `allowFastServiceTier` (default true; Settings → Providers): false hides the
  service tier control and runs new turns at the default service tier,
  including explicit requests for any other tier (fast, Codex ultrafast), saved
  project defaults, automations, and messages queued before the change. Project
  defaults saved while it was off retain the default tier.
- `managedBranchPrefix` (default `cc/`, at most 64 characters) prefixes every
  branch cc creates for a worktree or a new checkout branch: the default gives
  `cc/fix-login-flow-thr_ab12cd34ef`, `sawyer/wt-` gives
  `sawyer/wt-fix-login-flow-thr_ab12cd34ef`, and an empty value gives no
  prefix. cc rejects a prefix that cannot start a valid git branch name.
  Existing branches keep their names.
- `providerOrder` (default `[]`) is a JSON array of provider ids, and
  `defaultProviderId` (default `null`) names the default provider; `null`
  clears it.
- `idleProviderSessionTimeoutMinutes` (default `30`; Settings → Providers → Configuration → Release idle agent sessions) sets how long an agent can sit idle after its last turn before every machine stops its provider process. Allowed values are `0` (ASAP), `5`, `10`, `30`, and `60`, for example `cc settings general idleProviderSessionTimeoutMinutes 5`. Machines check every five minutes, so release can take up to five minutes beyond the timeout. Changes apply live and on reconnect. Only restorable sessions without active or pending work are eligible; threads keep their history and resume on the next message. `cc thread stop` still releases a runtime manually. This is not a limit on loaded processes or memory. Read the value with `cc settings show`; SDK callers use `system.config()` and `system.updateGeneralSettings({ ...config.generalSettings, idleProviderSessionTimeoutMinutes: 5 })`.

`cc settings replay-onboarding` clears `onboardingCompletedAt`, so the
first-run setup guide (connect an agent, add projects, pick plugins, set up
devices) shows again in every open client. Settings → General → Setup guide has
the same button.

`cc settings usage --refresh` fetches fresh provider usage; ordinary reads may
reuse results for 10 seconds. The SDK equivalent is
`cc.sdk.system.usageLimits({ refresh: true })`.

Command line: Settings → General → Command line puts the `cc` command on PATH
on the computer that runs the cc server, so the user, a script, or an agent
running outside cc (such as Claude Code or Codex) can control cc; threads in cc
already have `cc`. `cc settings cli-command` shows the state, and `install` or
`remove` changes it. Install links the launcher at `~/.cc/bin/cc` into a PATH
folder such as `~/.local/bin` (on Windows it adds `~/.cc/bin` to the user
PATH). cc never replaces another `cc`: install is refused while one runs first
in a new terminal. Only an installed cc (`npx cc-app` or the desktop app)
offers this; a source checkout does not.

Completed turns: `cc settings completed-turns` lists how each provider shows a
finished turn: `collapse` folds the turn's work into one "Worked for" row and
keeps the final answer visible, and `flat` keeps every step visible. Each
provider has a default (Claude Code is `flat`, the other first-party providers
`collapse`); `--json` shows whether each value comes from your setting or that
default. `cc settings completed-turns <provider-id> <collapse|flat>` overrides
it for that provider, and `default` removes the override. It applies to
existing threads too, including `cc thread log`. Settings → Providers has the
same per-provider switch.

App links: explicit Markdown links to apps such as Linear and Reflect open on
the viewing device, with confirmation unless that scheme was previously
allowed. Choose Always allow to save an approval on that device. Settings →
General → Links → App links can revoke approvals. All clients store
approvals locally for the current CC site and device profile. They do not sync
across devices or server addresses. The Plugin SDK can list and revoke the
viewing client's approvals; there is no CLI command that reads or modifies a
remote client's localStorage.

Experiments: `cc settings experiment <key> <true|false>` toggles a default-off
experiment (Settings → Experiments). Experiments that
gate a feature are documented with it: `serverMove` in `cc guide machines`,
`performanceDiagnostics` under Server performance diagnostics below.
`agentCpuPriority` runs agent processes and setup and teardown scripts at a
lower CPU priority (and, on macOS, the cc server and daemon with application
scheduling) so cc stays responsive under heavy agent load; it takes full effect
after restarting cc, and terminals keep normal priority.
`compactExpiredCache` offers a Compact chip in the composer when an idle
thread's prompt cache has expired and its context holds at least 100k tokens;
see `cc guide thread-messaging` for `--compact-first`.
`resumeThreadsAfterRestart` retries a turn that a quit, crash, update, or
machine restart cut off, and wakes idle threads whose background work it
stopped, a few seconds after the machine's daemon comes back; see `cc guide
thread-lifecycle`.
`dismissReadNotifications` removes a thread's push, web, and desktop
notifications once the thread is read on any client. It defaults on for early
adopters.
`pluginUpdates` lists plugin updates on Settings → Updates with Update and
Update all, and counts them in the sidebar updates badge; see `cc guide plugins`.
`skipFocusedThreadNotifications` skips the web and desktop system notification
for a thread open in a visible, focused cc window or tab. It defaults on for
early adopters.
`threadContextCard` moves a running thread's changes, pull request, and parent
and child threads into a card at the upper-right of its pane, opened or pinned from
the header.
`threadRowMetadata` adds Organize → Rows → Metadata to the built-in thread list,
a line under each thread title where plugins show details such as the pull
request number. It defaults on for early adopters.
`updateWhenIdle` adds a "Restart and update cc automatically" switch to
Settings → Updates (`cc updates app auto on|off`) that has cc check for updates
every hour and restart into a new version once no thread is running, and
enables `cc updates app apply --when-idle`; see `cc guide machines`. It defaults on for early adopters.
`walCheckpointWorker` copies recent writes into cc's SQLite database files on a
background thread instead of during a commit, so heavy writing does not stall
the server. It applies live.
`cc settings general earlyAdopter on` (Settings → Experiments → Become an early
adopter) turns on the experiments marked Early adopter, currently
`compactExpiredCache`, `dismissReadNotifications`, `pluginUpdates`,
`skipFocusedThreadNotifications`, `threadRowMetadata`, and `updateWhenIdle`; an
experiment you set yourself keeps your value.

Launcher settings

`cc-app config` and `cc-app env` reload runtime settings in a running server,
but the CLI identifies settings that are startup-only, including binding/ports,
data and the dev-app port, inherited skill roots, and
`CC_LOG_LEVEL`. Use `cc-app config`, not `cc-app env`, to change `CC_APP_URL`
live. After a startup-only change, run `cc-app stop && cc-app start` or restart
the desktop app; until then, changing or unsetting `CC_SERVER_BIND_HOST` does
not close a previous `0.0.0.0` listener.

`--server-bind-host 0.0.0.0` (or `CC_SERVER_BIND_HOST=0.0.0.0`) listens on
every interface for direct remote access; containers must also publish the
port. CC accepts request hosts that are `localhost`, IP addresses (including
LAN and Tailscale IPs), or the hostname in `CC_APP_URL`. For a custom DNS name
or reverse proxy, run `npx cc-app config set CC_APP_URL https://cc.example.com`
before connecting, including from the CLI or SDK; forwarded host headers cannot
authorize an unconfigured name. CC Connect needs no additional configuration.

Keyboard shortcuts

Settings → Keyboard records per-command shortcut overrides, persisted
server-side and applied live to every connected window, including desktop menu
accelerators. Reset removes an override and returns to cc's current default;
`disabled` explicitly unbinds a command. `Mod` means Command on macOS and
Control on Windows/Linux. The complete default table is in docs/configuration.md.

cc settings keyboard list
cc settings keyboard hints <true|false>
cc settings keyboard set <command> <shortcut|disabled> [--platform mac|windows|linux]
cc settings keyboard reset [command] [--platform mac|windows|linux]

`keyboard list` prints core command ids with their effective bindings, plus
every saved override; examples include `panel.previousTab` / `panel.nextTab`,
`pane.focus.left|right|up|down`, `pane.maximize.toggle`, and the initially
unbound `panel.fullScreen.toggle`. `terminal.find` applies while a terminal has
focus: `Cmd+F` on macOS and `Ctrl+Shift+F` elsewhere, so Ctrl+letter keys keep
reaching the shell. `hints` (default true) shows or hides the delayed shortcut
badges shown while holding the modifier key; shortcuts work either way.

`history.back` / `history.forward` (`Mod+[` / `Mod+]`) follow the pages opened
in the current window, like the sidebar arrows. `thread.previous` /
`thread.next` follow sidebar order instead: `Mod+Shift+[` / `Mod+Shift+]`
on desktop and `Control+Shift+[` / `Control+Shift+]` on the web.

`thread.rename`, `thread.archive`, `thread.markRead`, and `thread.pin` start
unbound and act on the focused pane's open thread; Mark read and Pin toggle
like the matching thread menu item.

An open question card binds `question.select.1`–`9` (`1`–`9`),
`question.submit` (`Mod+Enter`: Next, or Submit on the last question),
`question.previous` / `question.next` (`ArrowLeft` / `ArrowRight` with focus
in the card), and `question.cancel` (`Mod+.`). They skip text fields outside
the card. In the card's answer field, `Enter` goes to the next question or
submits and `Shift+Enter` adds a line.

An override can be scoped with `--platform`; without it, it applies on all
platforms. A platform-specific override takes precedence over a general one,
including when disabled. Scoped `set` and `reset` keep other platforms'
overrides; unscoped `set` updates the general override, and unscoped `reset`
clears every scope for the command (or every command if omitted). The SDK uses
`system.updateKeyboardSettings` to write and `system.config` to read bindings.

Plugin commands use `plugin:<plugin-id>/<command-id>` as their binding ID, for
example `cc settings keyboard set plugin:example/open-issue Mod+Shift+I`;
`reset` restores the plugin's default. Overrides survive plugin disable,
re-enable, and reload. Commands without defaults start unbound, and
conflicting plugin defaults stay unbound. Plugin defaults resolve in each app
window, not in `keyboard list`, so CLI/SDK callers should clear conflicting
explicit bindings in the same update.

Sidebar preferences

`cc settings ui` reads and writes server-side sidebar preferences shared by
every window, device, and the CLI. The same registry stores which thread Info
panel sections are collapsed (`infoPanel.collapsedSections`) and whether a
thread pane's thread context card stays pinned open (`threadContextCard.pinned`).

cc settings ui list [--json]
cc settings ui get <key> [--json]
cc settings ui set <key> <value> [--json]
cc settings ui reset <key> [--json]

`list` prints every key with its value, revision, and a short description.
`set` takes plain strings for enum and provider keys and JSON for lists and
`null`; it retries once if another writer changed the key. `reset` writes the
default. The SDK offers `sdk.system.uiPreferences.list()`, `.set()`, and
`.reset()`.

The thread list is drawn by `sidebar.threadListProvider`, which defaults to
`__automatic__`: the first installed thread list plugin other than the bundled
Thread list plugin (`thread-list/thread-list`), or the bundled plugin when
there is none, so installing a thread list plugin switches to it. Select one
with `cc settings ui set sidebar.threadListProvider <plugin-id>/<slot-id>`, or
reset to restore Automatic. The bundled Thread list plugin keeps its own
layout (organization mode, sort, grouping, hidden and collapsed groups) and
copies the legacy `sidebar.*` layout keys from here only once; change its
layout with `cc thread-list prefs` (see `cc guide plugins`).

The composer's input box is drawn by `composer.provider`, which defaults to
`__automatic__`: the first composer plugin you installed, or the bundled
Composer plugin (`cc--composer/composer`) when there is none. Pick one with
`cc settings ui set composer.provider <plugin-id>/<slot-id>`, or reset to
restore Automatic. With no composer plugin enabled, no composer is shown.

A vertical rail of destinations sits on the left edge of the sidebar on every
screen size. Home is at the top and returns to the last thread; the visible
destinations (Plugins, Skills, and plugin panels) follow; More holds hidden
destinations and Customize navigation; Settings is at the bottom. New thread sits in
the sidebar header and cannot be hidden from the rail. The list beside the rail swaps between
the thread list, Plugins, Skills, and Settings, and collapsing the sidebar
hides that list and leaves the rail. Rail order and visibility are
`sidebar.pluginPanelOrder` and `sidebar.visiblePluginPanels`. In the macOS
desktop app, wide windows add a title bar holding the window controls, Back
and Forward, and the sidebar toggle; the sidebar and page sit in a card below
it. On narrow windows and phones the rail sits inside the drawer: Home,
Plugins, Skills, and Settings swap the list beside it and leave the drawer
open, and a plugin page closes it.

The rail and the top list below are the two layouts of the bundled Navigation
plugin, a built-in you can fork like the thread list.
`sidebar.navigationProvider` picks what draws the navigation:
`navigation/rail` (the rail above), `navigation/top-list` (labeled rows above
the thread list), another navigation plugin as `<plugin-id>/<slot-id>`, or
`__automatic__` (the default: the first navigation from another plugin, else
`navigation/rail`). Pick one in Settings → Appearance → Navigation, or:

cc settings ui set sidebar.navigationProvider navigation/top-list
cc settings ui reset sidebar.navigationProvider

The top list puts the visible destinations, New thread among them, and More
above the thread list, moves Settings into the footer, and adds a Back to app
row to the Settings, Plugins, and Skills lists. New thread can be reordered
and hidden like any other row there. Collapsing hides the whole sidebar, and
the macOS desktop app drops the separate title bar. A navigation plugin
declares whether it draws a rail or a list, and gets the matching layout; a
list navigation can also bring its own controls beside the sidebar toggle.
The same order and visibility keys apply to every provider.

Footer actions: `sidebar.footerOrder` and `sidebar.hiddenFooterItems` are
string lists of `builtin:settings` (top list only), `builtin:mobile`,
`builtin:report-bug`, or
`plugin:<encoded pluginId>/<encoded registrationId>`. They survive plugin
reloads and temporarily unavailable plugins; new items are visible by default.

cc settings ui set sidebar.hiddenFooterItems '["plugin:cc--provider-usage/usage"]'
cc settings ui reset sidebar.hiddenFooterItems

In the app, the sidebar footer's More menu holds hidden actions and actions
that don't fit; Settings → Appearance → Sidebar footer, or right-clicking an
action, edits the footer.

The command palette's thread search has its own Active/Archived filter, which
is browser-local: it is not a server setting or a CLI/SDK option. The sidebar
thread list's Active/Archived filter is the Thread list plugin's
`threadLifecycles` preference.

Sidebar width and open state are per window and stay local to the browser.

Host files and voice transcription

cc file read|write|list|paths|mkdir|move|remove ...
cc voice transcribe <audio-file> [--type <mime>] [--prompt <context>]
--type defaults to audio/webm

`cc file` supports `--host` for remote machines and `--root` on mutating
commands to confine access beneath an absolute directory. `cc file write`
takes exactly one of `--content` or `--stdin`; `cc file paths` lists files and
directories unless `--files` or `--directories` narrows it. `cc file list` and
`cc file paths` include dot-prefixed entries; pass `--no-hidden` to skip them.
Both skip a default set of dependency and cache directories such as
`node_modules`, `.venv`, `.pnpm-store`, and root-relative `.claude/worktrees`;
`--exclude <names...>` replaces that set. Entries match basenames at any depth
or exact root-relative paths using `/` separators. Use
`--json` for metadata and machine-readable results.

`cc file remove` needs `--yes` without a terminal. `cc file remove --recursive`
and `sdk.files.remove({ recursive: true, ... })` first stop processes whose
working directory is inside the directory, including dev servers in nested
checkouts (macOS and Linux only).

Voice transcription uses the Voice input service chosen with
`cc settings ai-services set voice <automatic|off|service-id>`. cc accepts
recordings up to 25 MB, and each service may set a lower limit; Codex takes up
to 20 MB. These limits apply to the app, SDK, and CLI. The app's microphone
choice is per browser and has no `cc` command. Right-click the composer
microphone, press Shift+F10, or click the Microphone control in Settings →
Voice Input to open preferences in a desktop popover or mobile drawer.
Opening starts a local waveform preview; closing releases it. Recording
controls contain cancel, stop, and send; preferences are available while idle.

Missing or unreadable inputs fall back to the system default, then other
available inputs. Permission denials do not trigger fallback. A disconnect
switches inputs in the same recorder, preserving captured audio. A reconnected
preferred device is used on the next recording. A missing preference alone
shows no warning. Capture failures warn on the idle microphone; five seconds
of near-silent audio warns in the preview or recording row without switching
inputs or stopping capture. Preview audio is never saved or transcribed.

Mobile app downloads

Settings → Mobile links the iOS TestFlight
(https://testflight.apple.com/join/T9MayTMb) and the Android APK from the
public `codythatsme/cc` GitHub `android-testing` release (`cc-android.apk`), and
pairs either app through Add mobile device. `cc settings mobile-app --json` or
SDK `system.mobileAppDownloads()` returns both links. Add `--details --json`
or call `system.mobileAppReleases()` for the Android version, build, size, and
upload date; `android` is `null` when that metadata is unavailable, and the
links still work. Inside the Android app, this page compares the installed
native build number with the published APK. Older apps without build reporting
cannot determine update status. Installed version and build are device-local;
CLI and SDK metadata report the published APK.

Server performance diagnostics

Start with `cc-app --perf-diagnostics` or `CC_PERF_DIAGNOSTICS=1` (restart to
change), then run `cc settings experiment performanceDiagnostics true|false`.
Collection needs both; it adds overhead and writes CPU profiles every 30 seconds
to `$CC_DATA_DIR/logs/performance/` (kept 12 hours), which contain local paths.
It also logs `Slow SQLite query plan` warnings to the server log for queries
whose plan walks a large table or picks a weaker index.
Open a `.cpuprofile` in Chrome DevTools.

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

Outbound networking

cc's own server, daemon, and worker processes trust OS-managed certificate
authorities and enable Node's environment proxy support by default; terminals,
provider CLIs, and agent shells keep the user's Node networking defaults. Configure `HTTP_PROXY`,
`HTTPS_PROXY`, and `NO_PROXY` with `cc-app env set` or in the launch environment;
include `localhost,127.0.0.1,::1` in `NO_PROXY`. `NODE_EXTRA_CA_CERTS` adds a PEM
bundle. `NODE_USE_SYSTEM_CA=0` and `NODE_USE_ENV_PROXY=0` opt out of the defaults.
Restart cc after changes. Proxy support requires Node 22.21+, 24.5+, or 26;
daemon WebSockets follow it, but other custom socket/agent libraries can still
bypass it.
