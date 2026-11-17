# cc cloud AI

Status: **2026-09-30: 0 passed, 5 not run** (on by default; settings page removed; voice input added). Run against the local cloud from hosted-web.md.

## Setup and entry points

Settings → AI services; Settings → Plugins → cc cloud AI (enable/disable only;
there is no settings page); cc ai --help. Needs a signed-in cc account
(cc-account plugin) against `pnpm cloud:dev`; real replies need
`OPENROUTER_API_KEY` in the cloud-dev environment. cc cloud is on in a fresh
store.

Use the main skill’s isolated targets and evidence rules. A plugin can be present
in this checkout but disabled in an installation. Enable it only in the test
store before checking its surfaces. Read its current command/schema definitions
from the source below; CLI references use the matching source CLI described in
SKILL.md. Inspect nested `--help` before selecting flags and IDs.

## Source

- `plugins/cc-ai/package.json`
- `plugins/cc-ai/src/server.ts`
- `apps/ai-gateway/src/gateway.ts`

## Feature recipes

| Feature                   | Drive                                                                                                                                                                                                                            | Observable success                                                                                                                                                                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| On by default and opt-out | In a fresh store, sign in and read `ai status` and the AI services picker; run `ai off --json`, reload the plugin, read status, create a thread with Thread titles pinned to cc cloud; then run `ai on`.                         | On by default: status is ready and Automatic lists cc cloud after Codex. After `ai off` status says "cc cloud is off" and names `cc ai on`, the choice survives the reload, the pinned title falls back to prompt text, and the gateway logs no request. `ai on` reports enabled and ready. |
| Readiness                 | Read `ai status` and the AI services picker signed out, signed in, and with cc-account disabled.                                                                                                                                 | Status says how to become ready in each case; signed in it reports ready and Automatic lists cc cloud after Codex.                                                                                                                                                                          |
| Titles and commits        | Pick cc cloud for Thread titles and Commit messages, create a thread in a disposable project, and use the Commit action.                                                                                                         | The title and commit subject come from cc cloud; `ai usage` grows by the gateway's reported cost.                                                                                                                                                                                           |
| Voice input               | With cc cloud on and no Codex login, open a thread and check the microphone; pick cc cloud for Voice input, record a short dictation, and run `voice transcribe <file>` with a WebM and an MP4 recording; try a file over 10 MB. | The mic shows once cc cloud is ready and hides when it is off or signed out; the transcript comes from cc cloud and `ai usage` grows; the oversized file is refused before any gateway request.                                                                                             |
| Budget exhaustion         | Lower the local `AI_DAILY_BUDGET_MICROS`, generate until the gateway answers 402, then read status and generate again; sign in to a second local cloud account and read status.                                                  | cc cloud reports "Daily limit reached" until the reset time for the exhausted account only; Automatic skips it; a task pinned to cc cloud falls back to prompt text or `cc: automated commit`; the second account reports ready.                                                            |

## Evidence and cleanup

Record each row’s UI/tool/CLI action and observed result separately. Never
record prompts sent to the gateway beyond fixture text. Restore AI service
selections and cc cloud's on/off state, and remove only this run’s fixtures and
local cloud accounts.
