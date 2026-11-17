# Core command index

This index lists every command path that the core CLI registers, including aliases: `thread get|view|status` run `thread show`, `thread message|send` run `thread tell`, `thread messages|timeline` run `thread log`, `thread create|new` run `thread spawn`, `terminal read` runs `terminal output`, `plugin uninstall` runs `plugin remove`, and `environment get` runs `environment show`. At the top level `cc host`, `cc hosts`, and `cc machines` run `cc machine`, `cc env` runs `cc environment`, and the plurals `threads`, `projects`, `terminals`, `providers`, `plugins`, and `skills` run their singular command, unless a plugin registers that name. `cc guide commands <group>` prints a group's commands with every option on one page. Check live help for flags and defaults.

## status

- `cc status`

## settings

- `cc settings`
- `cc settings show`
- `cc settings mobile-app`
- `cc settings ai-services`
- `cc settings ai-services show`
- `cc settings ai-services set`
- `cc settings ai-services test`
- `cc settings cli-command`
- `cc settings cli-command show`
- `cc settings cli-command install`
- `cc settings cli-command remove`
- `cc settings general`
- `cc settings replay-onboarding`
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

`cc settings usage` accepts `--refresh` to fetch fresh provider usage.

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
- `cc project discover`
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

## prompt-history

- `cc prompt-history`
- `cc prompt-history list`

## provider

- `cc provider`
- `cc provider list`
- `cc provider enable`
- `cc provider disable`
- `cc provider models`

Use `--selected-model <model-id>` to discover its reasoning choices and include selected-only entries.

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

## updates

- `cc updates`
- `cc updates status`
- `cc updates apply`
- `cc updates app`
- `cc updates app status`
- `cc updates app apply`
- `cc updates app cancel`
- `cc updates app auto`
- `cc updates app dismiss`

## terminal

- `cc terminal`
- `cc terminal list`
- `cc terminal create`
- `cc terminal start`
- `cc terminal run`
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
- `cc thread regenerate-title`
- `cc thread delete`
- `cc thread edit-message`
- `cc thread tell`
- `cc thread message`
- `cc thread send`
- `cc thread retry`
- `cc thread stop`
- `cc thread compact`
- `cc thread context`
- `cc thread commands`
- `cc thread options`
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
- `cc environment cleanup`
- `cc environment show`
- `cc environment get`
- `cc environment paths`
- `cc environment update`
- `cc environment commit`
- `cc environment archive-threads`

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
- `cc plugin install-jobs`
- `cc plugin cancel-install`
- `cc plugin outdated`
- `cc plugin update`
- `cc plugin update-jobs`
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
- `cc plugin prune`
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
