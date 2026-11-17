# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities privately by email to
**support@terragonlabs.com**. Do not open a public GitHub issue for a
suspected vulnerability.

Include as much of the following as you can:

- the affected component (server, host daemon, app, desktop app, CLI, cc
  connect, or a plugin) and version or commit
- steps to reproduce, or a proof of concept
- the impact you expect an attacker could achieve

## Supported versions

Fixes land on `main` and ship in the next release of `cc-app` and the desktop
app. Only the latest release is supported.

## Scope

cc's server binds to loopback by default, and its local HTTP API is
unauthenticated by design: anyone who can reach it can run commands on the
host. Exposing it with `--server-bind-host 0.0.0.0` on an untrusted network is
documented as unsafe (see [docs/multiple-devices.md](docs/multiple-devices.md)).
Reports that a process on the same machine, or a peer the user chose to expose
the API to, can drive cc are out of scope. Ways for a web page, a remote party,
or an untrusted repository to reach or drive a cc server, host daemon, or cc
connect route are in scope.
