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

## Phase 2 — Layout-only composition [done]
3 agents · 3 catalogs on one surface, no synthesis (M1): GitHub (copied in 1.5), Gmail, Google Calendar. Basic Router, Planner, AgentsPool fan-out, flat-surfaces composition (placement on A2A metadata), shell catalog composition primitives, plan/fill/collapse, provenance + attribution, partition isolation. Deferred from 1.3: unknown-component handling at the composition layer; shell re-skin on Radix tokens with the shell catalog. Deferred from 1.4: `pnpm dev:agents` launcher + `dev:all`. The vendor-agent template/CLI moved to Phase 3.
Spec: `_dev/docs/spec/phase-2-layout-composition.md`.

- [x] **2.1** Doc edits — SPEC §4.1/§4.2/§4.3/§13/§14/§16 amendments per spec decision 18
- [x] **2.2** `sdk` composition extension — `contracts/` JSON + `js/` + `python/` projections, contract tests, workspace/turbo wiring incl. Python toolchain, both published (after 2.1)
- [x] **2.3** `shell-catalog` — schema + basic-catalog implementation, Radix-bound token theme, `Slot` + `Attribution` (after 2.1; parallel with 2.2)
- [x] **2.4** Orchestrator composition core — embedder + Registry card surface + Router, Planner (AI SDK seam, plan schema, per-agent requests), fan-out dispatch, three relay rewrites (stamp · surfaceId namespace · partition filter), slot-lifecycle painting, journal embedding (after 2.2; parallel with 2.3, 2.5–2.8)
- [x] **2.5** Client composition — multi-catalog processor, placement map, fragment boundary, Slot mounting, validation + `VALIDATION_FAILED` reporting, ChoicePicker pnpm patch, collision detector (after 2.2 and 2.3; parallel with 2.4, 2.6–2.8)
- [x] **2.6** `[apps]` Gmail app — three-mode agent on 11002 against live Gmail MCP, `gmail-catalog` (basic + product tokens) published, its four beats recorded (after 2.2; parallel with 2.4, 2.5, 2.7, 2.8)
- [x] **2.7** `[apps]` Calendar app — three-mode agent on 11003 against live Calendar MCP, `calendar-catalog` published, its beats recorded (after 2.2; parallel with 2.4, 2.5, 2.6, 2.8)
- [x] **2.8** `[apps]` `github-catalog` boundary retrofit — scoped provider, anchored portal root, republish; AgentCard retrofitted as a retrieval document (task-2.6 decision 14 — the three cards must be comparable embedding targets or the Router skews); empty the accepted-violation list in the client's collision detector; 2.5's live tunnel verification rides this session (after 2.1; parallel with 2.2–2.7)
- [x] **2.9** Integration + acceptance — `dev:agents` launcher + `dev:all` + `dev:client`/`dev:orch`/`dev:marketplace` aliases, the composed fan-out beat recorded over live MCP, attributed prose channel (stamp `onAgentText`, buffer per source, plural notices), visual Playwright specs, acceptance items 1–11, Claude-in-Chrome live verification via tunnel (after 2.4–2.8)
- [x] **2.10** README sweep — both repos, against the phase's end state: three agents, composition on orchestrator/client, run commands per 2.9's launchers (after 2.9)
- [x] **2.11** `[apps]` Vendor fragment visual pass — Gmail + Calendar product theme sheets (scoped stylesheet layer, SPEC §14), detector ships leading-compound classes only; trees, brand docs and fixtures untouched — the defects were catalog-implementation-level (after 2.6 and 2.7; before 2.9's beat recording)
- [x] **2.12** Live visual review — all three agents in `llm` mode over real MCP, a real conversation set driven through the canvas: does the composed screen read as one screen, and is this the thing we meant to build (after 2.10)

## Phase 3 — Agent building kit [done]
Shared vendor-agent logic extracted across the three agents into a published A2UI+A2A agent SDK/CLI in `a2uiverse-apps` (M1k). Uniform run-mode flag, single launcher for installed agents, vendor dependency rule amended, one-provider-and-CSS-setup-per-catalog-bundle rule.
Spec: `_dev/docs/spec/phase-3-agent-kit.md`.

- [x] **3.1** Doc edits — SPEC §13 dependency-rule amendment + stale `@a2uiverse/sdk` catalog-half claim reconciled, §14 `paintMeta` delta row, one-provider-and-CSS-setup-per-catalog-bundle review rule (#1)
- [x] **3.2** `[apps]` SDK package + stratum-1 extraction — Python kit (executor, servers, recorder, catalog load/validation, prompt assembly, `paint_meta`, beat pipeline), uniform `--mode deterministic|stub|live` entrypoint, per-vendor config, three agents refactored on path deps, shared tests into the kit, beats replay unchanged (after 3.1)
- [x] **3.3** `[apps]` Stratum-2 skeletons — toolset-wrapper base class, MCP-wiring + tool-shaping skeletons/hooks in the kit; vendor policy bodies rehomed onto them (after 3.2; parallel with 3.4)
- [x] **3.4** `[apps]` Scaffold CLI — TS workspace package, scaffold flow with the basic-themed/custom catalog option, generated agent on a version-pinned git dep, manifest emission; carries 3.3's deferred opt-in questions: Google ADC credential block (does the vendor need it), a2uiverse-ecosystem readiness (for now just paintMeta wiring) (after 3.2; parallel with 3.3)
- [x] **3.5** Launcher — platform `dev:agents` rewritten table-free: manifest-glob discovery over the agents dir, `--mode` passthrough to the kit entrypoint, agent list command, existing flag parity (after 3.2)
- [x] **3.6** Integration + acceptance — `dev:all` end to end, fourth-app scaffold proof (basic variant boots + paints, custom variant gates, then deleted) — note the orchestrator's own hardcoded registry: a scaffolded app is launchable by existing but not routable without a registry entry or `A2UIVERSE_AGENT_URLS` override, README/run-command updates both repos, live tunnel sanity pass (after 3.3–3.5)
- [x] **3.7** `[apps]` GitHub agent write tier — off the read-only endpoint onto the full toolset surface (capability = whatever MCP + token allow, no confinement), proposal/toggling convention as domain-doc guidance, read-only identity sweep (prose, card, README, tests), live tunnel verification; beats/fixtures untouched (after 3.3)

## Phase 4 — Synthesis, identical shapes [done]
Two sibling mock vendors merged (M2). Synthesizer, derived bindings, BindingEvaluator, IntegrityChecker, generation stamps, disclosure. Shapes identical by construction, so the join is free and every remaining hard thing is machinery. Mocks are quarantined from the default roster and kept as the clean-room regression bed.
Spec: `_dev/docs/spec/phase-4-synthesis.md`.

- [x] **4.1** Doc edits — SPEC §5.4 disclosure amendment, §6.2–§6.3 absent/invalid naming, §14 register corrections + cross-partition ref row, `a2uiverse-apps` docs for the mock tier
- [x] **4.2** `sdk` — synthesis wiring contract (rows, refs, formulas, generation stamps, the metadata channel), contract tests, published (after 4.1; parallel with 4.3, 4.6)
- [x] **4.3** `shell-catalog` — operator function definitions, the derived-value component, the sort control (after 4.1; parallel with 4.2, 4.6)
- [x] **4.4** Orchestrator synthesis core — partition materialization, Synthesizer, IntegrityChecker + generation stamps, plan-schema reservation + Planner prompt, synthesis surface painting, decline → collapse (after 4.2; parallel with 4.5, 4.6, 4.7)
- [x] **4.5** Client synthesis — wiring intake, BindingEvaluator, derived-model evaluation + data-model write, sort, partial-value integration (after 4.2 and 4.3; parallel with 4.4, 4.6, 4.7)
- [x] **4.6** `[apps]` Two mock storefronts — scaffolded into the quarantined tier, shared product dataset, three run modes with `live` over an in-repo dataset, both instrument behaviours (drill-down → absent; in-place reorder → invalid), beats recorded (after 4.1; parallel with 4.2–4.5)
- [x] **4.7** Mock profile plumbing — launcher discovery opt-in and registry opt-in (after 4.6; parallel with 4.4, 4.5)
- [x] **4.8** Integration + acceptance — end to end under the profile, both instruments proven, decline, sort, partial-value visibility, dead-air measured, live tunnel verification (after 4.4–4.7)

## Phase 5 — Heterogeneous shapes [WIP]
Temporal merge over Calendar · Mail · GitHub (M3). Unrelated data models, shared-axis merge, key-based refs, decline, quiescence across unsynchronized arrivals. The Synthesizer authors the merged view — the synthesize data model: a shell-catalog tree, a free-form derived data model with formula leaves, sorts, a note — replacing the Phase 4 wiring and derived table.
Spec: `_dev/docs/spec/phase-5-heterogeneous-shapes.md`.

- [ ] **5.1** Doc edits — SPEC §5 turn line and §5.2, §10 Synthesizer row, §12 M3 line, §14 rows for synthesis wiring, path predicates, derived-value rule
- [ ] **5.2** `sdk` — composition contract v0.3: the synthesize data model (tree, formula-leaf model, predicate refs, sorts, note), JS and Python projections, contract tests, published (after 5.1; parallel with 5.3, 5.6)
- [ ] **5.3** `shell-catalog` — `SortControl` over a sort declaration, catalog schema and operator descriptions exported for the Synthesizer's prompt, `DerivedValue` untouched (after 5.1; parallel with 5.2, 5.6)
- [ ] **5.4** Orchestrator — Synthesizer rewrite: text output, validate against contract and catalog, one retry; the prompt as the composition-authoring document in a2uiverse words; checklist with the derived-value rule and predicate resolution; predicate refs in the IntegrityChecker; painter paints the model-authored tree; re-synthesis handed its previous output; note journaled. Planner prompt: the synthesis brief and the vendor merge asks (after 5.2 and 5.3; parallel with 5.5)
- [ ] **5.5** Client — BindingEvaluator over the free-form model with predicate refs, sorts over declared arrays, v0.3 intake and validation, stale marker, synthesis fixture re-recorded (after 5.2 and 5.3; parallel with 5.4)
- [ ] **5.6** `[apps]` S1 beats — the "today" turn recorded per vendor in live mode, agents unmodified (after 5.1; parallel with 5.2–5.5)
- [ ] **5.7** Integration + acceptance — temporal merge end to end over the real roster live, comparison over the mocks, drill-down → absent and reorder → no re-synthesis under predicates, re-synthesis with previous output, decline, quiescence with real latency spread, dead air measured, live tunnel verification (after 5.4–5.6)
- [ ] **5.8** Design records — `synthesis.md` rewritten, Synthesizer sections of the orchestrator and client records (after 5.7)

## Phase 6 — The shell as an agent
The orchestrator's model answers an utterance itself, in the shell catalog, when no vendor serves it — installed agents, what the canvas can do, the platform's own state (M3s). What platform state the model may read. Which shell pages it may author and which stay trusted, against M10's Store page · App Library · accounts. Expands the Planner's framing in the same sense Phase 5 expanded the Synthesizer's: the archetype vocabulary revisited, the Planner authoring in prose what the shell should show. The shell-as-agent framing is decided in Phase 6's own grill. Before Phases 8, 11 and 14, which paint shell content into slots.

## Phase 7 — Entity resolution
Entity join (M4). The differentiator proven. Navigation from a merged cell to the originating vendor subtree (SPEC §7), deferred from Phase 5.

## Phase 8 — Late arrival + failure
Per-source deadlines, failure tiles, decline, late absorb as a visible attributed update (M6).

## Phase 9 — Durable composition
Timeline, frozen + stamped, refresh, add/drop source, "compare these" (M5).
Carried from 4.8, found in the live run: **acting inside a parked composition forks a turn whose answer lands nowhere.** The Phase 1 fork path assumes an action produces a new paint. Under composition a vendor answers an action with an `updateDataModel` on its existing surface, and that surface exists only inside the parked snapshot — the live head was torn down and replaced by the later turn — so the update has no surface to land on and the canvas shows nothing (journal 2026-09-04 11:50–11:53: four `sort-by` actions carrying `a2uiForkContext`, each completed with `shop-a:list`/`shop-b:list` updated, none visible). The orchestrator is confused the same way: it relays the action against the context's *current* composition, not the one the user was looking at, so its partitions and any live wiring belong to a different screen. The semantics to build: a fork from a parked composition rehydrates that composition — its surfaces, placement, partitions, wiring and generations — as the new live head on both sides, then applies the vendor's answer to it; a decline or re-synthesis then runs against the screen the user acted on. Until then, actions in a parked composed view should be blocked with a cue rather than silently dropped.

## Phase 10 — App bundle + registry
Bundle format, local install, registry no longer hardcoded, the GitHub app installed as a bundle (M7).

## Phase 11 — Authority surfaces
Auth-required → authority tile, consent dialog, AuthVault, credential components barred from all catalogs (M8). Expand the orchestrator's slot naming policy for multi-account: slot names derived from appId alone stop being collision-free once one app can fan out under two accounts.

## Phase 12 — Marketplace + publish
Local index, package hosting, publish step, hello-fragment smoke test (M9).

## Phase 13 — Shell trusted pages
Store page, App Library, accounts (M10).

## Phase 14 — Store loop
Capability gap → marketplace index → install → resume (M11).

## Phase 15 — Ecosystem run
Publish a new app → discover → install → compose with an existing one → act inside it. One sitting, no code changes; the deliverable is the recording (M12).

## Backlog
- The Planner's `archetype` (`card|panel|row|full`) is planned, validated and journaled but affects nothing: `Frame` sizes a row's slots equally regardless. Decide what each value should mean — whether `full` breaks out of its row, whether weights are proportional — or drop it from the plan schema
- Revisit Gmail/Calendar product styling depth once compositions and functionality land at later milestones
- Capability-gap terminal state when the marketplace has nothing either — what the capability tile says, whether the reserved slot collapses or stands (Phase 14's grill)
- Stream the synthesis fragment into its reserved slot (§16 dead-air mitigation). Measured in 4.8 over the mock roster (last source settled → synthesis outcome, journal `synthesis.deadAirMs`, Planner and Synthesizer on `gemini-2.5-flash` at low effort): deterministic mocks — comparison utterance 3.7 s · 4.2 s · 9.2 s across three runs, re-synthesis after an in-place reorder 3.8 s, decline 1.2–1.5 s; live mocks — comparison 8.0 s, re-synthesis after reorder 3.7 s, decline 1.4 s. The interval is the Synthesizer's own call; the mocks' mode barely moves it
- A re-synthesis may re-author the merged view, not only re-point its refs: in the live pass the reorder's re-synthesis swapped the per-shop price columns for per-shop availability columns. The Synthesizer is called with the Planner's request alone; whether it should be handed the previous wiring's fields so a bump preserves the view's shape is undecided
- S5 multi-account exercised
- Calendar's in-place RSVP toggle works in an LLM mode for the first time: the kit's executor used to reject every turn that carried no `createSurface` (fixed in 4.6). Verified in stub mode — the turn it now accepts is one `validate_surface` still rejects — but only when the prompt asks for an in-place change; unprompted the model paints a fresh RSVP surface. Record a live beat for it, and decide whether the prose should prefer the in-place turn
- Migrate to A2A 1.0 when `a2ui-agent-sdk` does — client, orchestrator, vendor kit in one move
