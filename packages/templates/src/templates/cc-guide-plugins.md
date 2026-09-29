cc bundles its SDK. `cc plugin new`, `cc plugin types`, and `cc plugin migrate`
copy the current SDK into `.cc/plugin-sdk-<version>` inside the plugin and pin a
relative file dependency. Keep that directory when sharing the plugin. Other
plugin dependencies install from npm normally. No SDK registry publication is
required.

---
kind: instruction
title: cc Guide — Plugins
summary: Command reference for installing, configuring, running, and authoring cc plugins and their contributed CLI commands.
intent: Provide complete plugin command documentation plus an authoring walkthrough for agents and humans building cc plugins.
editingNotes: Keep flags accurate against the CLI implementation (apps/cli/src/commands/plugin.ts, apps/cli/src/commands/marketplace.ts) and the server plugin service; a CLI test asserts every `cc plugin` and `cc marketplace` subcommand appears in this chapter. The full authoring reference is the cc-plugin-authoring builtin skill.
---
Plugin commands

A cc plugin is a TypeScript package that extends the cc server in-process and
may also declare one bundled Node entry for enrolled hosts: background
services, cron schedules, HTTP/RPC endpoints, thread lifecycle handlers,
settings, storage, host-local operations — and `cc` CLI subcommands that agents
and humans run like any other command. Plugins are full-trust code in both
runtimes.

Plugins are on by default. Builtin plugins (`builtin:<name>`) ship with cc;
user-installed plugins come from `cc plugin install` or the official store.
Plugin state lives under `<cc-data-dir>/plugins/<id>/` (per-plugin SQLite file,
secrets, logs).

The builtin Custom instructions plugin adds a multiline editor under Settings
→ Custom instructions. Saved text is persisted on this cc host and included in
agent task instructions; blank text contributes nothing.

The builtin Account Pooler plugin is disabled on fresh installations. It stores
Claude and Codex account tokens in per-account 0600 secret files and proxies
provider API requests through the cc server. Enable it and add an account:

```
cc plugin enable account-pool
cc pool account add --provider claude --login
printf '%s\n' "$CLAUDE_AUTH_CODE" | cc pool account login-complete --session <id> --code-stdin
cc pool account add --provider claude --import
cc pool account add --provider codex --import
printf '%s\n' "$ANTHROPIC_API_KEY" | cc pool account add --provider claude --api-key-stdin [--label <text>] [--priority <n>]
cc pool account add --provider claude --api-key <key> [--label <text>] [--priority <n>]
cc pool account list [--json]
cc pool account remove <id>
cc pool account enable <id>
cc pool account disable <id>
cc pool account priority <id> <n>
cc pool account reorder <claude|codex> <id>...
cc pool account refresh <id>
cc pool status [--json]
cc pool routing <claude|codex> [--off]
cc pool config
cc pool config set <anthropicUpstreamBaseUrl|codexUpstreamBaseUrl|switchThreshold> <value>
cc pool token rotate --machine <id-or-name>
cc pool bypass <thread-id> [--off]
```

Claude `--login` starts a ten-minute in-memory PKCE session, prints the browser
sign-in URL and session ID, then exits. After sign-in, pipe the manual callback
code to `account login-complete` with that session ID. The browser does not need
to run on the cc server machine, and neither the code nor account tokens enter
process arguments. Codex `--login` prints a device verification URL, one-time
code, session ID, and an `account login-poll` command that waits for
authorization. Both flows are available in the plugin settings page through
the **Sign in to Claude** and **Sign in to Codex** buttons. The CLI Codex import
path continues to read the cc server host's `~/.codex/auth.json`.

The hub starts immediately, even before an account is configured, so newly
added or enabled accounts are available without a plugin reload. With an
enabled account whose secret file remains readable and valid, the plugin
contributes its provider-specific server route and a distinct secret token to
Claude Code or Codex sessions on every host. Claude Code also receives
`ENABLE_TOOL_SEARCH=true` so tool search stays on through the hub. Codex
receives `CODEX_OPENAI_BASE_URL` and the secret `CODEX_POOL_AUTH_TOKEN`; its
app server uses those values without editing `~/.codex/config.toml`.
Codex image generation and editing use the same authenticated pool route.
Tokens are never printed. `status` prunes tokens for
unenrolled machines and shows token timestamps plus recently routed threads
whose machines need a local Claude login before the pool can be disabled
safely. Rotation keeps the prior token valid for ten minutes. Agents should use
`--api-key-stdin`, which reads exactly one non-empty key from piped standard
input. The compatibility form `--api-key <key>` exposes the key in process
arguments, shell history, and agent transcripts. Prefer `--import` when Claude
Code is already signed in. OAuth quota refreshes on add or enable and every
five minutes while the account is idle. Use `cc pool account refresh <id>` to
request an immediate refresh for one account. Account tables add columns for
the family buckets Anthropic reports, and JSON status exposes the same
observations under `familyWeekly`. Selection skips an account only for a spent
requested family while retaining it for other families. When Claude Code supplies an
account UUID in `metadata.user_id`, the hub aligns it with the selected OAuth
account. `cc pool config` prints the quota switch threshold and both upstream
URLs. Use `cc pool config set <key> <value>` to change one; the two URL values
are QA-only overrides. Upgrading from a build that stored these values through
plugin settings resets the threshold and QA overrides to their defaults.

Accounts run sequentially per provider: lower priority numbers first, with ties
following the order accounts were added. New conversations use the current
account until it reaches the switch threshold or fails; the pool then advances
to the next eligible account and wraps at the end. It keeps using that fallback
even when an earlier account recovers. Existing conversations stay pinned while
their account remains eligible. Short temporary rate limits wait on the same
account once; longer holds return Retry-After for pinned conversations while new
conversations can advance. A model-family limit detours only requests for that
family without moving the session's main pin or the provider cursor. The cursor
and session pins survive hub restarts. Session pins expire after 30 idle minutes,
and the pool retains the 4,096 most recently used pins.

Use the up/down arrows in Account Pooler settings, or
`cc pool account reorder <claude|codex> <id>...`, to set the complete order for
one provider. Include disabled accounts too. Reordering changes the next failover
sequence without moving the current account. `cc pool account priority <id> <n>`
sets an individual priority; the same operations are available through the
`account.reorder` and `account.setPriority` plugin RPCs.

The builtin Keep Awake plugin prevents macOS idle sleep while cc is running.
Its settings page lets you target all hosts or selected hosts. The CLI
equivalents are:

```
cc keep-awake status [--json]
cc keep-awake enable [--json]
cc keep-awake disable [--json]
cc keep-awake hosts all
cc keep-awake hosts <host-id>...
```

It reconciles when the plugin starts, a host connects, its configuration
changes, or a worker exits unexpectedly. Disabling the plugin disposes its host
workers and their child processes.

The builtin Concurrency limit plugin controls how many threads run at once.
Its settings page has an optional overall limit and one limit per host. Host
limits default to Auto: one thread per available processor.
Leave an override blank to return it to Auto; use 0 to pause new work. The CLI
equivalents are:

```
cc concurrency-limit status [--json]
cc concurrency-limit global [unlimited|<limit>] [--json]
cc concurrency-limit host <host-id> [auto|<limit>] [--json]
```

The builtin Provider retry plugin is enabled on fresh installations. It retries
Codex and Claude Code turns after structured provider overloads and subscription
window limits. A pending retry is a queued row on the thread, so a server
restart does not lose it, and that row — on the queue card above the composer,
with its reason, its time and its own Cancel — is the only place the wait is
narrated. Inspect it with `cc provider-retry status`. See
`cc guide providers` for the eligibility rules. The plugin only reacts to a
failed turn — it never blocks a send. Prior output or tool activity does not
block recovery. Its `maximumWait` setting defaults to `6 hours`; choose
`24 hours` or `No limit` from the plugin detail page, or configure it with
`cc plugin config provider-retry set maximumWait <value>`.

The builtin Workflows plugin runs durable provider-independent JavaScript
orchestration. It is disabled on fresh installations; enable `workflows` under
Settings → Installed plugins or run `cc plugin enable workflows` before using:

  cc workflows validate (--script '<javascript>'|--source '<javascript>'|
                        --file <path>|--name <name>)
  cc workflows run (--script '<javascript>'|--source '<javascript>'|
                   --file <path>|--name <name>)
                   [--args '<json>'] [--resume <run-id>]
  cc workflows status <run-id>
  cc workflows history <run-id> [--cursor <call-index>] [--limit <1-100>]
  cc workflows list [--limit <1-50>]
  cc workflows stop <run-id>

Commands must run from a CC project thread. Workflows has six plugin
settings, configurable with `cc plugin config workflows set <key> <value>`:
`maxActiveRuns` (default 4, range 1–32), `maxConcurrentAgents` (8, 1–64),
`maxAgentCalls` (100, 1–1000), `totalRunTimeoutMs` (86400000, 60000–604800000),
`retentionDays` (7, 1–3650), and `maxNotificationBytes` (16384,
1024–262144). `maxActiveRuns` applies live; the other five are snapshotted for
each new run. Settings changes do not require a plugin reload.

`status` is a bounded polling summary, and `list` returns only compact run
summaries. Detailed run and call records are paged JSONL: redirect `history`
into `$CC_THREAD_STORAGE` before inspecting it, and continue with the final
page record's `nextCursor`. The invoking shell writes
that file on the thread's execution host, so this works the same on local and
remote hosts without granting the plugin arbitrary filesystem access. Use `cc
provider list --environment "$CC_ENVIRONMENT_ID" --json` and then `cc provider
models <provider-id> --environment "$CC_ENVIRONMENT_ID" --json` before writing
an explicit selection; never guess ACP model IDs.

The Memory plugin is an opt-in install, bundled with the app:
`cc plugin install memory`. Once installed, it injects a compact global and
current-project memory index into agent context and progressively discloses
full records through CLI-only commands. Because its store works across
providers, we recommend disabling provider-native memory under Settings →
Providers to avoid duplicate or conflicting stores. Settings → Memory lists
every global and project memory and supports version-checked edits and soft
deletion.

  cc memory catalog [--scope project|global|all] [--json]
  cc memory search <query> [--scope project|global|all] [--json]
  cc memory get <id> [--scope project|global|all] [--json]
  cc memory add --scope project|global --name <name> --summary <text>
                --details <text> --reason <text> [--kind <kind>]
                [--tag <tag>]... [--importance <0-100>] [--pinned] [--json]
  cc memory update <id> --expected-version <n> [fields...] [--json]
  cc memory forget <id> --expected-version <n> --reason <text> [--json]
  cc memory history <id> [--scope project|global|all] [--limit 1-100] [--json]

Project writes use the invoking CLI's current project. Global writes require
the explicit `--scope global` flag.

The Docs plugin is an opt-in official plugin bundled with the app:
`cc plugin install docs`. Read-only discovery remains direct, while edits use
a manifest-backed local workspace:

  cc docs vaults [--json]
  cc docs list [--vault <id>] [--json]
  cc docs read <path> [--vault <id>]
  cc docs pull <path> [--folder] [--vault <id>] [--into <dir>]
  cc docs pull --all [--vault <id>] [--into <dir>]
  cc docs status [workspace-dir] [--delete] [--diff] [--json]
  cc docs push [workspace-dir] [--delete] [--dry-run] [--diff] [--json]

Pull preserves vault-relative paths and writes `.cc-docs-state.json`; edit the
ordinary files and leave that state file untouched. Push uses pulled SHA-256
versions as compare-and-swap guards. Concurrent changes stop with exit 3.
Status exits 0 when no changes exist and exits 4 when changes exist. Exit 4 is
a successful result. Review its output, then run push separately. Do not
connect status and push with `&&`.
Local file and empty-directory deletions are warnings unless `--delete` is
explicit; a pulled folder root is retained, so pull its parent or the whole
vault to remove that folder. Use `--workspace-host <id>` when a standalone
CLI's working directory is not on the server machine. Direct `write`, `mkdir`,
`move`, and `remove` remain only as deprecated compatibility commands.

Docs can also propose revisions without overwriting the saved document:

  cc docs proposal <path> [--vault <id>] [--json]
  cc docs propose <path> --file <candidate.md> --expected-sha256 <hash> --version <none|N> [--vault <id>] [--json]
  cc docs proposal-update <path> --content <markdown> --version <N> [--vault <id>] [--json]
  cc docs accept|reject|undo|redo <path> --version <N> [--vault <id>] [--json]

Read the current file and proposal before proposing. Use `none` only when no
proposal exists; otherwise pass its current version. Markdown Docs cards are
editable in the timeline and can open in a tab. Pending proposals show a live
diff for the user to accept, reject, edit, or request further changes.

The Tasks plugin is an opt-in official plugin bundled with the app:
`cc plugin install tasks`. It adds a task tracker, agent delegation,
and the `cc tasks` command. Common agent operations are:

  cc tasks show <key-or-id> [--json]
  cc tasks list [--project <prefix-or-id>] [filters...] [--sort manual|priority|due] [--limit 1-500] [--cursor <opaque>] [--json]
  cc tasks comment <key-or-id> (--body <markdown> | --body-file <path>) [--json]
  cc tasks attachment add <key-or-comment-id> --file <path> [--json]
  cc tasks attachment get <attachment-id> --out <path> [--json]
  cc tasks attach <key-or-id> [--thread <thread-id>] [--json]
  cc tasks detach <key-or-id> [--thread <thread-id>] [--json]
  cc tasks update <key-or-id> --status in_review [--json]
  cc tasks update <key-or-id> (--parent <parent-key-or-id> | --no-parent) [--json]

Run `cc tasks --help` for project, folder, task, label, attachment, and demo-data
commands, plus preset management, delegation, and attached-thread inspection.
Delegated threads are attached automatically; use `cc tasks attach` only when
work started outside Tasks, and `cc tasks detach` when a thread is done with a
task or a respawned worker replaced it. `cc tasks threads <key>` lists live
threads first, newest first. Task update resolves both task keys and IDs for
`--parent`; use `--no-parent` to promote a subtask to the top level. File paths
in tasks commands resolve on the invoking machine (the thread's machine inside
an agent thread, otherwise the server's); pass `--machine <id-or-name>` to
target another enrolled machine.
Task lists default to 100 rows. JSON pages include `nextCursor`; human pages
print the exact continuation option when more rows exist. Cursors are bound to
the filters, sort, and task-list revision. Any add, removal, reorder, update,
label-link/name change, active-thread change, or project-prefix change invalidates an
outstanding cursor; restart without `--cursor` instead of accepting a mixed
snapshot.

The builtin Secrets plugin provides a secure credential form and guarded
dotenv reconciliation:

  cc secret request <NAME...> --write-env <path>
                    [--purpose <text>] [--describe <NAME> <text>]...

The command blocks until the user submits or cancels the form. Secret values
never appear in command arguments, model-visible output, or persisted
interaction data; success prints only the path, variable names, and
added/updated/unchanged counts.

  cc plugin search <query>       Search the store: the plugins bundled with
                                 the app plus every registered marketplace
                                 catalog. Results include a Category column
  cc plugin install <entry>      Install a bundled official plugin by name
                                 (github, docs, memory, tasks),
                                 <entry-id>@<marketplace>, a Git repository
                                 URL, local path, builtin:<name>,
                                 git:<url>[@<ref|semver-range>], or
                                 npm:<package>[@<version|tag|range>]
                                 (installs prompt —
                                 pass --yes to skip). Managed git:/npm:
                                 installs refuse engines.cc / engines.ccPluginSdk
                                 mismatches, manifest/artifact identity
                                 mismatches, and ids reserved by bundled plugins
                                 Omitted npm specs, ranges, dist-tags, omitted
                                 Git refs, Git branches, and Git semver ranges
                                 track; exact npm versions, Git tags, and Git
                                 commits are pinned
                                 --subdirectory <path> installs one plugin
                                 directory of a multi-plugin git:/path:
                                 repository; --plugin <name> installs the
                                 .cc/plugins.json entry with that name
                                 (the two flags are mutually exclusive)
                                 --tag-prefix <prefix> resolves a git: semver
                                 range over <prefix>vX.Y.Z tags
                                 Installing a local path for an id that is
                                 already installed from another local path
                                 moves it there and keeps its settings
  cc plugin outdated             Check installed plugins for compatible
                                 updates (table; --json for raw results).
                                 Columns: installed, latest compatible,
                                 blocked newer (incompatible releases not
                                 selected), status. Dev builds (cc 0.0.0)
                                 annotate that engines.cc is not enforced
  cc plugin update <id> | --all  Apply compatible updates for one plugin or
                                 every tracking plugin with an update. Same
                                 full-trust confirmation as
                                 install (--yes skips; non-TTY refuses without
                                 --yes). Use outdated to preview; pinned
                                 installs stay put
  cc plugin list                 Status, services, schedules, handler timings.
                                 `cc status` also names enabled plugins that
                                 are incompatible, failed, or missing
  cc plugin source <id> [--json] Show requested/resolved source, subdirectory,
                                 semver range with its tag prefix and resolved
                                 tag, engine ranges, install time, and recent
                                 activation history
  cc plugin enable|disable <id>  Load or unload an installed plugin
  cc plugin safe-mode [on|off]   Show or change safe mode. `on` stops every
                                 plugin you installed (official store plugins
                                 included) without changing its enabled
                                 setting; plugins included with cc keep
                                 running. `off` restarts the ones that were
                                 enabled and exits 1 if any fail to start.
                                 Installs and updates of stopped plugins are
                                 refused until it is off. Also in the command
                                 palette
  cc plugin reload [id]          Re-run factories against current sources.
                                 Exits 1 when a plugin does not come up on
                                 them (previous instance kept, or degraded
                                 because a service ignored its abort)
  cc plugin config <id> [set <key> <value> | unset <key>]
                                 Show or change a plugin's declared settings
  cc plugin logs <id> [-n N] [-f]  Print (or follow) a plugin's cc.log output
  cc plugin run <id> [args...]   Run a plugin command explicitly (also works when core owns its name)
  cc plugin token <id> [--rotate]  Print the token for auth:"token" HTTP
                                 routes; --rotate generates a new token,
                                 invalidating the old one
  cc plugin remove <id>          Uninstall and delete the plugin's settings,
                                 secrets, and schedules (managed git:/npm:
                                 files deleted; local path sources stay on
                                 disk; builtin removals are remembered)
  cc plugin new <name>           Scaffold a todo-list plugin (server.ts,
                                 app.tsx with a sidebar page, a `cc <id>` CLI
                                 command, and a skill) and install its npm
                                 dependencies, including @codythatsme/plugin-sdk
                                 pinned to this cc's exact SDK version (no
                                 server required)
  cc plugin types [path]         Sync a plugin's @codythatsme/plugin-sdk surface to
                                 this cc (default: cwd): repin the npm
                                 devDependency to this cc's SDK version and
                                 the type-only devDependencies of the packages
                                 cc shims at runtime (sonner, vaul, the portal
                                 radix families, ...) to this cc's versions;
                                 legacy vendored-layout plugins must migrate;
                                 --check writes nothing and exits non-zero on
                                 a mismatch
  cc plugin migrate [path]       Switch a plugin that still vendors types/ to
                                 the @codythatsme/plugin-sdk npm package (default:
                                 cwd): pin the devDependency, drop the tsconfig
                                 path map, delete the vendored declarations.
                                 Prints the plan and asks first; --yes skips
                                 the prompt (required when stdin is not a
                                 terminal)
  cc plugin build [path]         Compile the plugin into dist/ — the backend
                                 bundle (server.js, server.meta.json); when
                                 cc.app is declared, the minified frontend
                                 bundle (app.js, app.css, app.meta.json); when
                                 cc.host is declared, the self-contained Node
                                 host bundle (host.js, host.js.map,
                                 host.meta.json recording its digest — host
                                 daemons fetch and verify the bundle by that
                                 digest, and run it as a host RPC worker, a
                                 provider bridge, or both). Each
                                 *.meta.json is stamped with SDK
                                 major/version, artifactFormatVersion,
                                 pluginId, pluginVersion, and builtWith (cc +
                                 plugin SDK versions); no server required
  cc plugin dev [path]           Watch a plugin's sources (default: cwd) and
                                 on every change rebuild its declared frontend
                                 (unminified, for readable stack traces),
                                 host, and provider-bridge bundles, then
                                 reload the plugin; Ctrl+C to stop

  cc marketplace add <source>    Add a marketplace from an https manifest URL,
                                 git:<url>[@<ref>], or path:<directory>. cc
                                 validates the manifest, caches the catalog,
                                 and fetches the entry icons. Adding a
                                 marketplace installs nothing
  cc marketplace list            Name, source, entry count, and last refresh of
                                 every marketplace (--json for raw rows)
  cc marketplace refresh [name]  Re-read one catalog, or every one of them.
                                 Discovery metadata and icons only — a refresh
                                 never installs, updates, or runs plugin code.
                                 A failed refresh keeps the last catalog cc
                                 validated and exits non-zero
  cc marketplace remove <name>   Forget a marketplace. Its catalog rows and
                                 cached icons are deleted; plugins installed
                                 from it keep running as direct installs and
                                 keep checking for updates from their recorded
                                 source. cc-official and cc-community cannot
                                 be removed

Multi-plugin repositories

One repository can hold several plugins. Each plugin directory stays an
ordinary plugin package with its own package.json and cc manifest. An optional
collection manifest at .cc/plugins.json indexes them:

  {
    "$schema": "https://raw.githubusercontent.com/codythatsme/cc/main/apps/web/public/schemas/plugins.schema.json",
    "schemaVersion": 1,
    "name": "acme-plugins",
    "plugins": [
      { "name": "sidebar", "source": "./plugins/sidebar" },
      { "name": "status", "source": "./apps/status" }
    ]
  }

Every source is a repository-relative directory that starts with "./".
Absolute paths, "..", and a source that selects the repository root are
rejected, and so are duplicate entry names and unknown fields. The file is an
index only: identity, branding, entry points, and engine ranges stay in each
plugin's own manifest.

Install one plugin of the repository:

  cc plugin install git:github.com/acme/repo@main --plugin sidebar
  cc plugin install git:github.com/acme/repo@main --subdirectory plugins/sidebar
  cc plugin install path:/work/repo --plugin sidebar

--subdirectory is the primitive and works without a collection manifest.
--plugin resolves a name from .cc/plugins.json. Installs from one repository
and commit share a single checkout. When a repository has a collection
manifest, is not a plugin itself, and neither flag is given, the install fails
and lists the entry names. cc records the subdirectory, so outdated, update,
rollback, and remove keep working per plugin.

CC Official plugins

CC's official plugins ship inside the app. The reserved `cc-official`
marketplace describes these plugins with the standard v2 format. Its catalog
uses a local path. It never uses the network. `cc marketplace list` shows it
first. You cannot add or remove it.

The plugins appear in the first Browse shelf, CC Official. They also appear in
their category shelves. Install a plugin by its bare name or its qualified name.
For example, use
`cc plugin install docs` or `cc plugin install docs@cc-official`. cc copies the
plugin from the app bundle. An app update also updates the bundled copy.

The CC Community marketplace has the reserved name `cc-community`. It starts
empty and performs no network requests. Set CC_MARKETPLACE_URL to an explicitly
chosen manifest URL and restart cc to enable community catalog refreshes at
startup and every two hours. You can also add your own marketplace with
`cc marketplace add`.

cc stores the last catalog that it validated. An invalid manifest keeps that
catalog. The initial community snapshot is empty. A
refresh changes discovery data and icons only. It never installs, updates, or
runs plugin code. The server fetches and serves entry icons. The detail page
loads screenshots from the URLs that the marketplace declares. An entry can
also carry a long-form markdown description. The detail page renders it below
the short description, and `cc plugin search --json` returns it as `overview`.
An install uses the normal git or npm source pipeline. cc records the source
marketplace.

A configured community marketplace may publish install counts in stats.json
beside its manifest. cc reads that file on refresh — the counts move while the manifest sits unchanged —
and shows them in the store and in the Installs column of `cc plugin search`.
Counts are read-only metadata supplied by the marketplace publisher. CC does
not collect or report plugin installation activity.

CC Official entries use the same counts. cc finds each count in the CC
Community `stats.json` file by the plugin id.

Third-party marketplaces

Anyone can host a marketplace manifest. Add one with its https manifest URL,
with git:<url>[@<ref>] (cc reads marketplace.json from the checkout), or with
path:<directory> on the cc server's machine:

  cc marketplace add https://plugins.acme.dev/marketplace.json
  cc marketplace add git:github.com/acme/cc-marketplace@main
  cc marketplace add path:/work/acme-marketplace

The manifest `name` is the marketplace identity. cc refuses a duplicate name.
The `cc-official` and `cc-community` names are reserved. You cannot add or
remove them. A third-party marketplace can use manifest v1 or v2. A git or
path marketplace reads icons
from its checkout. An HTTPS marketplace resolves relative icon URLs against
the manifest URL. The server fetches and serves all icons. The detail page
loads screenshots from the URLs that the marketplace declares. cc clones a
git marketplace into a temporary checkout. cc keeps only the validated
manifest and icon bytes.

cc ignores unknown v2 fields, except in npm and git source objects. cc rejects
unknown source keys because a source key changes the installed code.

Install an entry of a specific marketplace with <entry-id>@<marketplace>:

  cc plugin install thread-hover-cards@acme-plugins

A bare id resolves across every marketplace. Exactly one match installs.
Several matches fail and list the id@marketplace choices. Every other source
form — Git repository URLs, path:, npm:, git:, builtin:, and path-like
syntax — is unchanged and still bypasses catalog resolution.

Before an install from a third-party marketplace, cc resolves and
shows the true source: the npm package with its range or dist-tag, or the git
URL with its ref or semver range, its subdirectory, and the exact release tag
and commit that range currently lands on. The confirmation names the
marketplace and the entry's author. `--yes` skips the prompt, not the
resolution. The same disclosure appears in the app's install dialog, and
Settings → Plugin marketplaces adds, refreshes, and removes marketplaces with
the same server routes the CLI uses.
The install must still match these confirmed source facts. cc refuses the
install when the listing or its resolved git commit changes after confirmation.

Removing a marketplace never disturbs installed code. Each plugin it listed
becomes a direct install that keeps its full source intent and exact
resolution, so `cc plugin outdated` and `cc plugin update` keep working from
the recorded source. Only the catalog rows and the cached icons are deleted.

The Browse tab groups entries by publisher: CC Official for the plugins
bundled with the app, CC Community for the curated marketplace's listings, and
each third-party marketplace under its own display name. Grouping keys on the
marketplace identity, not on the display name, so a marketplace cannot join
another publisher's group by copying its name. Only the two reserved
marketplaces can use the CC Official or CC Community labels. Entry cards show
the author.

For direct git:/npm: installs, updates are manual: `cc plugin outdated`
checks tracking sources and `cc plugin update` applies compatible candidates.
Reinstalling an already-installed managed plugin is refused — use
`cc plugin update`. A failed activation restores the pre-update snapshot and
leaves the latest failure visible as needing attention. Exact npm versions,
git tags and commits, path sources, and bundled official plugins are pinned;
npm ranges/omitted specs/dist-tags, omitted Git refs (the repository default
branch), Git branches, and Git semver ranges track compatible updates. A
pinned git:/npm: source changes only through `cc plugin remove` (which
deletes the plugin's settings, secrets, and schedules) and a fresh install. A
local path plugin is never removed to change it: edit it in place and
`cc plugin reload <id>`, or `cc plugin install path:<new dir>` to move it to
another directory; both keep its configuration.

Git semver ranges

A git source can track releases the way an npm range does, over the
repository's tags:

  cc plugin install git:github.com/acme/repo@^1.2.0
  cc plugin install git:github.com/acme/repo@semver:^1.2.0
  cc plugin install git:github.com/acme/repo@^1.2.0 --tag-prefix notes/

cc lists refs/tags, keeps the tags named [<tag-prefix>]vX.Y.Z that parse as
semver, and installs the highest one the range allows. Prereleases are
excluded unless the range itself names one (^1.0.0-beta.1), exactly as for an
npm range. Without --tag-prefix the tags are repository-wide (v1.2.3); with
it they version one plugin of a repository (notes/v1.2.3).

cc records the tag it selected and the commit that tag pointed at. If that
tag later points at another commit, cc refuses to resolve it and names both
commits: a released version is not allowed to change under you. Remove and
reinstall the plugin to accept the new commit.

A bare spec that reads as a range (`^1.2.0`, `1.x`, `>=1 <2`) resolves over
tags only when the repository has no branch or tag of that literal name; when
it has both, the install fails and asks you to choose. Write
`@semver:<range>` for the range or `@ref:<name>` for the literal ref. Bare
version tags such as `v1` and `v1.2.3` are always the literal tag.

`cc plugin search <query>` matches an id, name, description, category, or tag.
It searches cc-official and each other registered marketplace. The output has a
Category column. Status shows installed, compatible, or requires newer cc.
Install a bundled plugin by its bare name. Direct
HTTP(S) Git repository URLs, `path:`, `npm:`, `git:`, and `builtin:`
sources—and path-like syntax—continue to bypass official-plugin resolution.

Builds are automatic once installed. Git installs run `npm install`
(lifecycle scripts disabled), then compile both bundles — so a git plugin may
depend on third-party packages. node_modules is kept, because bundling cannot
inline data files a dependency reads at runtime. A committed dist/ is always
replaced by the bundles cc builds. Path installs compile dist/ at install time
from dependencies you have already installed. A build failure fails the
install. npm packages must ship a metadata-validated prebuilt app or the
install is refused. The server rebuilds source-built apps after a cc upgrade.

CC ships a pinned npm for plugin installation and updates; npm and Node do
not need to be on PATH. Git sources still require `git`. Git installs use
`--omit=dev --omit=optional --ignore-scripts`. Plugins may keep normal
development dependencies in their manifests; npm resolves these but does not
install them.
Checking for updates does not install dependencies: a check reads the candidate's manifest and stops, so
polling never resolves a dependency tree or builds. A candidate that fails to
build is reported as available and fails when you apply it.

cc ships no build toolchain. The first time a git or path plugin is built on
a machine, cc downloads a pinned esbuild + Tailwind set into
`<dataDir>/plugins/toolchain-<versions>/` and reuses it afterwards. Installing
a prebuilt npm plugin never triggers that download.

To build a plugin yourself — in CI, or to check it compiles without a running
cc — depend on the published `cc-app` package and call the CLI:

```jsonc
// your plugin's package.json
"devDependencies": { "cc-app": "^0.35.1" },
"scripts": { "build": "cc plugin build" }
```

`cc plugin build` talks to no server. Depending on `cc-app@X` builds with
exactly that release's shim configuration, so the bundle cannot be built
against a mismatched host runtime. Cache the toolchain directory in CI to skip
the download on later runs. Only `cc plugin dev` needs a running cc, because
it reloads the installed plugin after each rebuild.

The backend half is prebuilt too: when a builtin/official/git/npm install ships
a dist/server.js built for the running SDK major, the server loads it instead
of the TypeScript source. A declared `cc.host` is bundled into a self-contained
Node 22 ESM artifact and delivered lazily to the targeted daemon after digest
verification. Host production code may import public
`@codythatsme/plugin-sdk` entrypoints, Node APIs, and ordinary dependencies, but no
private `@cc/*` workspace packages; the host build rejects direct, transitive,
type-only, and relative imports that resolve into those packages.
Keep the SDK in exact devDependencies: the builder supplies and bundles its
small host runtime, so managed installs and remote workers do not resolve an
SDK package at runtime. That covers the bare `@codythatsme/plugin-sdk` import. An
SDK subpath (`@codythatsme/plugin-sdk/host`, `/provider-bridge`,
`/provider-bridge/acp`) imported from server or host code is
bundled from the plugin's own installed SDK, so a plugin that imports one
needs the SDK as a real dependency; the build names the missing install
rather than shipping an import cc cannot serve.
Path installs compile server.ts into a versioned cc-owned cache and load the
result with native ESM. The cache follows source, SDK, cc, and Node versions,
so `cc plugin dev`/reload sees edits immediately without running the source
transformer on the server event loop.
The Legacy plugin loader (JITI) experiment restores the previous loader on the
next install, reload, enable, update, or server restart; running instances are
unchanged when the experiment is toggled.

`cc plugin dev` is the edit loop: it requires the directory to already be
installed as a plugin (`cc plugin install .` first), ignores dist/,
node_modules/, and .git/, batches saves, and prints one line per cycle. A
build or reload failure prints the error and keeps watching (a failed build
skips that cycle's reload). Reloads reach open app pages live — changed
frontend bundles re-import and their UI slots remount without a page refresh —
and replace host worker generations on their next call.

Frontend entries (app.tsx) default-export `definePluginApp` from
`@codythatsme/plugin-sdk/app` and register UI slots: homepageSection (root compose),
settingsSection (per-plugin settings page below the host-rendered settings
form; no props in V1, optional host-rendered title),
navPanel (own sidebar entry + /plugins/<id>/<path>/* route; the remainder
arrives as the component's subPath prop for panel-internal deep links; the
host always renders the shared plugin title bar and the component owns a
zero-padding full-bleed body, including its scrolling; optional
experimental_sidebarAccessory mounts a presentational live-value component at
the trailing edge of the sidebar row on wide viewports, bounded to one short
line, replaced visually by the host options button on hover/focus, and omitted
on compact viewports),
threadPanelAction
(a thread-only entry in an existing thread's right-panel new-tab Actions list;
it is never offered on root compose, and its run() can
open closable panel tabs with recursive `JsonValue` params; restored
components read a required `threadId` plus `JsonValue | null`),
experimental_newThreadPanelAction (the root New thread counterpart, with
`projectId: string | null` instead of `threadId`), pendingInteraction (temporarily replace a thread composer with a
plugin form), fileOpener (register as a per-extension file viewer/editor;
users pick defaults under Settings → File openers and can right-click a
file link for a one-off choice), and messageDirective (replace a leaf
`::name{k="v"}` block inside assistant / nested-agent Markdown with a plugin
component; unknown, disabled, incomplete, code-fenced, or crashing
directives fall back to the original source; components receive a nullable
openWorkspaceFile(path) callback for opening a worktree-relative file in the
host workspace viewer and a nullable
openThreadPanel({ actionId, title?, params? }) callback for opening one of the
same plugin's thread-panel actions). Hooks:
useRpc, useRealtime, useRealtimeConnectionState (the shared realtime socket's
connecting/connected/reconnecting lifecycle; reconcile on later connected
transitions, not the initial connection), useSettings (secrets excluded),
useCcContext,
useCcNavigate (including openUrl(url), which applies the current
client's in-app/external-browser preference, plus
experimental_openFilePreview({ target, location }) and
experimental_openFileExternally({ target, location }) for explicit live
workspace/host/thread-storage files), useComposer
(read/replace/update/clear scoped composer text,
apply a class-based text effect, lock input, quote selections, insert mention
pills, and focus the composer), and useComposerView (reactive bound scope,
layout, draft, and run state). Plain-text edits preserve attachments and
reconcile only inline mentions overlapped by the edit. Define RPC methods with `defineRpcContract`
and Standard Schema-compatible input/output validators (Zod works directly),
register via `cc.rpc.register(contract, handlers)`, then use a type-only
backend contract import with `useRpc<typeof contract>()` for exact frontend
method/input/result inference. The server validates both schemas and rejects
non-JSON results (including cyclic and non-finite values) with structured
error codes. Components are vendored shadcn source the plugin owns (the
shadcn model): `cc plugin new` pre-vendors a starter set into
components/ui/ and `npx shadcn add @cc/<name>` pulls more from the CC
component registry (the full stock shadcn set, version-matched to the
running CC via the pinned ref in components.json). Product capabilities are
the exception: UrlLink renders a real anchor whose ordinary
HTTP(S) activation uses the same client preference as first-party links while
leaving app routes, modifiers, copying, unsupported schemes, and explicit
targets browser-owned. A `_blank` or named target preserves your `rel` tokens
but adds `noopener noreferrer` unless `rel` explicitly contains `opener`.
experimental_FileLink renders a real explicit live-file anchor whose ordinary activation uses the same
preview/file-opener controller as first-party links. Valid targets expose an
encoded, scheme-safe href; traversal paths, ill-formed Unicode, and other
malformed runtime targets are inert in both the app and SDK test harness. Its
lazy context menu adds Open with, preferred-external, installed-app, and copy
actions without reading the file or discovering editors on mount.
experimental_ProviderModelPicker is the controlled
`{ providerId, model, reasoningLevel, serviceTier? }` selector backed by the
same catalog and picker as cc's composers; provider switches emit only after
the target provider's verified defaults and capabilities resolve. Its optional
`routing` targets a host or existing environment; `disabled` renders the same
selection summary read-only. Tasks presets and Automations use this component
instead of plugin-owned catalog RPCs.
Every `fixedTabs` registration must include `panelId` equal to its
containing nav panel's `id`; it is also an owner-scoped reference. Add
`experimental_target: { validate }` for a typed JSON-safe transient target,
select it with `experimental_useAppPanel().openFixedTab({ surface: { kind:
"current" }, tab, target? })`, and read the target state inside the fixed tab
with `experimental_useFixedTabTarget(tab)`. Target state survives tab, panel,
and route remounts for the current app session; call `clear()` when returning to
the tab's untargeted state. Selection persists across refreshes, but targets do
not. A plugin can address only its own eligible tab on the current nav panel.
`import { toast } from
"sonner"` reaches the host toaster; react, the portaling radix families,
sonner, vaul, @pierre/diffs, and the host-resident clsx, tailwind-merge, and
class-variance-authority libraries are runtime-shimmed (never bundled). Shimmed
does not mean undeclared: tsc resolves their declarations through node_modules,
so each shimmed package a plugin imports is a type-only devDependency at the
host's version — the scaffold declares all of them and `cc plugin types`
repins declared packages; unused packages may be removed. Never list one in dependencies, which would bundle a second copy —
though source and diffs should go through the host's own
experimental_SourceCode / experimental_Diff components rather than
@pierre/diffs directly, so cc owns patch normalization, syntax
highlighting, and the live code theme. A Diff caller that has loaded complete
old/new UTF-8 file contents can pass them through
`experimental_fullFileContents` to enable
expand-context controls without exposing Pierre types. CC's original renderer
validates those paths and hunk lines before enabling expansion; a replacement
that implements its own expansion must do the same.
Everything else (zod included) bundles from the plugin's node_modules (`npm install` for authors; CC installs
release packages with their declared production dependencies). A crashing slot collapses to a
"plugin <id> crashed" chip without
touching the rest of the app. Installed plugins and their declared settings
(same data as `cc plugin config`) appear under both Settings → Installed plugins
and Plugins → Installed plugins. Both locations manage the same installed plugins.
On a plugin's detail page, the settings button beside the enable switch opens
its settings in place; Plugin details returns to the page. A local plugin's
Source section opens or copies its path.

Plugin CLI commands: a plugin can register one top-level subcommand (for
example `cc github …`). Unknown `cc` commands are looked up against installed
plugins and proxied to the server, so plugin commands work exactly like core
commands; core command names always win. A collision logs an activation warning,
and `cc plugin list` shows the required `cc plugin run <id>` form. Inside agent
threads the generated `plugin-commands` skill lists the available plugin commands.

Settings changes do not auto-reload a plugin — run `cc plugin reload <id>`
after configuring. Add --json to plugin commands for machine-readable output.
Plugin CLI stdout plus stderr is capped at 1,048,576 UTF-8 bytes from the
shared `@codythatsme/plugin-sdk` constant. Results above the ceiling are rejected in
full with a structured `plugin_cli_output_too_large` error; output is never
silently clipped. Page growing collections and use file/streaming commands for
large content.

Authoring a plugin

The loop: `cc plugin new <name>` scaffolds `./cc-plugin-<name>` — a working
todo list with a backend, a sidebar page, a `cc <name>` command, and a skill;
delete what you do not need; `cc plugin install .` registers it; `cc plugin
dev` watches and reloads on every save. The manifest is package.json: required
`cc.name` and `cc.description` human identity, required `cc.branding` with at
least `icon` or `logo.light`, `cc.server`
(backend entry, loaded as TypeScript — no build step), optional `cc.app`
(frontend entry), optional singular `cc.host` (full-trust Node entry run by
targeted enrolled daemons), optional `cc.skills` (static skill directories auto-imported
into agent threads unless filtered by `cc.agents.configure`; default
`skills/`), `engines.cc` (supported cc range),
and optional `engines.ccPluginSdk` (the lowest plugin SDK you need, read as a
floor rather than a ceiling; scaffold writes `">=0.4.3"` for SDK 0.4.3). Use
`cc-plugin-hello` for the package name by
default. Scoped names such as `@acme/cc-plugin-hello` are also supported. The
plugin id is the final package-name component minus `cc-plugin-`, so both forms
use `hello`.

The scaffold also writes `PLUGIN_OVERVIEW.md` beside package.json: the
long-form store listing, shown in an Overview section under `cc.description` on
the plugin detail page in the app and on cc.example.invalid. It says the same thing as
`cc.description` at length, so update both together. Keep it under 4000
characters, use headings, paragraphs, emphasis, code, blockquotes, lists,
thematic breaks, and absolute https links only, and do not open with a `#`
title. A submission to the CC Community marketplace requires the file.

Plugins can contribute palettes with `cc.themes`: an array of
`{ id, name, description?, css, codeTheme? }`, where `css` is a
plugin-relative `.css` file and optional `codeTheme` is
`{ dark?, light? }` (a bundled Shiki / Pierre name or a plugin-relative
VS Code theme `.json`). Loaded plugin palettes appear in Settings →
Appearance and `cc theme list`; their selectable id is
`plugin:<plugin-id>:<theme-id>`. Disabling or removing the owning plugin
makes cc fall back to the default palette.

Branding is explicit. Declare `cc.branding.icon` as either the plugin's
canonical CC icon name or a plugin-relative compact SVG such as
`./assets/icon.svg`. CC validates and hash-serves path-shaped SVGs, then
renders them as masks that inherit the surrounding text color. Compact chrome
prefers the manifest icon, then a contribution's local icon hint, and finally
Zap. Roomy surfaces reuse the same icon when no logo override is declared.

Add `cc.branding.logo.light` only for intentionally different rich/full-size
identity artwork; optional `cc.branding.logo.dark` is preferred in dark mode.
Logo paths must be plugin-relative `.svg`, `.png`, or `.webp` files.
`cc plugin build` refuses an SVG logo that carries a script vector (a
`script`, `handler` or `listener` element, an `on*` attribute, or a
`javascript:` href) and takes any other tool export as-is; install and load
never refuse a logo, and every SVG cc serves carries `nosniff` and a
`default-src 'none'` CSP. Root logo files are not auto-detected, and a dark
logo requires a light logo. Logo-only
manifests remain supported for compatibility, so at least an icon or light logo
is required. Do not duplicate the same artwork across fields. CC rejects nulls,
empty strings, missing or escaping assets, and unsupported extensions. Reload
the plugin to pick up branding changes.

The backend entry default-exports a factory receiving the full plugin API:

  import type { CcPluginApi } from "@codythatsme/plugin-sdk";
  export default async function plugin(cc: CcPluginApi) { ... }

The import is type-only and erased at load; the scaffold depends on the npm
package @codythatsme/plugin-sdk, pinned to this cc's exact SDK version, so
`npm install && npx tsc --noEmit` typechecks anywhere — no cc checkout
needed. The full API lands at
node_modules/@codythatsme/plugin-sdk/bundled-types/cc-plugin-sdk.d.ts (plus
-app.d.ts and -host.d.ts): ordinary readable declarations, not a minified
bundle — read them
for an exact signature. Plugins scaffolded before this switch instead vendor
the root/app declarations in types/, mapped through tsconfig. `cc plugin build`
and `cc plugin dev` still work with those checked-in declarations, but warn
without updating them. Run `cc plugin migrate` to receive current SDK types and
before adding `cc.host` so the `/host` and `/testing/host` declaration subpaths
are available; migration shows every change and asks first.
The SDK surface grows every release, so `cc plugin types` syncs a plugin to
the running cc by repinning the SDK devDependency and the declared shimmed packages'
type-only devDependencies. Unused, undeclared shim packages are optional for both
updates and `--check`; declare packages your source imports. It exits with migration instructions for a plugin
that still vendors types/. Run it in a cloned or older package-layout plugin,
and `cc plugin types --check` in CI. Need a symbol the types don't explain?
Clone the repo: https://github.com/codythatsme/cc. The API in
one line each — cc.log (plugin-scoped logger behind `cc plugin logs`);
cc.settings.define (declarative settings incl. secrets, editable via
`cc plugin config`); cc.storage.kv (JSON rows ≤256KB) and
cc.storage.database()+migrate (the plugin's own database); cc.sdk (the full
cc SDK — handlers/services only, not the factory; spawned threads are
attributed to the plugin; `visibility: "hidden"` creates directly addressable
background workers omitted from sidebar organization and unread/pending
favicon attention, with other behavior unchanged; a child thread inherits
its parent's visibility and still notifies that parent; plugins must archive
finished hidden workers when appropriate and call `threads.stop` in a
`finally` block to release each agent runtime promptly);
cc.events.on (observe thread.created/idle/failed/deleted);
cc.http.route (routes under /api/v1/plugins/<id>/http/* with
local/token/none auth); defineRpcContract + cc.rpc.register (Standard
Schema-validated frontend data plane with inferred backend handlers and
type-only frontend method/input/result inference);
defineRpcContract + cc.hosts.experimental_client (typed calls, typed ephemeral
host signals, and unexpected-worker-exit notifications to the plugin's own
`cc.host` entry; the host context also provides plugin-scoped data/temp paths
and daemon-owned native file watching; active calls and watches retain the
lazy worker automatically, while independent background work can hold an
explicit `experimental_retainWorker()` lease; the host entry uses
experimental_defineHostEntry from
`@codythatsme/plugin-sdk/host` and can be unit-tested with
experimental_createHostEntryHarness from
`@codythatsme/plugin-sdk/testing/host`);
cc.realtime.publish (ephemeral signals to open app pages);
cc.background.service (long-lived, AbortSignal, restart w/ backoff) and
cc.background.schedule (durable cron rows); cc.cli.register (a top-level
`cc <name>` command agents run through bash, with a shared 1 MiB combined
stdout/stderr ceiling and atomic structured over-limit errors); cc.agents.registerTool
(static native tools with zod or JSON-schema parameters) and
cc.agents.configure (one synchronous per-resolution callback selecting this
plugin's own tool/skill ids and optional dynamic instructions; tools apply on
the next provider session start/resume, while busy skill runtimes defer catalog
changes); cc.ui
registerMentionProvider (host-rendered UI — no
frontend bundle needed); cc.status.needsConfiguration (report
"unconfigured" instead of crashing); cc.onDispose (LIFO cleanup on
reload/disable/shutdown).

Frontend entries register React slots (homepageSection, settingsSection,
navPanel, threadPanelAction, experimental_newThreadPanelAction, fileOpener,
messageDirective) and composer
customizations via `app.composer.customize({ actions, plusMenu, banners,
richText })`; action/banner components use `useComposer()` and
`useComposerView()`, while the host renders plus-menu rows and editor
decorations. The deprecated pre-1.0 `slots.composerAccessory` footer API was
removed; migrate controls to actions or the plus menu and larger content to
banners. Register all frontend surfaces via
definePluginApp, use the hooks
listed above, and render vendored components; styling is Tailwind against
the host theme's tokens only (semantic classes like bg-background and
tw-animate-css utilities compile in plugin builds).

For the complete authoring reference — exact signatures, working snippets
for every surface, the reload lifecycle, testing tips, and gotchas — use
the built-in `cc-plugin-authoring` skill (agents: it loads on demand;
humans: plugins/cc-guide/skills/cc-plugin-authoring/
in a checkout). The builtin `inline-vis` plugin renders
`::inline-vis{file="demo.html" height="480"}` through the sidebar's
path-shaped, sandboxed worktree HTML iframe preview; `height` is optional.
Its card header includes an open-in-sidebar action for the source HTML file.
The `plugins/` directory contains every bundled plugin: the auto-installed
builtins and the store-only CC Official GitHub, Docs, Memory, and Tasks
plugins. The `examples/plugins/` reference plugins cover slack-bot (webhook
bot), agent-enrichment (agent surfaces), and composer-customization (all
composer regions). Thread Hover
Cards installs from the CC Community marketplace (source: the cc-plugins
repo).

Modal setup uses `cc modal account inspect --json` to check credentials, then
`cc machine create --provider modal-sandbox --json` to create a
machine. Settings edits its shared Dockerfile; `cc modal image set --file PATH [--json]` saves it and `cc modal image reset [--json]` restores the bundled default for future machines; `cc modal image show [--json]`
reads the same file without cloud access. The image builds automatically and is reused across projects;
core installs the daemon on demand. Project dependencies and services belong in
`.cc-env-setup.sh`. Read the plugin's skill for connection and lifecycle details.

Contributed commands may accept `--stdin`: the calling CLI transfers up to
256 KiB of multiline text as `--input-text`, without reading server-local files.
The existing `--<flag>-stdin` form still accepts one line.

Modal image debugging: `cc modal image build [--json]` prepares the saved image; `cc modal sandbox run [--json]` starts a 30-minute standalone sandbox; `cc modal sandbox exec ID [--json] -- COMMAND...` runs a command (60-second timeout); `cc modal sandbox stop ID [--json]` cleans up. These debug sandboxes skip CC enrollment, clone and setup. Logs are returned after the build finishes.

## Inspect plugin RPC

`cc plugin rpc list [plugin-id] [--method <exact-name>] [--json]` lists discoverable methods from running plugins, optionally restricted to one plugin. `cc plugin rpc inspect <plugin-id> [method] [--json]` dumps registration and method descriptions plus input/output JSON Schemas. Copy the relevant schema into your consumer and call the existing plugin RPC endpoint. Discovery is opt-in advertising, not access control; method names may carry versions such as `provider-usage.v1.listResources`.

`cc plugin rpc call <plugin-id> <method> [--input-file <json-path>] [--json]` invokes a method using server-side schema validation. Omitting the input file sends JSON null. Input files avoid putting sensitive values in command arguments.
