# Task 7.3 — Linear app

The Linear vendor app in `../a2uiverse-apps/linear/`: a three-mode agent on port 11005 over Linear's hosted MCP server, a `linear-catalog` package, its manifest, a Linear workspace with its GitHub integration on the `a2uiverse` repository as its setup, and the platform wiring that puts the app on the canvas. Parent: `_dev/TODO.md` 7.3, under `_dev/docs/spec/phase-7-entity-resolution.md` (decisions 3 and 12). Sibling: `_dev/docs/spec/task-7.2-circleci-app.md`.

## Scope

- `linear/agent/` — the three-mode A2A agent (`deterministic` / `stub` / `live`), its knowledge docs, examples, fixtures, and beats.
- `linear/linear-catalog/` — the basic catalog under a Linear product theme, with two appended product components.
- `linear/manifest.json`.
- The Linear workspace, its team, its GitHub integration on `retz8/a2uiverse`, and the issues and pull requests the app is recorded over.
- The empirical check of what the server returns for an issue's linked pull request and branch, recorded in the phase spec.
- The platform wiring: the orchestrator's registry entry and the client's `linear-catalog` dependency, catalog map and resolver entries.

## Locked decisions

### 1. Backend: Linear's hosted MCP server with a personal API key

The agent reaches Linear's hosted MCP server over streamable HTTP, sending a personal API key from `agent/.env` as a bearer token. The key carries the Read and Write permissions. `live` mode refuses to start without the key. The agent never runs a consent flow. If the server rejects a personal key sent as a bearer token, the fallback is a token from a Linear OAuth application's client-credentials grant, recorded as a finding.

### 2. The setup: one team, the GitHub integration, three issues

A Linear workspace on the free plan with one team, its GitHub integration installed on `retz8/a2uiverse`. Three issues: one linked to a throwaway pull request by branch name, one linked to a throwaway pull request by a magic word in the pull request's title or description, and one with no pull request. The two pull requests stay open and are never merged; task 7.8 decides whether to reuse or close them. The four-vendor bed for the pinned utterance is task 7.8's.

### 3. The empirical check, recorded in the phase spec

What the server's issue read returns for each linking path — whether its git branch name equals the pull request's branch, and what the pull-request attachment carries — replaces the unverified sentence in the phase spec's decision 3. The fallback to issue text stays only for a path that returns nothing usable. The captured responses go into the task's handoff.

### 4. The task wires the app into the platform

7.3 closes with the platform commit that puts the app on the canvas — the registry entry, the client's `linear-catalog` dependency, and its catalog map and resolver entries — as task 7.2 closed. The Linear fragment is checked live in the canvas through the tunnel. The 7.3 line in `_dev/TODO.md` names the wiring.

### 5. The app's scope: issues

The app shows issues: lists — the user's own, a team's, filtered — an issue's detail with its description, status, priority, assignee and labels, its comments, and its linked pull requests and git branch as Linear's issue page shows them. Projects, cycles, documents, initiatives, releases and Linear's pull-request review are outside it.

### 6. A pinned tool inventory

The agent holds the issue reads, plus `save_issue` for creating and updating an issue and `save_comment`; every other tool is withheld client-side, the delete, label-creation and attachment tools among them. The exact names are pinned after a live `tools/list`. The agent's README says how to expand the list.

### 7. Create, update and comment are proposed, then confirmed

Every write paints a proposal naming what it will change; the tool fires on the user's confirm action. This is the grammar of the GitHub and CircleCI apps.

### 8. Teams from the server

The agent keeps no team list in its environment. It finds teams through the server's own reads and covers what the key can see; narrowing is done by restricting the key's teams in Linear.

### 9. Theme: tokens, a scoped theme sheet, a brand-guidance doc, two product components

`linear-catalog` carries the three layers Gmail, Calendar and CircleCI carry: the `--a2ui-*` tokens, a scoped product theme sheet on Gmail's sheet as template, and a brand-guidance doc for the model. The visual reference is Linear's web app as its documentation screenshots show it, not the marketing site; the palette is sampled from them. Under SPEC §9.2 the catalog appends two product components: the status icon, a circle drawn by the workflow state's type in the state's color, and the priority icon.

### 10. Three beats; deterministic mode carries the status change

The beats are: the user's issues; an issue opened — the one linked by branch name — with its description, comments, linked pull request and branch; and a status change proposed, confirmed, and the issue repainted in place. One live run under the recorder yields the payloads for `stub` mode and the painted streams for `deterministic` mode, whose action map covers the three beats. Creating an issue and commenting are in the prompt and in `live` mode, not beats.

### 11. Real values, no pseudonymization

The recorded payloads and streams keep their real values, as GitHub's and CircleCI's do. A publishability test fails the corpus on anything token- or secret-shaped.

### 12. The rest follows the roster

Scaffolded by `create-a2ui-agent` on the basic catalog, without the Google credential helper, with the paintMeta convention on; the kit as a path dependency; question surfaces declared by carrying an action; the AgentCard authored as the Router's retrieval document, per task 2.6 decision 6; the roster's Gemini model.

## Invariants

- Phase decision 12 holds: the domain doc, prompt and card say what a Linear user sees, drawn from what the server returns — nothing of the shell, the join, pull requests as a key, or the other agents. An issue's linked pull requests and branch are part of what a Linear user sees.
