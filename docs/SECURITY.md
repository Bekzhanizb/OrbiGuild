# Security model

## Stage 00 boundary

The UI has no agent connection or execution action. It makes no provider or
database requests, needs no credentials and does not fetch runner health.
Browser, contracts and core source cannot import Node built-ins or runner code;
ESLint enforces this boundary. No `VITE_*` secret is needed: public build variables
would be visible to every user.

The runner exposes only read-only `GET /health`. It has no filesystem, shell, Git,
provider, storage or arbitrary command API. The process inherits its user's OS
permissions; it is not a sandbox. Do not run it as administrator or root.

- Startup validates literal `127.0.0.1` or `::1` before listening. Hostnames,
  wildcard and LAN addresses are rejected. IPv6 uses an IPv6-only socket.
- Requests must come from the configured loopback address and carry exactly one
  matching Host authority including the bound port. Forwarded headers are not
  trusted as authority.
- Any Origin or Fetch Metadata header is rejected, including same-origin browser
  requests. No CORS grants are sent. This is a CLI health surface, not a browser API.
- Queries, fragments, payloads, transfer encoding, upgrade/CONNECT and non-GET
  methods are rejected. Parser errors return a bounded error without debug detail.
- Header size and request/header timeouts are bounded; responses close the socket,
  disable caching and contain no sensitive runtime information.
- Health and application error payloads are parsed with strict contracts before
  serialization. No user-supplied data is reflected in responses or startup errors.

Loopback is not authentication. Another local process can read this health
response. A compromised local machine, OS user or privileged proxy remains outside
this boundary. Do not port-forward or reverse-proxy the runner. Developer tooling
such as Vite is intended for local development only.

## Before execution or local browser APIs

Review a threat model and implement narrow authenticated APIs with explicit
pairing/consent, strict Origin/Host policy, CSRF and DNS-rebinding protection,
credential lifecycle, revocation and workspace scoping. Health must never grant
capabilities. No arbitrary remote command API is allowed.

The runner alone will handle provider credentials and local tools. Add explicit
permissions for filesystem, shell, network and Git changes, validated tool
parameters, bounded per-task execution, cancellation, event provenance and logs
that redact secrets. Production changes require user consent. None of these
permission or orchestration features exists in stage 00.

## Hosted transport

Do not assume an HTTPS site can securely fetch an HTTP localhost API. Mixed
content, secure contexts and local-network access policies vary across browsers.
The [transport ADR](adr/0001-local-first-web-and-runner.md) defers this path pending
a verified design for a user-paired outbound TLS connection/relay with short-lived
credentials, revocation, consent and workspace scoping.

## Future persistence

SQLite is the planned no-setup default. User-owned Supabase is the preferred
optional cloud mode, with a publishable key, end-user Auth and RLS on every exposed
table. Test read/write authorization with at least two users and unauthenticated
access. Neither public clients nor runner may receive a secret/service-role key
or privileged database credentials. No Supabase project is created or contacted by
the application in stage 00.

Only user-approved metadata, definitions and task summaries may leave the machine
under that future design. Secrets and arbitrary code/output are excluded by
default. Do not treat cloud storage as execution consent. Direct SQL adapters are
later work with separately scoped least-privilege credentials.

## Supply chain

Direct dependency versions and the root lockfile are pinned. CI uses immutable
action SHAs, read-only repository permissions and a high/critical npm audit gate.
Dependabot proposes npm and GitHub Actions updates; reviews must evaluate changed
install scripts and lockfiles. No untrusted PR runs with repository secrets.
External advisories change; a clean audit is evidence for its run time only.

See the root [reporting policy](../SECURITY.md) and
[branch protection recommendations](GITHUB.md).
