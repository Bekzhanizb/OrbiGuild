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

Reference environment: Linux 6.18.55 x86_64, Node **24.19.0**, npm **11.9.0**,
verified on 2026-10-22. The foundation implementation is local commit `ddff274`;
this report is a subsequent documentation-only update on `foundation/stage-00`.

The fresh checkout had no `node_modules` or build output. A separate empty npm
cache was used to exercise an actual lockfile install, not a reused dependency
directory. Exact commands:

```sh
git clone --no-hardlinks --branch foundation/stage-00 /workspace/OrbiGuild /tmp/orbiguild-fresh-checkout
cd /tmp/orbiguild-fresh-checkout
NPM_CONFIG_CACHE=/tmp/orbiguild-npm-fresh-cache npm ci
NPM_CONFIG_CACHE=/tmp/orbiguild-npm-fresh-cache npm run check
git status --short
```

| Check | Result | Evidence |
| --- | --- | --- |
| Fresh `npm ci` | PASS | Installed from the committed lockfile; no manifest or lockfile changes |
| `npm run lint` | PASS | ESLint completed with zero warnings |
| `npm run typecheck` | PASS | All four workspaces, including test source |
| `npm test` | PASS | 15 named behavior tests; 0 failures and 0 skips |
| `npm run build` | PASS | Contracts/core declarations, compiled runner and Vite production assets |
| `npm run docs:check` | PASS | Basic Markdown structure and 50 local links in 16 Markdown files |
| `npm run check` | PASS | Entire sequence above in the fresh checkout |
| `npm audit --audit-level=high` | PASS | Zero vulnerabilities after dependency cleanup |
| `git diff --check` | PASS | No whitespace errors; fresh checkout remained clean |
| Windows execution | NOT RUN | This execution environment is Linux; Windows CI is configured |
| GitHub Actions execution | NOT RUN | No branch was pushed or remote workflow triggered |
| External documentation URLs | NOT RUN | Local documentation checks intentionally do not fetch remote links |

The test suite contains eight runner tests, two web tests, three contract tests
and two core tests. It covers real HTTP/raw TCP health, IPv4/IPv6 loopback,
port collisions, unsafe bind/port rejection, hostile/missing/duplicate Host,
Origin/Fetch Metadata rejection, methods, payloads, queries, invalid HTTP,
oversized headers, upgrades/CONNECT and continued health after rejection.
Contracts reject incompatible versions, unknown fields and invented activity;
web tests check semantic landmarks, empty-state copy, skip navigation and the
HTML entry point.

Additional manual checks passed:

- `npm run dev` launched both processes at the documented addresses.
  `curl --fail http://127.0.0.1:4319/health` returned the documented idle JSON;
  a request with `Host: evil.example` returned 403 and `{"error":"forbidden"}`.
- `node /tmp/orbiguild-browser-smoke.mjs` used the environment's preinstalled
  Playwright and Chromium **154.0.8037.57**. The actual page rendered the exact
  heading at 1280×900 and 375×812; keyboard skip navigation focused main; there
  was no horizontal overflow, console error or request to runner/external hosts.
  Screenshots were visually inspected. This environment-specific smoke helper is
  not a repository dependency or a claim of automated browser CI coverage.
- `node /tmp/orbiguild-cli-smoke.mjs` tested the compiled CLI: wildcard bind
  rejected with exit 1; port zero selected a real loopback listener; health
  validated; SIGTERM exited with code 0 and released the port. The temporary
  helper used Node's HTTP client, consistent with the health-only policy.
- All five GitHub workflow/configuration YAML files parsed successfully with the
  environment's YAML parser. This is syntax validation, not a remote CI run.
- A temporary Markdown file with an intentionally broken local link made the
  documentation check exit 1. The probe was then removed.

Initial failed attempts were resolved before the fresh-checkout pass: the tsx
CLI hit sandbox IPC restrictions, so tests now use Node's runner plus the tsx
loader with process isolation disabled and named assertions; the Markdown CLI
introduced vulnerable transitive dependencies, so a small dependency-free check
replaced it; the PR template needed a title; and a browser favicon 404 was fixed
with a local SVG. A first CLI smoke probe using Node `fetch` was rejected by the
deliberate Fetch Metadata policy; the plain HTTP client passed. No final
verification failure remains. Socket tests/dev startup require network/listener
permission in this managed sandbox; that permission was enabled for verification.

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
