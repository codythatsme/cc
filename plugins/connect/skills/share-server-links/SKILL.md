---
name: share-server-links
description: "Expose a local HTTP server through CC Connect and give the user its remotely accessible URL."
---

cc has no hosted connect default. Configure your own service with CC_CONNECT_BASE_URL or pair with an explicit server URL before sharing links.

# Share local server links via cc connect

When you start an HTTP server the user should open, give them a connect share
URL — not a localhost URL. Shares work from threads running on any enrolled
host, and the command resolves the thread's host automatically.

1. Check remote access: run `cc connect status --json`. If `paired` is
   false, give the localhost URL and mention that remote URLs work once this
   cc is signed in to its cc account (`cc account login`). If `enabled` is
   false, the user turned remote access off with `cc connect off`; give the
   localhost URL and mention `cc connect on`. Don't turn it on or sign in
   yourself unless the user asks.
2. From the thread that started the HTTP server, run `cc connect expose
<port>`. It prints that host's share URL. Use `--host <name-or-id>` only
   when you intentionally need another enrolled host; outside a thread,
   sharing defaults to the machine running the cc server.
3. Give the returned URL to the user as a markdown link. It works for viewers
   who have the owner's cc.example.invalid session; it is not a public internet link.
4. When the server stops, run `cc connect unexpose <port>` from the same
   thread (or with the same `--host`) so the share is cleaned up. Use
   `cc connect shares [--host <name-or-id>]` to inspect that host's shares.

Use `cc connect unexpose-all [--host <id>] [--json]` to revoke all shared ports
on one machine, including an unavailable machine. It defaults to the thread's
machine, or the server machine outside a thread, and keeps machine pairing intact.
Each collapsible machine group in settings offers **Revoke all** for that machine.
The typed plugin RPC is `unexposeAll` with `{ hostId: string }` input and a
`{ removed: number }` result. Bulk revocation attempts every share on that
machine; any failures report partial progress and can be retried.

`cc connect --help` and `cc connect <command> --help` print the commands and
their flags and exit 0. Unknown commands and flags fail with a suggestion —
`cc connect list` points at `cc connect shares` — and with `--json` a failure
prints `{"ok":false,"error":{"code":…,"message":…}}` on stdout while the same
message stays on stderr.

Server-host shares use `https://<server-label>--<port>.<base-domain>` through
the server tunnel. While cc connect next is on (`cc connect-next status`),
server-host shares also answer at
`https://<server-label>--<port>.next.<base-domain>`: `cc connect expose` prints
that URL on a second line, `cc connect shares` after the first URL, and
`--json` listings carry it as `nextUrl`. Give the user both, or the one on the
address they are using. Other enrolled hosts use
`https://<machine-label>--<port>.<base-domain>` through their daemon, and
while cc connect next is on also
`https://<machine-label>--<port>.next.<base-domain>` (the same second line and
`nextUrl`; a machine whose daemon predates protocol 247 serves it once it
updates). A machine enrolled through the next address has only the next URL:
it is the listing's `url`, with no `nextUrl`. If a
machine was not enrolled through Connect, expose fails with instructions to
remove and re-add it under Settings > Machines.

## Remote access and the cc account

Remote access runs through the cc account plugin, which holds the cc.example.invalid
pairing. `cc connect off` turns remote access off and keeps the account
signed in; `cc connect on` turns it back on. Both set the connect
`remoteAccess` setting (`cc plugin config connect set remoteAccess false`).
`cc account logout` forgets the
pairing, and `cc account status` shows which account is signed in.
`cc connect --code <code>` still pairs with a dashboard code like
`cc account login --code <code>`, and also turns remote access back on if it
was off. `--server` takes the dashboard's `https://<handle>.cc.example.invalid` (or
`https://<handle>.cc-staging.example.invalid`) URL; other origins are refused.

## Agent instructions setting

Settings → Installed plugins → Connect has a "Tell agents about remote access"
toggle, enabled by default. Use
`cc plugin config connect set sendRemoteInstructions false` to suppress the
remote-access message, or `true` to restore it. This controls only the message;
sharing still works. The message otherwise requires active or recent remote
usage. Changes apply when session instructions are next assembled.
