# Development

## Prerequisites and reproducibility

The reference toolchain is Node **24.19.0** (supported LTS major 24) and npm
**11.9.0**. `.nvmrc`, `.node-version` and `packageManager` document these exact
versions; `engines` with `.npmrc` requires Node 24.19+ within major 24 and npm
11.9+ within major 11. Other majors are intentionally not claimed as supported.

```sh
node --version
npm --version
npm ci
npm run check
```

`npm ci` uses the committed root lockfile. Run commands at the repository root;
there are no child lockfiles or global build tools. Dependency changes use
`npm install`, then review the manifest and lockfile together. The sandbox used
for the initial implementation needs `NPM_CONFIG_CACHE=/tmp/orbiguild-npm-cache`
because its default home cache is not writable; ordinary installations do not
need this setting.

## Start and stop

```sh
npm run dev
```

This builds contracts then core, then runs Vite and the runner concurrently.
Open `http://127.0.0.1:5173`. Query health from a local CLI:

```sh
curl --fail http://127.0.0.1:4319/health
```

Use `curl.exe` on Windows PowerShell. A browser address bar or cross-origin fetch
may be rejected intentionally. The UI polls authenticated status, never health. See [pairing](LOCAL_CONNECTION.md). Ctrl+C stops both
processes. The runner handles SIGINT/SIGTERM and closes active connections. Port
collisions fail instead of silently moving to a different port.

Web source is watched; restart the runner manually after source changes. Changes to shared packages require restarting
`npm run dev` to rebuild their `dist` exports. There is no multi-package watch
orchestration beyond this small development script.

For separate terminals, first run `npm run build:shared`, then use
`npm run dev -w @orbiguild/web` and `npm run dev -w @orbiguild/runner`.
After `npm run build`, run the compiled runner with
`npm run start -w @orbiguild/runner`. Web output is `apps/web/dist`; this stage
does not install a production hosting service or deploy any assets.

## Runner configuration

Only two environment variables are read. No `.env` file, credentials or database
configuration is required. The runner does not load dotenv files.

| Variable | Default | Accepted values |
| --- | --- | --- |
| `ORBIGUILD_RUNNER_HOST` | `127.0.0.1` | Literal `127.0.0.1` or `::1` only |
| `ORBIGUILD_RUNNER_PORT` | `4319` | Decimal 1024–65535; `0` selects a free test/local port |

Port text cannot contain whitespace, signs, leading zeroes, fractions or exponent
notation. Invalid configuration exits unsuccessfully before binding. With port
zero, use the actual URL printed at startup. The exact Host header must match that
address and port; `localhost` aliases are intentionally rejected.

Bash:

```sh
ORBIGUILD_RUNNER_HOST=::1 ORBIGUILD_RUNNER_PORT=4320 npm run dev -w @orbiguild/runner
curl --fail 'http://[::1]:4320/health'
```

PowerShell:

```powershell
$env:ORBIGUILD_RUNNER_HOST = '::1'
$env:ORBIGUILD_RUNNER_PORT = '4320'
npm run dev -w @orbiguild/runner
```

The process stays in the foreground. Never expose it with a proxy or port forward.
The legacy health endpoint rejects payloads and browser requests. The Stage 01
API supports only the fixed default IPv4 browser topology documented in
[local connection](LOCAL_CONNECTION.md), with strict Origin/Host and JSON checks. Errors contain only a contract-defined
code. See the [security model](SECURITY.md).

## Checks

`npm run check` runs ESLint, workspace typechecks, Node behavior tests through
tsx, builds and documentation checks. Shared builds run before tests and
typechecks so a clean checkout resolves package exports. Tests include real HTTP
and raw TCP requests, invalid startup input, strict contract rejection, and
semantic HTML rendering. There are no snapshot-only tests or real provider calls.

Documentation checks enforce one top-level heading, closed language-tagged code
fences, no trailing whitespace and a final newline, then verify inline
repository-local links and heading anchors. This is a small built-in check, not
a complete Markdown linter. Remote links are intentionally not fetched; network
availability is not a prerequisite. The checker does not implement every Markdown
extension. Tests use Node's test runner with the tsx loader and process isolation
disabled, avoiding tsx CLI IPC and ensuring named assertions run in this sandbox.

CI uses `ubuntu-latest` and `windows-latest` on the reference Node/npm versions.
IPv6 tests skip only when the OS reports that loopback IPv6 is unavailable; other
errors fail. A Linux result does not establish a Windows result. See
[the Stage 01 verification report](STAGE_01_REPORT.md) for exact local checks
and checks not performed. CI configuration is not evidence of a completed run.
