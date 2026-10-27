# GitHub setup and publication

The public repository [Bekzhanizb/OrbiGuild](https://github.com/Bekzhanizb/OrbiGuild)
already exists. Stage 00 is merged; Stage 01 uses
`feature/stage-01-secure-local-connection`. Work on separate feature branches and
open focused draft PRs after local verification. Push only when authorized; do
not merge, deploy, publish packages or change repository settings without approval.

```sh
git push --set-upstream origin feature/stage-01-secure-local-connection
gh pr create --repo Bekzhanizb/OrbiGuild --base main --head feature/stage-01-secure-local-connection --draft --title "Stage 01: secure local pairing and authenticated status" --body-file docs/STAGE_01_REPORT.md
```

The GitHub CLI is optional for development. Do not create a duplicate repository
or import AgentNest. Private npm workspace manifests prevent accidental package
publication. The [Stage 01 report](STAGE_01_REPORT.md) records verification and scope.

## Recommended settings (not applied)

- Protect `main`: require a PR, passing required checks and resolved discussions;
  block force pushes and branch deletion. Apply the rule to administrators where
  practical. With collaborators, require at least one independent approving review.
- After the first actual CI run, require the check contexts
  `quality (ubuntu-latest)`, `quality (windows-latest)` and `security`.
  Select the contexts GitHub actually reports; do not assume they ran locally.
- Enable dependency graph, Dependabot alerts/security updates, secret scanning and
  push protection where available. Enable private vulnerability reporting and
  verify its availability before advertising a public release.
- Keep workflow permissions read-only by default. CI does not use
  `pull_request_target`, deploy credentials or privileged runner APIs.
- Review all dependency and action updates; actions are pinned to full commit
  SHAs and Dependabot checks both npm and GitHub Actions weekly.
- Keep merge and deployment manual during foundation review. No automation has
  been configured to merge PRs, publish packages or deploy the site.

Suggested description: **Web-first AI agent workspace with a separately controlled
local runner. Stage 01 secure local connection.**

Suggested topics: `orbiguild`, `ai-agents`, `local-first`, `typescript`, `react`,
`vite`, `npm-workspaces`, `open-source`. Avoid integration topics that suggest a
working provider, office renderer or database before those exist.
