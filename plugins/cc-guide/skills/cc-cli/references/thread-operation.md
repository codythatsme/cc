# Thread coordination and inspection

## Coordinating Work

- Use one clear owner per task.
- Spawn independent tasks separately when parallel work is useful.
- Let threads work after spawning. Do not poll with shell sleeps, repeated log
  reads, or repeated status reads.
- Use `cc thread wait <thread-id>` when you explicitly need to block until a
  thread finishes. It defaults to waiting for `idle` for up to 20 minutes;
  pass `--status` or `--event` for a different target, and `--timeout
<duration>` (seconds, or a duration with a unit such as `90s`, `20m`, `4h`)
  when you need a shorter or longer budget.
- Use `cc thread tell <thread-id> "..."` when requirements change, a blocker
  needs clarification, or follow-up work is needed. For multi-line or Markdown
  text use `cc thread tell <thread-id> --message-file <path>` (`-` reads
  stdin): inside double quotes the shell runs `backticks` and `$(...)` before
  cc sees the message. `cc thread edit-message`, `cc thread queue create`, and
  `cc thread queue update` take `--message-file` too.
- Add `--plan` to `cc thread spawn` or `cc thread tell` to send the prompt as
  the provider's structured `/plan` action: the agent proposes a plan for
  approval before executing when supported by the provider. Plain `/plan ...` text is
  not recognized and reaches the provider as literal text. Review the proposed
  plan with `cc thread interactions`; `cc thread cancel-plan` leaves Plan mode
  early. The SDK equivalent is `input: [createBuiltinPlanCommandTextInput(text)]`
  (exported by `@cc/sdk`) on `threads.spawn` / `threads.send`.
- Use `cc thread edit-message <thread-id> --message "..."` to replace and rerun
  the latest eligible user message in a supporting provider thread. Pass
  `--expected-request-sequence <sequence>` to select an earlier message. Failed
  and incomplete turns are eligible; submitting against a running thread stops
  and settles its current turn first. Opening edit mode in the app is
  non-destructive; history changes only when the edit is submitted successfully,
  and workspace changes remain. When an agent edits another thread, the CLI
  carries its `CC_THREAD_ID` so the replacement runs under agent permission
  policy.
- Add `--send-at <when>` to `cc thread spawn` or `cc thread tell` to schedule
  the dispatch instead of attempting it now. `<when>` is an ISO 8601 timestamp
  (`2026-08-25T09:00`, local when no offset is given) or a duration from now
  (`30s`, `10m`, `2h`, `7d`); a time in the past and a bare date are both
  rejected. A scheduled spawn creates the thread `pending` with no turn and no
  environment work — no worktree and no setup script run until it is due — and a
  scheduled tell neither sends nor runs. Both report `delivery: "queued"` and
  dispatch on the sweep after the requested time. The SDK equivalent is `sendAt`
  (epoch ms) on `threads.spawn` / `threads.send`.
- `cc thread queue list` shows a Sender for agent threads and system notices.
  SDK queue rows and `--json` include `initiator` and nullable `senderThreadId`.
- A send that cannot run right now does not fail: it joins the thread's queue
  with a typed reason. `--json` reports `delivery: "queued"` plus
  the complete `queuedMessage` row, so a script can inspect its `id`,
  `waitingOn`, and `sendAt` without guessing. `queuedMessage.waitingOn.kind` is
  one of `time`, `thread-busy`, `turn-starting`, `provisioning`, `host-offline`,
  `interaction`, or `plugin` (which also carries `pluginId` and a human reason).
- Inspect and act on queued dispatches with `cc thread queue list [<thread-id>]
[--wait-holder plugin:<plugin-id>]`, `cc thread queue send <thread-id>
<message-id>` (send it now, bypassing every plugin wait and its schedule), and
  `cc thread queue delete <thread-id> <message-id>` (discard it). Omitting the
  thread lists every queued row in the workspace. The list shows `Waiting on`
  and `Send at` columns. Several queued rows on one thread are normal. The SDK
  equivalents are `threads.queue.list` (cross-thread) and
  `threads.queuedMessages.list/send/update/delete` (one thread).
- Failed queue rows show the failure reason and an exact recovery command.
  Use `cc thread queue send <thread-id> <message-id>` to retry immediately,
  including after automatic retries are exhausted. Editing does not clear a
  failure or trigger a retry; send still respects core readiness requirements.
- `cc thread queue send <thread-id> <message-id> --mode steer` re-attempts the
  row as a steer with the same send-now behavior: it bypasses the row's schedule
  and plugin waits, while core waits still apply. During provisioning it reports
  that the row is still queued and leaves it waiting for the workspace.
- Queueing writes nothing to the timeline: a queued message reaches the thread
  log only once it dispatches. Ask the queue instead. In the app the same fact
  reaches the sidebar as a clock on any thread that holds queued work and is not
  running (the failure glyph instead if a drain attempt failed); a thread list
  entry carries it as `queuedWork: "none" | "waiting" | "failed"`.
- Use `cc thread count` when you need how many threads there are, never a list
  plus a row count: the count is a database aggregate, while `cc thread list`
  pages a bounded window and would miscount. Narrow with `--status
<pending|idle|starting|active|stopping|error>`, `--host`, `--provider`,
  `--project`, and `--parent <id|none>` (`none` counts only threads that have no
  parent at all; pass an id to count one thread's children). Archived, deleted,
  and hidden threads are excluded. Plain output is one number; `--by
host|provider|project` prints a count per group (a thread with none groups
  under `-`) and the total. The SDK equivalent is `threads.count({ status,
hostId, providerId, projectId, parentThreadId, groupBy })`.
- `cc thread tell` steers by default, delivering the message immediately into
  the active turn. Use `--mode queue` when the message is non-urgent and the
  agent can finish its current work first. Steer is especially important for a
  wrong direction, hard stop, or critical clarification.
  Example: `cc thread tell <thread-id> "Stop and use approach B" --mode steer`.
- Input sent while a turn is starting stays queued with
  `waitingOn.kind: "turn-starting"`. The `turn/started` event wakes it and
  steers it into that turn. Do not resend it.
- If the target thread is awaiting user interaction (an open question or
  approval), `cc thread tell` cannot interrupt it. The message joins the
  thread's queue with `waitingOn.kind: "interaction"` and dispatches once the
  interaction settles; the CLI prints that it is queued and why. That outcome is
  not a failure, so do not resend. For a hard stop use `cc thread stop
<thread-id>`. `--json` reports `delivery` as `sent` or `queued`. If the thread
  fails while the message is queued (its provider exited), the message waits
  until somebody retries the thread.
- `cc thread archive` is not a hard stop. For 30 seconds after archiving, a
  thread keeps its terminals and a mid-turn thread keeps running, so
  `cc thread unarchive` inside that window leaves everything in place; cc stops
  the thread and closes its terminals once the grace elapses. Use
  `cc thread stop <thread-id>` when the run must end now.

## Inspecting Results

- Use `cc thread search <query> [--limit <1-50>]` for sidebar search. Use
  `history`, `read|unread`, and `section` for organization and recall. The
  `cc thread queue` group contains the queued-message operations. Queue updates
  use the listed version and accept repeatable `--file` and `--image` options;
  absolute file/image paths and `file:` URLs are uploaded from the CLI machine before the update.
- Use `cc thread show <thread-id>` for status, parent, environment, pull request
  status, and result.
- Use `cc thread show <thread-id> --git-diff` to review file changes.
- Use `cc thread log <thread-id>` to inspect the conversation. The default
  shows only the newest 20 user-message turns and ends with a notice when older
  history was omitted. For timeline text, `--limit <n>` accepts at most 100.
  `--all` prints the whole thread. Human formats use a consistent history
  snapshot and join paginated group contents. Appends remain outside that walk;
  rerun after a cursor-invalidated error from a history edit. JSON accepts any positive limit. It defaults
  to the oldest 100 raw events and warns when more exist. Page with
  `--after-seq <seq>` or pass `--all`.
  Grep the `--all` output, not the default page, when checking whether a
  thread ever received a message.
- Use `cc thread output <thread-id>` to read the latest final output, or
  `cc thread output --self` for the current thread.

For review or fix pipelines, get the environment ID from
`cc thread show <thread-id> --json`, then spawn the follow-up with
`--environment <environment-id>` so it sees the same files.

## Opening Threads And Files In The App

- Reference a CC thread in chat as `@thread:thr_abc123`, substituting its
  actual ID. CC renders the mention with the correct project-aware link; do not
  construct `/threads/...` or `/projects/.../threads/...` URLs manually.
- Use `cc thread open <path>` inside a CC thread to open a Markdown, HTML, or
  other workspace file for the user in the CC IDE's thread panel.
- Use `cc thread open <thread-id> --split right|down|left|top|replace` to open
  or focus a thread in the current app split layout. `replace` is the default;
  an already-open thread is focused. Edge splits create panes through the
  eighth pane; at eight panes, they replace the focused pane.
- A file path is optional when a thread ID is explicit:
  `cc thread open <thread-id> [path] [--split <placement>]`.
- Paths can be thread-relative workspace paths, or absolute paths inside the
  target thread workspace.
- Absolute paths under `CC_THREAD_STORAGE` open as thread-storage files for the
  current thread.
- Use `cc thread pane maximize|restore|toggle|spotlight|clear-spotlight
[thread-id]` to change a matching open pane in every connected CC app window.
  Inside a CC thread, omit the ID to use `CC_THREAD_ID`. The command reports
  how many connected clients received the ephemeral action. The SDK equivalent is
  `sdk.threads.paneAction({ threadId, action })`.
- Users can also toggle the focused pane from its header or with the configurable
  `pane.maximize.toggle` app command (default `Mod+Shift+E`).

## Files And Voice

- Use `cc file read|write|list|paths|mkdir|move|remove` for SDK-equivalent host
  file access. `--host` targets another machine; `--root` confines mutations.
- File write requires exactly one of `--content` and `--stdin`. File paths lists
  files and directories when neither selector is present. File list and file
  paths include dot-prefixed entries; `--no-hidden` skips them. Both skip
  `node_modules`, `.venv`, `.pnpm-store`, and root-relative `.claude/worktrees`
  by default. `--exclude <names...>` replaces that set; entries match basenames
  at any depth or exact root-relative paths using `/` separators.
- File remove supports `--recursive` and requires `--yes` without a terminal.
- Use `cc voice transcribe <file> [--type <mime>] [--prompt <text>]` without the
  app composer. The MIME type defaults to `audio/webm`.

## Long-Running Commands

- Use `cc terminal ...` for long-running commands the user may need to inspect
  or stop later: dev servers, watch tasks, REPLs, database consoles, and similar
  processes. The terminal is a real persistent PTY shown in the cc UI.
- `list` and `create` require exactly one explicit scope: `--thread <id>`,
  `--environment <id>`, or `--machine <id-or-name>` (`--host` is an alias).
  Add `--cwd <path>` only to a machine scope. Machine targets resolve to an
  explicit host ID; terminal commands never silently fall back to the server machine.
- Start a server with
  `cc terminal create --thread <thread-id> --title "pnpm dev" --command "pnpm dev"`.
- `cc terminal start` is an alias for create. `cc terminal stop` is an alias
  for close.
- Use `cc terminal show`, `attach`, and `resize` for session inspection,
  interactive attachment, and PTY size changes. Use live help for their flags.
- All existing-session operations need only the terminal ID; they accept and
  ignore the scope flags of `list` and `create`. Use
  `cc terminal wait <terminal-id> --contains "Local:" --timeout 120` to wait
  for readiness from new output. Pass `--from-start` only when matching existing
  scrollback is intentional. When the terminal exits before the text appears,
  wait stops at once with exit code 124, the terminal's exit code, and its last
  output.
- Use `cc terminal output <terminal-id> --json` to read bounded output, then
  continue with `--since-seq <nextSeq>` when polling. The response carries
  `status`, `exitCode`, and `closeReason`. Output stays readable for 30 minutes
  after the command exits, until the machine's daemon restarts. Use
  `cc terminal send <terminal-id> --text "..." --enter` for interactive input,
  `cc terminal rename <terminal-id> <title>` to rename, and
  `cc terminal close <terminal-id>` when the process is no longer needed.
- `cc terminal restart <terminal-id>` replaces the session with a shell in the
  same scope, size, and title. It does not replay the original launch command.

Clearing a thread's parent with `cc thread update --clear-parent-thread` inherits the former parent's section unless the update explicitly supplies a section. Children released by environment archiving also inherit their former parent's section.
