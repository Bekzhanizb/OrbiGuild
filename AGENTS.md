# Contributor and coding-agent instructions

Read [README.md](README.md), [PRODUCT.md](docs/PRODUCT.md),
[ARCHITECTURE.md](docs/ARCHITECTURE.md) and [ROADMAP.md](docs/ROADMAP.md) before
editing implementation code. Keep changes within the current milestone.

- Keep AgentNest entirely unchanged. Do not import its source, assets or history.
- Stage 01 adds only terminal-approved local pairing and read-only status.
  There is no execution, provider, database or office feature.
  Do not introduce fake activity, empty feature packages or Electron-only code.
- Keep browser/core/contracts source free of Node APIs and provider secrets.
  Local session credentials may exist only in browser memory. Validate
  unknown data at transport and configuration boundaries with shared schemas.
- Keep the health API read-only, bound to literal loopback addresses, with strict
  Host checks and browser-origin rejection. Do not add permissive CORS or tools.
- Do not create/connect a Supabase project. Future storage defaults to SQLite;
  BYO Supabase uses end-user Auth and RLS, never privileged keys in public clients
  or runner.
- Use the documented Node/npm versions and preserve the root lockfile. Run
  `npm run check` for implementation changes. Report attempted, passed, failed
  and unavailable checks accurately; never claim remote CI ran from local output.
- Keep changes local unless explicitly authorized to push. Do not merge, deploy,
  publish packages or mutate repository settings without authorization.

See [development](docs/DEVELOPMENT.md), [security](docs/SECURITY.md) and the
[demo policy](docs/DEMO_POLICY.md) for boundary details.
