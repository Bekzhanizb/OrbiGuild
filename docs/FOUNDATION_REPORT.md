# Foundation review report

## Result and changed files

Stage 00 adds a truthful **Foundation / No connected agents** React/Vite screen
and a separately controlled, read-only Node loopback health process. It introduces
no AI execution, credentials, provider/database connection or office simulation.

- Root `package.json`, `package-lock.json`, toolchain/configuration files and
  `eslint.config.js`: four private TypeScript npm workspaces and reproducible checks.
- `apps/web`: accessible static shell, loopback Vite settings and semantic HTML tests.
- `apps/runner`: strict configuration, loopback HTTP boundary, shutdown handling
  and real HTTP/raw TCP failure-path tests.
- `packages/contracts` and `packages/core`: strict versioned health/status schemas,
  pure initial status/presentation and behavior tests.
- `.github`: Windows/Linux CI, npm audit, Dependabot and PR/issue templates.
- `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `docs/`,
  `examples/README.md`, `prompts/00-foundation.md`, `scripts/check-links.mjs`:
  onboarding, architecture/ADR, policies and local documentation checks.

The existing MIT license is preserved. AgentNest was not inspected or changed;
no source, assets or history were copied. Only the new OrbiGuild repository was
cloned, retaining its own initial commit.

## Verification

Reference environment: Linux x86_64, Node 24.19.0, npm 11.9.0.

Initial dependency resolution/install passed. Full verification results will be
recorded here after the checks finish; they are not claimed as passed yet.

## Limitations and approval decisions

Only read-only health exists. There is no authentication/pairing, web-to-runner
connection, task execution, permissions system, provider, persistence or PixiJS
office. The schemas intentionally reject future/invented activity. IPv6 requires
OS support. Documentation checks cover local links, not remote availability.

No cloud resource was created or connected. SQLite is the future default;
user-owned Supabase with end-user Auth and RLS is the preferred optional cloud
mode. No privileged key belongs in browser or runner. Other databases/providers
remain future work.

No remote mutation is authorized or performed. Publishing the branch/draft PR
requires explicit push authorization. Repository protection/security settings
are recommendations only. Merge/deployment and any future privileged transport
need separate approval. No approval is needed to review the local foundation.

## Next two small steps

1. Specify the local authenticated status handshake and threat model, including
   Origin/Host, CSRF, consent, token revocation and workspace scoping, without tools.
2. Implement and negatively test that narrow local status handshake, keeping task
   execution, provider access and hosted transport out of scope.
