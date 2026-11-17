# cc account

cc account links this cc server to a cc.example.invalid account. It keeps the
long-lived `bbcred_` server credential in its plugin KV (`credential`, with the
cached profile under `profile` and the status revision under `revision`) and
never returns or logs it. Other plugins reach cc.example.invalid through its RPC
methods.

## RPC contract

Call these with `cc.sdk.plugins.callRpc({ pluginId: "cc-account", … })` and
keep your own copy of the Zod schemas (see `src/contract.ts`). cc account
loads before most plugins but can be disabled or held, so call it lazily and
treat an HTTP 503 as signed out.

| Method                              | Input                                      | Output                                                          |
| ----------------------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| `cc-account.v1.status`              | `{}`                                       | `{state, revision, account}`                                    |
| `cc-account.v1.waitForStatusChange` | `{afterRevision}`                          | the status once `revision > afterRevision`, or after 25 seconds |
| `cc-account.v1.fetch`               | `{target, method, path, body, timeoutMs?}` | `{status, body}`                                                |

`state` is `signed-in`, `signed-out`, or `profile-pending` (cc holds a server
credential but hasn't loaded its account yet and keeps retrying). Treat every
state other than `signed-in` as not signed in; more may be added. `account`
is non-null only while signed in. It carries `userId`, `githubLogin`, `name`,
`avatarUrl`, `handle`, `serverId`, `serverLabel`, `serverUrl` (the gate
origin) and `baseUrl` (the cc.example.invalid origin). The revision increases on
sign-in, sign-out, credential rejection, and every profile refresh, and it
survives restarts.

`fetch` sends JSON to a fixed origin: `"api"` is `baseUrl` and `"gate"` is
`serverUrl`. Any caller may use paths under `/api/ai/`; paths under
`/api/connect/` are only for the connect plugin (the handler checks the rpc
caller), and every other path is refused. A path may not contain `..`, `//`,
a query, a fragment, or characters other than letters, digits, and `-._~/`;
anything else throws. `timeoutMs` is an integer from 1000 to 65000 and
defaults to 15000. Request bodies are capped at 16 MB (room for a base64
voice recording) and response bodies at 1 MB, redirects
are returned rather than followed, and a non-JSON body comes back as `null`.
The credential goes in both `authorization: Bearer` and
`x-cc-connect-machine`. Without a stored credential, `fetch` answers
`{status: 401, body: {error: "signed-out"}}` without a request. After an
upstream 401, cc account checks the credential with `GET /api/account/me` and
signs out only if cc.example.invalid rejects it there too.

The unlisted methods serve the plugin's own UI and CLI and connect:
`cc-account.v1.adoptConnectCredential`, `cc-account.v1.connectCredential`,
`cc-account.v1.confirmRefusedCredential`, `login.start`, `login.poll`,
`login.cancel`, `redeemCode`, and `signOut`. Only the connect plugin may call
the three `cc-account.v1.*` methods, except that the `cc--connect-next` plugin may
also read `connectCredential`.

- `adoptConnectCredential` (`{credential, baseUrl, replaces}`) stores the
  pairing connect holds for older builds. It answers `changed` unless cc
  account's current credential is still `replaces` (`null` for signed out),
  `rejected` when `GET /api/account/me` refuses the credential, and
  `adopted` once it is stored. It never revokes anything.
- `connectCredential` returns `{credential: {baseUrl, serverUrl, serverId,
credential} | null}`. Connect dials the tunnel with it and keeps its copy
  for older builds current; connect-next sends it to the Fly gate as frp's
  `metas.credential`.
- `confirmRefusedCredential` (`{credential}`) is how connect reports that the
  gate refused the credential. If it is still the current one, cc account
  checks it with `GET /api/account/me` and signs out when cc.example.invalid answers 401. It returns the account status.

`signOut` returns `{revocation, status}`, where
`revocation` is `revoked`, `not-signed-in`, or `failed` with a `message` and
the `dashboardUrl` to remove the server from.

## Sign-in

`login.start` calls `POST /api/account/link/start` with the machine hostname
and keeps the secret device code on the server. A background poll calls
`POST /api/account/link/poll` every `intervalMs`, adds five seconds after each
`slow-down`, and stops on approval, denial, expiry, or cancellation. Codes
from the dashboard go through `POST /api/connect/redeem`. Both paths then load
the profile from `GET /api/account/me`, which is refreshed at start and every
six hours. Sign-out posts `/api/connect/disconnect` to the gate before
clearing the credential.

Only one sign-in can finish. Starts are serialized and a new browser sign-in
cancels the pending one; cancelling, signing out, or a newer sign-in finishing
first stops an older one from saving its credential, and cc account revokes
the credential that older sign-in was issued. Signing in to a different
server revokes the previous one.

The base URL is `https://cc.example.invalid`. In development, `CC_DEV_CONNECT_BASE_URL`
may name an `http://cc.localhost:<port>` origin or `https://cc-staging.example.invalid`.
`--base-url` and the rpc `baseUrl` override it per command but accept only
`https://cc.example.invalid` and `https://cc-staging.example.invalid`, plus
`http://cc.localhost:<port>` in a development build.
