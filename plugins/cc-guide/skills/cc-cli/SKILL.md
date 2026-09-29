---
name: cc-cli
description: "Inspect or manage CC state with the cc CLI; use for CC commands and configuration."
---

# CC CLI

Use cc for CC state and actions. Inspect context when the target project, host,
workspace, or execution selection is not already established.

## Start with context

```sh
cc status --json
```

Use JSON when command output controls later work. Use human output for quick
inspection.

Run `cc --version` for the CLI version. Use `cc --help` or `cc help [command]`
for help. Run cc guide for the system overview. Run cc guide <chapter> for one
area. Use cc <group> --help for current flags and defaults, or
`cc guide commands <group>` for every command in a group with its options on
one page.

## Errors and JSON

- Read the whole error before you run `--help`. A failed invocation prints the
  nearest command or option, the usage line, the valid options, and, for a
  missing project, thread, machine, or environment, the exact flag to add with
  the current ID filled in.
- With `--json`, a failure prints
  `{"ok": false, "error": {"code", "message", "hint"}}` on stdout and the
  readable message on stderr, and exits non-zero. Parse stdout only; `2>&1`
  mixes the message into the JSON.
- Output shapes differ by command: `cc thread list --json` is a bare array,
  `cc thread show --json` nests under `.thread`, `cc terminal list --json`
  wraps in `.sessions`. `cc guide json` lists each shape, and the help of the
  most-parsed commands ends with its JSON shape.
- Pass long or multi-line text from a file: `cc thread tell <id>
--message-file <path>`, `cc thread spawn --prompt-file <path>`, with `-` for
  stdin. Inside double quotes the shell runs `backticks` and `$(...)` before
  cc sees the text, which silently corrupts Markdown and can execute commands.
- Timeouts take seconds or a duration with a unit (`90s`, `20m`, `4h`).

A standalone CLI targets http://127.0.0.1:38886. Use CC_SERVER_URL and
CC_HOST_DAEMON_PORT only for an intentional non-default target.

## Read only the relevant reference

- Read references/command-index.md to find the exact core command path. Use
  live help for current flags and defaults.
- Read references/configuration.md for settings, agent instructions, skills,
  remote clients, and environment setup scripts.
- Read references/thread-creation.md before you spawn or fork threads, create
  projects, select machines, move the server, or create environments.
- Read references/thread-operation.md for messages, queues, interactions,
  panes, terminals, inspection, and long-running commands.
- Read references/failure-recovery.md when a thread fails, stops, or needs plan
  or goal recovery.
- Read references/theme-commands.md for palette and favicon commands. Read
  references/theming.md before you create or edit theme CSS.
- Read references/plugins.md for plugin discovery, install, build, update,
  configuration, runtime, and contributed commands.
- Read references/app-settings.md for complete app setting keys and effects.

## Command habits

- Resolve names and IDs with a list or show command before mutation.
- Pass an explicit project when a command can act across projects.
- Pass an environment or machine selector when the default host is uncertain.
- Spawn onto a plugin-provisioned environment with
  `cc thread spawn --environment-provider <id>` (list them with
  `cc environment providers`).
  Read the provider's `requires` (`projectCheckout`, `gitCheckout`, `gitRemote`,
  `projectless`): these facts decide where
  the provider is offered. A provider whose `inputs` schema does not accept an
  empty object needs `--environment-inputs <json>` matching that JSON Schema;
  providers that accept `{}` use it when the flag is omitted
  (`cc environment providers --json` prints both facts). `--base-branch`
  belongs to `--new-environment worktree` only.
- Enroll an existing machine with `cc machine create --provider manual`; run
  the printed command on the target. `--no-wait` returns its host ID.
  Cancel with `cc machine remove <host-id>`. Removal revokes access; use the
  original `install-machine.sh --uninstall --host-id <host-id>` on that box.
- Create a standalone machine with `cc machine create --provider <id>`; use
  `--inputs <JSON>` for non-secret provider inputs and `--key` for retry identity.
- List plugin-provisioned machine choices with `cc machine providers`. Create a
  machine and an explicit environment with
  `cc thread spawn --new-machine <provider-id> --environment-provider <id>`; add
  `--machine-inputs <json>` when its schema requires inputs. Machine inputs are
  persisted and non-secret; credentials belong in plugin settings. Composed
  environments choose their own machine: use `--environment-provider modal-sandbox`
  without machine selectors and pass `--machine-inputs <json>` when configuring
  the composition's machine provider.
- Use `cc machine enroll` for a private core-prepared bundle. Local lifecycle is
  handled by `install-machine.sh --start|--stop|--uninstall --host-id <id>`;
  see references/thread-creation.md for ownership checks.
- Moving the cc server to another machine is experimental (the `serverMove`
  experiment). Never move a server, abandon a move, or unlock an old copy
  without the user's explicit confirmation in this conversation: run
  `cc server move --to <machine> --check`, show them the checklist, and run
  the same command without `--check` only after they confirm. A move stops
  all running work. `cc server export --out <file>` backs
  up a running server. `cc server import`, `unlock`, `allow-connect`, and
  `delete-old-copy` act on this computer's data directory without calling a
  server. An imported server keeps its connect tunnel off until
  `cc server allow-connect`. On the computer a server moved away from,
  `cc server install-machine-service` installs the persistent, self-updating
  machine service (needs Node.js 22.19+ on the PATH).
- Use `cc machine suspend|resume <id-or-name>` only for providers that expose
  suspend and resume. Resume waits for pending suspension and is a no-op
  when already active. Use `cc machine retry-cleanup <id-or-name>` to retry a
  failed provider teardown immediately.
- Use `cc machine reconnect <id-or-name>` when a disconnected machine's
  server access or host key is rejected but its CC host ID must remain.
  Run the printed short-lived command on that machine as is; it reuses the
  machine's recorded data directory, refreshes access, and re-enrolls under
  the same host ID. Connected machines are refused, and
  `--json` returns without waiting.
- `cc environment providers` lists Project checkout, Worktree, then other
  installed providers by display name. With `--project <id> --machine <id>`
  it also prints that machine's availability (`available`, `setup-required`,
  `unavailable`, or `unknown` until the background probe answers). Read or set `managedBranchPrefix`
  through `cc settings show` and `cc settings general <key> <value>`.
- The server keeps a registry of sidebar layout preferences (organization
  mode, section order, collapsed rows, navigation entries): `cc settings ui
list`, `get`, `set`, and `reset`.
- Query provider models on the machine that will run the thread.
- Prefer non-interactive commands and machine-readable output for automation.
- Pass `--yes` for a confirmed destructive command in a non-interactive shell.
- Treat plugin commands as normal top-level commands after installation.

- Inspect real status, logs, API results, or diffs instead of assumptions.
- For launcher startup errors and console output, read `logs/server-stdio.log`
  or `logs/host-daemon-stdio.log` under the selected cc data directory. These
  append across restarts; `cc-app`, `cc-server`, and `cc-host-daemon` capture
  service output there instead of forwarding it to their terminal.
- Keep file paths on the machine that owns the selected workspace.

## Common checks

```sh
cc project list --json
cc machine list --json
cc environment providers --json
cc provider list --environment "$CC_ENVIRONMENT_ID" --json
cc thread show "$CC_THREAD_ID" --json
cc thread context --self --json
cc environment status "$CC_ENVIRONMENT_ID" --json
cc plugin list --json
cc skill list --environment "$CC_ENVIRONMENT_ID" --json
```

## Completion

Confirm the command result and any affected thread, environment, plugin, or
remote service. Report the stable ID or URL that the user needs next.

`cc environment show <id>` reports core-owned lifecycle, retirement deadline and teardown attempts. Archive/delete of the last live thread starts the provider grace; unarchive cancels pending retirement. Once the grace passes and the workspace is destroyed, sends to the thread fail until `cc thread restore-environment <id>` asks the environment provider to restore it and reattaches it to an unarchived thread, without starting a turn; providers decide what restoring means (a worktree returns on the branch it held), some cannot restore, and uncommitted changes in the removed workspace are gone. Teardown errors remain visible and retry automatically. `cc environment delete <id>` requests cleanup immediately, including under a never-retire policy; destroyed is recorded after cleanup completes. Removal waits for live or stopping runtimes. Project source deletion remains available during project deletion, including removal of the last source, so providers can finish cleanup.

## Plugin configuration

Use `cc plugin config <id>` to inspect the plugin’s configuration and
`cc plugin config <id> set <key> <value>` to change it. Read the plugin’s own
skill for its commands, configuration meanings, and operating constraints.
Discover contributed command paths through `cc plugin list`, the generated
`plugin-commands` skill, or `cc plugin run <id> --help`.

Keep this skill and its references focused on core CC commands. Plugin-specific
behavior belongs in the owning plugin’s `skills/` directory, including built-in
plugins; do not add plugin command manuals here.

## Built-in browser control

Use `cc browser instances --host <host-id> --json` to discover a desktop. Commands `tabs`, `create`, `acquire`, `connection`, `release`, `reveal`, `capture`, `close`, and `watch` require explicit `--host`, `--instance`, `--generation`, and `--thread`. See `cc guide browser` and `cc browser --help` for flags. New tabs use separate automation profiles; personal-tab control needs an explicit handoff. Revealing tabs or acquiring control opens the side panel and selects the tab only in the already focused thread, without switching threads or activating the desktop window. Connection credentials are written with `connection --output <new-file>` and work only on the browser host; keep them out of chat and public port shares. `import-sources` and `import-cookies --from <source> --profile <dir> [--into personal|automation:<id>]` combine known-browser entries (including Helium and Dia) with schema-detected Chromium/Firefox profiles matched to registered web browsers and copy a selected profile into CC; use the returned source ID, including opaque `storage-…` IDs, rather than assuming a fixed browser list; they need `--host`, `--instance`, and `--generation` only, and the source browser must be quit first.

`cc machine show <id-or-name> --json` includes provider-owned inventory and
estimates in `providerDetails` when available. Provider inventory failures are
reported; this is not billing/invoice data. Suspension requires idle live threads
and no open terminals; empty machines can use an opted-in provider idle policy.

`cc thread context` reads recorded context usage without sending a model request. A breakdown is optional; absent usage is returned as `null`.

`cc machine reconcile <id-or-name> [--json]` asks core to enforce its recorded
suspended state through the provider and waits for completion. It leaves active
machines and in-progress lifecycle operations alone. Use `machine suspend` to
request a new pause. Core does not schedule reconciliation polling.
