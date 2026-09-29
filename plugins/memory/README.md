# cc-plugin-memory

CC's official plugin for durable, progressively disclosed agent memory. It
provides:

Because this memory store works across providers, we recommend turning off
provider-native memory under Settings → Providers while using it. That avoids
duplicated or conflicting memories split between Codex, Claude Code, and cc.

- plugin-private SQLite storage with append-only migrations;
- global and current-project memory scopes;
- an automatically injected, 3,900-character summary catalog through
  `cc.agents.contributeInstructions`;
- CLI-only agent access through `cc memory` (no native agent tools);
- FTS5 search followed by full-record reads;
- explicit provenance, tags, kinds, importance, pinning, and version history;
- optimistic update/forget operations and soft deletion;
- basic prompt-injection and secret-pattern rejection;
- a bundled `memory` skill that teaches agents retrieval and write policy.
- a Settings → Memory table for reviewing, editing, and deleting every stored
  global or project memory.

## Install

Install Memory from the CC Official catalog:

```bash
cc plugin install memory
cc plugin list
```

## Try it

```bash
cc memory add \
  --scope project \
  --name turbo-validation \
  --summary "Use Turbo for builds and typechecks" \
  --details "Run pnpm exec turbo run typecheck --filter=@cc/<pkg>." \
  --kind procedure \
  --tag build \
  --tag testing \
  --importance 80 \
  --reason "Durable repository validation convention" \
  --json

cc memory search "Turbo typecheck" --scope all --json
cc memory get <id> --scope all --json
```

Project writes take the invoking CLI's CC project context. Global writes must
explicitly pass `--scope global`. The injected catalog refreshes at every
thread start / turn submission, so a successful CLI write is visible on the
next turn.

## Limitations

- CLI calls require loopback access to the local server. Claude's macOS
  workspace sandbox permits this; Linux and other provider sandboxes may
  still block it.
- Retrieval is FTS5 keyword search in this first version; embeddings and
  background reflection are deliberately deferred.
- The safety scanner is a guardrail, not a substitute for avoiding sensitive
  memory content.

## Develop

```bash
pnpm exec turbo run test typecheck --filter=cc-plugin-memory
cc plugin dev ./plugins/memory
```
