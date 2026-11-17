Sign this cc in to your cc.example.invalid account once. Remote access and hosted services, such as generated thread titles and commit messages, then use that account.

## What you get

- A Settings section with your avatar, GitHub login, handle, this server's label, and a Sign out button.
- Sign-in from any device. cc shows a code and a cc.example.invalid link; you approve it in a browser, even when cc runs on a headless or remote machine.
- One place that holds this server's cc.example.invalid credential. Other plugins make requests through it and never see the credential.

## How it works

Click Sign in, or run `cc account login`. Open the cc.example.invalid link, sign in with GitHub, claim a handle if you have none, and approve this cc as a new server or as a replacement for one you already have. cc picks up the approval on its own. If you have a pairing code from the cc.example.invalid dashboard, paste it in Settings or run `cc account login --code <code>`.

`cc account status` shows the account and `cc account logout` signs out. Signing out revokes the server credential on cc.example.invalid, so remote access and hosted services stop until you sign in again. Add `--json` to any command for machine-readable output.

## Requirements

A GitHub account to sign in to cc.example.invalid. An imported server keeps cc account off until you run `cc server allow-connect`.
