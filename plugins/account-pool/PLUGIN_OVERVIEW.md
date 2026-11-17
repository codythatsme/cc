Keep a Claude Code or Codex thread running when one account hits its limit. The Account Pooler puts every account you own behind a local hub and picks the account for each request.

## What you get

- Claude and Codex accounts added by signing in (browser or device code) or with an Anthropic API key. Each holds its own login, so the pool never signs this machine's Claude Code or Codex out; **Sign in again** renews one in place.
- Accounts run one after another in priority order, with ties following the order added. New conversations stay on the current fallback even when an earlier account recovers. Existing conversations keep their account until the provider refuses it.
- Drag handles (or Space and arrow keys) set the account order within each provider in settings, as does `cc pool account reorder <claude|codex> <id>...`.
- Live limit windows per account and model family in settings, and the same numbers from `cc pool status`.
- A routing switch per provider and a bypass per thread, so one thread can go straight to its own credentials.

## How it works

The hub serves Anthropic Messages and OpenAI Responses endpoints. Routed providers report **Proxied** and receive a machine-scoped hub token. Accounts in error are skipped. Accounts below the switch threshold (default 98 percent) go first; accounts above it still serve until the provider refuses them. Claude extra usage and Codex credits come last, and conversations return when quota recovers. Accounts past the threshold are rechecked before fallback. Codex spending-control and explicit credit-depletion restrictions block routing even below the threshold. The pool does not enable extra usage, purchase credits, or change spending limits. Settings shows “Extra usage available” only for reported allowance, never current billing activity. Secrets stay on the server and tokens refresh in the background.

The pool waits once on the same account for short temporary rate limits. Longer holds return Retry-After for pinned conversations while new conversations can advance. A model-family limit detours requests for that family without moving the session’s main pin or the provider cursor. Server, overload and connection errors retry a pinned account twice with backoff before failing over. The pool commits a new account after a successful response; failing everywhere keeps the old binding. The current account and pins survive hub restarts; pins expire after 30 idle minutes, and the 4,096 most recent are kept.

The pool uses HTTP/1.1 and honors standard proxy environment variables. Connection failures log error codes without credentials or request contents.

## Nested cc servers

A cc server started inside another cc server's thread detects the parent's pooler and enables this plugin. Choose in settings or with `cc pool parent`:

- **proxy** (default): keep a local hub with its own machine tokens and forward pooled traffic to the parent, so the parent's token never reaches this server's agents. Routing is contributed only for providers the parent can serve.
- **isolate**: neutralise the inherited routing and use this instance's own accounts, or each provider's own credentials.

Proxied traffic authenticates as the parent machine's token, so the parent attributes it to itself.

## Requirements

Accounts you own and are permitted to use this way.

Experimental: routing, storage, and CLI may change.

## For agents

`cc pool account add|login|list|remove|enable|disable|priority|reorder`, `cc pool status`, `cc pool routing <claude|codex> [--off]`, `cc pool config`, `cc pool config set`, `cc pool parent [proxy|isolate]`, `cc pool token rotate`, and `cc pool bypass <thread-id>`. Every command takes `--json` and `--help`; `cc pool --help` lists the commands and `cc pool <command> --help` prints its arguments, options, and rules.

## Automatic retries

Provider Retry uses pool recovery times. Inspect `cc provider-retry status` or `cc provider-retry explain <thread-id>`.
