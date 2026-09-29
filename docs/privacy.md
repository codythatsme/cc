# Privacy

CC has no application usage telemetry or automatic crash reporting. Server
startup, thread creation, user messages, and plugin installation do not publish
usage events. The website does not record page views, link clicks, download
clicks, campaign parameters, or copied commands.

The former reporting service, website analytics SDK, project keys, telemetry
settings, request attribution headers, and installation identifier creation are
removed. Archives exclude the former `telemetry-id` file. Legacy settings cannot
enable reporting.

Better Auth is needed for authentication, but its transitive telemetry package
is patched to remove both the Node and browser reporting implementations. The
patch ignores environment opt-ins, configuration opt-ins, and custom reporting
callbacks. Regression tests execute both entry points with reporting explicitly
enabled and verify that neither callbacks nor network requests run. The
`@opentelemetry/api` dependency remains an inert API used for compatible types by
other dependencies; CC registers no exporter.

CC's local logs and provider usage displays remain available for troubleshooting
and account management. They are not sent to an analytics collector. A model
provider still receives prompts and other inputs when a user uses that provider.

For external Claude Code processes, CC forces usage and error reporting off for
both sessions and model discovery, and disables OpenTelemetry collection. The
controls are documented in [Claude Code's environment variable reference](https://code.claude.com/docs/en/env-vars).
For external Codex app-server processes, CC supplies command-line overrides that
disable analytics and all three OpenTelemetry exporters, using the supported
[Codex configuration keys](https://developers.openai.com/codex/config-reference/).
These controls apply only to processes CC launches; they do not change the
user's global provider configuration or credentials. Other providers and
third-party plugins have their own behavior and privacy policies.

Marketplace install counts, when supplied by an explicitly configured catalog,
are read-only publisher metadata. CC does not report installations. Optional
Cloudflare deployments have worker observability and Wrangler metrics disabled
in their checked-in configuration. Email
subscriptions on a separately deployed website require an explicit signup and
configured email service; they are not usage tracking.
