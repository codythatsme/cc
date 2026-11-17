---
name: account-pool
description: "Configure or diagnose Account Pooler accounts, authentication, quota routing, and failover through cc pool."
---

# Account Pooler

Use `cc pool` for this plugin's accounts and routes. Inspect current state with
`cc pool status --json` and `cc pool account list --json` before changing routing.
Use `cc pool --help` for available commands.

For account sign-in and re-login, secret handling, quota refresh, routing settings,
ordering, or failover, read
[references/accounts-and-routing.md](references/accounts-and-routing.md).

Use stdin or the supported sign-in flows for credentials; never put secret values
in command arguments or chat. Confirm the resulting account and routing state.
Do not enable the plugin or change accounts unless the requested task calls for it.

Pooled rate-limit failures can be retried by Provider Retry using the pool’s
earliest usable account, even if the provider omits structured quota events.
Inspect `cc provider-retry explain <thread-id> --json` for the last decision
and `cc provider-retry status <thread-id> --json` for pending retries.
