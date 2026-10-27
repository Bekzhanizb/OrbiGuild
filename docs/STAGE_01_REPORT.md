# Stage 01 review report

## Changes

- `packages/contracts`: strict version 1 pairing, session, status and error schemas;
  the original health contract remains compatible.
- `packages/core`: browser-safe connection state labels; foundation helpers retained.
- `apps/runner`: in-memory pairing authority, explicit terminal approval/revoke,
  bounded HTTP API, exact Host/Origin policy and authenticated read-only status.
- `apps/web`: accessible connection panel and lifecycle controller with memory-only
  credentials, validated responses, cancellation races and recovery messages.
- Root dev command: forwards terminal input to the runner; runner changes require
  manual restart. No new dependency or workspace; the web declares contracts directly.
- README, product, architecture, security, roadmap and development docs: current
  behavior, supported topology, protocol guide and ADR 0002. Existing CI matrix
  remains intact, including the action updates already merged into main.

## Verification

Reference: Linux x86_64, Node 24.19.0, npm 11.9.0; 2026-10-28 client date.
| Command/check | Result |
| --- | --- |
| `NPM_CONFIG_CACHE=/tmp/orbiguild-npm-cache npm ci` | PASS, installed from the root lockfile |
| `NPM_CONFIG_CACHE=/tmp/orbiguild-npm-cache npm run check` | PASS: lint, typecheck, tests, build and docs |
| `npm test` (within check) | PASS: 31 tests, zero failures/skips; 16 runner, 10 web, 3 contracts, 2 core |
| `npm run docs:check` (within check) | PASS: basic structure and 62 local links across 19 Markdown files |
| `NPM_CONFIG_CACHE=/tmp/orbiguild-npm-cache npm audit --audit-level=high` | PASS: zero vulnerabilities |
| `git diff --check` | PASS |
| `node /tmp/orbiguild-stage01-browser.mjs` | PASS: actual Chromium 154.0.8037.57 browser/CLI approval flow |
| `node /tmp/orbiguild-stage01-restart.mjs` | PASS: browser detects shutdown, requires reapproval after restart, re-pairs and loses credentials on reload |
| Local Windows execution | NOT RUN: Linux environment only |
| Remote CI at local verification time | NOT RUN: branch not yet published; inspect PR checks separately |

The cache setting is specific to this managed environment. Browser smoke helpers
used preinstalled Playwright/Chromium and are environment-local verification tools,
not installed project dependencies or a claim of browser coverage in CI. Browser
expiry and server clock boundaries are covered with deterministic unit tests;
the smoke check did not wait 15 minutes. The existing CI runs the same project
checks on Windows and Linux. No test result is inferred from CI configuration.

The real Chromium flow passed after correcting a native fetch call-binding issue
caught by browser verification; a regression test now covers that behavior.
No browser protection was disabled to permit the connection. Expected 401 network
responses occur before approval and after revocation; there were no JavaScript
page errors. The browser used the actual runner CLI through `npm run dev`, including
terminal input forwarding, code comparison, approval, cancellation, revocation,
re-pair and disconnect. No cookies/localStorage/sessionStorage were written, and
session credentials were absent from request URLs and runner logs. Mobile layout
at 375 pixels had no horizontal overflow.

## Security decisions and remaining risks

Only `http://127.0.0.1:5173` to `http://127.0.0.1:4319` is supported for browser
pairing. Exact literal Host and Origin checks, JSON/custom-header preflight,
non-credentialed explicit CORS, request limits and absence of ambient cookie
credentials address rebinding, cross-origin requests and CSRF. Terminal approval
is required for every new session. Challenges are one-time and expire in two
minutes; sessions expire in 15 minutes. The runner keeps hashes in memory and
restart revokes everything. Health remains unauthenticated and separate.

The same OS user, a compromised terminal, local runner impersonation or malicious
scripts/XSS at the trusted origin remain outside this boundary. Process-wide
limits can cause local denial of service. Tab-close cleanup is best effort, so
expiry and terminal revocation remain necessary. Hosted HTTPS-to-localhost and
any future relay require separate design. See
[ADR 0002](adr/0002-secure-local-pairing.md) for details.

## Working scope and next priorities

Pairing and authenticated status are real. No execution, filesystem/shell/Git tools,
providers, database, office renderer or fake activity is present. AgentNest remains
untouched. Windows is unverified until an actual Windows CI run is observed.
No merge, deployment, package publication or repository-setting change is included.

1. Review and harden this status-only pairing boundary across supported browsers,
   including local-origin script integrity and usability of approval/revocation.
2. Design the Stage 02 SQLite definition repository and migration tests separately;
   storage must not grant execution permissions or inherit this status-only session.
