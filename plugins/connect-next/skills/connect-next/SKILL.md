---
name: connect-next
description: "Check or switch the beta next address (https://<label>.next.cc.example.invalid, cc connect next) for this cc."
---

# cc connect next (beta)

The connect-next plugin makes this cc reachable at
`https://<label>.next.cc.example.invalid` through cc's Fly gate, in addition to its
cc connect address `https://<label>.cc.example.invalid`. The domain follows the cc
account it is signed in to (`next.<account domain>`); `status` prints the
exact address. It is on as soon as the
plugin is enabled and needs this cc signed in to its cc account
(`cc account status`).

- `cc connect-next status [--json]` prints the label, the address, and the
  state: `off`, `signed-out`, `connecting`, `connected`, `refused` (the gate
  refused the server credential), `offline` (the gate can't be reached), or
  `error` (the plugin couldn't start the tunnel; `lastError` says why).
- `cc connect-next on [--json]` turns it on; `cc connect-next off [--json]`
  turns it off. Neither touches cc connect or the account sign-in.
- The switch is the plugin setting `enabled`, so
  `cc plugin config cc--connect-next set enabled true` works too.

Only turn it on or off when the user asks.

Port shares: every port shared from the cc server's machine with
`cc connect expose <port>` also answers at
`https://<label>--<port>.next.<account domain>` while connect next is on
(owner session only, like the cc connect share). `cc connect expose` prints
that URL on a second line, and `cc connect-next status` lists each share as
`share <port>  <url>  <state>` (`--json`: `shares[]` with `port`, `url`,
`state` `pending` | `active` | `refused`, and `error`).

Shares from other enrolled machines (`cc connect expose <port> --host
<machine>`) answer at `https://<machine-label>--<port>.next.<account domain>`
while connect next is on; the machine's own daemon runs the tunnel while the
machine shares a port. `cc connect-next status` prints a
`machine <name> (<host id>)  <label>  <state>` line per machine with its
`share` lines (`--json`: `machines[]` with `hostId`, `hostName`, `label`,
`state` `idle` | `connecting` | `connected` | `refused` | `offline` | `error`,
`lastError`, and `shares[]`). A machine missing from the list shares nothing
or runs a cc too old for connect next machine tunnels.

The plugin itself is disabled by default: `cc plugin enable cc--connect-next`
first if `cc connect-next` is not found.
