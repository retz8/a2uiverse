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

| # | Join | Scenario | Synthesis |
|---|---|---|---|
| S1 | Shared time axis | **Temporal merge** — Calendar + Mail + GitHub → one timeline; ops incident on one axis | merge / sort keys, counts |
| S2 | Same real-world entity | **Entity join** — a camera across B&H, Amazon, KEH: merged price/availability row, each vendor's native widget preserved alongside | entity resolution + summary row |
| S3 | Semantic equivalence | **Juxtaposition** — two agents on one question, agreement map | disagreement detection |
| S4 | Task spine | **Multi-step job** across tools, persistent spine | sequential; mostly layout-only |
| S5 | Same catalog, different instances | **Multi-account** — N accounts of one app, merged | trivial; identical shapes |
| S6 | None | **Long tail** — small agents nobody would ever aggregate; the aggregator is generated per request instead of incorporated as a company | — |
| S7 | None | **Parallel independent tasks** — unrelated agents side by side | none; layout-only |

- **Architectural target:** S2 entity join — the only scenario that requires fragment graft.
- **Proving milestone:** S1 temporal merge.
- **Entity resolution** is a named responsibility of the Synthesizer, not a side effect of derived bindings.
- S5 is supported by the architecture and not exercised by the milestone ladder (§12).

---

## 4. Surface model

### 4.1 One surface, one tree

A composed screen is a single A2UI tree. A **fragment** is a subtree of that tree carrying:

- its own data-model **partition**
- its own **catalog scope**
- its own **provenance tag**
- its own **message channel** back to the agent that owns it

Consequences:

- Component IDs are namespaced at graft time.
- The tree unifies; the data model partitions. A fragment's bindings resolve only inside its own partition.
- The shell reads across all partitions. This is the hub privilege and the only asymmetry in the system.
- Catalog resolution is scoped by provenance boundary, not global.
- Repaint is subtree replacement.

### 4.2 Shell catalog

The orchestrator paints content, not just structure. Its catalog — the **shell catalog** — is the standard A2UI catalog plus composition primitives (slot, provenance attribution). The orchestrator's painted output is a **synthesis fragment** grafted through the same path as any agent's fragment. There is no privileged paint path.

The word "chrome" is not used.

### 4.3 Visual authority

**The shell owns the container; the vendor owns the interior.**

- Shell: layout, frames, grid, gutters, its own synthesis surface.
- Vendor: everything inside its fragment's box — font, spacing, color, components, design system. Total.
- No token contract. The shell never reaches into a fragment.
- Coherence comes from spatial discipline, not stylistic normalization.
- Graft granularity is the subtree/panel.

Every grafted subtree carries an **attribution element** rendered by the shell, in the shell catalog, that the fragment cannot suppress, restyle, or occlude. When multiple credentials are in play, attribution is per call, from the credential's user-given label.

### 4.4 Agent awareness

- The request to an agent carries a **slot archetype** (card / panel / row / full) and a **budget**. The agent paints for the slot in its own catalog.
- Agents that ignore the hint fall back to **orchestrator trimming**. This fallback is permanent: an unmodified A2UI agent composes, just less well.
- An AgentCard may declare supported archetypes. The binding decision is per turn.
- The budget's unit is task-internal.

### 4.5 Layout plan timing

- The Planner commits a provisional layout before any agent is dispatched. **First paint never waits on any agent.**
- Slot **identity and position are fixed for the turn**. Later revisions may fill, resize, or collapse a slot. They never permute slots. A fragment is never re-parented.
- When the plan fans out with synthesis, the **synthesis slot is reserved at plan time**, painted pending, and filled in place.

---

## 5. The turn

◆ LLM call · ▪ deterministic · ▸ network

```
t0  input        palette utterance
t1  ▪ Router     embed → retrieve over local index of AgentCard skills
t2  ◆ Planner    plan: dispatch list · layout tree · synthesis slot (or not) · capability gaps
t3  ▪ first paint layout + pending slots + reserved synthesis slot. Shell partition only.
t4  ▸ AgentsPool N parallel A2A calls, each (endpoint, credential, request, archetype, budget)
t5  ▪ per-fragment arrival — independent, unsynchronized:
       validate → namespace ids → mount at slot → partition data model → scope catalog → attach attribution
       partition generation bumped
t6  ◆ Synthesizer when every dispatched source has resolved:
       entity resolution · derived bindings · synthesis fragment tree · named sort criterion · optional layout revision
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

The Synthesizer emits **wiring, never values**:

1. A derived data model: formulas over provenance-qualified paths, e.g. `min(ref(bh, /items[sku=…]/price), ref(keh, /results[id=…]/cost/amount))`. Entity resolution is expressed as which paths land in the same row.
2. A synthesis fragment tree in the shell catalog bound to those paths.
3. A **named sort criterion**. The model chooses the criterion; the runtime sorts. The criterion is always displayed and always user-changeable.

The BindingEvaluator re-evaluates deterministically on every local change, including two-way binding edits inside a vendor fragment. Derived bindings behave as a live query, not a snapshot.

### 5.3 Synthesis trigger

- Fires when **every dispatched source has resolved** — arrived, failed, or hit its per-source deadline.
- A source with a request in flight — from the plan or from the user — is **not quiescent**. Synthesis waits for it.
- If a partition the in-flight synthesis depends on changes, that synthesis is **invalidated, not reconciled**. Re-fire on quiescence.
- Late arrivals after synthesis absorb as a **visible, attributed update**: the disclosure line changes at the same instant rows move.

> The merged surface may change under the user, but never without a visible reason.

### 5.4 Disclosure

The synthesis surface always carries a shell-painted disclosure line: **source count, timestamp, sort criterion, and why any source is absent** (e.g. `2 of 3 sources · B&H showing a detail view · as of 09:12 · sorted by best price`). Derived values must disclose their source set.

### 5.5 Mid-turn streaming

Inherited from the canvas: streaming renders only on the first turn; subsequent responses apply on completion. Quiescence of a fragment is its response completing.

---

## 6. Composition lifetime

A **Composition** is a durable object that outlives the turn that created it: slots, fragments, partitions with generation counters, derived bindings, source set, timestamp.

### 6.1 Invalidation tiers

| Tier | Trigger | Cost |
|---|---|---|
| 1 | repaint, all bindings still valid | re-evaluate arithmetic only |
| 2 | bindings broke, or a source joined/left | re-synthesize affected bindings |
| 3 | slot set changed, palette refinement, refresh | re-plan |

### 6.2 Binding validity

Per binding, not per partition:

- **Key-based ref** (path predicate, e.g. `/items[sku="…"]/price`) — valid while the key resolves.
- **Index-based ref** — valid while the partition's **generation** is unchanged.

Key-based refs are an optimization the Synthesizer uses when the observed data offers a stable key. They cannot be required of vendors. Generation stamps are the correctness floor.

### 6.3 What drives re-synthesis

Re-synthesis fires on changes to the **user's question** — a new source joins, the user refines at the palette, the user hits refresh. It never fires on navigation inside a fragment.

- Entities **vanishing** (filter, drill-down, detail view) degrade locally and free: affected refs go absent, formulas recompute over what still resolves, the disclosure line says why. Reconnection is free.
- Entities **appearing** need entity resolution → Synthesizer.

### 6.4 Returning via timeline

A past composite is **frozen**: re-hydrated from stored state, no dispatch, stamped with source count and time. **Refresh** is a tier-3 invalidation on demand.

---

## 7. Interaction routing

| Where | Routes to | Cost |
|---|---|---|
| Inside a vendor fragment | that agent, on its channel, with its credential | one agent call |
| On the synthesis surface, operating on the composition (sort, filter, hide/add source, "compare these") | shell | free |
| On a shell-painted cell referring to a vendor's entity | **navigate**: focus the originating subtree in that fragment | free |
| Palette | orchestrator | a turn |

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

**Install = one bundle:** agent URL + auth + catalogId + adapter. One artifact, registered to the store. The bundle format is the project's invention; the exact fields are task-internal.

The catalog (`catalog.json`) and the adapter (the React implementations) are one artifact with two faces; they version together.

### 9.2 The adapter is code

A vendor adapter is a binding layer between A2UI's flat component model and a design-system library. It cannot be data. Install footprint is the binding layer, not an application; N apps on one design system share one copy of that library.

- **First-party adapters only**, for the whole project.
- **Per-app isolation** is the stated target architecture. Same-context execution of third-party adapters is rejected.
- Whether identical adapters across bundles are deduplicated at install is an install-time detail.

### 9.3 Marketplace and Store

Two things with one word today; the spec names them separately:

- **Marketplace** — remote-in-spirit: index of AgentCards (skill embeddings), package hosting, the publish step, hello-fragment smoke test as the live preview. In this project it is a local process.
- **Store page** — a trusted shell page the user browses and installs from.

Routing and store search are **one mechanism over two indexes** — local registry and marketplace index. A miss in the first is a hit in the second.

### 9.4 Multi-account

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

| Component | Kind | Responsibility |
|---|---|---|
| **Router** | ▪ | Embedding retrieval over AgentCard skill descriptions/examples. One class, two indexes (local registry, marketplace). |
| **Planner** | ◆ | Intent + candidate cards → plan: dispatch list, layout tree with named slots, synthesis slot or not, capability gaps. Never sees data. |
| **Synthesizer** | ◆ | All partitions (names and values) → entity resolution, derived bindings, synthesis tree, sort criterion. May decline. Emits wiring, never values. |
| **AgentsPool** | ▪ | A2A connections. Dispatch unit `(endpoint, credential)`. Parallelism, per-source deadlines, quiescence. |
| **UIComposer** | ▪ | Mechanical tree assembly: namespace, mount, catalog scope, provenance + attribution, subtree replacement. Understands nothing. |
| **BindingEvaluator** | ▪ | Spreadsheet/signals semantics over derived formulas. Every local change, zero model cost. |
| **IntegrityChecker** | ▪ | Per-binding validity (key resolution / generation). Gates whether the Synthesizer runs. |
| **Validator** | ▪ | Agent trees against their declared catalog; LLM output against its schema. |
| **AuthVault** | ▪ | Credentials by `(app, account)`. Triggers consent; never paints it. |
| **Registry** | ▪ | Installed bundles. Presents the orchestrator's own AgentCard as the union of installed apps' skills, A2UI extensions, and supported catalog IDs, plus the orchestrator's own skills. |
| **IntentJournal** | ▪ | Per turn: free-form intent descriptor + embedding. The thin machine-facing projection is left unbuilt. |
| **Composition** | state | §6. |

Open seams, task-internal: where the Composition object is canonical (client or orchestrator); whether Validator is one class or two.

Routing is **taxonomy-free**: no intent enums; embedding retrieve → LLM rerank over skill descriptions and examples.

Entity resolution inside the Synthesizer follows the same shape as routing: deterministic embed-and-match, escalate the ambiguous middle to the model. Shape only; not settled.

---

## 11. Shell body and environment

- **Web app, for the duration of the project.** Native packaging is not developable in the current environment. Native is named as the trigger-gated successor: the first time the shell needs third-party adapter isolation or real process spawning.
- **OS bridge** is a built-in System app that launches things and records why. Not OS work. Out of scope.
- **Intent journal from day one.**
- **Everything runs locally** as multiple processes in multiple terminals. No deployment.
- Orchestrator is developed as a **separate A2A agent server**. Future: local-model inference target. Out of scope.
- Shell catalog is neutral. Future: per-user shell catalog as a computer theme. Out of scope.

---

## 12. Milestones

Mechanical spine first; each milestone adds one hard thing.

```
M1   layout-only composition   2 agents · 2 catalogs · no synthesis            ◆×1
     proves UIComposer · namespacing · catalog scoping · partition isolation ·
     provenance + attribution · one-tree graft · plan/fill/collapse
M2   + synthesis, identical shapes   two sibling mock vendor agents              ◆×2
     proves Synthesizer · derived bindings · BindingEvaluator · IntegrityChecker ·
     generation stamps · disclosure line
M3   + heterogeneous shapes   temporal merge (Calendar · Mail · GitHub)
     proves unrelated data models · shared-axis merge · key-based refs · decline · late arrival
M4   + entity resolution   entity join                                          ← differentiator proven
M5   durable composition   timeline · frozen + stamped · refresh · add/drop source · "compare these"
M6   late-arrival + failure   per-source deadlines · failure tiles · decline · late absorb
M7   app bundle + registry   bundle format · local install · a2ui-github as first external app
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
a2uiverse/              platform monorepo: client · orchestrator · marketplace · shell-catalog · bundle
a2uiverse-apps/         mock vendor agents
a2ui-github/            unchanged. The first external app.
```

> A vendor app may depend on the bundle format and the A2UI/A2A protocols. It may never depend on the platform.

`primer-a2ui-adapter` is consumed as a published package, never as a workspace sibling.

---

## 14. Protocol stance

Downstream of A2UI/A2A. All deviations ship as **one project-owned wrapper and one A2A extension**, proven locally, proposed upstream later.

Constraint protected throughout: **an existing A2UI agent composes with zero changes.**

### Protocol delta register (seed)

| Delta | Tag |
|---|---|
| Slot archetype + budget on the request | upstream candidate |
| Auth-required state carrying scheme + scope delta | upstream candidate |
| Cross-partition qualified refs `ref(source, path)` in bindings | upstream candidate |
| Path predicates (key-based refs) in the formula vocabulary | upstream candidate |
| Arithmetic functions (`min`, `add`, …) in the shell catalog | local; exists in upstream basic catalog |
| Partitioned data model on a shared surface (agents address paths as root; shell namespaces) | upstream candidate — prior art: the upstream orchestrator sample strips `a2uiClientDataModel.surfaces` to the target agent's own surfaces via a client interceptor (§18); ours generalizes surface → partition |
| Unsuppressable attribution on a grafted subtree | local convention |
| Credential components barred from all catalogs | normative review rule |
| `sendDataModel`, multi-catalog `MessageProcessor`, `catalogId` scoping | already in protocol — no delta |

Every future deviation is added here, tagged *local convention* or *upstream candidate*.

---

## 15. Reused vs. new

| Reused | New |
|---|---|
| Canvas shell, timeline, hold-and-swap | Orchestrator: Router · Planner · Synthesizer · AgentsPool · IntegrityChecker |
| A2A transport, AgentCard, extensions, `securitySchemes` | UIComposer + one-tree graft runtime |
| A2UI validation, `sendDataModel`, multi-catalog, local functions | Shell catalog + composition primitives |
| `primer-a2ui-adapter` as the first installed app | Derived-binding table + BindingEvaluator |
| Catalog authoring skills, GitHub agent | App bundle format · Marketplace · Store page · AuthVault · IntentJournal |

---

## 16. Known consequences

Properties that follow from the decisions above, recorded so they are not discovered late.

- The synthesis surface is structurally the last thing to arrive. The interval between the last fragment and the synthesis paint is dead air; streaming the synthesis fragment into its reserved slot is the available, unspent mitigation.
- Two filters with different scopes sit on one screen: the synthesis surface's (shell-owned, free, filters the merge) and a vendor's (vendor-owned, one round trip, filters only that fragment). A visual design problem for the shell's container language.
- Two vendors' adapters and the shell's consent surfaces share one document. Isolation is deferred; first-party-only is what makes that acceptable.
- Two apps wanting different versions of the same design-system library put both in one document.
- A publisher can style a fragment to resemble the shell catalog. Attribution is shell-rendered for this reason; lookalike review belongs to the marketplace. The upstream orchestrator sample's README states the same threat (spoofed interfaces, crafted AgentCard fields as prompt injection) from the protocol authors' side (§18).
- The shell chooses the merge's columns and criterion. The criterion is named, displayed, and user-changeable for this reason.

---

## 17. Out of scope

Named so they do not creep in: native shell · adapter isolation · third-party adapter review/signing · OS bridge · machine-facing intent projection · cross-vendor transactions · act-on-synthesis-surface · multi-account exercised · local-model inference · per-user shell catalog (theme) · deployment.

---

## 18. References

### Upstream orchestrator sample

`a2ui-project/a2ui` — `samples/community/agent/adk/orchestrator` at `upstream/main` `c6ea14e7`.

An ADK `LlmAgent` instructed to route each request to exactly one subagent via `transfer_to_agent`. The L0 case of this project's orchestrator.

| Sample | This spec |
|---|---|
| Subagent skill descriptions/examples serialized into the system prompt; no taxonomy | Taxonomy-free routing (§10) — same principle; ours retrieves then reranks |
| `SubagentRouteManager`: `surfaceId → subagent` in session state on `beginRendering` | Fragment provenance tag (§4.1), per subtree |
| `before_model_callback` routes `userAction` to the owning subagent without inference | Interaction routes by provenance, free (§7) |
| Client interceptor strips `a2uiClientDataModel.surfaces` to the target's own surfaces | Partition isolation (§4.1); delta register (§14) |
| Orchestrator AgentCard = union of subagent skills and A2UI extensions | Registry (§10) |
| `metadata["a2a_subagent"]` on outgoing events | Attribution element (§4.3), rendered and unsuppressable |
| Routing re-inferred on every turn; `streaming=False` | Invalidation tiers (§6); mid-turn streaming (§5.5) |

Not present, structurally: fan-out. `transfer_to_agent` hands the conversation to one agent at a time — no parallel dispatch, no two live surfaces, no composition. AgentsPool's parallel `(endpoint, credential)` dispatch is the replacement. ADK is not adopted.
