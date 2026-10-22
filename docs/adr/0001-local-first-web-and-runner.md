# ADR 0001: Local-first web interface and separately controlled runner

Status: accepted for stage 00 boundaries; secure execution transport is deferred.

Date: 2026-10-22.

## Context

OrbiGuild needs a web-first interface, an eventual interactive office and real AI
work on a user's machine. Browser code cannot safely own local commands or
provider credentials. Cloud storage is optional and must not imply cloud
execution. AgentNest is separate and no source or history is imported.

## Decision

Use a TypeScript npm-workspaces monorepo with a React/Vite web application, a
separate Node Local Runner, strict shared contracts and pure core logic. Defer
office, UI, provider and storage packages until each has a concrete consumer.
The runner alone will own tools, credentials and execution permissions.

Stage 00 has a static truthful empty screen and an unauthenticated read-only
loopback health endpoint. It has no web-to-runner connection, task API, provider
integration or database. This small surface validates packaging and runtime
boundaries without granting execution authority.

SQLite is the future no-setup default. The maintainer-preferred optional cloud
mode is user-owned Supabase with a publishable key, end-user Auth and RLS. No
secret/service-role key is allowed in the browser or runner. Direct SQL modes and
other providers are outside this stage. No cloud resources are provisioned.

## Local transport risks

Loopback alone does not authenticate a caller. Malicious pages may issue simple
requests without CORS permission; local processes can reach local ports; DNS
rebinding can turn an attacker hostname into a loopback destination. Sensitive
payloads can leak through logs, URLs, token storage or overly broad permissions.

The current health surface binds only literal loopback, validates the exact Host,
rejects Origin/Fetch Metadata and payloads, grants no CORS, and exposes no commands.
It does not attempt to solve pairing. Before adding a local browser API, specify
and verify narrow authentication, Origin/Host and CSRF policy, consent, token
lifecycle and workspace scoping. A future local MVP may accompany or serve the
localhost web app under that reviewed design.

## Why hosted-browser-to-localhost is deferred

An HTTPS page reaching HTTP localhost is not a portable transport assumption.
Secure-context exceptions, mixed-content handling, browser local-network access
permissions and preflight behavior vary by browser and version. Permissive CORS
would not solve authentication, request forgery or capability control.

The hosted direction is a user-paired, runner-initiated outbound TLS connection or
relay with short-lived credentials, explicit consent, revocation, reconnection
semantics and workspace isolation. Its threat model must include relay access,
replay, message ordering, device theft, multi-tab/session behavior and secret
redaction. No relay or hosted connection is implemented now.

## Consequences

The foundation is installable without accounts and keeps Node/credential access
out of browser packages. Shared schemas validate both configuration and HTTP
boundaries. A separate process requires lifecycle and packaging work later, and
the hosted UI cannot control local work until secure transport is approved and
tested. The read-only office will consume events; it cannot originate them.

Electron-only main/preload/window lifecycle code is excluded. Only independently
implemented vocabulary, event projection, adapter separation and permission
concepts may inform later OrbiGuild work; see
[AgentNest conceptual reuse](../ARCHITECTURE.md#agentnest-conceptual-reuse).

## Validation gate for the next stage

Review a local authenticated status-handshake specification and negative tests
before adding it. Require a separate threat-model and browser compatibility review
before any hosted pairing. No execution permission follows from a health result,
cloud account, storage connection or visual animation.
