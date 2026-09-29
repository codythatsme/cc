---
kind: instruction
title: cc Guide — Environments
summary: Command reference for environment setup, inspection, commits, and merges.
intent: Provide complete environment command documentation for agents.
editingNotes: Keep flags accurate against the CLI implementation.
---
Environment commands

Environments determine where threads run. Multiple threads can share an environment
(e.g., a coding thread and a review thread in the same worktree).
The first-party choices are Project checkout (the project's existing directory),
Worktree (a fresh Git worktree), and Personal workspace (a projectless workspace).

Making your repo work with cc:

  If the default environment plugin is disabled or missing, creation fails
  before inserting a thread. Enable the plugin or explicitly choose another
  environment; CC does not silently replace an isolated worktree with a checkout.
  Host-dependent preflight checks require the selected machine to be connected.
  Directory switching creates a core-owned attachment with no provider identity.

  Commit a .cc-env-setup.sh script at the repo root when new cc worktrees need
  repo-specific setup. After cc creates a new managed worktree environment, it
  looks for .cc-env-setup.sh inside that new workspace. If the file is absent,
  provisioning continues with no error.

  The script must be tracked by git. A fresh worktree only checks out tracked
  files, so an untracked .cc-env-setup.sh in your source checkout will not be
  present and will not run.

  CC runs the hook as `env bash .cc-env-setup.sh` with cwd set to the new
  workspace. POSIX shell setup scripts are not supported on Windows. The hook
  inherits the host daemon's sanitized environment: NODE_ENV and every CC_*
  variable are removed, and cc does not inject CC_PROJECT_ID, CC_ENVIRONMENT_ID,
  or CC_SOURCE_PATH.

  Core admits and claims the path before hooks, and runs hooks only
  after create confirms ownsPath: true. Attached project
  checkouts and personal workspaces never run hooks. Hook IDs derive from the launch attempt. A server restart can join the same
  operation while the daemon remains alive. Hook state is held only in daemon
  memory; a daemon restart leaves an interrupted hook outcome unknown.

  A non-zero exit, timeout, signal, or cancellation fails provisioning and cc
  removes the new worktree after confirming the script has stopped. An unknown
  hook outcome blocks automatic cleanup and requires inspection before recovery.
  Keep optional setup steps non-fatal inside the
  script if the environment should still open. Provisioning progress reports
  "Running .cc-env-setup.sh" and then ".cc-env-setup.sh finished",
  ".cc-env-setup.sh failed", or ".cc-env-setup.sh cancelled".

  Commit a .cc-env-teardown.sh script at the repo root when setup creates
  resources outside the managed worktree. CC runs the hook as
  `env bash .cc-env-teardown.sh` from the worktree before it removes the
  worktree. The hook receives the same sanitized environment as the setup
  hook, and stdin is closed.

  Teardown has a separate 15-minute timeout. A non-zero exit, timeout, or
  signal reports failure in the destroy transcript, but cc removes the
  worktree after script termination. If transport fails, cc cancels the hook
  and confirms its process group has stopped before releasing the workspace.
  An unreachable daemon leaves cleanup pending for retry. If the daemon no
  longer knows the hook, cleanup remains blocked with an explicit unknown-outcome
  error. There is no cross-restart script recovery or persisted process tracking.
  Teardown only runs for paths whose ownership was confirmed by create.

  New worktrees do not contain untracked files such as .env.local. To copy
  them from the source checkout, commit a .worktreeinclude file at the repo
  root. It uses gitignore syntax: one pattern per line, # for comments, ! to
  negate an earlier pattern. cc copies each untracked file in the source
  checkout that matches a pattern:

    .env
    .env.*
    !.env.example
    certs/

  cc copies files only. It follows no symlinks, and it replaces nothing that
  the worktree already has. The copy runs after `git worktree add` and before
  .cc-env-setup.sh, so the setup script can read the copied files. A pattern
  that matches nothing, or a file cc cannot read, is reported in the
  provisioning transcript and does not fail provisioning.

  Large directories such as node_modules are copied file by file. Install
  dependencies in .cc-env-setup.sh instead of listing them here.

  For files that customize agent instructions and skills (AGENTS.md,
  .cc/AGENTS.md, .cc/skills/), run `cc guide agent-configuration`.

  cc environment providers                List registered environment providers in picker order:
                                          Project checkout, Worktree, then other installed providers
                                          by display name; includes id, name, the `requires` facts (host,
                                          projectCheckout, gitCheckout, gitRemote, projectless), and whether
                                          it takes --environment-inputs (--json prints the JSON Schema)
    --project <id>                        Filter by structural eligibility for this project
    --machine <id-or-name>               Scope structural eligibility to this machine
    --host <id-or-name>                  Alias for --machine
  cc environment list                     List environments that are not destroyed
    --project <id>                        Only environments in this project
    --provider <id>                       Only environments this environment provider produced
    --host <id-or-name>                   Only environments on this machine
    --instance-key <key>                  Only the environment its provider named with
                                          this instance key (with --provider, the one
                                          row that provider's launch produced)
    --status <status>                     Only environments in this status: provisioning,
                                          ready, error, destroyed (the only way to see
                                          destroyed rows)
    --limit <n> / --offset <n>            Page through the rows, oldest first
  cc environment delete <id>              Request provider cleanup; refused while threads are
                                          live or stopping. The command returns with cleanup
                                          requested; lifecycle becomes destroyed only after
                                          provider removal completes
  cc environment show <id>                Show environment details (path, branch, status, lifecycle, retirement deadline and teardown attempts)

  cc environment status <id>              Show workspace status
    --merge-base-branch <branch>          Include merge-base status

  cc environment branches <id>            List local and remote branches
    --query <query>                       Filter branch names
    --limit <count>                       Limit local and remote results

  cc environment paths <id>               Search workspace paths
    --query <query>                       Fuzzy path query
    --limit <count>                       Maximum results
    --files                               Include only files unless combined with --directories
    --directories                         Include only directories unless combined with --files

  cc environment diff <id>                Show file summary and full git diff
  cc environment diff-files <id>          List changed-file metadata
    --target <target>                     uncommitted, branch_committed, all, or commit (required)
    --merge-base-branch <branch>          Required for branch_committed and all
    --sha <sha>                           Required for commit

  cc environment diff-file <id>           Read one side of a changed file
    --target <target>                     Diff target (required)
    --path <path>                         Repository-relative path (required)
    --side <old|new>                      File side (required)
    --merge-base-ref <sha>                Required for branch_committed and all
    --sha <sha>                           Required for commit

  cc environment diff-patch <id>          Fetch selected file patches
    --target <target>                     Diff target (required)
    --path <path>                         Changed path; repeat for multiple files (required)
    --merge-base-branch <branch>          Required for branch_committed and all
    --sha <sha>                           Required for commit

  cc environment update <id>              Update environment metadata
    --merge-base-branch <branch>          Set merge-base branch override
    --clear-merge-base-branch             Clear merge-base override
    --name <name>                         Set display name
    --clear-name                          Clear display name

  cc environment commit <id>              Create a commit in the environment

  cc environment archive-threads <id>     Archive all threads in an environment

  When the last thread of a worktree environment is archived, the worktree
  plugin waits five minutes and then tears it down: it runs
  .cc-env-teardown.sh, stops every process whose working directory is inside
  the worktree (the agent process, background jobs it left behind, and also
  shells, editors, or servers you started there yourself; SIGTERM, then
  SIGKILL after a short grace period), removes the worktree, and records the
  environment as destroyed. The branch is kept. Deleting the last thread starts
  teardown without the retirement grace; cleanup still completes asynchronously. Unarchiving a thread inside the grace window cancels the
  teardown. Move your own shells out of the worktree first if you want to
  keep them.

  cc environment pull-request show <id>   Inspect a pull request
  cc environment pull-request ready <id>  Mark a pull request ready
  cc environment pull-request draft <id>  Convert a pull request to draft
  cc environment pull-request merge <id>  Merge a pull request
    --method <method>                     merge, squash, or rebase

Every inspection command accepts an arbitrary environment ID and supports
`--json`. Non-git status/diff responses are reported explicitly. `diff-file`
prints UTF-8 content directly and labels base64 binary content; diff and patch
truncation markers are preserved.

Remote access (cc connect):

  Remote connect has no hosted default. Run your own connect service and set
  CC_CONNECT_BASE_URL to its origin, then copy the connect command its dashboard
  generates, then run it here to
  pair:

  cc connect --code <code> --server https://<handle>.cc.example.invalid
    --code <code>          One-time pairing code from the dashboard
    --server <url>         https://<handle>.cc.example.invalid (from the dashboard)

  Pairing returns immediately: the cc SERVER redeems the code, stores the
  credential, and holds the tunnel itself — so it stays up as long as cc is
  running and reconnects on restart (no foreground process).
  Without an installed cc, pair via npm:
  `pnpm cli connect --code <code> --server <url>`.

  In a source checkout, `pnpm dev` automatically points the unpaired Connect
  settings and code-only pairing at that worktree's local Cloud origin through
  `CC_DEV_CONNECT_BASE_URL`. Explicit `--server` and `--base-url` targets still
  win, so the dev cc can also pair with cc.example.invalid.

  cc connect status                       Show the server's connect status
  cc connect off                          Disconnect and forget the pairing
  cc connect expose <port> [--host <name-or-id>]    Share a host's HTTP port
  cc connect unexpose <port> [--host <name-or-id>]  Stop sharing on that host
  cc connect shares [--host <name-or-id>]           List that host's shares
  cc connect servers                      List every cc on this account (handle, url, live)
  cc connect machine-code                 Mint a one-time code that pairs the cc mobile app
                                          (needs the mobileApp experiment)

  Port sharing works from threads on any enrolled host. In a thread,
  `cc connect expose <port>` resolves the thread environment's host; outside a
  thread it defaults to the server host. `--host <name-or-id>` overrides that
  choice for expose, unexpose, and shares. Server-host URLs use
  `https://<server-label>--<port>.cc.example.invalid`; machine-host URLs use
  `https://<machine-label>--<port>.cc.example.invalid` and proxy directly through that
  machine's daemon. Access is owner-session-gated — only viewers signed into
  the owner's cc.example.invalid account can open the URL; it is not a public internet
  link. Agents should run expose from the thread that started the server, share
  the returned URL, and unexpose from the same thread when it stops.
  `cc connect status` shows all shares with host + URL. `shares --json` returns
  the resolved `host` and rows with `hostId`, `hostName`, `port`, and `url`.

  The cc mobile app pairs with a paired cc through cc connect. Turn on the
  `mobileApp` experiment first (`cc settings experiment mobileApp true`, or
  Settings → Experiments → Mobile app); the surfaces below stay hidden without
  it. Settings → Remote access → Add mobile device shows a QR code plus the code as text;
  `cc connect machine-code` prints the same code, server URL, apex, and expiry
  (`--json` for `{code, serverUrl, apex, expiresAt}`). The phone scans or
  types the code and enrolls as a connect machine on the account with its own
  revocable credential (it appears in the cc.example.invalid dashboard machine list).
  Codes last 10 minutes and work once; an account-machine-limit failure says
  so and points at the dashboard to revoke an unused device.

  Remote access is owned by the builtin "connect" plugin (Plugins → connect
  shows the URL, QR code, mobile pairing, and shared ports). Disabling the
  plugin (`cc plugin disable connect`) cuts off all remote access; re-enable
  with `cc plugin enable connect`.

Core owns environment retirement and teardown. After the last live thread is archived or deleted, the provider policy sets the retirement deadline. `cc environment show <id>` reports lifecycle phase and teardown status, attempt and failure message. Failed teardown retries automatically; checkout environments do not retire.

Explicit environment or project deletion bypasses the retirement grace, including the never-retire policy. Provider cleanup retains the host, path and resource until removal completes; inspect progress with `cc environment show <id>`.

`cc environment providers --json` includes each choice’s `description` and `icon`, as well as its label, inputs, and availability.

`cc environment providers --project <id>` omits providers whose declared requirements are unmet on every persistent machine, and reports each provider's `machineAvailability` per machine in `--json`. Add `--machine <id>` to scope structural eligibility to that machine and print its availability: `available`, `setup-required`, `unavailable` with the plugin's reason, or `unknown` while the background probe has not answered. Listing never waits on a machine; probes run in the background, are cached for ten minutes per project and machine, and are checked afresh for the selected provider and machine during thread creation.

CC source checkout startup

  In the CC repository, `pnpm start:worktree` prepares and serves production
  artifacts using stable checkout-specific dev data and ports (no Vite).
  Add `--dryrun` to `pnpm start` or `pnpm start:worktree` to prepare through
  Turbo, print resolved paths/ports, and exit. It does not launch services,
  migrate instance data or require ports to be free. It still writes artifacts
  and may repair native modules. Install dependencies beforehand when needed.
  Both normal and dry-run startup preserve their runtime policy and use the same
  dotenv settings. Preparation writes the
  checkout's build files; warm a separate staging checkout's cache if the live
  instance still serves those paths. Keep the serving checkout path stable to
  preserve its data and ports. See `docs/debugging-and-qa.md` for the restart
  sequence and source programmatic helpers. These are repository maintenance
  commands, not environment lifecycle hooks or installed `cc` commands.
