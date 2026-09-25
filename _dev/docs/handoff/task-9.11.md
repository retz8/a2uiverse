# Task 9.11 — README sweep: handoff

Plan: `_dev/docs/plan/task-9.11-readme-sweep.md`. Each draft is pushed to `main` on its repo; the user reviews on GitHub and gives feedback in chat.

## Where it stands

Steps 1–12 are done and reviewed:

- `a2uiverse-apps`: every vendor app (a new app README, agent, catalog), both mocks, the scaffold templates (plus a new app README template the scaffolder now writes), `create-a2ui-agent`, and a new `agent-kit/README.md`.
- `a2uiverse`: marketplace, `packages/sdk` and `sdk/js`, `shell-catalog`, orchestrator, client, and `src/canvas` (cut to a code guide).

Left: **step 13, `a2uiverse-apps/README.md`**, and **step 14, `a2uiverse/README.md`** — the two roots, the most important ones. The user shapes the root READMEs last, having seen every other one.

Done along the way, outside READMEs: the orchestrator's `Canvases` renamed to `Compositions` (with its types, readers, journal hook, refusals, design record); Gmail's and Calendar's `.env.example` given a `your-gcp-project-id` placeholder; the scaffolder writes an app README.

## Stance for drafting a README

- **For human developers, not AI.** Easy to read, easy to understand, concise. Details belong in the design records (`docs/design/*.md`), not the README.
- **Features first, mechanisms after.** Lead with what the thing does and what's cool about it, in the user's-eye terms; the machinery of the latest phase is a smaller section after. Ask "what are this component's main features?" before writing.
- **Context before mechanism.** Give the broad picture (where it sits, what the reader is looking at) before any detail that would read as absurd on its own.
- **Show it.** Screenshots and GIFs where they explain, captioned, displayed smaller than full size; drop any that don't earn their place.
- **Reference folds away.** Configuration, module tables, on-demand scripts, source maps and long lists go in `<details>` blocks. Commands stay open, in "Running it".
- **Each component in its own words.** "The canvas" is the client's name for its UI, never a unit: one question's screen is an answer (a past answer, a trail of answers). The orchestrator speaks of an A2A context and its composition. Don't borrow a term across components.
- **Never write the chat into the README.** No reasoning from the conversation, no restating the user's instructions (e.g. why the basic catalog was chosen), no "doesn't depend on A2UIVerse" framing.
- **Check every fact against the code** (commands, env vars, ports, counts, vendor doc links) and fix stale facts found on the way.

## Style rules

- No em dashes (—) anywhere; number ranges as "10 to 18".
- No task, decision, phase-number or SPEC-section references (`task-9.3`, `M8`, `SPEC §9.2`).
- Headings without a leading "The".
- Exact names: `a2ui-agent-kit`; "Agentic BFF"; A2UI and A2A unlinked in app READMEs (the roots link them).
- App, agent and catalog READMEs don't open on A2UIVerse; they end with a short "Connecting to A2UIVerse" section.
- Mermaid only where it clarifies; the user preferred a plain step list over a sequence diagram.

## Step 13 — `a2uiverse-apps/README.md`

- Define once what an app is: three parts — the vendor's MCP server (not built here), the agentic BFF (the A2A agent that answers with UI it generates in A2UI), the A2UI catalog.
- `paintMeta` (the paint titles and question marks the kit sends beside the A2UI) is the one thing an agent needs to be rendered on A2UIVerse's canvas — it belongs here, not in the app READMEs.
- The current README wrongly says the apps depend on `@a2uiverse/sdk`; none does.
- Roster with ports (GitHub 11001 · Gmail 11002 · Calendar 11003 · CircleCI 11004 · Linear 11005), the three run modes, the mock tier (`mocks/`, 12001+, opted in with `--agents-dir`), `create-a2ui-agent`, `agent-kit`.

## Step 14 — `a2uiverse/README.md`

- Last touched in Phase 4: missing the merged view, entity join, failure handling, the trail and the way back.
- The front door; GIFs and images belong here most. Reuse `docs/images/`.

## Taking screenshots and GIFs

In `docs/images/`: `composed-answer.png`, `trail.png`, `trail-drawer.png`, `past-canvas.png`, `way-back-circleci.gif`, `way-back-merged.gif`.

Taken from beat replays with no orchestrator and no model: start the client on a spare port (`pnpm --filter @a2uiverse/client exec vite --port 5199 --strictPort`), then drive headless Chromium from `apps/client` with `require('@playwright/test')` against `http://localhost:5199/?beat=<name>&instant`, waiting for `main[data-replay="done"]` (the headless browser runs on this machine, so `localhost` is right here). Crop to the region that matters (a slot is `[data-attribution="<App>"]`, the merged view `[data-slot="shell"]`); build GIFs with PIL, synced pairs sharing frame durations; give a replaced image a new filename, since GitHub caches. Useful beats: `9` (entity join), `23` (way back), `trail` (four questions on two branches; `Back` then `Trail` for a parked canvas and the drawer).
