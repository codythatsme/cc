Beta. Reach this cc at `https://<label>.next.cc.example.invalid` through cc's new Fly gate, as well as at its usual `https://<label>.cc.example.invalid` address. The domain follows the cc account this cc is signed in to (`next.<account domain>`). Both answer at once; cc connect keeps working as before.

## What you get

- A second address for this cc, served from the region nearest you.
- On as soon as you enable this plugin and this cc is signed in to your cc account. A switch in Settings, "Reach this cc at its next address (beta)", turns the address off and on again, with the connection state and the address.
- `cc connect-next status`, `cc connect-next on`, and `cc connect-next off`. Add `--json` for machine-readable output.
- Port shares from this cc's machine (`cc connect expose <port>`) at `https://<label>--<port>.next.cc.example.invalid` too, listed in Settings and in `cc connect-next status`.
- Port shares from your other enrolled machines (`cc connect expose <port> --host <machine>`) at `https://<machine-label>--<port>.next.cc.example.invalid`, with each machine's tunnel state in Settings and in `cc connect-next status`.

## How it works

The plugin downloads frp's client, `frpc` 0.71.0, from its GitHub release, checks it against a pinned SHA-256, and runs it. `frpc` makes an outbound WebSocket connection to `tunnel.next.cc.example.invalid` (`tunnel.next.<account domain>`), signs in with this cc's label and the server credential cc account holds, and forwards visitors' requests to a separate tunnel listener on this cc. That listener only accepts requests the gate has signed for this server, so local access stays as it is. The plugin restarts `frpc` if it stops and closes it when you turn the switch off or sign out. Each shared port is one more `frpc` proxy that goes straight to `127.0.0.1:<port>`; sharing or unsharing a port changes the list without restarting `frpc`. On other machines the host daemon does the same with the machine's label and machine credential, and only for the domain the machine enrolled with.

## Requirements

The cc account plugin, signed in to your cc.example.invalid account, and the connect plugin for port shares. Each enrolled machine runs its own `frpc` from its host daemon while it shares a port; a machine whose cc predates this release keeps only its cc connect share until it updates.
