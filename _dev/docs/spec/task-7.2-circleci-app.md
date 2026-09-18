# Task 7.2 — CircleCI app

The CircleCI vendor app in `../a2uiverse-apps/circleci/`: a three-mode agent on port 11004 over CircleCI's hosted MCP server, a `circleci-catalog` package, its manifest, the CircleCI project on the `a2uiverse` repository as its setup, and the platform wiring that puts the app on the canvas. Parent: `_dev/TODO.md` 7.2, under `_dev/docs/spec/phase-7-entity-resolution.md` (decisions 3 and 12; acceptance item 4).

## Scope

- `circleci/agent/` — the three-mode A2A agent (`deterministic` / `stub` / `live`), its knowledge docs, examples, fixtures, and beats.
- `circleci/circleci-catalog/` — the basic catalog under a CircleCI product theme.
- `circleci/manifest.json`.
- The CircleCI project on `retz8/a2uiverse` and its pipeline config.
- The platform wiring: the orchestrator's registry entry and the client's `circleci-catalog` dependency, catalog map and resolver entries.

## Locked decisions

### 1. Backend: CircleCI's hosted MCP server with a personal API token

The agent reaches CircleCI's hosted MCP server over streamable HTTP, sending a personal API token from `agent/.env` as a bearer token. `live` mode refuses to start without the token rather than degrading to canned data, as the GitHub agent does with its PAT. The agent never runs a consent flow.

### 2. The pipeline on `a2uiverse`

A `.circleci/config.yml` on `a2uiverse` runs `pnpm verify`'s checks split into parallel jobs in one workflow, on every branch, with no test-result upload. It lands as a `chore:` commit on `a2uiverse` `main`; the CircleCI project is then finished against it, with the default GitHub App trigger building every commit. Only `a2uiverse` gets a CircleCI project.

### 3. The task wires the app into the platform

7.2 closes with the platform commit that puts the app on the canvas — the registry entry, the client's `circleci-catalog` dependency, and its catalog map and resolver entries — following task 2.6's close. The CircleCI fragment is checked live in the canvas through the tunnel.

### 4. Workflows nested under each run; appearance at the workflow level

The app shows each run with its workflows nested under it, as CircleCI's own pipelines page does. A rerun adds a workflow, with a new id, inside the same run; it creates no new run. The phase spec's acceptance item 4 is amended accordingly: rerunning a workflow inside the CircleCI fragment makes a new workflow appear in its run, and the row re-points to the new workflow.

### 5. The app's scope: runs, workflows, jobs, logs

The app shows runs → workflows → jobs → a job's logs. Test results, artifacts, deploys, orbs, config validation and usage export are outside it.

### 6. A pinned tool inventory

The agent holds the reads that serve runs, workflows, jobs and logs, plus `rerun_workflow` with its from-failed option and `cancel_workflow`; every other tool is withheld client-side. The exact names are pinned after a live `tools/list`. The agent's README says how to expand the list.

### 7. Rerun and cancel are proposed, then confirmed

Both writes paint a proposal naming the project, the branch, the workflow and, for a rerun, from the start or from the failed jobs; the tool fires on the user's confirm action. This is the GitHub app's written grammar — a workflow trigger is proposed first — taken for consistency across the roster. It is the vendor app's own choice; nothing on the platform side depends on it.

### 8. Projects configured in the environment

The projects the agent covers are listed in `agent/.env`, each by slug or id with its repository name; the prompt tells the model which projects this user has. `live` mode refuses to start with the list empty. Whether `list_runs` accepts a GitHub App project's slug is confirmed live alongside the tool names.

### 9. Theme: tokens, a scoped theme sheet, a brand-guidance doc

`circleci-catalog` carries the three layers Gmail and Calendar carry: the `--a2ui-*` tokens, a scoped product theme sheet on Gmail's sheet as template, and a brand-guidance doc for the model. The visual reference is screenshots of CircleCI's web app — the pipelines page and a workflow's job view — not the marketing site's tokens.

### 10. Four beats; deterministic mode carries the rerun

The beats are: recent runs on the configured project, with workflows nested; opening a run to its workflows and jobs; a failed job's logs, over a failed run on a throwaway branch; and a rerun proposed, confirmed, and the run repainted with its new workflow. One live run under the recorder yields the payloads for `stub` mode and the painted streams for `deterministic` mode, whose action map covers the four beats. Cancel is in the prompt and in `live` mode, not a beat.

### 11. Real values, no pseudonymization

The recorded payloads and streams keep their real values, as GitHub's do. A publishability test fails the corpus on anything token- or secret-shaped.

### 12. The rest follows the roster

Scaffolded by `create-a2ui-agent` on the basic catalog, without the Google credential helper, with the paintMeta convention on; the kit as a path dependency; question surfaces declared by carrying an action, as Gmail and Calendar declare them; the AgentCard authored as the Router's retrieval document, per task 2.6 decision 6; the roster's Gemini model.

## Invariants

- Phase decision 12 holds: the domain doc, prompt and card say what a CircleCI user sees, drawn from what the server returns — nothing of the shell, the join, pull requests as a key, or the other agents.

## Open items

- Carried to 7.6 and 7.9: acceptance item 4 fires only if the merged row reads a workflow; a row reading the run's own outcome sees the rerun as a value change in place.
- Carried to 7.8's grill: Gmail's recorder scrambles every string, so on the deterministic bed its pull-request cues will not match GitHub's.
