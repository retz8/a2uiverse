# A2UIVerse — Project Spec

> **A2UIVerse = A2UI + Universe.** The application ecosystem for A2UI agents. A2UI defines how agents describe user interfaces; A2UIVerse defines how those interfaces become composable applications — agents as first-class, composable application primitives that can be packaged, discovered, installed, orchestrated, and composed into interactive experiences.

## 1. What this is

The upper semantic layer of the Semantic Computer architecture, built as a standalone project. A full front-end ecosystem for A2UI:

- **App** — an A2A agent that paints its own UI. Not a client application.
- **Store** — how an app is published, discovered, and installed in the agentic era.
- **Canvas shell** — the canvas from `a2ui-github`, generalized so it composes multiple agents into one surface.
- **Orchestrator** — window manager + package manager + intent router. The new deliverable.

No SSM/OS work is in scope. The lower layers survive as an intent journal and a narrow future contract.

### Differentiator

**Cross-agent UI composition.** Multiple agents, each in its own design system, painted into one surface with a shell-authored synthesis surface over their data. This is the first-class citizen; everything else serves it.

Composition spectrum:

```
L0 single surface   L1 tiled          L2 fragment graft        L3 deep merge
(a2ui-github)       (whole surfaces   (shell layout + agent    (dissolve trees)
                     side by side)     fragments in slots)
                                       ← target                ← ruled out
```

L3 is ruled out permanently. Anything L3 would have served is served by the synthesis surface instead.

---

## 2. Axioms

1. **The vocabulary is the boundary.** LLM authors → closed vocabulary bounds → validator checks → runtime executes. Applied to: UI trees (A2UI), intent projection, data wiring (derived bindings), the integrity gate (the validator decides whether the model is needed at all), and catalog subtraction (credential components barred).
2. **Open semantics, thin closed projection.** Free-form wherever an LLM is the reader; tiny fixed vocabularies only where deterministic code must act.
3. **Replace pre-agreement with understanding.** No pre-declared schemas, no intent taxonomies, no per-app integration code, no shell token contract imposed on apps. The shell understands what flows through it at composition time. Understanding is expensive so it runs once; arithmetic is cheap so it runs always.
4. **Trusted pixels.** Any UI that grants authority is deterministic shell UI, never generated. Browsing is rich; consent is boring. This is a distinct pattern from 1–3: not bounded generation, but no generation.

---

## 3. Composition scenarios

The spec carries all of these. Sorted by the kind of join the shell performs.

| #   | Join                              | Scenario                                                                                                                               | Synthesis                       |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| S1  | Shared time axis                  | **Temporal merge** — Calendar + Mail + GitHub → one timeline; ops incident on one axis                                                 | merge / sort keys, counts       |
| S2  | Same real-world entity            | **Entity join** — a camera across B&H, Amazon, KEH: merged price/availability row, each vendor's native widget preserved alongside     | entity resolution + summary row |
| S3  | Semantic equivalence              | **Juxtaposition** — two agents on one question, agreement map                                                                          | disagreement detection          |
| S4  | Task spine                        | **Multi-step job** across tools, persistent spine                                                                                      | sequential; mostly layout-only  |
| S5  | Same catalog, different instances | **Multi-account** — N accounts of one app, merged                                                                                      | trivial; identical shapes       |
| S6  | None                              | **Long tail** — small agents nobody would ever aggregate; the aggregator is generated per request instead of incorporated as a company | —                               |
| S7  | None                              | **Parallel independent tasks** — unrelated agents side by side                                                                         | none; layout-only               |

- **Architectural target:** S2 entity join — the only scenario that requires fragment graft.
- **Proving milestone:** S1 temporal merge, over GitHub · Gmail · Google Calendar.
- **Entity resolution** is a named responsibility of the Synthesizer, not a side effect of derived bindings.
- S5 is supported by the architecture and not exercised by the milestone ladder (§12).

---

## 4. Surface model

### 4.1 One composed screen, flat surfaces

A composed screen renders as a single tree; on the wire it is a flat set of A2UI surfaces. A **fragment** is one agent's surface, mounted into a slot of the shell's layout surface, carrying:

- its own data-model **partition** — the surface's data model
- its own **catalog scope** — the surface's `catalogId`, fixed at creation
- its own **provenance tag**
- its own **message channel** back to the agent that owns it

Placement (`surface → slot`) rides on A2A message metadata. The shell's `Slot` components are purely local placeholders — no component tree references another surface. **Graft** means mounting a surface into a slot. Composition is a shell capability, not a protocol feature.

Consequences:

- Surface ids are namespaced by the orchestrator (`<appId>:<surfaceId>`) — the one A2UI rewrite. Component ids, binding paths, and catalog ids are untouched.
- The relay also rewrites the **A2A envelope** around that untouched A2UI: it stamps composition metadata, and it demotes each vendor's terminal state so the hub owns the turn's single final. These are envelope bookkeeping, not content — which is why the A2UI claim above is the strong one, and why the two are counted separately.
- The rendered tree unifies; the wire and the data model partition. A fragment's bindings resolve only inside its own partition.
- The shell reads across all partitions. This is the hub privilege and the only asymmetry in the system.
- Catalog resolution is per surface, not global.
- Repaint is surface replacement.

### 4.2 Shell catalog

The **shell** is every platform-owned surface — the canvas container, the synthesis surface, the trusted pages, the authority dialogs. The **shell catalog** is the orchestrator's paint vocabulary: the standard A2UI basic catalog under a neutral `--a2ui-*` token theme, plus composition primitives (`Slot`, `Attribution`). Its implementation is the basic catalog's React implementation themed by tokens — no mapping of the basic catalog's components; the composition primitives are its own mappings, shipped with their schema in `shell-catalog`. The shell's own pages and widgets are built on Radix Themes. The orchestrator paints content, not just structure. The orchestrator's painted output is a **synthesis fragment** grafted through the same path as any agent's fragment. There is no privileged paint path.

The word "chrome" is not used.

### 4.3 Visual authority

**The shell owns the container; the vendor owns the interior.**

- Shell: layout, frames, grid, gutters, its own synthesis surface.
- Vendor: everything inside its fragment's box — font, spacing, color, components, design system. Total.
- No token contract. The shell never reaches into a fragment.
- Coherence comes from spatial discipline, not stylistic normalization.
- Graft granularity is the subtree/panel.

Every grafted fragment carries a shell-owned **attribution affordance** — rendered by the shell, in the shell catalog, in the shell's own surface — that the fragment cannot suppress, restyle, or occlude. The shell controls its prominence: a quiet persistent marker on the fragment boundary, full attribution on hover/focus, escalation when authority is in play. The boundary carries an accessible name announcing the source. When multiple credentials are in play, attribution is per call, from the credential's user-given label.

Attribution is for vendor fragments. The shell's own content — the synthesis surface — carries none: it renders in its reserved position with no boundary and no tile, the shell writing on its own page, and its provenance is in each derived value (§5.4).

### 4.4 Agent awareness

- The request to an agent is Planner-authored natural language carrying all size/shape guidance as prose. The agent paints for its slot in its own catalog; nothing a2uiverse-specific rides the vendor wire.
- Slot **archetypes** (card / panel / row / full) are hub-internal plan vocabulary — never sent to or declared by agents.
- Agents that ignore the guidance fall back to **orchestrator trimming**. This fallback is permanent: an unmodified A2UI agent composes, just less well.

### 4.5 Layout plan timing

- The Planner commits a provisional layout before any agent is dispatched. **First paint never waits on any agent.**
- Slot **identity and position are fixed for the turn**. Later revisions may fill, resize, or collapse a slot. They never permute slots. A fragment is never re-parented.
- When the plan fans out with synthesis, the **synthesis slot is reserved at plan time**, painted as a quiet pending marker rather than a tile, and filled in place.

---

## 5. The turn

◆ LLM call · ▪ deterministic · ▸ network

```
t0  input        palette utterance
t1  ▪ Router     embed → retrieve over local index of AgentCard skills
t2  ◆ Planner    plan: dispatch list · layout tree · synthesis slot (or not) · capability gaps
t3  ▪ first paint layout + pending slots + reserved synthesis slot. Shell partition only.
t4  ▸ AgentsPool N parallel A2A calls, each (endpoint, credential, request)
t5  ▪ per-fragment arrival — independent, unsynchronized:
       validate → namespace ids → mount at slot → partition data model → scope catalog → attach attribution
       partition generation bumped
t6  ◆ Synthesizer when every dispatched source has resolved:
       the synthesize data model: entity resolution · derived data model of formulas · synthesis fragment tree · sorts · note · optional layout revision
t7  ▪ evaluate + paint synthesis into the reserved slot. Nothing else moves.
t8  ▪ steady state, forever: BindingEvaluator on local change; IntegrityChecker on repaint
```

- A single-agent turn is one model call.
- A layout-only composition is one model call.
- A synthesized composition is two.
- Whether the Planner internally splits routing from layout is task-internal.

### 5.1 Synthesis is opt-in per turn

- The **Planner decides** whether to reserve a synthesis slot.
- The **Synthesizer may decline** if it reserved and finds nothing joinable. The slot collapses; fragments stand side by side.
- If only one source ever arrives, no synthesis runs and the slot collapses.
- The user may request a merge on a layout-only composite ("compare these").

### 5.2 Synthesizer output

The Synthesizer emits the **synthesize data model** — the data model for a2ui composition — as **wiring, never values**. It authors it the way an agent authors its surface: JSON as text against the contract and the shell catalog described in its prompt, parsed and validated after, one retry carrying the failure.

1. A derived data model: a free-form JSON shape of the model's choosing whose every leaf is a formula — one operator the shell catalog declares over refs into partitions — never a literal value, e.g. `min(ref(bh, /items[sku=…]/price), ref(keh, /results[id=…]/cost/amount))`. Entity resolution is expressed as which refs land in the same object.
2. A synthesis fragment tree in the shell catalog bound to those paths. A formula-bound path renders only through the shell's derived-value component (§14); literal props in the tree — labels, headings — are presentation.
3. **Sort declarations**: for each sorted array, its path, the key path inside each element, and the direction. The model names the criterion from the Planner's brief; the runtime sorts. The criterion is always displayed and always user-changeable.
4. A **note**: what was delivered and why it differs from the Planner's brief, when it differs. Journaled, never painted — the user never saw the brief.

The Planner's brief to the Synthesizer is prose — the reserved slot's request — as its brief to each vendor is. When a synthesis slot is reserved, the vendor requests also ask in prose for the data the merge depends on; nothing a2uiverse-specific rides the vendor wire, and a vendor is never changed to serve the merge. Planner and Synthesizer know only the shell catalog, never a vendor tree. A re-synthesis is handed the previous synthesize data model beside the fresh partitions: re-point what became invalid, keep the view unless the data no longer supports it, say in the note what changed.

The BindingEvaluator re-evaluates deterministically on every local change, including two-way binding edits inside a vendor fragment. Derived bindings behave as a live query, not a snapshot.

### 5.3 Synthesis trigger

- Fires when **every dispatched source has resolved** — arrived, failed, or hit its per-source deadline.
- A source with a request in flight — from the plan or from the user — is **not quiescent**. Synthesis waits for it.
- If a partition the in-flight synthesis depends on changes, that synthesis is **invalidated, not reconciled**. Re-fire on quiescence.
- Late arrivals after synthesis absorb as a **visible, attributed update**: disclosure changes at the same instant entities reorder.

> The merged surface may change under the user, but never without a visible reason.

### 5.4 Disclosure

The synthesis surface always discloses **which sources contributed, why any source is absent, and the sort criterion in force**. Derived values must disclose their source set.

The requirement is not a caption. Disclosure is carried where the fact belongs: a derived value renders its contributor state in the cell, so a value computed over a partial source set never renders identically to one computed over a complete set; the criterion is carried by the control that changes it; provenance is carried by the fragment's shell-drawn attribution (§4.3). A timestamp earns its place on a frozen composition (§6.4), not on a live one.

**The model names things; the runtime counts them.** The Synthesizer chooses the criterion's name; every count, contributor set, and absence is computed.

### 5.5 Mid-turn streaming

Inherited from the canvas: streaming renders only on the first turn; subsequent responses apply on completion. Quiescence of a fragment is its response completing.

---

## 6. Composition lifetime

A **Composition** is a durable object that outlives the turn that created it: slots, fragments, partitions with generation counters, derived bindings, source set, timestamp.

### 6.1 Invalidation tiers

| Tier | Trigger                                       | Cost                            |
| ---- | --------------------------------------------- | ------------------------------- |
| 1    | repaint, all bindings still valid             | re-evaluate arithmetic only     |
| 2    | bindings broke, or a source joined/left       | re-synthesize affected bindings |
| 3    | slot set changed, palette refinement, refresh | re-plan                         |

### 6.2 Binding validity

Per binding, not per partition. There is **one ref form**: a **key-based ref** (path predicate, e.g. `/items[sku="…"]/price`, conjoining fields where one does not identify the element), valid while its key resolves. Resolution *is* validity, so the answer needs nothing but the partition's current data. An element of an array is never addressed by position: a position is not a name, and after a reorder the same position is a different entity.

Key-based refs are the Synthesizer's own discipline over the data it was shown. They cannot be required of vendors — nothing about them reaches the vendor wire; a vendor that paints no stable key simply cannot have that element merged, and that is the §4.4 fallback.

**Absent is not invalid.** A ref whose key no longer resolves is **absent**: free, reversible, recomputed around — formulas skip it and carry their contributor count. Absence is what re-synthesis fires on. Because a key names the element rather than its place, an in-fragment reorder re-points nothing and costs no model call, which is what makes §6.3's local degradation implementable.

The residual hazard is a vendor that **reuses an identifier for a different entity** across a repaint: the key resolves, to the wrong thing. Generation stamps could detect it only by marking every ref into a repainted partition invalid, which is the positional rule applied universally and would negate what keys buy. It is accepted, not solved (§14).

### 6.3 What drives re-synthesis

Re-synthesis fires on changes to the **user's question** — a new source joins, the user refines at the palette, the user hits refresh. It never fires on navigation inside a fragment.

- Entities **vanishing** (filter, drill-down, detail view) degrade locally and free: affected refs go absent, formulas recompute over what still resolves, and the affected values disclose the narrowed source set. Reconnection is free.
- Entities **appearing** need entity resolution → Synthesizer.

### 6.4 Returning via timeline

A past composite is **frozen**: re-hydrated from stored state, no dispatch, stamped with source count and time. **Refresh** is a tier-3 invalidation on demand.

---

## 7. Interaction routing

| Where                                                                                                   | Routes to                                                    | Cost           |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------- |
| Inside a vendor fragment                                                                                | that agent, on its channel, with its credential              | one agent call |
| On the synthesis surface, operating on the composition (sort, filter, hide/add source, "compare these") | shell                                                        | free           |
| On a shell-painted cell referring to a vendor's entity                                                  | **navigate**: focus the originating subtree in that fragment | free           |
| Palette                                                                                                 | orchestrator                                                 | a turn         |

- Pre-synthesis, fragment interaction costs nothing beyond the agent call: no bindings exist yet.
- A fragment interaction never propagates sideways. Filtering one vendor does not filter another.
- **Act** (the shell sending an interaction into a vendor's agent on the user's behalf) is excluded from this project. It is the eventual target.
- Navigation needs a reverse index from data path to rendering component per partition (mechanism).

### Fan-out

- The **Planner judges fan-out per turn** against the actual AgentCards in the pool. Fan-out is a plan with N>1.
- The user can always **add or drop a source** on an existing composite and request a merge. Both are tier-2.
- No standing compare-by-default preferences.
- Known properties: fan-out discloses the query to every dispatched vendor; fan-out spends cost the user did not explicitly authorize.

---

## 8. Authority

- **The shell owns every authority surface.** An agent declares that it needs auth and which scheme (AgentCard `securitySchemes`); it never paints the prompt.
- An **auth-required** response fills the agent's slot with a shell-painted **authority tile**. The composite does not block; synthesis runs over the sources present; the disclosure line stays honest.
- Consent is a deterministic shell dialog, visually constant every time. Standard OAuth leaves the composite to the system browser; the token returns to the vault. The shell never sees the credential.
- Scope escalation shows the **delta**, not the total.
- Decline is a first-class state. Expiry re-enters the same path.
- Recovery re-dispatches only that slot: tier 2.

### Credential components are not in any catalog

No password, card, or OTP input exists in the shell catalog or in any vendor catalog that passes store review. A vendor cannot paint a login form because the vocabulary lacks the word. This is a checkable review rule.

### Missing app and missing auth are the same hole

A capability the Planner wants and cannot fill is a reserved slot with a shell-painted **capability tile**. Store search, install consent, and re-dispatch of that slot follow the exact shape of the authority tile. The original request is never torn down; resume is what not tearing it down gets for free.

The Planner must be able to name a capability gap.

---

## 9. Apps, bundles, store

### 9.1 The app bundle

**Install = one bundle:** agent URL + auth + catalogId + catalog implementation. One artifact, registered to the store. The bundle format is the project's invention, defined in `sdk`; the exact fields are task-internal.

A **catalog** has two faces — the **catalog schema** (`catalog.json`) and the **catalog implementation** (the React components) — shipped as one `<vendor>-catalog` package; they version together. "Adapter" is reserved for upstream's meaning, the framework layer (`@a2ui/react`).

### 9.2 The catalog implementation is code

A vendor's catalog implementation is a binding layer between A2UI's flat component model and a design-system library. It cannot be data. Install footprint is the binding layer, not an application; N apps on one design system share one copy of that library.

- **Vendor catalogs are the A2UI basic catalog themed by tokens** to mimic the vendor's product. No per-vendor component mapping. GitHub is the exception: its catalog is Primer (`primer-a2ui-adapter`), GitHub's real design system.
- **First-party catalog implementations only**, for the whole project.
- **Per-app isolation** is the stated target architecture. Same-context execution of third-party catalog implementations is rejected.
- Whether identical implementations across bundles are deduplicated at install is an install-time detail.

#### One provider and one CSS setup per catalog bundle

A catalog bundle ships **exactly one Provider component and one CSS setup, both owned by the bundle**. The Provider is the bundle's whole entry into the page: it wires its design system, brings its own stylesheets and tokens, and anchors any portal root — all of it scoped to the fragment boundary the shell mounts it in, never to `:root`. The bundle carries its design system as its own dependencies at exact versions; the host supplies only the runtime that must be a singleton (React, the A2UI runtime, zod).

The host imports a catalog package for its catalog, its catalog id, and that one Provider, and applies the Provider around that catalog's fragments only. It registers nothing at the app root, lists no vendor design system, and performs no per-vendor CSS setup of its own — so the canvas does not accumulate vendor setup as apps are installed, and installing an app is a table entry rather than a shell change.

This is a normative, checkable catalog-bundle review rule, like the credential-component bar (§8): a bundle that needs a second provider or asks the host for a CSS setup fails review. Its scoping half is already machine-checked by the client's collision detector; both agent-kit scaffold templates embody the rule.

### 9.3 Marketplace and Store

Two things with one word today; the spec names them separately:

- **Marketplace** — remote-in-spirit: index of AgentCards (skill embeddings), package hosting, the publish step, hello-fragment smoke test as the live preview. In this project it is a local process.
- **Store page** — a trusted shell page the user browses and installs from.

Routing and store search are **one mechanism over two indexes** — local registry and marketplace index. A miss in the first is a hit in the second.

### 9.4 Vendor agents

Every vendor agent is backed by its vendor's **official, publicly available MCP server**; that is the first selection criterion for a vendor. Roster: GitHub · Gmail · Google Calendar (S1); developer-tool vendors with official MCPs are the fallback and the later S3 expansion.

A vendor agent runs on **one port in one of three modes**: `deterministic` (no model), `llm` (model + MCP), `llm` without MCP (model + stub backend).

### 9.5 Multi-account

One app, one install. Multiple credentials live inside the single app; the AgentsPool dispatches per `(endpoint, credential)`; the vault is keyed `(app, account)` and is the shell's account manager. **Deprioritized for this project:** one app, one credential. The credential field stays as a placeholder so multi-account is a data change later, not an architecture change.

---

## 10. Orchestrator components

Hub-and-spoke. **The client talks only to the orchestrator.** Agents are never reached directly.

```
CLIENT (canvas shell)                        ORCHESTRATOR (A2A agent server)
  palette · timeline · trusted pages           ROUTER           retrieval, two indexes
  UICOMPOSER      graft · mount                PLANNER        ◆ call #1
  render layer    catalog scope        ◄ A2A ► SYNTHESIZER    ◆ call #2, opt-in
  BINDINGEVALUATOR formulas                    AGENTSPOOL       dispatch, quiescence
  VALIDATOR       tree conformance             INTEGRITYCHECKER tier gate
                                               VALIDATOR        LLM output bounds
                                               AUTHVAULT · REGISTRY · INTENTJOURNAL
```

| Component            | Kind  | Responsibility                                                                                                                                    |
| -------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Router**           | ▪     | Embedding retrieval over AgentCard skill descriptions/examples. One class, two indexes (local registry, marketplace).                             |
| **Planner**          | ◆     | Intent + candidate cards → plan: dispatch list, layout tree with named slots, synthesis slot or not, capability gaps. Never sees data.            |
| **Synthesizer**      | ◆     | All partitions (names and values) + the Planner's brief + the shell catalog → the synthesize data model: entity resolution, derived data model of formulas, synthesis tree, sorts, note. May decline. Emits wiring, never values; knows only the shell catalog. |
| **AgentsPool**       | ▪     | A2A connections. Dispatch unit `(endpoint, credential)`. Parallelism, per-source deadlines, quiescence.                                           |
| **UIComposer**       | ▪     | Mechanical tree assembly: namespace, mount, catalog scope, provenance + attribution, subtree replacement. Understands nothing.                    |
| **BindingEvaluator** | ▪     | Spreadsheet/signals semantics over derived formulas. Every local change, zero model cost.                                                         |
| **IntegrityChecker** | ▪     | Per-binding validity: does the ref's key still resolve. Gates whether the Synthesizer runs.                                                           |
| **Validator**        | ▪     | Agent trees against their declared catalog; LLM output against its schema.                                                                        |
| **AuthVault**        | ▪     | Credentials by `(app, account)`. Triggers consent; never paints it.                                                                               |
| **Registry**         | ▪     | Installed bundles — the orchestrator's local state, written only by the orchestrator. Serves the orchestrator's AgentCard.                        |
| **IntentJournal**    | ▪     | Per turn: free-form intent descriptor + embedding. The thin machine-facing projection is left unbuilt.                                            |
| **Composition**      | state | §6.                                                                                                                                               |

A registry entry is the bundle record (§9.1). The client holds only its projection — `catalogId → catalog implementation` — reached through **`orchestratorApi`**, the client's non-A2A channel to the orchestrator: a static map until M7, served by the orchestrator once install exists, IPC under a native shell. Install is an orchestrator operation; the Store page is its UI.

Open seams, task-internal: where the Composition object is canonical (client or orchestrator); whether Validator is one class or two.

Routing is **taxonomy-free**: no intent enums; embedding retrieve → LLM rerank over skill descriptions and examples.

Entity resolution inside the Synthesizer follows the same shape as routing: deterministic embed-and-match, escalate the ambiguous middle to the model. Shape only; not settled.

---

## 11. Shell body and environment

- **Web app, for the duration of the project.** Native packaging is not developable in the current environment. Native is named as the trigger-gated successor: the first time the shell needs third-party catalog-implementation isolation or real process spawning.
- **The client is a Vite + React SPA, not a Next.js app.** The client holds only browser-side state (Composition, partitions, BindingEvaluator, streaming); the orchestrator is its server. Trusted pages are client-rendered routes (a client-side router, added when the first one arrives). The native successor is Electron: a Vite build loads into a BrowserWindow as-is, and the orchestrator becomes a spawned child process.
- **OS bridge** is a built-in System app that launches things and records why. Not OS work. Out of scope.
- **Intent journal from day one.**
- **Everything runs locally** as multiple processes in multiple terminals. No deployment.
- Orchestrator is developed as a **separate A2A agent server**. Future: local-model inference target. Out of scope.
- Shell catalog is neutral. Future: per-user shell catalog as a computer theme. Out of scope.

---

## 12. Milestones

Mechanical spine first; each milestone adds one hard thing.

```
M0   spine   1 agent · 1 catalog · through the hub                           ◆×1
     proves hub-and-spoke · canvas shell reuse · orchestrator as an A2A agent server ·
     hardcoded registry · intent journal
M1   layout-only composition   3 agents · 3 catalogs · no synthesis            ◆×1
     GitHub · Gmail · Google Calendar
     proves UIComposer · namespacing · catalog scoping · partition isolation ·
     provenance + attribution · one-tree graft · plan/fill/collapse
M1k  agent building kit   shared vendor-agent SDK/CLI extracted across the three agents, published from a2uiverse-apps
M2   + synthesis, identical shapes   two sibling mock vendor agents              ◆×2
     proves Synthesizer · derived bindings · BindingEvaluator · IntegrityChecker ·
     generation stamps · disclosure line
M3   + heterogeneous shapes   temporal merge (Calendar · Mail · GitHub)
     proves unrelated data models · shared-axis merge · the model-authored merged view · key-based refs · decline ·
     quiescence across unsynchronized arrivals
M3s  the shell as an agent   the orchestrator's model answers itself in the shell catalog when no vendor serves —
     installed agents · the platform's own state; what platform state the model may read (§10's Planner "never sees data"
     is revisited here); which of M10's pages it may author and which stay trusted
M4   + entity resolution   entity join                                          ← differentiator proven
M6   late-arrival + failure   per-source deadlines · failure tiles · decline · late absorb
M5   durable composition   timeline · frozen + stamped · refresh · add/drop source · "compare these"
M7   app bundle + registry   bundle format · local install · registry no longer hardcoded
M8   authority surfaces   auth-required · consent · AuthVault · credential components barred
M9   marketplace + publish   local index · package hosting · publish step · hello-fragment smoke test
M10  shell trusted pages   Store page · App Library · accounts
M11  store loop   capability gap → marketplace index → install → resume
M12  ecosystem run   publish a new app → discover → install → compose with an existing one → act inside it.
     One sitting, no code changes. Deliverable is the recording.
```

Until M7, the registry is hardcoded.

---

## 13. Repositories

Three repos, one per trust domain.

```
a2uiverse/              platform monorepo
  apps/                 client · orchestrator · marketplace — the local processes
  packages/             sdk · shell-catalog — libraries
a2uiverse-apps/         vendor apps, one folder per app: agent · <vendor>-catalog · manifest
a2ui-github/            origin of the GitHub app; unchanged. Copied into a2uiverse-apps/github/ at the end of Phase 1.
```

**Vendor dependency rule.** Per half:

- **Agent half** — the A2UI/A2A protocols and the **agent kit** (the vendor-agent SDK/CLI published from `a2uiverse-apps`, M1k); the kit itself depends on the protocols alone. Nothing a2uiverse-specific reaches the vendor wire: the kit's one shell convention is `paintMeta` (§14), which is optional and degradable — an agent that never emits it composes, with cause-derived titles and question surfaces painted as ordinary surfaces.
- **Catalog half** — the A2UI protocol, its design-system library, and, available to it, the platform sdk: one contract (`packages/sdk/contracts`, normative JSON) with a single JS projection, **`@a2uiverse/sdk`**, carrying a contract test against the JSON. Available, not required — the projection's realized consumers today are all platform-side (client, orchestrator, `shell-catalog`, marketplace); no vendor catalog builds against it.

Neither half may depend on anything else in the platform.

There are no internal agents: every app in `a2uiverse-apps` is an external app, and the ecosystem and its apps are built as a whole.

`primer-a2ui-adapter` is consumed as a published package, never as a workspace sibling.

---

## 14. Protocol stance

Downstream of A2UI/A2A. All deviations ship as **one project-owned wrapper and one A2A extension**, proven locally, proposed upstream later.

Constraint protected throughout: **an existing A2UI agent composes with zero changes.**

**A2A line:** 0.3, at the newest versions compatible with the A2UI ecosystem (`a2ui-agent-sdk` pins A2A 0.3). Migration to A2A 1.0 is gated on `a2ui-agent-sdk` and is done across client, orchestrator, and vendor kit in one move.

### Protocol delta register (seed)

| Delta                                                                                                                                                                                                                                                                             | Tag                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth-required state carrying scheme + scope delta                                                                                                                                                                                                                                 | upstream candidate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Cross-partition qualified refs `ref(source, path)` in bindings                                                                                                                                                                                                                    | upstream candidate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Path predicates (key-based refs) — a `[key=value]` segment in a ref's pointer, conjoining fields where one does not identify the element, selecting the array element whose fields equal the values. The only ref form: resolution is validity, positions are not refs. Never required of vendors. A vendor reusing an identifier for a different entity resolves silently to the wrong element — accepted, not solved (§6.2)                                                                                                                                                                                                                        | upstream candidate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Arithmetic and aggregate functions (`min`, `max`, `sum`, …) in the shell catalog                                                                                                                                                                                                  | local convention — the upstream basic catalog _schema_ declares validators, formatters and boolean logic (`and`/`or`/`not`) only; its React _implementation_ ships binary arithmetic and comparison (`add`, `subtract`, `greater_than`, …) undeclared; neither has aggregates. Declared as catalog `FunctionDefinition`s, executed in the BindingEvaluator. Flat: one operator over N refs, no nesting. Aggregates skip absent inputs and carry their contributor count |
| The synthesize data model — the data model for a2ui composition: a free-form derived data model of formula leaves, a shell-catalog tree bound to it, sort declarations, a note — on A2A message metadata, as the synthesis half of the composition contract                                                                                                                                                                      | upstream candidate — the same shape as surface placement above: composition rides the envelope, the A2UI the shell paints stays standard. Resolved client-side before render, so no renderer or component understands a ref                                                                                                                                                                                                                                                                                                           |
| A formula-bound cell must render through the shell's derived-value component                                                                                                                                                                                                      | normative rule, machine-checked — the synthesis tree is model-authored, so the guarantee that a partial value never renders as a complete one cannot live in the tree; the orchestrator's validator rejects a tree that binds any other component to a formula path. The `Attribution` pattern (§4.3) applied to values rather than fragments                                                                                                                                                                                                                                                                                                 |
| Partitioned data model on a shared surface (agents address paths as root; shell namespaces) — enforced at the hub as the outbound partition filter                                                                                                                                | upstream candidate — prior art: the upstream orchestrator sample strips `a2uiClientDataModel.surfaces` to the target agent's own surfaces via a client interceptor (§18); ours generalizes surface → partition                                                                                                                                                                                                                                                                                                                        |
| Surface placement (`surface → slot`) on A2A event metadata                                                                                                                                                                                                                        | upstream candidate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| surfaceId namespacing `<appId>:<surfaceId>` at the hub, reversed on inbound actions                                                                                                                                                                                               | local convention                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Vendor terminal states demoted to non-final `working` on relay; the hub emits the turn's single final                                                                                                                                                                             | local convention — several vendor tasks resolve onto one client task under fan-out, so relaying a vendor's final would end the turn at the first agent to answer                                                                                                                                                                                                                                                                                                                                                                      |
| Unsuppressable attribution on a grafted fragment                                                                                                                                                                                                                                  | local convention                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `ChoicePicker` document-global radio group name in `@a2ui/react` (patched locally)                                                                                                                                                                                                | upstream bug report — `_dev/a2ui-findings.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Unsatisfiable `catalogId` clause in `server_to_client.json` prose                                                                                                                                                                                                                 | upstream bug report — `_dev/a2ui-findings.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Scoped per-catalog stylesheet layer — a catalog bundle ships CSS styling the basic components' runtime DOM under its own scope class                                                                                                                                              | local convention                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Dead CSS-module class maps in `@a2ui/react` `v0_9` basic catalog (classless Button/variants, unshipped `index.css`)                                                                                                                                                               | upstream bug report — `_dev/a2ui-findings.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Bound `DynamicValue` props and their generated setters typed by the union's literal branches in `@a2ui/web_core`'s generic binder                                                                                                                                                 | upstream bug report — `_dev/a2ui-findings.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `paintMeta` — a per-paint shell object (`{surfaceId, title?, kind?}`) riding the A2A stream as a dedicated data part marked `application/json+a2ui-shell`, emitted ahead of the `createSurface` it names; carries the agent-authored paint title and the declared question marker | local convention — the agent kit's one shell convention (§13). Optional and degradable: absent, titles fall back to cause-derived and question surfaces paint as ordinary surfaces, so an unmodified A2UI agent still composes. Sits beside A2UI, never inside it: the A2UI extractor never takes a `paintMeta` part                                                                                                                                                                                                                  |
| Credential components barred from all catalogs                                                                                                                                                                                                                                    | normative review rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| One provider and one CSS setup per catalog bundle, scoped to the fragment boundary (§9.2)                                                                                                                                                                                         | normative review rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `sendDataModel`, multi-catalog `MessageProcessor`, `catalogId` scoping                                                                                                                                                                                                            | already in protocol — no delta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

Every future deviation is added here, tagged _local convention_ or _upstream candidate_.

---

## 15. Reused vs. new

| Reused                                                           | New                                                                              |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Canvas shell, timeline, hold-and-swap                            | Orchestrator: Router · Planner · Synthesizer · AgentsPool · IntegrityChecker     |
| A2A transport, AgentCard, extensions, `securitySchemes`          | UIComposer + one-tree graft runtime                                              |
| A2UI validation, `sendDataModel`, multi-catalog, local functions | Shell catalog + composition primitives                                           |
| `a2ui-github` as the GitHub app                                  | Derived-binding table + BindingEvaluator                                         |
| Catalog authoring skills, GitHub agent                           | App bundle format (`sdk`) · Marketplace · Store page · AuthVault · IntentJournal |
| A2UI basic catalog + `--a2ui-*` tokens as every vendor catalog   | Agent building kit (`a2uiverse-apps`)                                            |

---

## 16. Known consequences

Properties that follow from the decisions above, recorded so they are not discovered late.

- The synthesis surface is structurally the last thing to arrive. The interval between the last fragment and the synthesis paint is dead air; streaming the synthesis fragment into its reserved slot is the available, unspent mitigation.
- Two filters with different scopes sit on one screen: the synthesis surface's (shell-owned, free, filters the merge) and a vendor's (vendor-owned, one round trip, filters only that fragment). A visual design problem for the shell's container language.
- Two vendors' catalog implementations and the shell's consent surfaces share one document. Isolation is deferred; first-party-only is what makes that acceptable.
- Two apps wanting different versions of the same design-system library put both in one document.
- A publisher can style a fragment to resemble the shell catalog. Attribution is shell-rendered for this reason; lookalike review belongs to the marketplace. The upstream orchestrator sample's README states the same threat (spoofed interfaces, crafted AgentCard fields as prompt injection) from the protocol authors' side (§18).
- The shell chooses the merge's columns and criterion. The criterion is named, displayed, and user-changeable for this reason.
- The Planner authors each dispatched agent's request. What a vendor receives is the orchestrator's words, not the user's — fan-out can disclose more, or less, than the user said.

---

## 17. Out of scope

Named so they do not creep in: native shell · catalog-implementation isolation · third-party catalog-implementation review/signing · OS bridge · machine-facing intent projection · cross-vendor transactions · act-on-synthesis-surface · multi-account exercised · local-model inference · per-user shell catalog (theme) · deployment.

---

## 18. References

### Local extension supplement

`_dev/docs/A2UIVerse-Local-Extension-Spec.md` — architectural vision for the post-project direction: local SLM inference for Planner/Synthesizer, hardware-backed AuthVault, native shell with an OS Bridge. Covers the items §11 and §17 name as out of scope. A supplement, not part of this spec.

### Upstream orchestrator sample

`a2ui-project/a2ui` — `samples/community/agent/adk/orchestrator` at `upstream/main` `c6ea14e7`.

An ADK `LlmAgent` instructed to route each request to exactly one subagent via `transfer_to_agent`. The L0 case of this project's orchestrator.

| Sample                                                                                | This spec                                                                 |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Subagent skill descriptions/examples serialized into the system prompt; no taxonomy   | Taxonomy-free routing (§10) — same principle; ours retrieves then reranks |
| `SubagentRouteManager`: `surfaceId → subagent` in session state on `beginRendering`   | Fragment provenance tag (§4.1), per subtree                               |
| `before_model_callback` routes `userAction` to the owning subagent without inference  | Interaction routes by provenance, free (§7)                               |
| Client interceptor strips `a2uiClientDataModel.surfaces` to the target's own surfaces | Partition isolation (§4.1); delta register (§14)                          |
| Orchestrator AgentCard = union of subagent skills and A2UI extensions                 | Registry (§10)                                                            |
| `metadata["a2a_subagent"]` on outgoing events                                         | Attribution element (§4.3), rendered and unsuppressable                   |
| Routing re-inferred on every turn; `streaming=False`                                  | Invalidation tiers (§6); mid-turn streaming (§5.5)                        |

Not present, structurally: fan-out. `transfer_to_agent` hands the conversation to one agent at a time — no parallel dispatch, no two live surfaces, no composition. AgentsPool's parallel `(endpoint, credential)` dispatch is the replacement. ADK is not adopted.
