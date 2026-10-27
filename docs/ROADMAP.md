# Roadmap

Milestones describe planned scope, not delivered capabilities. No delivery dates
or automatic promotion between stages are implied.

## 00 — Foundation (completed)

- Four TypeScript npm workspaces and a committed root lockfile.
- Accessible React/Vite empty state and a separate loopback health process.
- Strict shared status/health contracts and behavior tests.
- Windows/Linux CI, dependency hygiene and honest onboarding documentation.
- Architecture, transport, storage and demonstration policies.

Stage 00 ends here. There is no agent, database, provider or browser pairing.

## 01 — Secure local connection (implemented for review)

Versioned local pairing now requires explicit runner-terminal approval. It uses
strict Host/Origin checks, one-time challenges, bounded requests, memory-only
sessions, expiry, cancellation and revocation. React displays real authenticated
status and recovery states. Health remains separate; no execution capability exists.
See [the protocol](LOCAL_CONNECTION.md). Hosted transport remains deferred.

## 02 — Local definitions and persistence

Introduce a small storage package for SQLite definitions and migrations, with
round-trip and failure tests. No provider execution or cloud synchronization is
required to validate this step. A storage choice alone must not grant permissions.

## 03 — One bounded real task

Specify an adapter interface and implement one provider path, initially considering
Codex. Add capability checks, explicit local permissions for filesystem/shell/
network/Git, approval requests, per-task bounds, cancellation, provenance and
redacted logs. Never expose an arbitrary remote command endpoint.

## 04 — Read-only office

Add PixiJS to project validated real events into a deterministic office view.
Provide an accessible textual equivalent. Fixtures must remain visibly labelled
under the [demo policy](DEMO_POLICY.md).

## 05 — Optional user-owned Supabase

Design metadata consent, end-user Auth and RLS isolation tests, then implement an
optional repository. Keep SQLite useful without any account. Never put privileged
keys in browser or runner. No cloud project is provisioned by the foundation.

## Later design work

Secure paired outbound hosted transport/relay, more provider adapters and direct
PostgreSQL/MySQL support each need separate designs. Shared UI components and
additional packages should follow concrete reuse, rather than precede it.
