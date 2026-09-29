The builtin Account Pooler plugin is disabled by default. Enable it, add Claude
or Codex credentials, and inspect its proxy routes and account quota with:

```sh
cc plugin enable account-pool
cc pool account add --provider claude --login
printf '%s\n' "$CLAUDE_AUTH_CODE" | cc pool account login-complete --session <id> --code-stdin
cc pool account add --provider codex --login
cc pool account login-poll --session <id>
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
cc pool config set <anthropicUpstreamBaseUrl|codexUpstreamBaseUrl|switchThreshold|parentMode> <value>
cc pool parent [proxy|isolate]
cc pool token rotate --machine <id-or-name>
cc pool bypass <thread-id> [--off]
```

Every command accepts `--json` and `--help`. `cc pool --help` lists the
commands; `cc pool <command> --help` prints that command's arguments, options,
and rules, including which flags cannot be combined. Unknown commands, unknown
flags, and stray arguments are rejected with the nearest suggestion rather than
ignored, and a failing invocation that carries `--json` also prints
`{"ok":false,"error":{"code","message","hint"}}` on stdout.

Claude `--login` starts a PKCE session, prints a browser URL and session ID,
then exits. Pipe the manual callback code to `account login-complete` with that
session ID within ten minutes. Codex `--login` prints a device verification
URL, one-time code, session ID, and an `account login-poll` command that waits
for authorization. The Claude code stays out of process arguments, and either
browser may be on a different machine from the cc server. Newly added or
enabled accounts are available without a plugin reload. With an
enabled account whose secret file remains readable and valid, matching Claude
Code or Codex sessions receive the pool route and a distinct secret token for
their machine.
Codex receives `CODEX_OPENAI_BASE_URL` and the secret
`CODEX_POOL_AUTH_TOKEN`; cc applies them as in-memory app-server config.
Codex image generation and editing use the same authenticated pool route.
Tokens are never printed. `status` prunes tokens for unenrolled machines and
shows token timestamps plus recently routed threads whose machines need a
local Claude login before the pool can be disabled safely. Rotation keeps the
prior token valid for ten minutes. Agents should pipe API keys to
`--api-key-stdin`;
`--api-key <key>` is an unsafe compatibility form that exposes the key in
process arguments, shell history, and agent transcripts. Prefer `--import` for
an existing Claude Code login. The CLI Codex import path reads
`~/.codex/auth.json` on the cc server host. OAuth quota refreshes on add or
enable and every five minutes while an account is idle. When a request finds no
eligible account, the pool first refreshes the OAuth accounts it considers
exhausted, at most once every 30 seconds per account, so a plan upgrade or an
early reset takes effect on the next turn. Use
`cc pool account refresh <id>` to request an immediate refresh for one account.
For an OAuth account in error, `refresh` also forces a new token with the stored
refresh token and clears the error when that succeeds, so a spurious error does
not require logging in again.
An account enters error only when its OAuth refresh token is rejected (HTTP 400
or 401 from the token endpoint) or an API key is rejected. A 401 or 403 on a
freshly refreshed OAuth token is treated as an upstream failure instead: the
request gets HTTP 503, and that token is held out of routing for one minute.
Account tables add columns for observed model-family buckets; JSON status
exposes their utilization, reset, status, observation time, and source under
`familyWeekly`. Selection skips an account whose requested family is spent
while retaining it for other families. A present `metadata.user_id` account
UUID is aligned with the selected OAuth account. Use `cc pool config` to
inspect the full routing configuration and
`cc pool config set <key> <value>` to update one value. The upstream URL keys
are QA-only overrides; `switchThreshold` must be greater than 0 and at most 1.

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

Drag an account’s handle in Account Pooler settings (or focus the handle and use
Space, arrow keys, and Space again), or
`cc pool account reorder <claude|codex> <id>...`, to set the complete order for
one provider. Include disabled accounts too. Reordering changes the next failover
sequence without moving the current account. `cc pool account priority <id> <n>`
sets an individual priority; the same operations are available through the
`account.reorder` and `account.setPriority` plugin RPCs.

## Nested cc servers

A cc server started from inside another cc server's thread inherits that parent's
pooler routing through its environment. The parent contributes
`CC_ACCOUNT_POOL_PARENT_URL` and `CC_ACCOUNT_POOL_PARENT_TOKEN` alongside the
provider routing variables, and the nested server enables the pooler on first run
when it sees them.

`cc pool parent` reports the detected parent, the current mode, and which
providers the parent can serve. `cc pool parent proxy` and `cc pool parent
isolate` set the mode; `cc pool config` shows it as `parentMode`.

In `proxy` mode the nested server runs its own hub and mints its own machine
tokens, forwarding pooled traffic upstream with the parent's token, so the
parent's token is never handed to the nested server's agents. It reads the
parent's `/availability` endpoint and contributes routing only for providers the
parent can actually serve; if the parent is unreachable it contributes nothing
and neutralises the inherited values rather than pointing agents at a dead hub.

In `isolate` mode the nested server contributes empty routing variables, which
overrides the inherited values so threads fall back to that instance's own
accounts or to each provider's own credentials.

Proxied traffic authenticates as the parent machine's token, so `cc pool status`
on the parent attributes it to the parent host rather than to the nested
instance.
