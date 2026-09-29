---
name: concurrency-limit
description: "Inspect or change global and per-host limits on concurrently running CC threads."
---

# Concurrency limits

Use `cc concurrency-limit status --json` to inspect current limits.

```sh
cc concurrency-limit global [unlimited|<limit>] [--json]
cc concurrency-limit host <host-id> [auto|<limit>] [--json]
```

Automatic host limits allow one thread per available processor. Resolve the host
with `cc machine list` before changing a host limit. Omit the value to inspect it;
change limits only for the requested scope and verify the resulting status.
