# Handoff — task 7.2, the CircleCI app

Not started. 7.1 (doc edits) is done on `main` (`fa4d9d1` SPEC, `16b0306` tick; apps repo `013cb95` roster + port table). Phase spec: `_dev/docs/spec/phase-7-entity-resolution.md` (`1064117`). 7.2 is an `[apps]` sub-task: worked on `../a2uiverse-apps/` `main`, no worktree; its spec, plan and handoff stay here. Parallel with 7.3 (Linear), 7.4 (sdk), 7.5 (shell-catalog).

## What binds it

- **Spec decision 3**: CircleCI joins the pull request on branch and commit hash. **Decision 12**: the agent is written to its vendor, never to the merge — its domain doc and prompt say what a CircleCI app's own user sees, drawn from what the official MCP server returns; nothing about the shell, the join, pull requests as a key, or the other agents. The Planner asks for fields in prose; an agent that does not paint one is the §4.4 fallback, recorded as a finding.
- **Apps-repo conventions** (`../a2uiverse-apps/CLAUDE.md`, README): scaffolded by `create-a2ui-agent` on the kit as a path dependency; `circleci/agent/` + `circleci/circleci-catalog/` + `manifest.json`; three modes on one port; basic catalog under a product theme; official-public-MCP rule; no dependency on the platform beyond `@a2uiverse/sdk`. Gmail (`../a2uiverse-apps/gmail/`) is the nearest precedent: a hosted vendor MCP behind a credential the agent never holds.
- **Port 11004**, already in the apps README roster and the apps tunnel port table.

## Verified facts (vendor sources, 2026-09-16)

- **Hosted server**: `https://mcp.circleci.com/v1/mcp`, docs `https://circleci.com/docs/guides/toolkit/circleci-mcp-overview/`. Auth: OAuth2 or a personal API token. Tools: `hello, list_runs, get_run, list_workflows, get_workflow, rerun_workflow, cancel_workflow, list_jobs, get_job, get_job_logs, list_artifacts, list_job_tests, download_usage_data`.
- **`get_run` fields** (from the CLI source the server is built on, `github.com/CircleCI-Public/circleci-cli`, `internal/cmd/run/get.go`): `id, phase, outcome, current_outcome, branch, tag, revision, repository_url, commit.subject/url/author_name/author_login, created_at, errors[], workflows[] → jobs[]`. **No pull-request number** anywhere in the vendor schema. So a run names its commit by `revision` (the hash) and `branch`.
- **The npm package `@circleci/mcp-server-circleci` is deprecated** and its output carries no commit or branch fields; do not build on it. The CLI (`circleci mcp`) is the local alternative; it reads `circleci auth login` credentials or `CIRCLE_TOKEN`.
- **Project setup**: runs exist only for a project created in CircleCI on the repository through its GitHub App, with a config file in the repo (`https://circleci.com/docs/guides/getting-started/create-project/`). `list_followed_projects` returns only projects the user follows.

## Setup that needs Jioh

1. A CircleCI account, the GitHub App installed on `retz8/a2uiverse`, the project created.
2. A `.circleci/config.yml` committed to `a2uiverse` `main` — a real `chore:` commit on the platform repo, minimal (the gates already exist: `pnpm verify`). Every push then produces a run, which is what the join reads.
3. A personal API token in the agent's environment, per the agent's README once written. The agent never holds a consent flow.

## Open threads for the sub-task's own grill

- Hosted MCP over HTTP with a token versus the CLI's MCP as a local process — which transport the kit's live toolset factory supports today; Gmail's agent is the precedent to read first.
- What a CircleCI app shows its user: runs by branch with outcome, revision and commit subject; workflows and jobs; a run's logs on drill-down. Two-way content, if any.
- The `deterministic` fixture: a canned "recent runs" answer over `retz8/a2uiverse`, plus an action map for the beats 7.8 will record (rerun a build is acceptance item 4's live action; whether deterministic mode mirrors it is this task's call).
- Whether `rerun_workflow` is exposed as an in-fragment action (write tier) or the app stays read-only, the way GitHub's write tier was its own sub-task (3.7).
