# Core command index

This index lists every command path that the core CLI registers, including aliases: `thread get|view|status` run `thread show`, `thread message|send` run `thread tell`, `thread messages|timeline` run `thread log`, `thread create|new` run `thread spawn`, `terminal read` runs `terminal output`, `plugin uninstall` runs `plugin remove`, and `environment get` runs `environment show`. At the top level `cc host`, `cc hosts`, and `cc machines` run `cc machine`, `cc env` runs `cc environment`, and the plurals `threads`, `projects`, `terminals`, `providers`, `plugins`, and `skills` run their singular command, unless a plugin registers that name. `cc guide commands <group>` prints a group's commands with every option on one page. Read the task-specific reference before you use a command. Check live help for flags and defaults.

## status

- `cc status`

## settings

- `cc settings`
- `cc settings show`
- `cc settings ai-services`
- `cc settings ai-services show`
- `cc settings ai-services set`
- `cc settings ai-services test`
- `cc settings general`
- `cc settings completed-turns`
- `cc settings experiment`
- `cc settings keyboard`
- `cc settings keyboard hints`
- `cc settings keyboard list`
- `cc settings keyboard set`
- `cc settings keyboard reset`
- `cc settings ui`
- `cc settings ui list`
- `cc settings ui get`
- `cc settings ui set`
- `cc settings ui reset`
- `cc settings usage`
- `cc settings version`
- `cc settings reload`

## project

- `cc project`
- `cc project source`
- `cc project source add`
- `cc project source update`
- `cc project source delete`
- `cc project attachment`
- `cc project attachment upload`
- `cc project attachment download`
- `cc project list`
- `cc project history`
- `cc project reorder`
- `cc project branches`
- `cc project paths`
- `cc project commands`
- `cc project files`
- `cc project content`
- `cc project create`
- `cc project show`
- `cc project update`
- `cc project delete`

`cc project show <id>` accepts `proj_personal` to inspect Personal.

## provider

- `cc provider`
- `cc provider list`
- `cc provider models`

## manager

- `cc manager`
- `cc manager hire`
- `cc manager list`
- `cc manager status`
- `cc manager delete`

## machine

- `cc machine`
- `cc machine providers`
- `cc machine enroll`
- `cc machine env`
- `cc machine env list`
- `cc machine env set`
- `cc machine env unset`
- `cc machine create`
- `cc machine list`
- `cc machine show`
- `cc machine reconnect`
- `cc machine rename`
- `cc machine remove`
- `cc machine suspend`
- `cc machine resume`
- `cc machine reconcile`
- `cc machine retry-cleanup`
- `cc machine retry-update`
- `cc machine provider-cli`
- `cc machine provider-cli status`
- `cc machine provider-cli install`

`cc thread spawn --new-machine <provider-id>` creates a machine for a new
environment and requires `--environment-provider <id>`. For a composed option,
use `--environment-provider modal-sandbox` alone. `--machine-inputs <json>`
configures the machine with optional configured `preset` and `image` names;
`--environment-inputs <json>` configures the workspace. Neither carries secrets.

## server

- `cc server`
- `cc server move`
- `cc server move status`
- `cc server move cancel`
- `cc server export`
- `cc server import`
- `cc server unlock`
- `cc server allow-connect`
- `cc server delete-old-copy`
- `cc server install-machine-service`

`move`, `move status`, `move cancel`, and `export` call the running server.
Server moves are experimental; agents run `move` (without `--check`),
`move cancel`, and `unlock` only after the user explicitly confirms.
`import`, `unlock`, `allow-connect`, and `delete-old-copy` act on a local data
directory (`--data-dir`, else `CC_DATA_DIR`, else `~/.cc`) and never call a
server. `install-machine-service` acts on the same local data directory after a
move and downloads the new server's cc-app package for its service.

## updates

- `cc updates`
- `cc updates status`
- `cc updates apply`
- `cc updates app`
- `cc updates app status`
- `cc updates app apply`
- `cc updates app dismiss`

## terminal

- `cc terminal`
- `cc terminal list`
- `cc terminal create`
- `cc terminal start`
- `cc terminal show`
- `cc terminal attach`
- `cc terminal send`
- `cc terminal resize`
- `cc terminal output`
- `cc terminal read`
- `cc terminal wait`
- `cc terminal rename`
- `cc terminal restart`
- `cc terminal close`
- `cc terminal stop`

## thread

- `cc thread`
- `cc thread wait`
- `cc thread spawn`
- `cc thread create`
- `cc thread new`
- `cc thread fork`
- `cc thread list`
- `cc thread show`
- `cc thread get`
- `cc thread view`
- `cc thread status`
- `cc thread log`
- `cc thread messages`
- `cc thread timeline`
- `cc thread output`
- `cc thread open`
- `cc thread pane`
- `cc thread section`
- `cc thread section list`
- `cc thread section create`
- `cc thread section rename`
- `cc thread section delete`
- `cc thread search`
- `cc thread history`
- `cc thread read`
- `cc thread unread`
- `cc thread reorder-pinned`
- `cc thread count`
- `cc thread queue`
- `cc thread queue list`
- `cc thread queue create`
- `cc thread queue update`
- `cc thread queue send`
- `cc thread queue delete`
- `cc thread queue reorder`
- `cc thread queue group`
- `cc thread tabs`
- `cc thread tabs show`
- `cc thread tabs set`
- `cc thread update`
- `cc thread archive`
- `cc thread unarchive`
- `cc thread restore-environment`
- `cc thread pin`
- `cc thread unpin`
- `cc thread delete`
- `cc thread edit-message`
- `cc thread tell`
- `cc thread message`
- `cc thread send`
- `cc thread retry`
- `cc thread stop`
- `cc thread compact`
- `cc thread context`
- `cc thread clear`
- `cc thread cancel-plan`
- `cc thread clear-goal`
- `cc thread interactions`
- `cc thread interactions list`
- `cc thread interactions show`
- `cc thread interactions approve`
- `cc thread interactions grant`
- `cc thread interactions answer`
- `cc thread interactions respond`
- `cc thread interactions deny`

## environment

- `cc environment`
- `cc environment providers`
- `cc environment list`
- `cc environment delete`
- `cc environment show`
- `cc environment get`
- `cc environment status`
- `cc environment branches`
- `cc environment paths`
- `cc environment diff`
- `cc environment diff-files`
- `cc environment diff-file`
- `cc environment diff-patch`
- `cc environment update`
- `cc environment commit`
- `cc environment archive-threads`
- `cc environment pull-request`
- `cc environment pull-request show`
- `cc environment pull-request ready`
- `cc environment pull-request draft`
- `cc environment pull-request merge`

## file

- `cc file`
- `cc file read`
- `cc file write`
- `cc file list`
- `cc file paths`
- `cc file mkdir`
- `cc file move`
- `cc file remove`

## theme

- `cc theme`
- `cc theme list`
- `cc theme set`
- `cc theme dir`
- `cc theme favicon`
- `cc theme favicon set`
- `cc theme favicon reset`
- `cc theme show`
- `cc theme reset`

## plugin

- `cc plugin`
- `cc plugin search`
- `cc plugin list`
- `cc plugin source`
- `cc plugin install`
- `cc plugin outdated`
- `cc plugin update`
- `cc plugin new`
- `cc plugin types`
- `cc plugin migrate`
- `cc plugin build`
- `cc plugin dev`
- `cc plugin reload`
- `cc plugin rpc`
- `cc plugin rpc list`
- `cc plugin rpc inspect`
- `cc plugin rpc call`
- `cc plugin enable`
- `cc plugin disable`
- `cc plugin safe-mode`
- `cc plugin config`
- `cc plugin token`
- `cc plugin run`
- `cc plugin logs`
- `cc plugin remove`
- `cc plugin uninstall`

## marketplace

- `cc marketplace`
- `cc marketplace add`
- `cc marketplace list`
- `cc marketplace refresh`
- `cc marketplace remove`

## skill

- `cc skill`
- `cc skill list`
- `cc skill show`
- `cc skill files`
- `cc skill update`
- `cc skill delete`
- `cc skill search`
- `cc skill registry`
- `cc skill registry detail`
- `cc skill install`
- `cc skill cli-skills-status`
- `cc skill install-cli-skills`

## guide

- `cc guide`

## diagnostics

- `cc diagnostics`
- `cc diagnostics cli-errors`

`cc diagnostics cli-errors` tallies the failed `cc` invocations recorded in `<data dir>/logs/cli-errors.jsonl` on this machine. It records the command path, the error code, and the unknown command or flag, never argument values. `CC_CLI_ERROR_LOG=0` turns recording off.

## voice

- `cc voice`
- `cc voice transcribe`

## browser

- `cc browser`
- `cc browser instances`
- `cc browser tabs`
- `cc browser create`
- `cc browser acquire`
- `cc browser connection`
- `cc browser release`
- `cc browser reveal`
- `cc browser close`
- `cc browser capture`
- `cc browser watch`
- `cc browser import-sources`
- `cc browser import-cookies`

Machine lists and name/ID selectors include machines still being created. Machine creation is durable: `create --no-wait` returns the creating host ID. `machine show <host-id>` reads progress and `machine remove <host-id>` cancels it. SIGINT only stops following.

Machine environment: `cc machine env list`, `cc machine env set NAME`
(value from stdin), and `cc machine env unset NAME`; all accept `--project <id>` for project overrides and `--json`. Omit `--project` for global settings.

Standalone `cc machine create` machines remain until explicitly removed.

To enroll an existing machine, run `cc machine create --provider manual`, then
run its printed enrollment command on the target. The CLI waits until the daemon
connects. With `--no-wait`, it returns the creating host ID immediately.
