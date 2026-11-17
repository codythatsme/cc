---
name: cc-account
description: "Sign this cc in to or out of its cc.example.invalid account with cc account, and check which account remote access and hosted services use."
---

# cc account

The builtin cc account plugin links this cc server to a cc.example.invalid account and
holds the server credential. Remote access (`cc connect`) and hosted services
reach cc.example.invalid through it; they never see the credential.

## Check the account

`cc account status [--json]` prints the signed-in name, GitHub login, handle,
and this server's label and URL, or `Not signed in`. A cc that holds a
pairing but couldn't load its account yet says so; it keeps retrying, and
remote access and hosted services start once it succeeds. With `--json` it
prints `{state, revision, account, login}`: `state` is `signed-in`,
`signed-out`, or `profile-pending`, and `login` is the pending browser
sign-in, if any.

## Sign in

- `cc account login [--json]` starts a browser sign-in. It prints a
  `https://cc.example.invalid/link?code=XXXX-XXXX` link and the code, then returns.
  Open the link on any device, sign in with GitHub, claim a handle if asked,
  and approve. cc finishes signing in on its own; the code expires after 10
  minutes.
- `cc account login --wait [--json]` waits for that sign-in to be approved,
  denied, or expire, and exits non-zero unless it signed in.
- `cc account login --code XXXX-XXXX [--json]` pairs with a one-time code from
  the cc.example.invalid dashboard. `cc connect --code <code>` is an alias.
- `--base-url <url>` points sign-in at `https://cc.example.invalid` or
  `https://cc-staging.example.invalid` (staging); a development build also accepts
  `http://cc.localhost:<port>`. Any other origin is refused. In a source
  checkout, `pnpm dev` sets `CC_DEV_CONNECT_BASE_URL` so sign-in uses that
  worktree's local Cloud.

Signing in again replaces the account this cc is signed in to, and revokes the
previous server on cc.example.invalid when the new sign-in is for a different one.
Starting a new sign-in cancels one that is still waiting for approval.

## Sign out

`cc account logout [--json]` revokes this server's credential on cc.example.invalid,
forgets it locally, and cancels a sign-in still waiting for approval. Remote
access and hosted services stop until you sign in again. If cc.example.invalid can't be
reached, cc still signs out locally and says the server wasn't revoked; remove
it from the cc.example.invalid dashboard. `--json` prints `{revocation, status}`. To
stop remote access but stay signed in, use `cc connect off`.

Settings → Plugins → cc account shows the same account, a Sign in button that
opens cc.example.invalid, a pairing-code field, and Sign out.

## Delete the account

Deleting the cc account is only possible on the cc.example.invalid dashboard
(Delete account, then type the handle to confirm); there is no CLI command.
It disconnects every cc on the account, removes all paired devices and
connected apps, and releases the handle and addresses. Each cc keeps running
locally, but its remote access and hosted services stop.

## Imported servers

A server imported with `cc server import` starts with cc account and cc
connect held off, so a copy can't use the original server's account. Stop
the original server, run `cc server allow-connect`, then restart cc.
