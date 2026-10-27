# ADR 0002: Explicit local approval for read-only status

Status: implemented for Stage 01 review. Date: 2026-10-28.

## Decision

Preserve the Stage 00 health contract and four workspaces. Add a version 1 local
pairing protocol on `/v1/` routes. Support only the development browser origin
`http://127.0.0.1:5173`, connecting directly to `http://127.0.0.1:4319`.
No hosted transport, relay or execution capability is introduced.

The browser requests a 256-bit random challenge and displays a public verification
code. The runner terminal displays the same code and the fixed origin. The user
compares the codes and explicitly types `approve CODE` in that terminal. There is
no HTTP approval route. The code is a request selector, not an authentication
credential: knowing it does not permit an HTTP caller to complete pairing.

The browser polls with its secret challenge in a JSON body. Approval allows one
exchange for a random 256-bit bearer token. Challenges expire after two minutes;
sessions expire after 15 minutes without renewal. Both sides use memory only;
the runner stores hashes of secrets. Restart revokes everything. Reloading a
browser loses its credential and requires new approval. The only authenticated
read is status, which reports zero agents and execution disabled.

Cancellation removes a pending challenge and revokes any session already issued
from it during a response race. The consumed challenge record is retained until
its original expiry for this purpose; repeated exchange always fails. Browser
disconnect revokes its token and clears memory. Terminal `revoke` revokes all
sessions and requests. Cleanup on page exit is best effort, so expiry and terminal
revocation remain the guarantees after lost responses or abrupt tab closure.

## Threat model and controls

- A hostile website cannot satisfy the exact Origin allowlist or use simple form
  submissions: the API requires JSON and `X-OrbiGuild-Protocol: 1`. Preflight grants
  only explicit methods/headers to that origin, never wildcard or credentialed CORS.
- DNS rebinding cannot supply a valid Host: every request must use the exact bound
  literal IP and port, with exactly one Host. Hostnames and wildcard binds fail.
  Forwarded headers cannot establish authority. Socket peers must be loopback.
- Cookies are rejected; bearer credentials are explicit headers, never ambient
  browser authentication. Missing, null, multiple and hostile Origins fail closed.
  Browser Fetch Metadata must be `same-site` and `cors` when present.
- Unknown fields, versions and malformed JSON fail runtime validation. Bodies are
  limited to 1 KiB and three seconds, headers to 8 KiB; the existing server timeouts
  still apply. Transfer encoding, upgrades and CONNECT are not supported.
- Starts are limited to ten per minute, three outstanding challenge records and
  five sessions. All known API routes share a 120-request/minute limit. These
  process-wide bounds limit memory and guessing, but allow local denial of service.
- Cancellation/response races use a browser operation generation to prevent old
  responses from restoring Connected. Late session responses trigger revocation.
  Connected is shown only after a validated authenticated status response.

## Remaining risks and alternatives

The trusted runner terminal is the approval authority. The public code may be
printed there; challenge and bearer secrets must never enter logs or URLs.
Users must not approve unexpected requests or mismatched codes. Local malware or
another process running as the same OS user can forge HTTP headers, inspect memory,
or control the terminal; this protocol is not an OS sandbox or local TLS identity.
A process impersonating the runner on the fixed port remains a local-host threat.

Any script served by the allowed development origin is inside the browser trust
boundary. XSS or a malicious development server could steal in-memory tokens.
Do not serve untrusted content on that origin. Cookies, localStorage and persistent
pairing were rejected for this stage to avoid ambient authority and durable secrets.

HTTP on loopback is supported only for the documented local development topology.
Hosted HTTPS-to-localhost still has mixed-content, secure-context and local-network
access differences across browsers. Do not disable browser protections, add a
permissive CORS override, expose interfaces, proxy the runner or invent a relay.
A future hosted connection needs its own paired outbound TLS design as recorded
in [ADR 0001](0001-local-first-web-and-runner.md).

No workspace or tool scope can be granted yet: there are no execution resources.
Any later workspace, storage or tool capability requires a separate permission
model and cannot inherit authority from this status-only session.
