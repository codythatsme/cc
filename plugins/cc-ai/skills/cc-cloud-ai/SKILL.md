---
name: cc-cloud-ai
description: "Check, turn off, or troubleshoot cc cloud, the hosted service that writes thread titles and commit messages and transcribes voice input for signed-in cc accounts."
---

# cc cloud AI

cc cloud is the `cc` AI service from the `cc-ai` plugin. It writes thread
titles (branch names follow the title) and commit messages and transcribes
voice input for a signed-in cc account, within a daily spend limit per account.

cc cloud is on by default for a signed-in account. A user who turned it off
stays off across restarts and upgrades. While off, it reports not ready,
Automatic skips it, and nothing is sent to cc.example.invalid. It has no settings page.

- `cc ai off [--json]` turns cc cloud off and keeps the cc account signed in;
  `cc ai on [--json]` turns it back on. Only turn it on when the user asks: it
  sends prompt text, diffs, and voice recordings off the machine. Disabling the
  `cc-ai` plugin in Settings → Plugins also stops it.
- `cc ai status [--json]` shows the account, whether cc cloud is on and ready,
  and today's usage.
- `cc ai usage [--json]` shows today's spend against the limit and when it
  resets (00:00 UTC). Titles, commit messages, and voice input share one
  budget.
- Sign in with `cc account login`. Signed out, cc cloud is not ready and
  Automatic skips it.
- Which service handles each task is a core setting:
  `cc settings ai-services set <thread-title|commit-message|voice> cc` picks cc
  cloud, `automatic` tries cc cloud first, then other compatible
  registered services by plugin id and service id in lexicographic order, and `off` turns the
  task off. `cc settings ai-services test thread-title` runs a sample.
- Voice input: without a Codex login, the microphone appears once cc cloud is
  ready. `cc voice transcribe <file> [--type <mime>]` transcribes a recording.
  cc cloud takes WebM, Ogg, MP4/M4A, MP3, WAV, FLAC, and AAC up to 10 MB; it
  reads the format from the MIME type, then the file extension, and refuses
  anything else before contacting cc.example.invalid. Each transcription model gets 30
  seconds, and a model that times out or fails falls back to the next one.
- When an account's daily limit is used up, cc cloud reports not ready for
  that account until the reset and Automatic moves on; a task set to `cc`
  falls back to the prompt text for titles and `cc: automated commit` for
  commits, and the microphone hides unless another voice service is ready.
  Signing in to a different account clears the limit message.

While cc cloud is on, cc sends the text of a thread's first prompt (titles), the
changed files with a diff excerpt (commit messages), and voice recordings with
a vocabulary hint (voice input) to cc.example.invalid, which forwards them to OpenRouter
model providers with zero data retention. cc stores daily usage totals and, for
30 days, metadata about each request such as its time, model, token counts, and
cost; it never stores prompts, recordings, or replies.
