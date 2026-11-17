Thread titles, commit messages, and voice input from cc cloud, included with your cc account.

## What you get

- A `cc cloud` AI service for thread titles (branch names follow the title), commit messages, and voice input.
- On by default once you sign in. Turn it off with `cc ai off`, or disable this plugin.
- Automatic tries cc cloud first, then other compatible registered services by plugin id and service id in lexicographic order. The microphone appears once an enabled service is ready.
- Today's usage against your daily limit with `cc ai usage`.

## How it works

Sign in with your cc account. When a task uses cc cloud, cc sends its prompt to cc.example.invalid, which forwards it to OpenRouter model providers with zero data retention: the text of a thread's first prompt for titles, the changed files with a diff excerpt for commit messages, and the recording for voice input. cc stores your daily usage totals and, for 30 days, metadata about each request such as its time, model, token counts, and cost. It never stores prompts, recordings, or replies. Turn cc cloud off with `cc ai off`; your cc account stays signed in.

## For agents

`cc ai status` and `cc ai usage` report readiness and spend. `cc ai off` turns cc cloud off and `cc ai on` turns it back on; turn it on only when the user asks. `cc settings ai-services set <task> cc` picks cc cloud for a task, and `cc voice transcribe <file>` tests voice input.

## Requirements

A cc account (`cc account login`).
