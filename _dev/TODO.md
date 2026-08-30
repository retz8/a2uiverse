# A2UIVerse — Dev TODO

## Phase 0 — Scaffold [done]
Monorepo, workspace packages, root commands to run the local processes, per-package READMEs, sibling `a2uiverse-apps` skeleton. No behavior.
Spec: `_dev/docs/spec/phase-0-scaffold.md`.

- [x] **0.1** Doc edits — SPEC §9/§13/§15, `a2ui-sdk-design` skill (both repos), `a2uiverse-apps` README + CLAUDE.md
- [x] **0.2** Monorepo scaffold — pnpm + Turborepo, toolchain, `apps/{client,orchestrator,marketplace}` + `packages/{sdk,shell-catalog}`, READMEs, placeholder `dev`, gates green (after 0.1; parallel with 0.3)
- [x] **0.3** `[apps]` `a2uiverse-apps` skeleton — workspace, one-folder-per-app layout, CLAUDE.md setup + gates, gates green with no vendor (after 0.1; parallel with 0.2)
- [x] **0.4** Nightly routine setup, `a2uiverse` — labels, fresh-clone gate check, `schedule` registration, CLAUDE.md (after 0.2; parallel with 0.5)
- [x] **0.5** `[apps]` Nightly routine setup, `a2uiverse-apps` (after 0.3; parallel with 0.4)

## Phase 1 — Spine [done]
Client ↔ orchestrator ↔ one vendor agent, end to end: canvas shell ported from `a2ui-github`, orchestrator as an A2A agent server, hardcoded registry, intent journal (M0). The client talks only to the orchestrator.
Spec: `_dev/docs/spec/phase-1-spine.md`.

- [x] **1.1** Doc edits — SPEC wording/roster/registry card duty/backlog, TODO roadmap amendment (Phase 2 three agents, agent-kit phase, renumber), tunnel docs port ranges (both repos), `a2uiverse-apps` CLAUDE.md + README wording
- [x] **1.2** Orchestrator — A2A server on 0.3.14, port 10001, minimal static card, hardcoded Registry with bundle record, AgentsPool transparent relay + source stamp, IntentJournal (after 1.1; parallel with 1.3)
- [x] **1.3** Client port — canvas only, Radix Themes shell, Primer scoped to fragment, `orchestratorApi` static catalog map, `link:` primer-a2ui-adapter, replayBeat, tests (after 1.1; parallel with 1.2)
- [x] **1.4** Spine integration + acceptance — client → orchestrator wiring, `pnpm dev` (vendor agent started by hand from `a2ui-github`), READMEs, beat re-recording + visual Playwright spec, transparency/action/journal/card checks, Claude-in-Chrome live verification via tunnel (after 1.2 and 1.3)
- [x] **1.5** `[apps]` GitHub app copy — `a2uiverse-apps/github/`, port 11001, catalog id fixed, `github-catalog` published with its provider + CSS setup owned by the bundle, client on published package, gates green in both repos (after 1.4)

## Phase 2 — Layout-only composition [WIP]
3 agents · 3 catalogs on one surface, no synthesis (M1): GitHub (copied in 1.5), Gmail, Google Calendar. Basic Router, Planner, AgentsPool fan-out, flat-surfaces composition (placement on A2A metadata), shell catalog composition primitives, plan/fill/collapse, provenance + attribution, partition isolation. Deferred from 1.3: unknown-component handling at the composition layer; shell re-skin on Radix tokens with the shell catalog. Deferred from 1.4: `pnpm dev:agents` launcher + `dev:all`. The vendor-agent template/CLI moved to Phase 3.
Spec: `_dev/docs/spec/phase-2-layout-composition.md`.

- [x] **2.1** Doc edits — SPEC §4.1/§4.2/§4.3/§13/§14/§16 amendments per spec decision 18
- [x] **2.2** `sdk` composition extension — `contracts/` JSON + `js/` + `python/` projections, contract tests, workspace/turbo wiring incl. Python toolchain, both published (after 2.1)
- [x] **2.3** `shell-catalog` — schema + basic-catalog implementation, Radix-bound token theme, `Slot` + `Attribution` (after 2.1; parallel with 2.2)
- [x] **2.4** Orchestrator composition core — embedder + Registry card surface + Router, Planner (AI SDK seam, plan schema, per-agent requests), fan-out dispatch, three relay rewrites (stamp · surfaceId namespace · partition filter), slot-lifecycle painting, journal embedding (after 2.2; parallel with 2.3, 2.5–2.8)
- [x] **2.5** Client composition — multi-catalog processor, placement map, fragment boundary, Slot mounting, validation + `VALIDATION_FAILED` reporting, ChoicePicker pnpm patch, collision detector (after 2.2 and 2.3; parallel with 2.4, 2.6–2.8)
- [WIP] **2.6** `[apps]` Gmail app — three-mode agent on 11002 against live Gmail MCP, `gmail-catalog` (basic + product tokens) published, its four beats recorded (after 2.2; parallel with 2.4, 2.5, 2.7, 2.8)
- [ ] **2.7** `[apps]` Calendar app — three-mode agent on 11003 against live Calendar MCP, `calendar-catalog` published, its beats recorded (after 2.2; parallel with 2.4, 2.5, 2.6, 2.8)
- [WIP] **2.8** `[apps]` `github-catalog` boundary retrofit — scoped provider, anchored portal root, republish; AgentCard retrofitted as a retrieval document (task-2.6 decision 14 — the three cards must be comparable embedding targets or the Router skews); empty the accepted-violation list in the client's collision detector; 2.5's live tunnel verification rides this session (after 2.1; parallel with 2.2–2.7)
- [ ] **2.9** Integration + acceptance — `dev:agents` launcher + `dev:all` + `dev:client`/`dev:orch`/`dev:marketplace` aliases, the composed fan-out beat recorded over live MCP, attributed prose channel (stamp `onAgentText`, buffer per source, plural notices), visual Playwright specs, acceptance items 1–11, Claude-in-Chrome live verification via tunnel (after 2.4–2.8)

## Phase 3 — Agent building kit
Shared vendor-agent logic extracted across the three agents into a published A2UI+A2A agent SDK/CLI in `a2uiverse-apps` (M1k). Uniform run-mode flag, single launcher for installed agents, vendor dependency rule amended, one-provider-and-CSS-setup-per-catalog-bundle rule.

## Phase 4 — Synthesis, identical shapes
Two sibling mock vendors merged (M2). Synthesizer, derived bindings, BindingEvaluator, IntegrityChecker, generation stamps, disclosure line.

## Phase 5 — Heterogeneous shapes
Temporal merge over Calendar · Mail · GitHub (M3). Unrelated data models, shared-axis merge, key-based refs, decline, quiescence across unsynchronized arrivals.

## Phase 6 — Entity resolution
Entity join (M4). The differentiator proven.

## Phase 7 — Late arrival + failure
Per-source deadlines, failure tiles, decline, late absorb as a visible attributed update (M6).

## Phase 8 — Durable composition
Timeline, frozen + stamped, refresh, add/drop source, "compare these" (M5).

## Phase 9 — App bundle + registry
Bundle format, local install, registry no longer hardcoded, the GitHub app installed as a bundle (M7).

## Phase 10 — Authority surfaces
Auth-required → authority tile, consent dialog, AuthVault, credential components barred from all catalogs (M8). Expand the orchestrator's slot naming policy for multi-account: slot names derived from appId alone stop being collision-free once one app can fan out under two accounts.

## Phase 11 — Marketplace + publish
Local index, package hosting, publish step, hello-fragment smoke test (M9).

## Phase 12 — Shell trusted pages
Store page, App Library, accounts (M10).

## Phase 13 — Store loop
Capability gap → marketplace index → install → resume (M11).

## Phase 14 — Ecosystem run
Publish a new app → discover → install → compose with an existing one → act inside it. One sitting, no code changes; the deliverable is the recording (M12).

## Backlog
- Capability-gap terminal state when the marketplace has nothing either — what the capability tile says, whether the reserved slot collapses or stands (Phase 13's grill)
- Stream the synthesis fragment into its reserved slot (§16 dead-air mitigation)
- S5 multi-account exercised
- Migrate to A2A 1.0 when `a2ui-agent-sdk` does — client, orchestrator, vendor kit in one move
