# GitHub setup and publication

The public repository [Bekzhanizb/OrbiGuild](https://github.com/Bekzhanizb/OrbiGuild)
already exists with its own initial commit and MIT license. The foundation is
prepared locally on `foundation/stage-00`. No repository creation, push, remote PR,
merge, deployment or settings change is part of the local implementation.

## Publish only with explicit push authorization

After reviewing the local commit and receiving explicit authorization to push,
these commands publish only the foundation branch and open a draft PR:

```sh
git push --set-upstream origin foundation/stage-00
gh pr create --repo Bekzhanizb/OrbiGuild --base main --head foundation/stage-00 --draft --title "Foundation: web shell and loopback runner health" --body-file docs/FOUNDATION_REPORT.md
```

These commands have not been run. The GitHub CLI is optional for local development.
Do not create a duplicate repository, import AgentNest, or push to AgentNest.
Do not merge or deploy without separate approval. Root `private: true` and private
workspace manifests also prevent accidental npm publication.

If bootstrapping in a different account where OrbiGuild does not exist, explicitly
select that owner first. Only then create the new public repository; do not run
this against the existing repository:

```sh
gh repo create OWNER/OrbiGuild --public --description "Web-first AI agent workspace with a separately controlled local runner. Stage 00 foundation."
```

`OWNER` must be replaced deliberately. Repository creation does not authorize
publishing source or copying another repository's history.

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
local runner. Stage 00 foundation.**

Suggested topics: `orbiguild`, `ai-agents`, `local-first`, `typescript`, `react`,
`vite`, `npm-workspaces`, `open-source`. Avoid integration topics that suggest a
working provider, office renderer or database before those exist.
