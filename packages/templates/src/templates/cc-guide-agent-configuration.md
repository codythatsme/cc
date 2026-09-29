---
kind: instruction
title: cc Guide — Agent Configuration
summary: User and workspace files that customize agent instructions and skills.
intent: Document the user and workspace files that shape agent behavior for threads.
editingNotes: Keep accurate against the server's agent-instructions reader and skill loader.
---
Agent configuration

cc reads agent configuration from the app data dir and from a project's .cc/
directory. These files shape how agents behave in provider-backed threads.

User instructions (<dataDir>/AGENTS.md):

  Add an AGENTS.md file to the cc data dir (usually ~/.cc/AGENTS.md) to give
  every provider-backed thread across all projects default user-level
  instructions. cc reads <dataDir>/AGENTS.md and appends its contents to the
  thread system prompt for all providers when a provider session starts.

Workspace instructions (.cc/AGENTS.md):

  Add a .cc/AGENTS.md file to a workspace to give every thread that runs there
  repo-specific instructions. cc reads <workspace>/.cc/AGENTS.md and appends its
  contents to the thread system prompt for all providers, after any
  <dataDir>/AGENTS.md instructions, when a provider session starts. Track it with
  git so fresh managed worktrees include it.

  Only the plural AGENTS.md is read, only from the exact data-dir and
  workspace-root .cc/ locations above (cc does not walk parent directories), and
  an empty file is ignored. This is cc's own provider-agnostic instruction
  injection, separate from provider-native instruction files. Codex reads a
  repo-root AGENTS.md. Claude Code 2.1.277 and later also reads AGENTS.md when
  no project or ancestor CLAUDE.md or CLAUDE.local.md takes precedence. Older
  Claude Code versions and sessions without its built-in AGENTS.md support
  still require CLAUDE.md.

Skills (.cc/skills/):

  A skill is a reusable instruction file that cc injects into a thread and
  exposes to the agent as a slash command. Place project skills under
  .cc/skills/<name>/SKILL.md in a workspace. Each SKILL.md has YAML frontmatter
  with `name` (lowercase, hyphenated, matching the directory) and `description`,
  followed by the instruction body.

  cc resolves skills from three sources, in increasing precedence:

    plugin     Skills from enabled plugins, including the bundled CC guide.
    user       <dataDir>/skills (e.g. ~/.cc/skills).
    project    <workspace>/.cc/skills.

  A project skill overrides a user or plugin skill with the same name. Two
  skills with the same name within one source collide and are both dropped.

  Use `cc skill list` to inspect installed and discovered skills and copy the
  opaque skill ID. `cc skill show|files <skill-id>` reads that exact skill;
  `cc skill show <skill-id> --json` returns the revision required by `cc skill
  update <skill-id> --revision <sha256>`. `cc skill delete <skill-id>` and
  update are restricted to editable, user-owned skills. These workspace-scoped
  commands default to `CC_PROJECT_ID`, then the personal project; pass
  `--project` or `--environment` when a different workspace is required.

  Use `cc skill search` to browse skills.sh, `cc skill registry detail
  <registry-skill-id>` to inspect metadata and the bounded file preview, and
  `cc skill install <registry-skill-id>` to install that canonical registry
  identity into cc user skills. Registry commands are server-wide and do not
  accept workspace selectors.

  Use `cc skill install-cli-skills` to copy cc's built-in CLI skills into a
  machine's global agent skill roots (`~/.agents/skills` and
  `~/.claude/skills`) so agents running outside cc can drive it. It installs on
  every connected machine unless you pass `--machine <id-or-name>`, which is
  repeatable. Settings → Skills exposes the same action; it asks which machines
  only when more than one is enrolled. Machines install independently, so the
  command reports each machine's outcome and exits non-zero if any failed. The
  install replaces a previously installed copy of the same skill and leaves
  other skills alone. `cc skill cli-skills-status` reports whether each machine
  is installed, out of date, missing, or unknown (disconnected or unreachable);
  the settings row shows the same as a badge.

  Use the skill-creator skill to author and iterate on skills.

CC guide plugin:

  The enabled-by-default CC guide plugin owns the CC introduction and the
  cc-cli, cc-plugin-authoring, skill-creator, and submit-a-plugin skills. Settings → Installed
  plugins → CC guide exposes introduction, a master skills switch, and one
  switch per skill. All default to true. Use:

    cc plugin config cc-guide set introduction false
    cc plugin config cc-guide set skills false
    cc plugin config cc-guide set ccCli false
    cc plugin config cc-guide set pluginAuthoring false
    cc plugin config cc-guide set skillCreator false
    cc plugin config cc-guide set submitPlugin false

  Changes apply when agent configuration is next assembled. They do not erase
  existing conversation text or disable independently installed copies.

Connect agent instructions:

  Settings → Installed plugins → Connect → Tell agents about remote access
  controls the message telling remotely used agents to expose public server
  links. It defaults to true and still requires active/recent remote usage.
  Use `cc plugin config connect set sendRemoteInstructions false` to turn it
  off. Port sharing remains available.
