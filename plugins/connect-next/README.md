# connect-next (`cc--connect-next`)

Opt-in second way in to a cc server: `https://<label>.next.cc.example.invalid`, served by
the Fly gate (`apps/connect-next`) through frp. The domain follows the cc
account: `next.<host of the account's base URL>`, so a staging account
(`https://cc-staging.example.invalid`) gets `https://<label>.next.cc-staging.example.invalid` and
local Cloud (`http://cc.localhost:<port>`) `http://<label>.next.cc.localhost:<port>`. The design is in
[`docs/connect-next.md`](../../docs/connect-next.md).

## Pieces

- `src/account.ts` follows cc account (`cc-account.v1.status`,
  `cc-account.v1.waitForStatusChange`) for the server id, label and base URL, and reads
  the server credential with `cc-account.v1.connectCredential` before each
  `frpc` start. cc account serves that method to `connect` and `cc--connect-next`
  only.
- [`@cc/frp-client`](../../packages/frp-client/README.md) downloads, verifies
  and supervises `frpc`. The plugin installs it in
  `<dataDir>/plugins/cc--connect-next/frp/<version>/` and keeps `frp/frpc.json`
  (mode 0600, it holds the credential) and, for `wss`, `frp/roots.pem` there.
  `CC_CONNECT_FRPC` names a binary to use instead.
- `src/next-site.ts` derives the next domain, the address and the default
  tunnel server (`wss://tunnel.<next domain>:443`) from the account's base URL.
- `src/tunnel.ts` opens the tunnel ingress with `gateAudienceForServer(serverId)`
  and runs an `FrpcSupervisor` with the main proxy (`cc`, `subdomain = <label>`)
  pointing at it. The supervisor restarts `frpc` with backoff, parses its log
  into `connecting`, `connected`, `refused`, or `offline`, waits five minutes
  after a refusal before trying again, and the tunnel closes `frpc` and the
  ingress on off, sign-out, and stop. Log lines are redacted of the credential.
- `src/ingress.ts` is the only place that touches the server's ingress API,
  `cc.server.internal_DO_NOT_USE_openTunnelIngress({ audience })`. It is looked up at
  run time; a server without it reports the `error` state with a message
  saying so.

## Environment

| Variable                 | Effect                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `CC_CONNECT_FRPC`        | Path of an `frpc` binary to run instead of the downloaded one.                                           |
| `CC_CONNECT_NEXT_SERVER` | `ws://host:port` or `wss://host:port` of the frp server instead of `wss://tunnel.<next domain>` (tests). |

## Tests

`pnpm exec turbo run test --filter=cc-plugin-cc--connect-next` runs real `frpc`
and `frps` 0.71.0 (fixtures from `@cc/frp-client/testing`). The release archives are cached in
`~/.cache/cc-frp/0.71.0` (`CC_FRP_CACHE_DIR` overrides it) and verified
against the pinned checksums; a missing archive is downloaded once. The wss
test needs `openssl` and is skipped without it.

## Shares

`src/shares.ts` long-polls the connect plugin for the ports shared from the
server's machine: `connect.internal_DO_NOT_USE.serverShares` and
`connect.internal_DO_NOT_USE.waitForServerSharesChange({ afterRevision })` (25 s), both
`{ revision, ports }` and answered to `cc--connect-next` only. A stopped
connect plugin (HTTP 404/503) counts as no shares. Each port becomes an frpc
proxy `share-<port>`: `type = http`, `subdomain = <label>--<port>`,
`localIP = 127.0.0.1`, `localPort = <port>`, `hostHeaderRewrite =
127.0.0.1:<port>` (dev servers such as Vite refuse other hosts). It goes
straight to the port, not through the ingress, as on the Cloudflare tunnel:
the gate's assertion reaches the dev server and is ignored. Changes are
applied by hot reload, so the main proxy and its connections stay up. The
status lists each share with its URL and proxy state (`pending`, `active`,
`refused` with the gate's reason); a refused share does not stop the tunnel.

## Machines

While the plugin's tunnel is wanted (on, signed in, service running),
`src/tunnel.ts` calls `cc.hosts.internal_DO_NOT_USE_setNextTunnels({ domain, server })`
with the same next domain and tunnel server it dials itself
(`CC_CONNECT_NEXT_SERVER` included), and `null` otherwise. The server sends it
to every enrolled machine's daemon; each runs its own `frpc` for the ports
shared from it (see Machine tunnels in
[`docs/connect-next.md`](../../docs/connect-next.md)). The plugin reads the
daemons' reports with `cc.hosts.internal_DO_NOT_USE_nextTunnelStatuses()`, republishes
its status on `cc.hosts.internal_DO_NOT_USE_onNextTunnelStatusChange`, and lists every
machine that is not idle, shares a port or reports an error under `machines`
in `status`, the CLI and the settings section.
