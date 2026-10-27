# Secure local connection

Stage 01 connects the local web app to authenticated, read-only runner status.
No agents, execution, provider, database or office renderer are implemented.

## Try it

Use Node 24.19.0 and npm 11.9.0 from the repository root:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173** (the literal IP, not `localhost`). Choose **Pair with
runner**. Compare the eight-character public verification code in the page with
the one printed by the runner. Only if both match and you requested pairing, type
`approve CODE` in the terminal running `npm run dev`, replacing CODE with that
public code. The root command forwards terminal input to the runner. The browser
then verifies authenticated status before showing **Connected**.

For separate terminals, run `npm run build:shared` once, then run
`npm run dev -w @orbiguild/web` and `npm run dev -w @orbiguild/runner`. Enter approval
in the runner terminal. Runner source changes need a manual restart; automatic
runner watch/restart is deliberately disabled because a restart revokes sessions.
Ctrl+C stops the process. No pairing secrets are printed or entered by the user.
The public verification code alone cannot authenticate over HTTP.

Choose **Cancel pairing** to cancel a pending request, or **Disconnect** to revoke
the browser session. Type `revoke` in the runner terminal to invalidate every
session and pending request. Requests expire after two minutes; sessions after
15 minutes. Reloading the page requires new approval. Terminal input must remain
available for approval; unattended/noninteractive processes cannot self-approve.

The web app uses fixed development addresses. The runner still supports literal
IPv6 loopback and alternate ports for health/testing, but the browser pairing flow
supports the default IPv4 address and port only. Vite preview port 4173 and hosted
origins are intentionally not allowlisted. Do not port-forward either process.

## What the states mean

| State | Meaning and recovery |
| --- | --- |
| Connecting | Requesting pairing or verifying authenticated status |
| Pairing Required | No valid session, awaiting terminal approval, or credentials expired/revoked; pair again |
| Connected | The latest authenticated status response validated; checked every five seconds |
| Disconnected | Explicit disconnect or network/timeout failure; start the runner and check/pair again |
| Error | Rejected request, rate limit, unsupported origin or invalid response; correct the cause and retry |

Connection state can lag a stopped runner by a polling interval plus the four-second
request timeout (background tabs may be throttled). There is no automatic credential
renewal or reconnect that bypasses consent. If revocation cannot be confirmed, the
UI says so; use terminal `revoke` or wait for expiry. Abrupt tab closure cannot
reliably deliver revocation. Status connectivity never implies agent execution.

## Protocol version 1

Host must equal the actual runner IP/port. Origin must be exactly
`http://127.0.0.1:5173`. API requests require `X-OrbiGuild-Protocol: 1`, and POSTs
require `Content-Type: application/json`. Credentials never appear in paths,
queries, fragments, cookies, browser storage or application logs.

| Route | Method | Input / authorization | Result |
| --- | --- | --- | --- |
| `/health` | GET | Existing CLI-only foundation checks; no browser Origin | Unauthenticated process health, unchanged |
| `/v1/pairing/start` | POST | `{protocolVersion: 1}` | Secret challenge, public verification code and expiry |
| `/v1/pairing/complete` | POST | Version and secret challenge in body | Pending (202), or one-time session token and expiry |
| `/v1/pairing/cancel` | POST | Version and secret challenge in body | Idempotent cancellation, including a just-issued session |
| `/v1/status` | GET | Bearer session token | Version, idle state, zero agents and execution disabled |
| `/v1/disconnect` | POST | Version in body and bearer token | Revokes that session |

Known API routes accept narrowly validated OPTIONS preflights. Unknown routes,
approval endpoints and execution endpoints do not exist. There is no generic
command dispatcher. Tokens are random 256-bit values; only hashes are retained
by the runner. The full decision and remaining risks are in
[ADR 0002](adr/0002-secure-local-pairing.md).
