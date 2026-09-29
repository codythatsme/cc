# Worktrees, setup scripts, and teardown scripts

When you start a thread in cc, you can run it in your project's existing
checkout or in a fresh **managed worktree** — a separate working copy on disk
with its own branch. Worktrees let cc work on multiple things in parallel
without touching your main checkout, and they make it easy to throw away
whatever the agent does without affecting the rest of your work.

You can pair a worktree with a **`.worktreeinclude` file** that lists the local
files each new worktree needs, and with a **setup script** that cc runs the
first time the worktree is created — useful for installing dependencies,
generating secrets, or anything else you need before the agent starts.
You can also add a **teardown script** that releases resources outside the
worktree before cc removes it.

## What is a managed worktree?

A managed worktree is a `git worktree` of your project's repo, on a fresh
branch. Under the hood it's `git worktree add` plus some bookkeeping:

- It shares the repo's `.git` state with your main checkout — cheap to
  create, no full clone.
- It gets its own branch so multiple threads can run in parallel.
- It lives at
  `<CC_DATA_DIR>/plugins/environment-git-worktree/host-data/worktrees/<thread-id>/<repo-name>`
  — for example, `~/.cc/plugins/environment-git-worktree/host-data/worktrees/thr_abc.../myrepo`.
- Once every thread using the environment is deleted, cc cleans the worktree up
  (`git worktree remove --force`). Archiving the last thread starts a
  five-minute grace period instead, so unarchiving within it keeps the
  worktree; after it elapses the worktree is removed the same way.

Worktrees are created by cc's built-in **Worktree** plugin, which is enabled by
default. Disabling it in Settings → Installed plugins leaves existing worktrees alone
but stops cc from making new ones: a thread that asks for one waits until the
plugin is running again.

## Start a thread in a worktree

In the app, pick **Worktree** in the environment picker when starting
a thread.

From the CLI:

```bash
pnpm cc thread spawn \
  --project <project-id> \
  --new-environment worktree \
  --prompt "..."
```

Omit `--base-branch` for cc's smart default. Explicit values are exact:
`main` is local and `origin/main` is remote.

## Copy local files with `.worktreeinclude`

A new worktree checks out tracked files only. Your `.env`, your local
certificates, and anything else git ignores stay behind in your main checkout.

Commit a `.worktreeinclude` file at the root of your repo to list what a
worktree needs. It uses gitignore syntax — one pattern per line, `#` for
comments, `!` to negate an earlier pattern:

```gitignore
# Local credentials the agent needs
.env
.env.*
!.env.example
certs/
```

cc copies every untracked file in the source checkout that matches a pattern,
after it creates the worktree and before it runs `.cc-env-setup.sh`. Your
setup script can therefore read the copied files.

Contract:

- cc copies files. It does not create symlinks, and each worktree gets its own
  copy — an edit inside the worktree does not change your main checkout.
- cc never replaces anything the worktree already has. If the branch tracks a
  file at that path, the tracked file wins and cc reports the skip.
- cc skips symlinks in the source checkout rather than copying their targets,
  and it never writes through a symlink in the worktree.
- A pattern that matches nothing, an unreadable file, or a failed copy is
  reported in the provisioning transcript. Provisioning continues.
- Large directories such as `node_modules` are copied file by file, which is
  slow. Install dependencies in `.cc-env-setup.sh` instead.

## Run setup with `.cc-env-setup.sh`

Drop a file named `.cc-env-setup.sh` at the root of your project. If cc finds
one after an environment provider creates a path it owns (`ownsPath: true`), cc
runs the script inside that path before handing the thread to the agent. Core
owns this policy for every provider. Attaching a project checkout or personal
workspace (`ownsPath: false`) does not run either hook. Provider-specific
preparation, including `.worktreeinclude` copying, finishes before setup starts.

Use it for anything the agent will need in a fresh checkout — install
dependencies, sync local state, generate tokens, etc. To bring local files in
from your main checkout, prefer `.worktreeinclude` above.

```bash
#!/usr/bin/env bash
set -euo pipefail

pnpm install
```

Contract:

- The script runs with `env bash`, working directory set to the new worktree.
- stdin is closed. stdout and stderr stream into the thread's provisioning
  transcript in the app.
- A non-zero exit, a signal, or a timeout (15 minutes) fails provisioning and
  the thread doesn't start.
- POSIX only — supported on macOS, Linux, and WSL2. Native Windows isn't
  supported; cc reports that POSIX shell scripts are unsupported on Windows.

## Cleanup

You don't need to clean up worktrees by hand. The Worktree plugin watches every
worktree it made and removes the ones nothing is using:

- Deleting the last thread on a worktree removes it right away.
- Archiving the last thread starts a five-minute grace period. Unarchive a
  thread within it and the worktree is kept; let it elapse and the worktree
  goes.
- Archiving is not an instant stop. For 30 seconds an archived thread keeps its
  terminals, and one that is mid-turn keeps running, so Undo on the archive
  toast — or an unarchive within those 30 seconds — picks up exactly where it
  was. After that cc stops the thread and closes its terminals.

Removal runs `.cc-env-teardown.sh` inside the worktree first, then stops
every process whose working directory is inside the worktree — the agent's
provider process, its background jobs (dev servers, MCP servers, `nohup`
jobs), and any process you started there yourself, such as a shell you `cd`'d
into the worktree or an editor terminal. Each process gets `SIGTERM`, then
`SIGKILL` after a short grace period. Then `git worktree remove --force` runs
and the directory is deleted. The branch is left behind, so work you committed
to it survives the worktree. If you want to keep uncommitted work, commit and
push (or open a PR) from inside the worktree before letting the thread go, and
move your own shells out of the worktree first if you want to keep them.

## Run teardown with `.cc-env-teardown.sh`

Commit a file named `.cc-env-teardown.sh` at the project root when setup
creates resources outside the worktree. For example, the script can remove a
database, a proxy registration, a container, or a port reservation.

```bash
#!/usr/bin/env bash
set -euo pipefail

docker rm -f "my-project-${USER}"
```

Contract:

- cc runs the script before calling a provider to remove a path it owns,
  including cleanup after failed setup. Attached paths do not run it.
- cc runs `env bash .cc-env-teardown.sh` from the worktree before it removes
  the worktree, so the script can read tracked and generated files.
- stdin is closed. cc records stdout and stderr in the server lifecycle logs.
- The script gets a separate 15-minute timeout.
- A non-zero exit, a signal, or a timeout reports a failure. It never stops cc
  from removing the worktree.
- The script receives the same sanitized environment as the setup script.
- POSIX only — supported on macOS, Linux, and WSL2. Native Windows isn't
  supported; cc reports that POSIX shell scripts are unsupported on Windows.

Hook operation IDs and their started/finished state are saved per launch attempt.
After a server restart, cc reconciles the original daemon operation instead of
starting setup again. If an RPC disconnects, cleanup cancels the operation and
waits for its process group to terminate before releasing the path. An
unreachable daemon leaves cleanup pending for retry. Durable daemon cancellation
records resolve never-started operations and prevent delayed execution.

## If something isn't working

A few quick checks:

1. If worktree creation fails, look at the thread's provisioning transcript
   in the app. Failures from `git worktree add` (dirty source checkout,
   invalid base branch, conflicting branch name) show up there with the exact
   git error.
2. If `.cc-env-setup.sh` doesn't seem to run, make sure it's committed to
   the branch you're working from. A file that exists only in the working
   copy of your main checkout won't appear in the new worktree.
3. If your setup script hangs, remember stdin is closed. Anything that
   prompts for input will time out at 15 minutes.
4. Run `bash .cc-env-setup.sh` manually in a clean clone to verify it works
   outside cc before debugging through the provisioning transcript.
5. Run `bash .cc-env-teardown.sh` manually before you delete a test worktree.
   Confirm that repeated runs do not fail or remove shared resources.

## Fresh project clones on machines

Core applies the same setup and teardown policy when a project checkout is freshly
cloned onto a new machine and the environment provider reports that it owns the
checkout. `.cc-env-setup.sh` must succeed before the environment is ready.
`.cc-env-teardown.sh` runs before removal with its own 15-minute timeout; a failure
is reported but does not prevent removal. A user-maintained checkout attached to
CC remains unowned and runs neither hook.

Fresh machine clones do not apply `.worktreeinclude`: no local source checkout
exists on the new host. Supply local files and secrets through core Machine
environment settings. Keep the repo hook's cache/no-op logic in the repository;
Modal's stored Dockerfile recipe contains image-build instructions only.

Restoring a machine filesystem does not rerun `.cc-env-setup.sh`. Setup runs when core first creates an owned environment. Fresh machine clones do not apply `.worktreeinclude`; supply local files and secrets through Machine environment settings.

Thread startup does not validate workspace fingerprints, probe agent authentication, or automatically install agent CLIs.
