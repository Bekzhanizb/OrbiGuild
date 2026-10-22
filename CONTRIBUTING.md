# Contributing to OrbiGuild

OrbiGuild is in stage 00. Start with the [README](README.md),
[product scope](docs/PRODUCT.md), [architecture](docs/ARCHITECTURE.md),
[roadmap](docs/ROADMAP.md) and [AGENTS.md](AGENTS.md).

## Local development

Install Node 24.19.0 and npm 11.9.0, run `npm ci`, then `npm run dev`.
Before submitting, run `npm run check` and review `git diff --check`.
The [development guide](docs/DEVELOPMENT.md) explains build order, ports,
configuration and platform limitations.

Keep PRs small, explain the observable change and include relevant test evidence.
Test runtime validation and failure paths, rather than adding snapshot-only or
implementation-mirroring tests. Update docs when a feature's availability changes.
Use the PR template and name checks that could not be run.

## Scope and trust

No fake agent cards, invented runs, provider keys or automatic production edits.
Fixtures belong in tests, or in a visibly labelled demo under the
[demo policy](docs/DEMO_POLICY.md). Do not expand the health API into an arbitrary
command service. A future privileged surface needs a reviewed security design.

Do not modify or copy AgentNest. Discuss independently implemented conceptual
reuse before proposing it. Additional packages need concrete ownership and
consumers; the target architecture is not a request for empty placeholders.

Keep secrets and personal data out of issues, PRs, screenshots and commits.
Use [private vulnerability reporting](SECURITY.md) for security concerns.
Contributions are made under the repository's [MIT license](LICENSE).
