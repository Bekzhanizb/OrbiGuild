# Product definition

## Goal

OrbiGuild will give users a web-first interface to create AI agents, assign work,
and observe actual execution in an interactive office. A separately controlled
Local Runner will own execution on the user's machine. A hosted UI and optional
cloud persistence will never imply hosted execution.

## Stage 01: Secure local connection

The web app pairs with the local runner after explicit approval in its terminal.
It displays Connecting, Connected, Disconnected, Pairing Required and Error using
actual protocol outcomes. Only authenticated read-only status is available.
Challenges, sessions, cancellation, expiry and revocation live in memory.
See [local connection](LOCAL_CONNECTION.md) for the supported development topology.

The original unauthenticated health response remains separate and compatible.
There are no agents, executions, providers, databases, filesystem/shell/Git tools
or office simulation. A healthy or connected runner never implies AI activity.

## Future capabilities

- Define agents and tasks with explicit provider capabilities.
- Review local permission prompts for filesystem, shell, network and Git actions.
- Start and cancel bounded runs, inspect redacted logs and approval requests.
- Render validated real events in a deterministic PixiJS office. The office is a
  read-only projector and cannot initiate execution.
- Persist locally in SQLite without setup; optionally use a user-owned Supabase
  project with end-user Auth and RLS for approved metadata and summaries.
- Pair a hosted UI through a secure outbound transport after a separate design
  and verification step.

These are plans, not current features. Codex is a prospective first adapter;
provider integrations and direct PostgreSQL/MySQL support are outside Stage 01.

## Trust and demonstration

Execution authority stays in the runner. Users choose their workspace, approve
capabilities and control cancellation. Future cloud writes require explicit
selection of what may leave the machine; raw secrets and arbitrary code/output
are excluded by default. Credentials must not enter browser bundles, shared
contracts, logs or cloud metadata.

Show real provenance for work. Fixture-driven examples must remain visibly
labelled as demo data. See the [demo policy](DEMO_POLICY.md) and
[security model](SECURITY.md).

## Current acceptance

- A clean checkout installs and builds on documented Node/npm versions.
- The web shell reports actual connection state after explicit approval, and zero agents.
- Health works only at a validated loopback address; malformed input fails safely.
- Tests cover validation, rejection behavior and truthful UI rendering.
- Linux and Windows CI is reproducible; local verification is reported separately.
- AgentNest remains untouched and no source or history is copied from it.
