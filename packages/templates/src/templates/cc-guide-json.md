---
kind: instruction
title: cc Guide JSON Output
summary: The --json contract for core cc commands, including output shapes and the error envelope.
intent: Let agents parse cc output on the first try instead of probing its shape.
editingNotes: Every shape here must match real command output. The CLI help JSON lines come from apps/cli/src/json-shapes.ts, and a CLI test fails when that file and this chapter disagree.
---
JSON output

Every core command accepts --json except the plugin authoring tools (`cc plugin
new`, `types`, `migrate`, `build`, `dev`, `run`, `logs`, `update`). Success
prints one JSON value on stdout and exits 0. Nothing else is written to stdout.

Errors

A failed command exits non-zero. With --json it prints this envelope on stdout
and still prints the readable message on stderr:

  {"ok": false, "error": {"code": "unknown_option", "message": "...", "hint": "..."}}

`hint` is present only when cc knows the fix: the flag to add, the nearest
command or option, or the usage line. Codes for mistakes in the invocation:
unknown_command, unknown_option, missing_required, unexpected_argument,
invalid_value, missing_command. A failed server request uses the server's error
code, such as thread_not_found or terminal_output_unavailable; otherwise the
code is http_<status> or error.

Parse stdout only. `2>&1` mixes the readable message into the JSON, and
`2>/dev/null` hides it. Check the exit code, or test `.ok == false`, before
reading fields.

Shapes

List commands do not share one wrapper. Most print a bare array; a few wrap it.
Fields beyond those shown exist; these are the ones scripts use. The `--help` of
the most-parsed commands ends with the same shape.

  cc status --json
    {project: {id, name} | null, thread: {id, status, title, parentThreadId, environment: {hostId, display} | null} | null, childThreads: [{id, status, title}] | null, pendingTodos, pluginsNeedingAttention: [{id, status}], dataDir}

  cc thread list --json
    [{id, projectId, environmentId, providerId, title, status, parentThreadId, sectionId, visibility, archivedAt, pinnedAt, createdAt, updatedAt, activity}]    (bare array; title can be null)

  cc thread show <id> --json
    {thread: {id, status, archivedAt, title, projectId, environmentId, parentThreadId, ...}, environment: {id, hostId, path, branchName, ...} | null, pendingTodos}    (thread fields are under .thread; status is the run state, archivedAt is null unless the thread is archived)

  cc thread log <id> --json
    [{id, seq, type, createdAt, threadId, scope, data}]    (bare array of raw events, oldest first; page with --after-seq <seq>); with --message: {message, before, after} of conversation rows

  cc thread output <id> --json
    {output}

  cc thread archive <id> --json
    {ok, threadId, alreadyArchived, archivedAt, archivedThreadIds}    (archivedThreadIds lists only threads this call archived)

  cc thread spawn ... --json
    the created thread: {id, status, title, projectId, environmentId, ...}

  cc thread tell <id> ... --json
    {threadId, ...delivery outcome}

  cc thread wait <id> --json
    {threadId, matched: true, target}

  cc thread count --json
    {total}

  cc thread search <query> --json
    {active: {total, results}, archived: {total, results}}

  cc prompt-history list --json
    {entries: [{id, createdAt, input, projectId, threadId, scope}], nextCursor: string | null}

  cc thread section list --json
    [{id, name, createdAt, updatedAt}]

  cc thread queue list <id> --json, cc thread interactions list <id> --json, cc thread history <id> --json
    bare arrays

  cc project list --json
    [{id, kind, name, gitRemoteUrl, sources: [{id, hostId, path, isDefault}]}]    (bare array)

  cc project show <id> --json
    {id, kind, name, gitRemoteUrl, sources}

  cc machine list --json
    [{id, name, type, status, lifecycle, maxPermissionMode, lastSeenAt}]    (bare array)

  cc provider list --json
    [{id, displayName, available, capabilities, reasoningLevels, serviceTiers}]    (bare array)

  cc provider models [providerId] --json
    [{id, model, displayName, supportedReasoningEfforts, defaultReasoningEffort, supportedServiceTiers?, isDefault}]    (bare array)

  cc environment list --json
    [{id, name, projectId, hostId, path, branchName, status, lifecycle}]    (bare array)

  cc environment show <id> --json
    {id, name, projectId, hostId, path, branchName, baseBranch, status, lifecycle}

  cc terminal list --thread <id> --json
    {sessions: [{id, title, status, exitCode, closeReason, cols, rows}]}    (wrapped in .sessions)

  cc terminal output <terminalId> --json
    {chunks: [{seq, dataBase64}], nextSeq, truncated, status, exitCode, closeReason}    (chunk data is base64; status is "exited" once the command has finished)

  cc terminal run --machine <id-or-name> --cwd <path> ... --json
    {terminalId, hostId, environmentId, cwd, status, observation, exitCode, closeReason, output, truncated, nextSeq}    (observation is "exited", "matched", or "timed-out"; output is plain text with terminal escapes removed, or null once the machine no longer keeps it)

  cc terminal wait <terminalId> ... --json
    {terminalId, hostId, environmentId, cwd, status, observation, exitCode, closeReason, output, truncated, nextSeq}    (same shape as terminal run)

  cc plugin list --json
    {plugins: [{id, version, enabled, status, source, rootDir}]}    (wrapped in .plugins)

  cc skill list --json
    {skills: [{id, name, description, scope, provider, filePath}]}    (wrapped in .skills)

  cc marketplace list --json
    bare array

  cc settings show --json
    one object keyed by settings area (generalSettings, serverAccess, keybindings, experiments, appearance, ...)

  cc guide commands [group] --json
    {chapter, commands: [{path, aliases, arguments, options, description}]}

Commands contributed by plugins document their own JSON in `cc <command> --help`
and the plugin's skill.
