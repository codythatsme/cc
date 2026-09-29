# Plugin management commands

## Plugins

- A cc plugin is a TypeScript package running inside the cc server, extending
  it with services, schedules, HTTP/RPC endpoints, settings — and `cc` CLI
  subcommands that agents run through bash like any other command.
- Use `cc plugin list` to inspect installed plugins and their current state.
- **CC plugin catalog** (store under `/api/v1/plugin-catalog`):
  - The reserved **CC Official marketplace** has the name `cc-official`. It
    describes all plugins in the app bundle with a generated v2 document.
    Its source is a local path. It never uses the network. It appears first in
    `cc marketplace list`. Its plugins appear in the first Browse shelf, CC
    Official, and in their category shelves. It can be neither added nor
    removed.
  - The **CC Community marketplace** starts empty and has no default remote
    URL. Set `CC_MARKETPLACE_URL` and restart to enable a chosen community
    catalog; it refreshes at startup and every two hours. Refreshes update only
    discovery metadata and icons. They never install or execute plugin code.
  - `cc plugin search <query> [--json]` — search the catalog by id,
    name, description, category, or tag; status shows installed / compatible /
    requires newer cc. The table includes a **Category** column. An
    **Installs** column appears once the curated
    marketplace's `stats.json` sidecar has been read (`installs` in `--json`,
    null when unknown): publisher-supplied install counts for published
    entries. CC Official entries use the count for the same plugin id. With
    `--json`, `overview` holds the entry's long-form markdown description when
    the marketplace publishes one; the detail page renders it below the short
    description.
- **Third-party marketplaces** (routes under `/api/v1/marketplaces`):
  - `cc marketplace add <source>` — add a marketplace from an https manifest
    URL, `git:<url>[@<ref>]` (cc reads `marketplace.json` from the checkout),
    or `path:<directory>`. The CLI resolves a relative path from its current
    directory before it sends the request. CC validates the
    manifest, caches the catalog, and fetches its icons. **Adding a
    marketplace installs nothing.** The manifest's own `name` is the
    marketplace's identity, so a name collision is refused. The `cc-official`
    and `cc-community` names are reserved. You can add or remove neither one.
    A third-party manifest can use v1 or v2. The server serves its icons.
    The detail page loads screenshots from the declared URLs.
    CC ignores unknown v2 fields, except in npm and git source objects. CC
    rejects unknown source keys because a source key changes the installed
    code.
  - `cc marketplace list [--json]` — name, source, entry count, last refresh.
  - `cc marketplace refresh [name] [--json]` — re-read one catalog or every
    one of them. Discovery metadata and icons only. A failed refresh keeps the
    last catalog cc validated and exits non-zero.
  - `cc marketplace remove <name> [--json]` — forget a marketplace. Its
    catalog rows and cached icons are deleted; every plugin it listed keeps
    running as a direct install with its full source intent and exact
    resolution, so `cc plugin outdated`/`update` keep working from the
    recorded source.
  - Install a specific marketplace's entry with
    `cc plugin install <entry-id>@<marketplace>`. A bare entry id resolves
    across every marketplace. Exactly one match installs. Several matches fail
    and list the `id@marketplace` choices.
  - A third-party marketplace install first resolves and
    prints the true source — npm package with its range or dist-tag, or git
    URL with its ref or semver range, subdirectory, and the exact release tag
    and commit that range currently lands on — plus the marketplace and the
    entry's author. `--yes` skips the prompt, not the resolution. The install
    fails if the listing or its resolved git commit changes after confirmation.
  - Install a bundled plugin by its bare name or with
    `<entry-id>@cc-official`. cc copies it from the app bundle.
- Commands:
  - `cc plugin install <src>` — `<entry-id>@<marketplace>`, an HTTP(S) Git
    repository URL, a local path,
    `git:<url>[@<ref|semver-range>]`, or `npm:<package>[@<version|tag|range>]`
    (using CC's shipped npm). Repository URLs and prefixes `path:` /
    `npm:` / `git:` skip catalog resolution. To pin or
    range an npm package, install with `npm:<package>@…`.
    Omit the npm spec to track compatible stable releases; ranges and dist-tags
    track, while exact versions are pinned. Omit the Git ref to track the
    repository's default branch; explicit branches track, while tags and
    commits are pinned. A Git semver range
    (`git:github.com/acme/repo@^1.2.0`) tracks the repository's `vX.Y.Z` tags,
    picking the highest release the range allows and excluding prereleases
    unless the range names one. `--tag-prefix <prefix>` ranges over
    `<prefix>vX.Y.Z` tags instead, for a repository that versions each plugin
    on its own. cc records the selected tag and its commit and refuses to
    resolve that tag again if it moved. A bare spec that reads as a range
    resolves over tags only when no branch or tag has that literal name; when
    both exist the install fails — write `@semver:<range>` or `@ref:<name>`.
    Installs prompt for confirmation (plugins are full-trust code);
    pass `--yes` to skip. Reinstalling an already-installed managed plugin is
    refused — use `cc plugin update`. Installing a local path for an id that
    is already installed from another local path moves the plugin to the new
    directory and keeps its settings, secrets, and schedules. Plugins that
    declare a frontend (`cc.app`) are built at install time for path sources
    and git sources without a prebuilt app when their imported dependencies
    are already available;
    git/npm packages can also ship a metadata-validated prebuilt `dist/`, and
    npm packages must. Git installs use `--omit=dev`, `--omit=optional`, and
    `--ignore-scripts`; plugins may keep normal development dependencies in
    their manifests.
    npm and Node do not need to be on PATH; Git sources still require `git`.
    Managed git/npm installs refuse `engines.cc` /
    `engines.ccPluginSdk` mismatches, manifest vs. artifact identity mismatches,
    and reserved ID mismatches.
    A `git:`/`path:` repository can hold several plugins. Install one with
    `--subdirectory <relative-path>`, or with `--plugin <name>` to resolve an
    entry of the repository's `.cc/plugins.json` collection manifest (the two
    flags are mutually exclusive, and neither applies to `npm:` sources).
    Installs from one repository and commit share a single checkout.
    A repository that has a collection manifest and is not a plugin itself
    refuses an unselected install and lists its entry names.
  - `cc plugin outdated` — check installed plugins for compatible updates
    (table; `--json` for raw results). Shows latest compatible candidate and
    any blocked incompatible newer release. Dev builds (cc `0.0.0`) annotate
    that `engines.cc` is not enforced.
  - `cc plugin update <id>` / `cc plugin update --all` — apply compatible
    updates for tracking sources, including newer tags that satisfy a Git
    semver range. Same full-trust confirmation as install (`--yes` skips;
    non-TTY refuses without it). Use `cc plugin outdated` to preview available
    updates. Changing a pinned git:/npm: source requires `cc plugin remove`
    (which deletes the plugin's settings, secrets, and schedules) and a fresh
    install. A local path plugin is never removed to change it: edit it in
    place and `cc plugin reload <id>`, or `cc plugin install path:<new dir>`
    to move it; both keep its configuration.
  - `cc plugin list` — status, background services, schedules, handler timings,
    and each plugin's contributed `cc` command.
  - `cc plugin source <id> [--json]` — requested and resolved source, the
    repository subdirectory for a nested plugin, the semver range with its tag
    prefix and resolved tag for a Git range install, engine ranges, install
    time, integrity/registry details, and recent activation history.
  - `cc plugin enable|disable <id>`, `cc plugin reload [id]` (exits 1 when a
    reloaded plugin does not come up on its current sources: the previous
    instance was kept, or it is degraded because a service ignored its abort),
    `cc plugin remove <id>` (deletes the plugin's settings, secrets, and
    schedules; managed git/npm files are deleted, and local path sources stay
    on disk).
  - `cc plugin safe-mode [on|off] [--json]` — show or change plugin safe
    mode. `on` stops every plugin you installed, official store plugins
    included, while keeping each plugin's enabled setting; plugins included
    with cc keep running. `off` restarts the ones that were enabled and exits 1
    naming any that fail to start. Installing or updating a stopped plugin is
    refused while safe mode is on. The command palette offers the same toggle.
  - `cc plugin config <id> [set <key> <value> | unset <key>]` — declared
    settings; boolean and number arguments are converted to their declared
    types. Reload the plugin after configuring (`cc plugin reload <id>`).
  - `cc plugin token <id>` — print a short-lived bearer token for that plugin.
  - List, reload, enable, disable, config, and remove support `--json`.
  - `cc plugin logs <id> [-n N] [-f]` — the plugin's `cc.log` output.
  - `cc plugin run <id> [args...]` — explicit form; collisions log an activation
    warning and are annotated by `cc plugin list`.
  - `cc plugin new <name>` — scaffold a todo-list plugin (`server.ts`,
    `app.tsx` with a sidebar page, a `cc <name>` CLI command, a skill, and
    vendored UI components) and install its npm dependencies (scaffold sets
    `engines.ccPluginSdk` to `>=0.4.3`). The
    scaffold depends on `@codythatsme/plugin-sdk`, pinned to this cc's exact SDK
    version in `devDependencies`, so the API declarations arrive with
    `npm install` at `node_modules/@codythatsme/plugin-sdk/bundled-types/*.d.ts`
    (no vendored `types/`). If that version is not on npm yet, it warns and
    still scaffolds. The
    install is best-effort and verified: if npm is missing or leaves a package
    out, it says so and prints the manual `npm install --include=dev` step
    rather than reporting success; `cc plugin build [path]` —
    compile the plugin into `dist/`: the backend bundle (`server.js` +
    `server.meta.json` stamped with SDK/identity metadata; preferred by
    git/npm installs over source), when `cc.app` is declared, `app.js` +
    `app.css` + `app.meta.json`, and, when `cc.host` is declared, the
    self-contained host artifact `host.js` + `host.js.map` +
    `host.meta.json` (its digest; host daemons download and verify the bundle
    by that digest, and run it as a host RPC worker, a provider bridge, or
    both). None of it needs the server.
  - `cc plugin types [path]` — sync the plugin's `@codythatsme/plugin-sdk` surface
    to the running cc (default: cwd). It rewrites the exact `devDependencies`
    pin to this cc's SDK
    version and brings the type-only devDependencies of the packages cc shims
    at runtime (sonner, vaul, the portal radix families, @pierre/diffs, clsx,
    tailwind-merge, class-variance-authority) to this cc's versions — adding
    any an app plugin is missing and moving one out of `dependencies`
    (reporting old → new, and reminding you to `npm install`). A plugin that
    still vendors declarations must run `cc plugin migrate`; `types` and
    `types --check` exit non-zero with that instruction. Run `types` in a
    cloned or older package-layout plugin: the SDK surface grows every release.
    `--check` writes nothing and exits non-zero on a mismatch (for CI).
    `cc plugin build` and `cc plugin dev` warn for a vendored layout, skip the
    type update, and continue with its checked-in declarations. Needs no server.
  - `cc plugin migrate [path] [--yes]` — convert a plugin that still vendors
    `types/` to the `@codythatsme/plugin-sdk` npm package (default: cwd): add the
    exact `devDependencies` pin, raise `engines.ccPluginSdk` when this cc's SDK
    is newer than the declared floor, move an SDK entry declared in
    `dependencies` into `devDependencies`, drop the `@codythatsme/plugin-sdk` (and
    pre-rename `@cc/plugin-sdk`) entries from `compilerOptions.paths` (other
    paths like `@/*` are untouched), and delete `types/cc-plugin-sdk*.d.ts`
    plus `types/` if that empties it — a `types/` still holding your own
    declarations is kept, along with the `include` entries that compile it. It
    also rewrites quoted `@cc/plugin-sdk` import/export specifiers (and their
    subpaths) in the plugin's own `.ts`/`.tsx` sources to `@codythatsme/plugin-sdk`,
    skipping `node_modules/`, `dist/`, and `types/`; the path map was what made
    the old name resolve, so the imports move with it. A
    half-migrated plugin that has no vendored artifacts left but never gained
    the pin is completed the same way. It
    prints the exact plan and asks before touching anything; `--yes` is
    required when stdin is not a terminal, where it otherwise prints the plan
    and exits non-zero having changed nothing. Run `npm install` afterwards.
    The vendored layout still builds and runs in development with its existing
    declarations, but SDK type updates require migration.
    Re-running on a migrated plugin is a no-op. Needs no server.
  - `cc plugin dev [path]` — watch loop for an installed plugin (default:
    cwd): on every change it rebuilds the frontend bundle (when `cc.app` is
    declared; unminified, unlike `cc plugin build`) and reloads the plugin;
    open app pages pick the new UI up live.
    Build/reload failures print and keep watching; Ctrl+C stops.
  - Frontend entries default-export `definePluginApp` from
    `@codythatsme/plugin-sdk/app` and register UI slots (homepageSection,
    settingsSection, navPanel, threadPanelAction, fileOpener) with hooks
    (useRpc, useRealtime, useRealtimeConnectionState,
    useSettings, useCcContext,
    useCcNavigate, useComposer for scoped text editing / quote / mention /
    focus access); components are vendored shadcn source the
    plugin owns. Installed
    plugins and their settings also appear under Settings → Installed plugins.
- **Writing a plugin?** Use the `cc-plugin-authoring` skill — the complete
  authoring reference for the backend `CcPluginApi` (settings, storage, sdk,
  http/rpc/realtime, background services and schedules, CLI commands, agent
  tools and context, host-rendered UI, lifecycle) and the frontend
  `@codythatsme/plugin-sdk/app` contract (slots, hooks, UI kit), with working patterns
  and gotchas. `cc guide plugins` has the short walkthrough.

## Inspect plugin RPC

`cc plugin rpc list [plugin-id] [--method <exact-name>] [--json]` lists discoverable methods from running plugins, optionally restricted to one plugin. `cc plugin rpc inspect <plugin-id> [method] [--json]` dumps registration and method descriptions plus input/output JSON Schemas. Copy the relevant schema into your consumer and call the existing plugin RPC endpoint. Discovery is opt-in advertising, not access control; method names may carry versions such as `provider-usage.v1.listResources`.

`cc plugin rpc call <plugin-id> <method> [--input-file <json-path>] [--json]` invokes a method using server-side schema validation. Omitting the input file sends JSON null. Input files avoid putting sensitive values in command arguments.
