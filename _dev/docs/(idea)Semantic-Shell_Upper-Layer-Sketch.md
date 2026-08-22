# Semantic Shell — Upper-Layer Sketch

> A rough idea sketch for the project after `a2ui-github`. Not a spec, not final —
> details are intentionally omitted; this carries the conversation, nothing more.

## What

Take the canvas shell that `a2ui-github` proposed and grow it into a **multi-agent
semantic shell**: an orchestrator that installs "apps" like an app store, routes user
intent to the right agents, and **composes their generated UIs into one screen**.
Architecturally this is the upper semantic layer of the Semantic Computer note
(`(idea)Semantic Computer_*.md`), but it stands alone — no SSM/OS work in scope.
The lower layers survive only as a well-kept journal and a narrow future contract.

Role shift: canvas shell = browser chrome (adopted as-is) · **orchestrator = window
manager + package manager + intent router** (the new deliverable) · semantic app =
the new app form factor.

## The differentiator: cross-agent UI composition

Ask for food, and both the UberEats agent and the DoorDash agent paint — each in its
own design system — synthesized into one surface. This is what generative UI can do
that static apps cannot, so it is a first-class citizen, not a stretch goal.

Composition spectrum (L2 is the destination, L1 a milestone):

```
L0 single surface   L1 tiled            L2 fragment graft         L3 deep merge
(a2ui-github today) (whole surfaces     (orchestrator chrome +    (dissolve trees,
                     in a split frame)   agent fragments in slots) unified list)
                                         ← target                  ← covered by a
                                                                     chrome summary view
```

Why it works at all: A2UI trees are declarative data, not code — grafting a
fragment is validating and mounting a subtree, something iframes never allowed.

## Anatomy

```
                    ┌───────────┐
                    │ PUBLISHER │  semantic-app package =
                    └─────┬─────┘  AgentCard (A2A, as-is)
                          │ publish   + adapter bundle (client render assets)
                          ▼          + store metadata (signing, versions)
 ┌──────────────── MARKETPLACE ────────────────┐
 │ index of AgentCards (skill embeddings)      │
 │ package hosting · live hello-fragment       │
 └───────┬──────────────────────┬──────────────┘
         │ discover             │ install (splits in two:
 ════════╪══════ user's machine ╪═══ render half → client,
         │                      │    exec half → orchestrator)
 ┌───────▼──── CLIENT (canvas shell) ──────────┐
 │ trusted pages: Store · App Library · wizard │
 │ generative:  STAGE (composite) · palette ·  │
 │              overlay · timeline             │
 │ render layer: per-app catalogs, provenance  │
 │              boundaries, derived-binding    │
 │              evaluator (spreadsheet layer)  │
 └───────────────────┬─────────────────────────┘
                     │ A2A
 ┌───────────────── ORCHESTRATOR ──────────────┐
 │ ROUTER    retrieve→rerank over AgentCard    │
 │           skills; miss → store fallback     │
 │ COMPOSER  chrome paint + fragment graft +   │
 │           data-model synthesis (see below)  │
 │ REGISTRY · AUTH VAULT · A2A POOL            │
 │ OS BRIDGE (spawn real apps, provenance)     │
 │ INTENT JOURNAL ──────────────▶ (future SSM) │
 └───────┬───────────┬───────────┬─────────────┘
         ▼           ▼           ▼
     app agents (GitHub · UberEats · DoorDash · …)
```

## Decisions so far

**Apps & store**
- A semantic app = **A2A AgentCard as-is** (skills = the old "capability card" idea;
  auth via securitySchemes; A2UI catalog already rides in `capabilities.extensions`)
  + an adapter bundle + store metadata. We invent one wrapper and one extension, no more.
- Install splits the package: catalog+adapter → client, card+endpoint+auth → orchestrator.
- Install wizard ends with a **hello-fragment smoke test** (endpoint alive, catalog
  conformant, adapter loads) — doubles as the store's live preview.
- **Killer loop:** intent miss → store search → install consent → resume the original
  request. "An empty computer that fetches its own apps."

**Routing**
- **Taxonomy-free.** No intent enums (the Alexa-skills mistake). Embedding retrieve
  → LLM rerank directly over AgentCard skill descriptions/examples. Writing good
  examples is the ecosystem's SEO. Fan-out is a routing outcome, not a special case.

**Composition & data (the technical heart)**
- Orchestrator owns a neutral **chrome catalog** (frames, slots, provenance badges);
  fragments keep each app's own catalog/design system. Trust boundary per subtree.
- **Fragment contract:** requests carry an archetype (card/panel/row/full) + budget.
  Data flows are **observed, not declared** — agents' data models are emergent
  (verified in a2ui-github: prompts prescribe behavior, never field names; shapes
  derive from MCP payloads per turn). `sendDataModel: true` already reports live
  data models back on every message — the observation half exists in-protocol today.
- **Composer = semantic compiler.** It reads the heterogeneous fragment data models
  (names *and* values), then authors the shell's own data model as **derived
  bindings** — formulas over mirrored fragment paths, e.g.
  `/shell/price_total = add(ref(dd,/order/total_price), ref(ue,/cart/price))`.
  LLM understands once per composition; the client runtime re-evaluates
  deterministically (spreadsheet/signals semantics) on every local change.
  Formula vocabulary = catalog functions (logic/format/count exist in the adapter;
  arithmetic operators are the known gap — upstream basic catalog has them).
  Derived formulas are declarative → **auditable**: tap a total, see its sources.
- Interactions route by provenance: inside a fragment → its agent; chrome & new
  palette utterances → orchestrator. Fragments never see each other's data
  (hub-and-spoke isolation between competing vendors).

**Shell & OS**
- **Trusted pixels principle:** any UI that grants authority (install review, auth,
  permissions) is deterministic shell UI, never generated. Everything on the stage
  is generative. Browsing is rich; consent is boring.
- OS Bridge is just a built-in "System" app (launch apps, open files/settings);
  every spawn is recorded in a **provenance ledger** with the intent that caused it.
- Intent journal records two layers per turn: an open free-form descriptor
  (+embedding) and, only at the future SSM boundary, a thin closed projection of
  machine-facing dimensions. Quantize late; store both.

## Recurring design axioms

1. **The vocabulary is the boundary.** LLM authors → closed vocabulary bounds →
   validator checks → runtime executes. Applied three times: UI trees (A2UI),
   intent projection, and now data wiring (derived bindings).
2. **Open semantics, thin closed projection.** Free-form wherever an LLM is the
   reader; tiny fixed vocabularies only where deterministic code must act
   (well-known keys, machine dimensions).
3. **Replace pre-agreement with understanding.** No pre-declared schemas, no intent
   taxonomies, no per-app integration code — the shell understands what flows
   through it at composition time. Understanding is expensive so it runs once;
   arithmetic is cheap so it runs always.

## Reused vs. new

| Reused from a2ui-github / A2A / A2UI | Genuinely new |
|---|---|
| Canvas shell, timeline, hold-and-swap | Orchestrator (router · composer · registry) |
| A2A transport, AgentCard, extensions | semantic-app wrapper + one A2A extension |
| A2UI validation, `sendDataModel`, local functions | chrome catalog + fragment graft runtime |
| primer-a2ui-adapter as first installed app | derived-binding table + evaluator |
| catalog authoring skills, GitHub agent | marketplace (static index is enough for demo) |

## Open questions (parked)

- Shell body: web app vs Tauri/Electron (OS Bridge realism vs. build weight).
- Demo domain pair: mock UE/DD food apps vs. a "my morning" dashboard
  (Calendar + GitHub + Mail) reusing the existing agent.
- Fragment negotiation: how much archetype awareness lives in the agent vs.
  the orchestrator trimming full paints (protocol purity vs. demo shortcut).
- Adapter-bundle trust for third parties (review/signing; or a future fully
  declarative adapter — an A2UI-next proposal).
- Chrome re-binding policy when fragment repaints break observed paths.
