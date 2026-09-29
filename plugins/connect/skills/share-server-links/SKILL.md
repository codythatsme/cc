---
name: share-server-links
description: "Expose a local HTTP server through CC Connect and give the user its remotely accessible URL."
---

cc has no hosted connect default. Configure your own service with CC_CONNECT_BASE_URL or pair with an explicit server URL before sharing links.

# Share local server links via cc connect

When you start an HTTP server the user should open, give them a connect share
URL — not a localhost URL. Shares work from threads running on any enrolled
host, and the command resolves the thread's host automatically.

1. Check pairing: run `cc connect status --json`. If not paired / not
   connected, give the localhost URL and mention that `cc connect` enables
   remote URLs once paired from the cc.example.invalid dashboard.
2. From the thread that started the HTTP server, run `cc connect expose
<port>`. It prints that host's share URL. Use `--host <name-or-id>` only
   when you intentionally need another enrolled host; outside a thread,
   sharing defaults to the machine running the cc server.
3. Give the returned URL to the user as a markdown link. It works for viewers
   who have the owner's cc.example.invalid session; it is not a public internet link.
4. When the server stops, run `cc connect unexpose <port>` from the same
   thread (or with the same `--host`) so the share is cleaned up. Use
   `cc connect shares [--host <name-or-id>]` to inspect that host's shares.

`cc connect --help` and `cc connect <command> --help` print the commands and
their flags and exit 0. Unknown commands and flags fail with a suggestion —
`cc connect list` points at `cc connect shares` — and with `--json` a failure
prints `{"ok":false,"error":{"code":…,"message":…}}` on stdout while the same
message stays on stderr.

Server-host shares use `https://<server-label>--<port>.<base-domain>` through
the server tunnel. Other enrolled hosts use
`https://<machine-label>--<port>.<base-domain>` through their daemon. If a
machine was not enrolled through Connect, expose fails with instructions to
remove and re-add it under Settings > Machines.

## Agent instructions setting

Settings → Installed plugins → Connect has a "Tell agents about remote access"
toggle, enabled by default. Use
`cc plugin config connect set sendRemoteInstructions false` to suppress the
remote-access message, or `true` to restore it. This controls only the message;
sharing still works. The message otherwise requires active or recent remote
usage. Changes apply when session instructions are next assembled.
