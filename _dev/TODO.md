# A2UIVerse — Dev TODO

## Phase 0 — Scaffold [done]
Monorepo, workspace packages, root commands to run the local processes, per-package READMEs, sibling `a2uiverse-apps` skeleton. No behavior.
Spec: `_dev/docs/spec/phase-0-scaffold.md`.

- [x] **0.1** Doc edits — SPEC §9/§13/§15, `a2ui-sdk-design` skill (both repos), `a2uiverse-apps` README + CLAUDE.md
- [x] **0.2** Monorepo scaffold — pnpm + Turborepo, toolchain, `apps/{client,orchestrator,marketplace}` + `packages/{sdk,shell-catalog}`, READMEs, placeholder `dev`, gates green (after 0.1; parallel with 0.3)
- [x] **0.3** `[apps]` `a2uiverse-apps` skeleton — workspace, one-folder-per-app layout, CLAUDE.md setup + gates, gates green with no vendor (after 0.1; parallel with 0.2)
- [x] **0.4** Nightly routine setup, `a2uiverse` — labels, fresh-clone gate check, `schedule` registration, CLAUDE.md (after 0.2; parallel with 0.5)
- [x] **0.5** `[apps]` Nightly routine setup, `a2uiverse-apps` (after 0.3; parallel with 0.4)

## Phase 1 — Spine [WIP]
Client ↔ orchestrator ↔ one vendor agent, end to end: canvas shell ported from `a2ui-github`, orchestrator as an A2A agent server, hardcoded registry, intent journal (M0). The client talks only to the orchestrator.
Spec: `_dev/docs/spec/phase-1-spine.md`.

- [WIP] **1.1** Doc edits — SPEC wording/roster/registry card duty/backlog, TODO roadmap amendment (Phase 2 three agents, agent-kit phase, renumber), tunnel docs port ranges (both repos), `a2uiverse-apps` CLAUDE.md + README wording
- [ ] **1.2** Orchestrator — A2A server on 0.3.14, port 10001, minimal static card, hardcoded Registry with bundle record, AgentsPool transparent relay + source stamp, IntentJournal (after 1.1; parallel with 1.3)
- [ ] **1.3** Client port — canvas only, Radix Themes shell, Primer scoped to fragment, `orchestratorApi` static catalog map, `link:` primer-a2ui-adapter, replayBeat, tests (after 1.1; parallel with 1.2)
- [ ] **1.4** Spine integration + acceptance — client → orchestrator wiring, `pnpm dev`, READMEs, transparency/action/journal/card checks, Claude-in-Chrome live verification via tunnel (after 1.2 and 1.3)
- [ ] **1.5** `[apps]` GitHub app copy — `a2uiverse-apps/github/`, port 11001, catalog id fixed, `github-catalog` published, client on published package, gates green in both repos (after 1.4)

## Phase 2 — Layout-only composition
2 agents · 2 catalogs on one surface, no synthesis (M1). Router, Planner, AgentsPool, UIComposer one-tree graft, shell catalog composition primitives, plan/fill/collapse, provenance + attribution, partition isolation.

## Phase 3 — Synthesis, identical shapes
Two sibling mock vendors merged (M2). Synthesizer, derived bindings, BindingEvaluator, IntegrityChecker, generation stamps, disclosure line.

## Phase 4 — Heterogeneous shapes
Temporal merge over Calendar · Mail · GitHub (M3). Unrelated data models, shared-axis merge, key-based refs, decline, quiescence across unsynchronized arrivals.

## Phase 5 — Entity resolution
Entity join (M4). The differentiator proven.

## Phase 6 — Late arrival + failure
Per-source deadlines, failure tiles, decline, late absorb as a visible attributed update (M6).

## Phase 7 — Durable composition
Timeline, frozen + stamped, refresh, add/drop source, "compare these" (M5).

## Phase 8 — App bundle + registry
Bundle format, local install, registry no longer hardcoded, `a2ui-github` as the first external app (M7).

## Phase 9 — Authority surfaces
Auth-required → authority tile, consent dialog, AuthVault, credential components barred from all catalogs (M8).

## Phase 10 — Marketplace + publish
Local index, package hosting, publish step, hello-fragment smoke test (M9).

## Phase 11 — Shell trusted pages
Store page, App Library, accounts (M10).

## Phase 12 — Store loop
Capability gap → marketplace index → install → resume (M11).

## Phase 13 — Ecosystem run
Publish a new app → discover → install → compose with an existing one → act inside it. One sitting, no code changes; the deliverable is the recording (M12).

## Backlog
- Stream the synthesis fragment into its reserved slot (§16 dead-air mitigation)
- S5 multi-account exercised
