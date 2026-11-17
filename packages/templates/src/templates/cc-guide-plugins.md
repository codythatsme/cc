cc bundles its SDK. `cc plugin new`, `cc plugin types`, and `cc plugin migrate`
copy the current SDK into `.cc/plugin-sdk-<version>` inside the plugin and pin a
relative file dependency. Keep that directory when sharing the plugin. Other
plugin dependencies install from npm normally. No SDK registry publication is
required.

---
kind: instruction
title: cc Guide — Plugins
summary: Command reference for installing, configuring, and running cc plugins, a summary of the bundled plugins, and the plugin authoring loop.
intent: Provide complete plugin management documentation, route each bundled plugin to its own skill, and route plugin authors to the cc-plugin-authoring skill.
editingNotes: Keep flags accurate against the CLI implementation (apps/cli/src/commands/plugin.ts, apps/cli/src/commands/marketplace.ts) and the server plugin service; a CLI test asserts every `cc plugin` and `cc marketplace` subcommand and flag appears in this chapter. Each bundled plugin gets a two-to-three-line summary here; its manual lives in the plugin's own skill. The full authoring reference is the cc-plugin-authoring builtin skill.
---
Plugin commands

A cc plugin is a TypeScript package that extends cc with server code, an
optional entry that runs on enrolled hosts, UI, agent skills and tools, and
`cc` CLI subcommands. Plugins are full-trust code.

Builtin plugins (`builtin:<name>`) ship with cc and install automatically.
Official store plugins ship with the app and install on request; third-party
plugins come from marketplaces, Git, npm, or a local path. Plugin state lives
under `<cc-data-dir>/plugins/<id>/` (SQLite database, secrets, logs).

  cc plugin search <query>       Search the store: the bundled official
                                 plugins plus every registered marketplace.
                                 Matches id, name, description, category, or
                                 tag; status shows installed, compatible,
                                 requires newer cc, or `id in use by <source>`
  cc plugin install <entry>      Install an official plugin by name (docs,
                                 memory, tasks, github, ...),
                                 <entry-id>@<marketplace>, a Git repository
                                 URL, a local path, builtin:<name>,
                                 git:<url>[@<ref|semver-range>], or
                                 npm:<package>[@<version|tag|range>].
                                 Installs ask for confirmation; --yes skips it.
                                 --subdirectory <path> or --plugin <name>
                                 selects one plugin of a multi-plugin
                                 repository; --tag-prefix <prefix> scopes a
                                 git: semver range. Installing a local path
                                 for an id already installed from another
                                 path moves it and keeps its settings.
                                 Installs run one at a time as server jobs
                                 that continue if the CLI or app disconnects;
                                 a repeat request joins the active job.
                                 --no-wait starts the job and prints its id
  cc plugin install-jobs         List queued, running, and recently finished
                                 installs (--json for the jobs)
  cc plugin cancel-install <job> Cancel an install: a queued job is dropped;
                                 a running job stops its download or build
                                 and installs nothing, unless it already
                                 started registering, which then finishes
  cc plugin outdated             Check installed plugins for compatible
                                 updates (--json for raw results), including
                                 newer releases blocked by engine ranges and
                                 releases outside the saved version range
  cc plugin update <id> | --all  Apply compatible updates for one plugin or
                                 every tracking plugin. Same confirmation as
                                 install (--yes skips; non-TTY refuses
                                 without --yes)
  cc plugin update <id> --range <range>
                                 Change one plugin's saved version range and
                                 install the newest compatible release it
                                 admits; settings, secrets, schedules, and
                                 data are kept
  cc plugin list                 Status, services, schedules, handler timings,
                                 and contributed CLI commands. `cc status`
                                 also names enabled plugins that are
                                 incompatible, failed, or missing
  cc plugin source <id> [--json] Requested and resolved source, subdirectory,
                                 semver range and resolved tag, engine ranges,
                                 install time, and recent activation history
  cc plugin enable|disable <id>  Load or unload an installed plugin. A
                                 builtin you never toggled follows cc's
                                 default; an explicit choice persists across
                                 releases
  cc plugin safe-mode [on|off]   Show or change safe mode. `on` stops every
                                 plugin you installed (official store plugins
                                 included) without changing its enabled
                                 setting; builtins keep running. `off`
                                 restarts them and exits 1 if any fail.
                                 Installs and updates of stopped plugins are
                                 refused until it is off
  cc plugin reload [id]          Restart plugins on their current sources.
                                 Exits 1 when one does not come up (the
                                 previous instance is kept or degraded)
  cc plugin config <id> [set <key> <value> | unset <key>]
                                 Show or change a plugin's declared settings.
                                 Running plugins receive changes live; a
                                 plugin waiting for configuration retries
  cc plugin logs <id> [-n N] [-f]  Print (or follow) a plugin's log
  cc plugin run <id> [args...]   Run a plugin command explicitly (also works
                                 when a core command owns its name)
  cc plugin token <id> [--rotate]  Print the token for a plugin's
                                 token-authenticated HTTP routes; --rotate
                                 replaces it
  cc plugin remove <id>          Uninstall and delete the plugin's settings,
                                 secrets, and schedules (local path sources
                                 stay on disk; builtin removals are
                                 remembered)
  cc plugin prune [--dry-run]    Delete cached git:/npm: plugin versions no
                                 installed plugin uses (left by earlier cc
                                 releases, rolled-back updates, or
                                 interrupted operations) and leftover cache
                                 directories, and print what was freed.
                                 Updates and removals already delete what
                                 they replace. Never touches a running
                                 version or a local path source. Also in the
                                 command palette

  cc marketplace add <source>    Add a marketplace from an https manifest URL,
                                 git:<url>[@<ref>], or path:<directory>.
                                 Adding a marketplace installs nothing. For a
                                 git: source, --subdirectory <path> reads
                                 marketplace.json from that directory of the
                                 repository instead of its root
  cc marketplace list            Name, source, entry count, and last refresh
                                 (--json for raw rows)
  cc marketplace refresh [name]  Re-read one catalog or all of them. Never
                                 installs, updates, or runs plugin code; a
                                 failed refresh keeps the last valid catalog
                                 and exits non-zero
  cc marketplace remove <name>   Forget a marketplace. Plugins installed from
                                 it keep running as direct installs and keep
                                 updating from their recorded source.
                                 cc-official and cc-community cannot be
                                 removed

Installed plugins and their settings also appear under Settings → Installed
plugins.

Plugin CLI commands

A plugin can register one top-level `cc` subcommand (for example
`cc github …`); run it like any core command. Core command names win on a
collision, and `cc plugin list` then shows the `cc plugin run <id>` form.
Inside agent threads the generated `plugin-commands` skill lists every
available plugin command. Most plugin commands accept `--json` and `--help`.

Bundled plugins

Each bundled plugin documents its commands and behavior in its own skill.

- Prompt Library (builtin, disabled by default): enable with
  `cc plugin enable cc--prompt-library`. Open **+ → Prompts…** or press
  **Ctrl+R** to search, preview, star, and insert prompts. Its commands and
  behavior are documented in the `prompt-library` skill.
- Custom instructions (builtin): up to 4,096 characters saved under
  Settings → Custom instructions are added to every agent task on this host.
  `cc instructions get`, `cc instructions set <text...>`, and
  `cc instructions clear`.
- Account Pooler (builtin, off by default): pools Claude and Codex accounts
  behind the cc server with quota-aware failover. Run
  `cc plugin enable account-pool`, then `cc pool account add`,
  `cc pool status`, and `cc pool routing`; see the `account-pool` skill.
- Keep Awake (builtin): prevents idle sleep on selected macOS and Windows
  hosts while cc runs; closing the lid still sleeps.
  `cc keep-awake status|enable|disable [--json]`, `cc keep-awake hosts all`,
  or `cc keep-awake hosts <host-id>...`.
- GitHub Star (builtin): asks once for a GitHub star after more than five
  prompts. `cc plugin disable cc--github-star` stops it from asking.
- Concurrency limit (builtin): caps running threads overall and per host.
  `cc concurrency-limit status|global|host`; see the `concurrency-limit`
  skill.
- Provider retry (builtin): queues an automatic retry after provider
  overloads, server or connection errors, and subscription-window limits.
  `cc provider-retry status|explain|retry|cancel`; see the `provider-retry`
  skill.
- Thread list (builtin): owns the sidebar's layout preferences, synced to
  every window. `cc thread-list prefs list|get|set|reset`; see the
  `thread-list` skill.
- Push notifications (builtin): notifies mobile, web, and desktop clients
  when a thread needs attention.
  `cc push-notifications status|list|add|remove|test|thread`; see the
  `push-notifications` skill.
- Secrets (builtin): `cc secret request <NAME...> --write-env <path>` collects
  credentials through a secure form into a dotenv file without exposing them
  to the agent; see the `secrets` skill.
- Inline previews (builtin): shows an HTML page inline in a reply, from a
  fenced `inline-vis` code block or a `::inline-vis{file="demo.html"}`
  workspace or thread-storage file; see the `inline-vis` skill.
- MCP server (builtin, disabled by default): `cc plugin enable cc--mcp` lets
  ChatGPT, Claude, or another MCP client control this cc; an approved app can
  run any `cc` command. `cc mcp status|clients|revoke`; see the `mcp` skill.
- Storage & retention (builtin, disabled by default): enable with
  `cc plugin enable cc--storage-retention`. Owns thread retention policies
  and machine storage cleanup through its sidebar panel and `cc storage`
  commands; see the `storage-retention` skill.
- Automations (builtin): recurring or one-shot agent prompts and stored
  server scripts. `cc automation create|list|show|update|pause|resume|run|runs|delete`;
  see the `automations` skill.
- Workflows (builtin, off by default): durable JavaScript orchestration of
  worker threads. Run `cc plugin enable workflows`, then
  `cc workflows validate|run|status|history|list|stop`; see the `workflows`
  skill.
- Memory (official, `cc plugin install memory`): durable cross-provider
  agent memory. `cc memory catalog|search|get|add|update|forget|history`;
  see the `memory` skill.
- Docs (official, `cc plugin install docs`): document vaults with a
  pull/edit/push loop and reviewable proposals.
  `cc docs vaults|list|read|pull|status|push|propose`; see the `docs` skill.
- Tasks (official, `cc plugin install tasks`): a task tracker with agent
  delegation. `cc tasks show|list|comment|update|attach`, and
  `cc tasks --help` for the rest; see the `tasks` skill.
- Modal sandboxes (official, `cc plugin install environment-modal-sandbox`):
  reusable Modal cloud machines. `cc modal account inspect`,
  `cc machine create --provider modal-sandbox`, and `cc modal image|sandbox`;
  see the `modal-sandboxes` skill.

Multi-plugin repositories

One repository can hold several plugins, each an ordinary plugin directory
with its own package.json. An optional `.cc/plugins.json` collection manifest
indexes them:

  {
    "$schema": "https://raw.githubusercontent.com/codythatsme/cc/main/apps/web/public/schemas/plugins.schema.json",
    "schemaVersion": 1,
    "name": "acme-plugins",
    "plugins": [
      { "name": "sidebar", "source": "./plugins/sidebar" },
      { "name": "status", "source": "./apps/status" }
    ]
  }

Every source is a repository-relative directory starting with "./"; absolute
paths, "..", the repository root, duplicate names, and unknown fields are
rejected. The file is an index only: identity, branding, entry points, and
engine ranges stay in each plugin's manifest.

  cc plugin install git:github.com/acme/repo@main --plugin sidebar
  cc plugin install git:github.com/acme/repo@main --subdirectory plugins/sidebar
  cc plugin install path:/work/repo --plugin sidebar

--subdirectory works without a collection manifest; --plugin resolves a name
from .cc/plugins.json. When a repository with a collection manifest is not a
plugin itself and neither flag is given, the install fails and lists the
entry names. cc records the subdirectory, so outdated, update, and remove
work per plugin.

Marketplaces

`cc-official` lists the plugins bundled with the app. It reads a local catalog
and never uses the network; install its entries by bare name or qualified name
(`cc plugin install docs` or `cc plugin install docs@cc-official`). An app
update also updates the bundled copy.

`cc-community` starts empty and makes no network requests. Set
CC_MARKETPLACE_URL (read at startup) to a manifest URL you choose to read it at
startup and every two hours. An invalid manifest keeps the last valid catalog.
`cc plugin search` shows install counts only when that marketplace publishes
them; cc never reports installs. Builtins show "Built in", and a plugin under 25
installs that was published in the last 30 days shows "New".
`cc plugin search --json` returns the raw `installs`, `installedByDefault`,
and long-form `overview` fields.

Anyone can host a third-party marketplace:

  cc marketplace add https://plugins.acme.dev/marketplace.json
  cc marketplace add git:github.com/acme/cc-marketplace@main
  cc marketplace add git:github.com/acme/agent-plugins@main --subdirectory cc
  cc marketplace add path:/work/acme-marketplace

--subdirectory follows the same path rules as `cc plugin install
--subdirectory`; cc reads marketplace.json and relative icons from that
directory on every refresh. `source.git.subdir` in a catalog entry stays
relative to the repository root.

The manifest `name` is the marketplace identity; duplicates and the reserved
`cc-official` and `cc-community` names are refused. Install an entry of a
specific marketplace with <entry-id>@<marketplace>:

  cc plugin install thread-hover-cards@acme-plugins

A bare id resolves across every marketplace: one match installs, several
matches fail and list the id@marketplace choices. Other source forms bypass
catalog resolution. Before installing from a third-party marketplace, cc shows
the marketplace, the entry's author, and the true source, including the exact
release tag and commit a range lands on. `--yes` skips the prompt, not the
resolution, and the install is refused if the listing or resolved commit
changes after confirmation. Settings → Plugin marketplaces manages the same
list. To publish a marketplace, see the cc-plugin-authoring skill.

Updates and pinning

cc checks tracking sources every six hours. With the `pluginUpdates`
experiment on (`cc settings experiment pluginUpdates true`, on for early
adopters), Settings → Updates checks again when it opens, lists each compatible
update with an Update button and Update all, shows candidates blocked by
engines.cc or engines.ccPluginSdk with the reason, and the sidebar updates
badge counts plugin updates. Updates are never applied automatically: `cc plugin outdated` checks on
demand and `cc plugin update` applies compatible candidates. Reinstalling an
installed managed plugin is refused; use `cc plugin update`. A failed
activation restores the previous version and leaves the failure visible.

Exact npm versions, Git tags and commits, path sources, and bundled official
plugins are pinned. npm ranges, dist-tags, and omitted specs, omitted Git refs
(the default branch), Git branches, and Git semver ranges track compatible
updates. Change a pinned git:/npm: source with `cc plugin remove` (which
deletes settings, secrets, and schedules) and a fresh install. Edit a local
path plugin in place and `cc plugin reload <id>`, or move it with
`cc plugin install path:<new dir>`; both keep its configuration. Before cc
deletes a thread's storage folder or removes a cc-managed workspace (such as
a worktree), it copies any path plugin installed from inside it to
<dataDir>/plugins/<id>/preserved-source and moves the plugin there, keeping
its configuration. Such a plugin carries a `sourceNotice` that says so;
`cc plugin install` and `cc plugin list` print it as `note:`, and the app shows
it in the install toast and on Plugin details.

Managed git:/npm: installs refuse engines.cc and engines.ccPluginSdk
mismatches, manifest and artifact identity mismatches, and ids reserved by
bundled plugins. Git and path installs build the plugin on install (git
sources need `git`; cc ships its own npm), and a build failure fails the
install. npm packages must ship their prebuilt app and host bundles.

Git semver ranges

A git source can track releases over the repository's tags:

  cc plugin install git:github.com/acme/repo@^1.2.0
  cc plugin install git:github.com/acme/repo@semver:^1.2.0
  cc plugin install git:github.com/acme/repo@^1.2.0 --tag-prefix notes/

cc keeps tags named [<tag-prefix>]vX.Y.Z and installs the highest one the
range allows. Prereleases are excluded unless the range names one. Without
--tag-prefix tags are repository-wide (v1.2.3); with it they version one
plugin (notes/v1.2.3).

cc records the selected tag and its commit. If that tag later points at
another commit, cc refuses it and names both commits; remove and reinstall
the plugin to accept the new commit.

Releases outside the saved range

cc saves a plugin's range at install and updates only within it; on 0.x a
caret range admits patches only (`^0.2.0` stops before 0.3.0). Each update
check also reports one newer release outside that range, for git semver and
npm range sources. A plugin installed from a marketplace is offered only a
release its entry's current range admits, and that range is proposed; if the
marketplace no longer lists the plugin, none is offered. Other plugins are
offered their newest stable release with `^<version>`. Pinned sources are never
offered one, and --range still takes any release you choose. `cc plugin outdated` prints the release, the
proposed range, whether it may break (a new major, or a new minor on 0.x),
and the command to take it:

  cc plugin update theme-toggle --range '^0.3.0'

cc never applies these on its own: `cc plugin update --all` and Update all
skip them. With --range cc confirms the release it checked and refuses one
that changed since, a range with nothing newer, or a downgrade. It keeps the
engines checks and the same snapshot and rollback as any update; a failed
activation restores the previous release and range. Plugin details and the
installed list show it with a Review action that names both ranges.

A bare spec that reads as a range (`^1.2.0`, `1.x`, `>=1 <2`) resolves over
tags only when no branch or tag has that literal name; when one does, the
install fails and asks you to choose `@semver:<range>` or `@ref:<name>`. Bare
version tags such as `v1` and `v1.2.3` are always the literal tag.

Authoring a plugin

  cc plugin new <name>           Scaffold ./cc-plugin-<name> (backend, sidebar
                                 page, `cc <name>` command, skill) and install
                                 its npm dependencies; no server required
  cc plugin install .            Register the directory in place
  cc plugin dev [path]           Watch sources, rebuild, and reload the
                                 installed plugin on every save
  cc plugin build [path]         Compile the plugin into dist/; no server
                                 required
  cc plugin types [path] [--check]  Sync the plugin's SDK and shimmed-package
                                 type pins to this cc; keep the SDK in
                                 dependencies when an entry needs its own
                                 SDK install; --check reports stale pins
                                 and the wrong dependency field
  cc plugin migrate [path] [--yes]  Move a plugin that vendors types/ to the
                                 @codythatsme/plugin-sdk npm package

The full authoring reference (manifest, every API surface, build and release,
testing, and marketplace publishing) is the built-in `cc-plugin-authoring`
skill; in a checkout it lives under plugins/cc-guide/skills/cc-plugin-authoring/.
`plugins/` holds every bundled plugin and `examples/plugins/` holds reference
plugins.

## Inspect plugin RPC

`cc plugin rpc list [plugin-id] [--method <exact-name>] [--json]` lists discoverable methods from running plugins, optionally restricted to one plugin. `cc plugin rpc inspect <plugin-id> [method] [--json]` dumps registration and method descriptions plus input/output JSON Schemas. Copy the relevant schema into your consumer and call the existing plugin RPC endpoint. Discovery is opt-in advertising, not access control; method names may carry versions such as `provider-usage.v1.listResources`.

`cc plugin rpc call <plugin-id> <method> [--input-file <json-path>] [--json]` invokes a method using server-side schema validation. Omitting the input file sends JSON null. Input files avoid putting sensitive values in command arguments. Handler refusals print their code and message and exit non-zero: `forbidden` (403), `not_found` (404), `conflict` (409), or `invalid` (422).

### Background updates

`cc plugin update <id> --yes` starts a server job and waits by polling, so the activation stability check does not hold one HTTP request open. Add `--no-wait` to return immediately. Use `cc plugin update-jobs [job-id] --json` for progress and results, including automatic rollback. Queued/running updates continue after the CLI or app disconnects. Finished jobs remain for ten minutes; jobs do not survive server restarts. Running updates cannot be cancelled midway through activation.

SDK: `plugins.applyUpdate({ pluginId })` waits; `plugins.experimental_startUpdate({ pluginId })` returns the job. Inspect with `plugins.experimental_updateJobs.list()` or `.get({ jobId })`. Raw HTTP callers opt in with `Prefer: respond-async`; legacy callers still receive the completed result.
