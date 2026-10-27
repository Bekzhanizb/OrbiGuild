# Security model

## Stage 01 boundary

The browser has a memory-only read-only session with the local runner after
explicit terminal approval. There is no provider, database, filesystem, shell,
Git or execution API. Node APIs and provider secrets stay outside browser code.
The runner is not an OS sandbox; do not run it as administrator or root.

[ADR 0002](adr/0002-secure-local-pairing.md) is the detailed threat model and protocol
decision. [Local connection](LOCAL_CONNECTION.md) documents recovery and limits.

- Literal loopback bind and exact IP/port Host validation protect every route.
- API Origin must exactly equal the supported local development origin; missing,
  null, duplicate and hostile Origins fail. Fetch Metadata is constrained.
- JSON plus a custom protocol header forces preflight; cookies are rejected and
  wildcard/credentialed CORS is absent. Sessions use explicit bearer headers.
- Only terminal input can approve pairing. Public comparison codes are not HTTP
  credentials. Challenges/tokens never enter URLs, logs or persistent browser storage.
- Random 256-bit secrets, server-side hashing, one-time exchange, two-minute
  challenge expiry, 15-minute session expiry and restart/revoke invalidation apply.
- Bodies are bounded to 1 KiB and three seconds, headers to 8 KiB. Pairing starts,
  pending records, sessions and total requests have process-wide limits.
- Cancellation also revokes a concurrently issued session; stale browser responses
  cannot restore a cancelled connection. Failed revocation is disclosed in the UI.
- `/health` retains the original unauthenticated CLI-only contract and rejects all
  Origin/Fetch Metadata headers. It never grants authenticated capability.

Same-user malware, terminal compromise, an impersonating local process, XSS or
malicious content on the trusted development origin remain risks. Loopback HTTP
does not authenticate the OS process or protect against a compromised host.
Process-wide rate limits can be exhausted by another local client. Abrupt tab exit
may leave an inaccessible session until expiry; terminal `revoke` clears it now.

## Before execution APIs

Review a separate capability and workspace permission model. The implemented
status session must never authorize tools or workspace access. Health must never grant
capabilities. No arbitrary remote command API is allowed.

The runner alone will handle provider credentials and local tools. Add explicit
permissions for filesystem, shell, network and Git changes, validated tool
parameters, bounded per-task execution, cancellation, event provenance and logs
that redact secrets. Production changes require user consent. None of these
permission or orchestration features exists in Stage 01.

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
the application in Stage 01.

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
