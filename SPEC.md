# A2UIVerse — Project Spec

> **A2UIVerse = A2UI + Universe.** The application ecosystem for A2UI agents, built as a **semantic application runtime** on A2UI and A2A: it composes independently-owned agent UIs into one persistent, interactive application. A2UI defines how an agent paints an application; A2UIVerse defines how applications understand and compose one another — agents as first-class, composable application primitives that can be packaged, discovered, installed, orchestrated, and composed into interactive experiences.

## 1. What this is

The upper semantic layer of the Semantic Computer architecture, built as a standalone project. A full front-end ecosystem for A2UI:

- **App** — an A2A agent that paints its own UI. Not a client application.
- **Store** — how an app is published, discovered, and installed in the agentic era.
- **Canvas shell** — the canvas from `a2ui-github`, generalized so it composes multiple agents into one surface.
- **Orchestrator** — window manager + package manager + intent router. The new deliverable.

No SSM/OS work is in scope. The lower layers survive as an intent journal and a narrow future contract.

### Differentiator

**Semantic composition across independently-owned applications.** The unit of composition is not the component but the relationship between independently-owned application states. Multiple agents, each in its own design system and owning its own UI and data, are painted into one surface, and the shell authors a synthesis surface over the relationships between their data: a Linear issue, its GitHub pull request and its CircleCI run joined as one work item, not three panes side by side. This is the first-class citizen; everything else serves it.

Composition spectrum:

```
L0 single surface   L1 tiled          L2 fragment graft        L3 deep merge
(a2ui-github)       (whole surfaces   (shell layout + agent    (dissolve trees)
                     side by side)     fragments in slots)
                                       ← target                ← ruled out
```

L3 is ruled out permanently. Anything L3 would have served is served by the synthesis surface instead: **semantic composition, not component-ownership composition.** At L2 every fragment's tree, design system, data, events and lifecycle stay with the agent that owns them; the shell composes what their states mean together.

### Shape of the runtime

```
intent ─▶ Planner ◆ ─▶ agents, in parallel ─▶ partitions: each agent's UI and data, isolated
                                                   │
                                   Synthesizer ◆ ◀─┘   semantic composition: which entries are one thing
                                        │
                              synthesize data model    the composition's IR: refs · formulas · relations · tree · sorts
                                        │
                                   validator ▪
                                        │
                         deterministic runtime ▪      bind · evaluate · sort · navigate · isolate · history · replay
                                        │
                              one live application
```

◆ a model call, ▪ deterministic. Models answer what needs meaning; the runtime holds every invariant (axiom 5). The Synthesizer's output is an intermediate representation, not UI: authored by a model, checked against a closed vocabulary, interpreted deterministically (§5.2).

---

## 2. Axioms

1. **The vocabulary is the boundary.** LLM authors → closed vocabulary bounds → validator checks → runtime executes. Applied to: UI trees (A2UI), intent projection, data wiring (derived bindings), the integrity gate (the validator decides whether the model is needed at all), and the credential bar (the shell catalog carries no credential input; the hub refuses a paint that contains one).
2. **Open semantics, thin closed projection.** Free-form wherever an LLM is the reader; tiny fixed vocabularies only where deterministic code must act.
3. **Replace pre-agreement with understanding.** No pre-declared schemas, no intent taxonomies, no per-app integration code, no shell token contract imposed on apps. The shell understands what flows through it at composition time. Understanding is expensive so it runs once; arithmetic is cheap so it runs always.
4. **Trusted pixels.** Any UI that grants authority is deterministic shell UI, never generated. Browsing is rich; consent is boring. This is a distinct pattern from 1–3: not bounded generation, but no generation.
5. **Models for meaning, software for invariants.** A model is called only where understanding is required: choosing the apps and the layout (the Planner), relating entries across apps (the Synthesizer). Everything that must hold every time (validation, isolation, binding, evaluation, sorting, navigation, history, replay) is deterministic code. The model writes wiring, never values (§5.2).

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

- **Architectural target:** S2 entity join — the only scenario that requires fragment graft. Proven at M4 over a work item across developer tools — a Linear issue, its pull request in GitHub, its CI runs in CircleCI (§9.4, §12).
- **Proving milestone:** S1 temporal merge, over GitHub · Gmail · Google Calendar.
- **Entity resolution** is a named responsibility of the Synthesizer, not a side effect of derived bindings: the Planner states the join hypothesis in its brief, the Synthesizer confirms it as a checked match claim (§5.2, §10).
- S5 is exercised at M8, over two accounts of Gmail merged (§9.5, §12).

---

## 4. Surface model

### 4.1 One composed screen, flat surfaces

A composed screen renders as a single tree; on the wire it is a flat set of A2UI surfaces. A **fragment** is one agent's surface, mounted into a slot of the shell's layout surface, carrying:

- its own data-model **partition** — the surface's data model
- its own **catalog scope** — the surface's `catalogId`, fixed at creation
- its own **provenance tag**
- its own **message channel** back to the agent that owns it

Placement rides on A2A message metadata: the composition stamp's `source` names the source a surface came from — the app, and the account it painted under (§9.5) — and the surface fills the layout's `Slot` holding that source. The shell's `Slot` components are purely local placeholders — no component tree references another surface. **Graft** means mounting a surface into a slot. Composition is a shell capability, not a protocol feature.

Consequences:

- Surface ids are namespaced by the orchestrator by their source (`<source>:<surfaceId>`) — the one A2UI rewrite. Component ids, binding paths, and catalog ids are untouched.
- The relay also rewrites the **A2A envelope** around that untouched A2UI: it stamps composition metadata, and it demotes each vendor's terminal state so the hub owns the turn's single final. These are envelope bookkeeping, not content — which is why the A2UI claim above is the strong one, and why the two are counted separately.
- The rendered tree unifies; the wire and the data model partition. A fragment's bindings resolve only inside its own partition.
- The shell reads across all partitions. This is the hub privilege and the only asymmetry in the system.
- Catalog resolution is per surface, not global — and within the painter's **catalog entitlement** (§9.1): a catalog id is an entitlement, not a lookup key.
- Repaint is surface replacement.

### 4.2 Shell catalog

The **shell** is every platform-owned surface — the canvas container, the synthesis surface, the trusted pages, the authority surfaces. The **shell catalog** is the orchestrator's paint vocabulary: the standard A2UI basic catalog's schema less its credential input (`TextField`'s `obscured` variant), plus composition primitives (`Slot`, `Attribution`) and the shell's closed action set — open the Store, with an optional query; open the App Library; add an account to an installed app. Its implementation maps each basic component onto its Radix Themes counterpart — Radix Themes is the shell catalog's own design system, brought by its Provider under the §9.2 artifact rule — and the composition primitives are its own mappings on the same system, shipped with their schema in `shell-catalog`. The shell's own pages and widgets are built on Radix Themes as well. The orchestrator paints content, not just structure: the Planner authors the **layout surface** (§5.6), and the Synthesizer's output is a **synthesis fragment** grafted through the same path as any agent's fragment. Both are ordinary A2UI in the shell catalog. There is no privileged paint path.

The word "chrome" is not used.

### 4.3 Visual authority

**The shell owns the container; the vendor owns the interior.**

- Shell: layout, frames, grid, gutters, its own synthesis surface.
- Vendor: everything inside its fragment's box — font, spacing, color, components, design system. Total.
- No token contract. The shell never reaches into a fragment.
- Coherence comes from spatial discipline, not stylistic normalization.
- Graft granularity is the subtree/panel.

Every grafted fragment carries a shell-owned **attribution affordance** — rendered by the shell, in the shell catalog, in the shell's own surface — that the fragment cannot suppress, restyle, or occlude. The shell controls its prominence: a quiet persistent marker on the fragment boundary, full attribution on hover/focus, escalation when authority is in play — a scope request inside the fragment is a fixed-width chip on the marker's row, beside the arrows, its request on a card floating over the fragment, nothing moving (§8). The boundary carries an accessible name announcing the source. On every fragment of an app with more than one account, attribution names the account by its label (§9.5). The affordance also carries the fragment's **way back** (§6.5): a back arrow at the right edge of the marker's row once the agent has painted more than once in this canvas, a forward arrow beside it after a back, each a soft accent icon named by the paint it returns to — the agent's `paintMeta` title, "Back" when it named nothing.

The boundary is **not drawn**. A rectangle around every fragment makes the target composition — the shell's layout with fragments grafted into its slots — read as the tiling it replaces (§1), and boxes a vendor's own cards inside a second box. The shell draws no border, edge, background or hover state around a fragment; a region is its attribution marker, the vendor's own pixels, and the whitespace between regions. A reserved slot draws nothing either and keeps the space it reserved, so first paint is a page assembling rather than a wireframe of empty boxes filling in.

The **user's question heads the canvas**: their words, verbatim, from Enter until the next question, the one header of every turn — the screen carries no title of its own; the merged view's title labels the merged view. A question that fits one line is set at display size; a longer one at body size in a four-line box whose height is settled at Enter, and past four lines "Show all" opens the whole question over the page, nothing beneath it moving. Under it a progress line says where the turn stands — planning, then a tick per source as its fragment fills, then the merge — in words the client computes from what it holds, never a model's; a merge over an entity is named in the entity's nouns from the Planner's join hypothesis ("Joining Linear issues to GitHub PRs and CircleCI runs"), the sentence still the client's. An action inside a fragment names no action: that source's tick works again until its answer lands. The header scrolls with the page it heads; once it has scrolled away, a one-line bar holds the top edge — the question and the progress line, running or landed — nothing beneath it moving. The status strip no longer carries the question.

Attribution is for vendor fragments. The shell's own content — the synthesis surface, and the framing and platform answers the Planner writes into the layout surface — carries none. The synthesis surface renders in its reserved position with no boundary and no tile, the shell writing on its own page, and its provenance is in each derived value (§5.4). The Planner never authors `Attribution`: the shell wraps every vendor-fragment `Slot` in it deterministically, and the synthesis slot and gap slots — the shell's own content — stay bare.

### 4.4 Agent awareness

- The request to an agent is Planner-authored natural language carrying all size/shape guidance as prose. The agent paints for its slot in its own catalog; nothing a2uiverse-specific rides the vendor wire.
- Agents that ignore the guidance fall back to **orchestrator trimming**. This fallback is permanent: an unmodified A2UI agent composes, just less well.

### 4.5 Layout plan timing

- The Planner commits a provisional layout before any agent is dispatched. **First paint never waits on any agent.**
- Slot **identity and position are fixed for the turn**. Later revisions may fill, resize, or collapse a slot. They never permute slots. A fragment is never re-parented.
- When the plan fans out with synthesis, the **synthesis slot is reserved at plan time**, drawn as the merged view to come rather than a tile — its planned column headers over a few skeleton rows — and filled in place; the landed view takes its own height. A collapsed merge slot leaves one line where the view's label would have sat — a decline's reason in the Synthesizer's words, in ink, with no press; every other collapse's in the client's, from its cause, carrying the press that can bring the view back: the home source failed, with that source's Retry; fewer than two sources arrived, with Retry over the ones that did not; the merged view couldn't be made, with Try again. The skeleton's height is given back and the fragments move up once. A collapsed merge a press brings back moves nothing until its view lands; until then only the line's words change.
- The rule holds one level down. A planned column is marked to its source from plan time; when the merge lands without that source, the column stays **reserved**, its cells drawn by the client from the slot's state — loading while the source is in flight, failed once it failed, not included while it waits for Include, the header saying the same — and filled in place once the source is included. Nothing moves.

---

## 5. The turn

◆ LLM call · ▪ deterministic · ▸ network

```
t0  input        palette utterance
t1  ▪ Router     embed → retrieve over local index of AgentCard skills, the platform's own card among them
t2  ◆ Planner    dispatch list · capability gaps · synthesis slot (or not) ·
                 the layout surface in the shell catalog: slots · framing · platform answers;
                 platform readers called on demand (§5.6)
t3  ▪ first paint the layout surface: every vendor Slot wrapped in Attribution · gap slots filled with the capability tile ·
                 slots whose card asks a sign-in the vault cannot meet filled with the authority tile ·
                 pending slots · reserved synthesis slot. Shell partition only.
t4  ▸ AgentsPool N parallel A2A calls, each (endpoint, credential, request)
t5  ▪ per-fragment arrival — independent, unsynchronized:
       validate → namespace ids → mount at slot → partition data model → scope catalog → attach attribution
t6  ◆ Synthesizer when every dispatched source has resolved:
       the synthesize data model: entity resolution as match claims · derived data model of formulas · synthesis fragment tree · sorts · note · optional layout revision
t7  ▪ evaluate + paint synthesis into the reserved slot. Nothing else moves.
t8  ▪ steady state, forever: BindingEvaluator on local change; IntegrityChecker on repaint
```

- A single-agent turn is one model call.
- A layout-only composition is one model call.
- A question about the platform is one model call; a platform reader is a step inside it.
- A synthesized composition is two.

### 5.1 Synthesis is opt-in per turn

- The **Planner decides** whether to reserve a synthesis slot.
- The **Synthesizer may decline** if it reserved and finds nothing joinable. The slot collapses to one line in its words (§4.5); fragments stand side by side.
- If fewer than two sources arrive, no synthesis runs and the slot collapses to one line in the client's words. Under an anchored join hypothesis a failed home source collapses it the same way, with no model call.
- The user may request a merge on a layout-only composite ("compare these").

### 5.2 Synthesizer output

The Synthesizer emits the **synthesize data model** — the data model for a2ui composition — as **wiring, never values**. It authors it the way an agent authors its surface: JSON as text against the contract and the shell catalog described in its prompt, parsed and validated after, one retry carrying the failure.

The synthesize data model is the composition's intermediate representation. The model authors it, the validator checks it against a closed vocabulary, and the runtime interprets it deterministically (resolving refs, evaluating formulas, holding relations, sorting), so no value on the screen comes from the model.

1. A derived data model: a free-form JSON shape of the model's choosing whose every leaf is a formula — one operator the shell catalog declares over refs into partitions — never a literal value, e.g. `min(ref(bh, /items[sku=…]/price), ref(keh, /results[id=…]/cost/amount))`. Entity resolution is expressed as which refs land in the same object; where the Synthesizer judges entries from different sources to be one thing, the object carries its **match claim** under the reserved key `match`: named relations — `equal` and `contains`, facts checked against the data, or `judged`, the Synthesizer's judgment — each over two refs in two different sources. No rule states which objects carry one. The validator checks each relation against the partitions at accept time; the client evaluates them live, so the evidence goes absent with the cells.
2. A synthesis fragment tree in the shell catalog bound to those paths. A formula-bound path renders only through the shell's derived-value component (§14), and a claimed object's join is disclosed on its values by the same component (§5.4); the tree binds no path under `match`; literal props in the tree — labels, headings — are presentation.
3. **Sort declarations**: for each sorted array, its path, the key path inside each element, and the direction. A path passes through the enclosing arrays with `*`, so one declaration orders the list inside every row alike. The model names the criterion from the Planner's brief; the runtime sorts. The criterion is always displayed and always user-changeable.
4. A **note**: what was delivered and why it differs from the Planner's brief, when it differs. Journaled, never painted — the user never saw the brief.

The Planner's brief to the Synthesizer is prose — the reserved slot's request — as its brief to each vendor is, beside the view's planned columns, each marked to its source, which the user has already read in the reserved slot, and the sources missing from this synthesis: the Synthesizer starts from the columns, keeps every column marked to a missing source, and says in the note where it departed. When the merge is over an entity, the brief carries the **join hypothesis**: the entity, its kind (§10), and the cue that identifies it in each source; the Synthesizer starts from it against the arrived partitions inside its one call — the named cue where the data carries it, otherwise any other fact that links two entries, `judged` only when nothing but understanding does — and says in the note where it departed. Under an anchored hypothesis the home source's instances are the merged view's rows; every other source attaches to a row or to nothing — an unmatched entry stays in its own fragment, a missing attachment is the empty cell, 0 of 0. Under a union the rows are every instance any source lists, the same thing across sources merged into one row, an unmatched entry a row of its own, a source that lacks the thing the empty cell. A row attaches one entry of a source, or a list of that source's matching entries, each entry an object with its own match claim; a list inside a row carries a `count` over its entries, so an empty one is the empty cell. When an anchored hypothesis's home source arrives with no instances, the Synthesizer declines, and under a union only when no source brought an instance; when the home source fails, the merge collapses without a call (§5.3). When a synthesis slot is reserved, the vendor requests also ask in prose for the data the merge depends on; nothing a2uiverse-specific rides the vendor wire, and a vendor is never changed to serve the merge. Planner and Synthesizer know only the shell catalog, never a vendor tree. A re-synthesis is handed the previous synthesize data model beside the fresh partitions: re-point what became invalid, keep the view unless the data no longer supports it, say in the note what changed.

The BindingEvaluator re-evaluates deterministically on every local change, including two-way binding edits inside a vendor fragment. Derived bindings behave as a live query, not a snapshot.

### 5.3 Synthesis trigger

- Fires when **every dispatched source has resolved** — arrived, failed, or hit its per-source deadline. The deadline is **patience after the pack**: once the sources that arrived could make a merge on their own, it fires after a short quiet in which no source has settled, and every source still out counts as resolved. It releases synthesis and nothing else; the stragglers' dispatches run on. A longer **hard cap** fails a dispatch: its slot takes the failure tile, and an answer arriving after the cap is held, undrawn, until the reader presses Retry. Under an anchored join hypothesis the home source is exempt: the reserved slot waits for it, and synthesis fires when it lands; a home source that fails collapses the slot at once, with no model call. The turn's final waits for every dispatch to arrive, fail or reach the hard cap. A new utterance does not end it: the canvas runs on while the user is elsewhere (§6.4); closing the canvas ends its turn, its dispatches and its model calls.
- A source with a request in flight — from the plan or from the user — is **not quiescent**. Synthesis waits for it.
- If a partition the in-flight synthesis depends on changes, that synthesis is **invalidated, not reconciled**. Re-fire on quiescence.
- A late arrival after synthesis is **visible and attributed**: its fragment mounts in its slot for free, the progress line names it, and a row above the merged view's label says the source arrived after this merge. The **absorb is on request**: an Include press runs the re-synthesis, handed the previous synthesize data model beside the fresh partition; disclosure changes at the same instant entities reorder. The merge keeps the set of sources it was built over: only Include, Retry and Try again add to it, a failure removes from it, and a re-synthesis for any other reason runs over that set. A re-synthesis whose call fails leaves the landed view as it was, a line saying so beside the press that tries again. After a decline, a source arriving later is offered Include under the collapse line; a merge that couldn't be made offers Try again, which makes it over every arrived source. The turn's first synthesis is its only automatic Synthesizer call; every further call has a press behind it — Include, Retry or Try again.

> The merged surface may change under the user, but never without a visible reason.

### 5.4 Disclosure

The synthesis surface always discloses **which sources contributed, why any source is absent, and the sort criterion in force**. Derived values must disclose their source set.

The requirement is not a caption. Disclosure is carried where the fact belongs: a derived value renders its contributor state in the cell, so a value computed over a partial source set never renders identically to one computed over a complete set; the criterion is carried by the control that changes it; provenance is carried by the fragment's shell-drawn attribution (§4.3). A canvas is stamped with its question's time (§6.4).

A claimed object discloses its join **on its values**, through the same derived-value component: the confirmed facts tie apps into the row's core, whose values carry no mark; a value from an app tied in only by the Synthesizer's judgment is marked guessed; one whose only link no longer holds is marked broken. A wrong join whose evidence holds — a reused identifier (§6.2) — is not detectable and stays accepted.

**The shell speaks where it is unsure and shows where it is sure.** A value says on hover or focus where it came from and what matched, in the Synthesizer's words, wherever the shell has admitted something — a join mark, or a contributor set short of what the formula declared. A value held by facts over every source it declared says nothing at rest: its audit is the tap, which lands the user on the originating element in the vendor's own fragment (§7), and showing the thing answers "why is this here" better than a sentence about it. The accessible name carries the whole disclosure either way, independent of pointer state, as attribution's does (§4.3).

The contributor state and the join are **one mark, not two families**, and the mark is the value's own contrast: the less solid its basis, the softer it reads. A value complete and held by facts is drawn at full strength; partial, absent and guessed step back into the quiet register; broken escalates and keeps a glyph, the one state that means the value may belong to another entity. The empty cell — the attachment a row never had, 0 of 0 (§5.2) — is not a mark at all: nothing was lost, so nothing is disclosed, which distinguishes it from refs that resolved once and stopped (§6.2).

A value the reader must act on — a failed build — carries a **danger tone**, apart from the mark: the Synthesizer names the column's danger words, the runtime compares each value against them and draws a match with a ✕-circle, in red where the value is drawn at full strength. Certainty wins the color: a guessed or partial failure stays in the quiet register and a broken one amber, the icon kept.

**The model names things; the runtime counts them.** The Synthesizer chooses the criterion's name; every count, contributor set, and absence is computed.

### 5.5 Mid-turn streaming

Inherited from the canvas: streaming renders only on the first turn; subsequent responses apply on completion. Quiescence of a fragment is its response completing.

### 5.6 Planner output

The Planner is the shell's designer and its voice. It authors the **layout surface** (`shell:main`) the way an agent authors its surface: as text against the shell catalog described in its prompt, parsed and validated after, one retry carrying the failure.

1. A **dispatch list**: each source with its prose request, and each capability gap named in prose (§8). The merged view's entry also carries its planned column headers and, under a join hypothesis, the entity's noun in each source — painted on its reserved slot (§4.3, §4.5).
2. A **tree** in the shell catalog. `Slot` is its placeholder — one per dispatched source, one for the reserved synthesis slot when there is one, one per capability gap. A `shell` slot is the synthesis slot and nothing else. Around the slots the tree carries framing — headings, the shell's own words — and answers to questions about the platform. It never contains `Attribution` or `Frame`.
3. A **data model of literal values** the tree binds to — never a formula, never a ref.
4. Actions only from the shell's closed action set (§4.2, §7).
5. A **title** for the canvas: a short noun phrase that names its entry in the trail (§6.4), validated for length, written at plan time so the entry is named the moment it appears. It reaches the client as the shell's own `paintMeta` for the layout surface (§14). The user's question stays the canvas's header; the title labels the trail only, and the truncated question stands in when the Planner writes none.

The Planner reads platform state only through a closed set of **platform readers**, called when the utterance needs them, the way a vendor agent calls its MCP:

- **Installed apps** — from the Registry: each app's id and its card's name, description and skills, whether the card was reachable at boot, and its accounts by label — never a credential.
- **This canvas** — the structure of the canvas the question was asked from — the one the user is looking at, not the newest (§6.4): the utterance it came from, which sources sit in which slots and each slot's state, whether a synthesis is live, collapsed or declined and the decline's reason.
- **Recent turns** — that canvas's ancestry in the trail, one line each: what was asked, which sources answered, the outcome, when.

No reader returns a partition's contents or the synthesis document; the Planner never sees vendor data. A new projection is a new reader. What A2UIVerse is needs no reader: it is the platform's card, on the shortlist.

---

## 6. Composition lifetime

A **Composition** is a durable object that outlives the turn that created it: slots, fragments, partitions, derived bindings, source set, the question's time, and — per agent — the sequence of its paints in this canvas with the wiring accepted over each combination of them (§6.5). There is one per canvas, held on the orchestrator for the session and named on every client message (§14); durable means outliving the turn, not the process — a reload starts fresh.

History is part of the application model, not a transcript: the trail across questions (§6.4) and each agent's steps (§6.5) restore live state through the same path a live paint takes, never a picture of it.

### 6.1 Invalidation tiers

| Tier | Trigger                                       | Cost                            |
| ---- | --------------------------------------------- | ------------------------------- |
| 1    | repaint, all bindings still valid             | re-evaluate arithmetic only     |
| 2    | bindings broke, or a source joined/left       | re-synthesize affected bindings |
| 3    | a new question from this canvas — asked again, refined, a source added or dropped, a merge asked for | re-plan, as a child canvas (§6.4) |

### 6.2 Binding validity

Per binding, not per partition. There is **one ref form**: a **key-based ref** (path predicate, e.g. `/items[sku="…"]/price`, conjoining fields where one does not identify the element), valid while its key resolves. Resolution *is* validity, so the answer needs nothing but the partition's current data. An element of an array is never addressed by position: a position is not a name, and after a reorder the same position is a different entity.

Key-based refs are the Synthesizer's own discipline over the data it was shown. They cannot be required of vendors — nothing about them reaches the vendor wire; a vendor that paints no stable key simply cannot have that element merged, and that is the §4.4 fallback.

**Absent is not invalid.** A ref whose key no longer resolves is **absent**: free, reversible, recomputed around — formulas skip it and carry their contributor count. Absence is what re-synthesis fires on. Because a key names the element rather than its place, an in-fragment reorder re-points nothing and costs no model call, which is what makes §6.3's local degradation implementable.

The residual hazard is a vendor that **reuses an identifier for a different entity** across a repaint: the key resolves, to the wrong thing. Generation stamps could detect it only by marking every ref into a repainted partition invalid, which is the positional rule applied universally and would negate what keys buy. It is accepted, not solved (§14).

### 6.3 What drives re-synthesis

A change to the **user's question** — a source added or dropped, a refinement, the question asked again — is not a re-synthesis but a new canvas, a child of the one it was asked from (§6.4, §7). Inside a canvas, re-synthesis fires only behind a press (§5.3) or on the walk below. It never fires on navigation inside a fragment.

- Entities **vanishing** (filter, drill-down, detail view) degrade locally and free: affected refs go absent, formulas recompute over what still resolves, and the affected values disclose the narrowed source set. Reconnection is free.
- Entities **appearing** need entity resolution → Synthesizer. On its post-action walk the IntegrityChecker compares the key set of every array any accepted document of the composition has referenced against the set at the last accept — empty when the array is not there; a new key is a change-account entry of its own kind, and the re-synthesis is told what appeared, to attach or ignore it. Vanish and appear are the two halves of one walk.
- A source the accepted document reads nothing from — one the Synthesizer detached, or never attached — has no ref to go absent and no watched array to appear in. When a surface of it holds other data than at the last accept, the walk names it **repainted**, and the re-synthesis is told which, to attach what it now carries or leave it out. It costs a model call for each change inside a fragment the merged view does not read.
- A match claim's fact that stops holding while its refs resolve is disclosed as **broken** (§5.4) and fires nothing; a re-synthesis that runs is told which relations no longer hold.

### 6.4 The trail

The timeline is a **trail of canvases, one entry per question**. Only asking makes an entry; everything that happens inside a canvas — a drill-down in a fragment, a press, a re-synthesis, a sort — is that canvas's own life. The trail is a tree: a question asked while viewing a past canvas makes a child of it, and the Planner reads the viewed canvas as *this canvas* and its ancestry as the recent turns (§5.6). It is drawn flat by time, newest first, each entry the Planner's title (§5.6) and the question's time, a branch annotated with the canvas it was asked from, the live one and the one on screen marked, a canvas still loading in the background marked quietly, a scaled preview of the canvas on hover, a close on each entry — opened on demand from a Trail button beside Back, the question staying the one header. Back follows the branch: it goes to the canvas the one on screen was asked from, not the one asked just before; a canvas closed hands its parent to the canvases asked from it. "Live" is the newest question's canvas.

A past canvas is **a previous tab, not a frozen past**: rehydrated from its state, actable — an action inside a fragment, a press, a sort run on *that* canvas and land in it, the orchestrator answering against its composition — and running on after the user leaves it: dispatches still out arrive, the deadlines and the one automatic merge run, presses in flight finish, with no cap on how many canvases run at once. It is stamped with its question's time, on the parked banner. It is never reloaded in place and never evicted: **"Ask this again now"** is the canvas's own question asked from this view — a new child, today's answer, the past one untouched — offered on a past canvas alone, the live canvas's question asked again from its header; the user closes a canvas from the trail, which cancels its turn if still loading, and closing the one on screen returns to live.

### 6.5 The way back inside a fragment

Each agent's paints inside a canvas are **local state**, each kept once under its **paint id** — one per `createSurface`, counted alike on the client and the orchestrator — and never dropped; a vendor's `updateDataModel` changes the paint on screen, so an agent that drills down by data update alone has no way back, the §4.4 fallback. An agent's history is a linear list of **visits**, the paint ids the user went through, walked by the back and forward arrows beside the attribution marker (§4.3). A new paint arriving while the user is not at the end of the visits first appends the paint landed on, then the new paint — the paints passed through on the way back are not recorded; a new paint at the end is appended. A step, from either arrow, restores that paint and the **wiring** the merged view had over it — the composition remembers, per combination of the paint each agent has on screen, the synthesize data model it accepted, never values, so a paint reached again by any route finds the wiring remembered for it — re-evaluated at once, with no call, as long as every other agent is where it was then; a combination never seen is covered by a wiring remembered over fewer sources — every source it names where it stands now — restored the same way, the sources that painted since late for Include (§5.3); only a combination nothing covers falls to the walk of §6.3 and its call. The step names the paint id and is reported at once: the orchestrator puts that paint's data model back on the source's partition, so the merge and the vendor's next answer see what the user sees, and journals the step. The list of visits is the client's alone; the orchestrator keeps which paint each agent has on screen. The walk starts only after a **quiet** with no further step on the canvas, each step restarting it, so a paint passed through starts no call; a step while the walk runs abandons it, the combination it walks no longer on screen.

---

## 7. Interaction routing

| Where                                                                                                   | Routes to                                                    | Cost           |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------- |
| Inside a vendor fragment                                                                                | that agent, on its channel, with its credential              | one agent call |
| On the synthesis surface, operating on the composition (sort, filter)                                  | shell                                                        | free           |
| The back or forward arrow beside a fragment's attribution (§6.5)                                        | client: the paint restored with the wiring the merged view had over it, the step reported to the orchestrator; no agent call | free, unless the combination was never seen (§6.5) |
| Add or drop a source, "compare these", ask this again — words at the palette, from the viewed canvas   | orchestrator: a child canvas planned from the viewed one (§6.4) | a turn         |
| On a shell-painted cell referring to a vendor's entity — every derived value that shows a value and names a source; a cell whose refs no longer resolve, like one with no refs, is not a button | **navigate**: scroll, focus and highlight the component bound to the ref's path in that fragment, degrading to the nearest bound ancestor, then to the fragment boundary, then — no fragment mounted for that source — to its slot. Client-local; never journaled | free           |
| On a shell surface, a shell action (open the Store with a query, open the App Library, add an account to an app) | client: opens the trusted page, or the sign-in (§8); reported to the orchestrator for the journal | free |
| Palette                                                                                                 | orchestrator                                                 | a turn         |

- Pre-synthesis, fragment interaction costs nothing beyond the agent call: no bindings exist yet.
- A fragment interaction never propagates sideways. Filtering one vendor does not filter another.
- **Act** (the shell sending an interaction into a vendor's agent on the user's behalf) is excluded from this project. It is the eventual target.
- Navigation runs on the client's reverse index from data path to rendered component, per partition, built from what the renderer binds. A cell over several sources goes to its winning contributor for a selector, to its first contributor otherwise; every other source is reached through its own values. Nothing leaves the client.

### Fan-out

- The **Planner judges fan-out per turn** against the actual AgentCards in the pool. Fan-out is a plan with N>1.
- The Planner **answers the question the user means**: an utterance about the state of one kind of thing gathers from every installed app that holds part of it, whether or not the user names them; a command or lookup inside one app's object, or an utterance that names its app, goes to that app alone. The rule holds one level down, over an app's accounts (§9.5): a question about state gathers from every account; a command, or an utterance naming an account, goes to that account alone. An action inside a fragment goes to the account that painted it.
- The user can always **add or drop a source** on a canvas, or ask for a merge over a layout-only one, in words at the palette: each is a child canvas planned from the viewed one, the parent standing (§6.4). No control for it on the canvas.
- No standing compare-by-default preferences.
- Known properties: fan-out discloses the query to every dispatched vendor; fan-out spends cost the user did not explicitly authorize.

---

## 8. Authority

- **The shell owns every authority surface.** An agent declares on its card what sign-in it needs — `securitySchemes`, and `security` for which of them are required; it never paints the prompt. A credential travels only as an HTTP header on the A2A request, as the card's scheme names it, never inside a message. **The shell never sees the credential**: no credential reaches the Planner or the Synthesizer, nor the client, a partition, the journal or the logs.
- **The card is checked before dispatch.** The hub evaluates the card-level `security` — an OR of ANDs, an empty requirement meaning none is needed — against the AuthVault for that app and account; when every alternative needs a scheme the vault holds nothing for, the slot takes the **authority tile** at first paint and the agent is not called. Per-skill `security` is not consulted. What the card cannot predict the agent signals in either of two ways, treated alike, each an **auth-required** response: HTTP 401 at dispatch, or the task moving to `auth-required` with the scheme and the missing scopes named by their keys on the card, in the card's own `security` requirement shape — scope escalation after the agent has begun (§14). The words of a request are the card's as installed; a key the installed card does not declare makes the request invalid, and no consent is shown.
- **The authority tile is the consent**: deterministic shell UI, visually constant every time — what is needed, the scopes in the words of the card's `scopes` map, one press, and that it opens the app's sign-in in a new window — in plain words, no address shown. The composite does not block; synthesis runs over the sources present; the disclosure line stays honest. Sign-in runs in a browser popup, never in a frame inside the canvas: opened with `noopener,noreferrer`, to https only, localhost exempt; while it is open the tile says to finish there, with Cancel. Its completion reaches the canvas from the orchestrator, never between windows; the client then sends the slot's resume press, and the slot re-dispatches and paints in place. Only the slot pressed resumes; any other slot waiting on that app loads on its own press, with no popup.
- Scope escalation shows the **delta**, not the total. A scope request inside a fragment is asked from its attribution row (§4.3), and the fragment stays: Allow signs in and sends again the press that needed the scope; Not now drops that press.
- Decline is a first-class state. The full tile shows once per app per session; after it, a slot for that app is one quiet line where its fragment would have sat — not signed in, Sign in — remembered by the orchestrator for the session. Expiry re-enters the same path: the vault refreshes silently, and the slot asks to sign in again only when the refresh fails.
- A slot that needs sign-in behaves like a failed source, sign-in its Retry: it resolves at once, and its source is included in the merge on arrival; an anchored home source that needs sign-in collapses the merge slot to a line in words with no press, the slot's own Sign in bringing the merge back; a reserved column for it reads not signed in; an escalation waiting on Allow is quiescent.
- Recovery re-dispatches only that slot: tier 2. A **failed** source fills its slot the same way, with the shell-painted **failure tile**: one statement at body size — the vendor's own words when it spoke, otherwise the client's reason for the failure — then Retry. Retry sends again what failed, to that slot alone — the action inside the fragment that failed, kept on the slot until an action or a Retry there completes, otherwise the slot's request from the plan — and includes it in the merge on arrival; an answer held past the hard cap is drawn at once, and a dispatch still running past it is raced by the re-dispatch, the first to arrive filling the slot. A failed source's data shows nowhere on the canvas: it leaves the merge, its column reads unavailable, and values computed over it recompute without it.

### Sign-in

The **AuthVault** is a generic OAuth client: it follows the authorization server the card's scheme names, with the authorization-code flow and PKCE, and registers itself where the server allows it — a client ID metadata document, otherwise dynamic client registration — with no per-vendor code. It signs in with OAuth and OpenID Connect against such a server, and with `http` bearer and `apiKey`, entered on a page the orchestrator serves in the same popup, which shows the scheme's `description` as the vendor's words and the card's `documentationUrl`. Any other declared scheme fills the slot with the authority tile, saying sign-in for that app is not supported here, with Manage apps opening the App Library; the app stays installed. An agent built on the agent kit is its own sign-in front door: its card points at its own sign-in endpoints, it holds its vendor's token and refreshes it, and the vault holds only tokens issued for agents. The vault keeps each account in an owner-only file in the orchestrator's state directory; uninstall deletes an app's accounts and revokes them where the authorization server advertises revocation; install-over keeps them.

### No credential input is painted on the canvas

No password, card, or OTP input is painted on the canvas. The shell catalog carries none. The hub refuses any painted tree containing a credential input, whatever it is for, by a deterministic check over names and painted values; a paint with one is refused whole. Vendor requests say in prose that the canvas shows no such field and that a secret is offered as a link to the agent's own page; a refused paint goes back to its agent once, its reason in prose; a slot whose agent does not repair takes a tile in the client's words, with Continue on the app from the card's `provider.url` or `documentationUrl`, and no Retry. The ways out are the agent's own: a scheme on its card for sign-in, `openUrl` to its own page for a secret that is content or a payment. A secret displayed rather than asked for is not covered. This is a checkable rule.

### Missing app and missing auth are the same hole

A capability the Planner wants and no installed app serves — the platform's own card included — is a **capability gap**. The Planner names it in its dispatch list and places a `Slot` for it in the layout surface (§5.6); the shell fills that slot with the **capability tile**, deterministic, no model wording in it, whose action opens the Store with the capability as query. Store search, install consent, and re-dispatch of that slot follow the exact shape of the authority tile. The original request is never torn down; resume is what not tearing it down gets for free.

A question about the platform itself is not a gap: the platform's card serves it, and the Planner answers in the layout surface.

---

## 9. Apps, catalogs, store

### 9.1 The app and the catalog artifact

Two units, joined by `catalogId`.

An **app** is an A2A agent, described by its AgentCard and nothing else: its name, description and skills, its `url`, its `securitySchemes`, and — under the A2UI extension's `params` — the catalog ids it paints in (`supportedCatalogIds`). The registry stores the card verbatim, refreshes it at boot, and dispatches to its `url`. No platform description of an agent exists, and the card is never extended. The one thing the platform adds is the **app id** — the provenance tag, the surface namespace, the vault key — chosen by the publisher, unique in the marketplace's index like a username, `shell` reserved.

A **catalog implementation** is its own unit, keyed by its `catalogId`, which A2UI already versions. The **catalog table** — the marketplace's index, the local registry's — maps each id to one **catalog artifact**, seeded with the standard basic catalog (the client's own `@a2ui/react` export) and the shell catalog. Each app has a **catalog entitlement** — the ids handed at its install plus the public basic catalog, the shell catalog in no app's set, fixed at install and changed only by install-over; the hub advertises to each agent its own entitlement as `a2uiClientCapabilities.supportedCatalogIds`, never the table, and refuses a paint outside it, so no agent can paint in another vendor's catalog. A card declaring no catalogs falls back to the basic catalog. The artifact is a directory of files served under one base URL — a descriptor with every file and its hash, the catalog schema, one ESM, its CSS files, its fonts and icons — reaching the host singletons through a versioned **host-module interface** the client provides at load. **Stellify** ("to turn into a star"), the platform's pack tool, writes it from a catalog package in the package's own checkout, one dev dependency, zero configuration by convention, its stylesheet and external imports rewritten so the vendor's source is untouched. The `sdk` holds the two contracts Stellify writes to and the marketplace, the registry and the client verify: the **catalog export contract** — a catalog package exposes `CATALOG` and, when its styles need a scope, one `Provider`, the minimum on any catalog used on A2UIVerse — and the **catalog artifact contract**.

**Publish** (§9.3) takes an agent URL and zero or more catalog artifacts: the card is fetched, and coverage holds in both directions — every catalog id on it is handed now or public, every artifact handed is an id on it; no orphan artifacts. **Install** takes the card and the artifacts for the ids it names, under the same check. An agent whose catalogs the platform already holds installs from its URL alone: an unmodified upstream agent on the basic catalog needs nothing packed.

A **catalog** has two faces — the **catalog schema** (`catalog.json`) and the **catalog implementation** (the React components) — shipped as one `<vendor>-catalog` package; they version together. "Adapter" is reserved for upstream's meaning, the framework layer (`@a2ui/react`).

### 9.2 The catalog implementation is code

A vendor's catalog implementation is a binding layer between A2UI's flat component model and a design-system library. It cannot be data. Install footprint is the binding layer, not an application; N apps on one design system share one copy of that library.

- **A vendor catalog is its own component vocabulary in its vendor's design language**, as GitHub's is Primer (`primer-a2ui-adapter`), GitHub's real design system — not the A2UI basic catalog themed. Gmail and Google Calendar are in Material 3's design language. Each is very similar to its vendor's product without imitating it: no exact colors unless the vendor discloses them publicly, no product icons, no logos.
- **The themed basic catalog** — the A2UI basic catalog under its `--a2ui-*` tokens, its basic components never re-mapped — is what the mock stores and the scaffolder's `basic` template carry. A themed basic catalog may **append product components** for what the basic vocabulary cannot express — a status drawn per row in its own color, where no basic property varies a row's look by data.
- **First-party catalog implementations only**, for the whole project.
- **Per-app isolation** is the stated target architecture. Same-context execution of third-party catalog implementations is rejected.
- Whether identical implementations across artifacts are deduplicated at install is an install-time detail.

#### One provider and one CSS setup per catalog artifact

A catalog artifact ships **exactly one Provider component and one CSS setup, both owned by the artifact**. The Provider is the artifact's whole entry into the page: it wires its design system, brings its own stylesheets and tokens, and anchors any portal root — all of it scoped to the fragment boundary the shell mounts it in, never to `:root`. The artifact carries its design system as its own dependencies at exact versions; the host supplies only the runtime that must be a singleton (React, the A2UI runtime, zod).

The host loads a catalog artifact from the registry for its catalog, its catalog id, and that one Provider — nothing of a vendor catalog is compiled into the client — and applies the Provider around that catalog's fragments only. It registers nothing at the app root, lists no vendor design system, and performs no per-vendor CSS setup of its own — so the canvas does not accumulate vendor setup as apps are installed, and installing an app is a table entry rather than a shell change.

This is a normative, checkable catalog-artifact review rule: an artifact that needs a second provider or asks the host for a CSS setup fails review. Its scoping half is already machine-checked by the client's collision detector; both agent-kit scaffold templates embody the rule.

### 9.3 Marketplace and Store

Two things with one word today; the spec names them separately:

- **Marketplace** — remote-in-spirit: index of AgentCards (skill embeddings), the catalog table and its artifacts hosted, the publish step — the card fetched, every catalog id covered, the app id and catalog ids claimed, refused when taken — and the hello-fragment smoke test as the live preview. In this project it is a local process.
- **Store page** — a trusted shell page the user browses and installs from.

The **App Library** is a trusted shell page over the local registry, where installed apps are uninstalled and their accounts and permissions managed.

The shell knows what A2UIVerse is and what is there; every how that changes state is a trusted page. The model never authors the Store page or the App Library and never reads the marketplace index; it may paint an affordance into either (§7).

Routing and store search are **one mechanism over two indexes** — local registry and marketplace index. A miss in the first is a hit in the second.

### 9.4 Vendor agents

Every vendor agent is backed by its vendor's **official, publicly available MCP server**; that is the first selection criterion for a vendor. Roster: GitHub · Gmail · Google Calendar (S1); CircleCI · Linear (S2, the entity join over a work item); developer-tool vendors with official MCPs are the later S3 expansion. An agent is written to its vendor, never to the merge: its domain doc and prompt say what the vendor's own user sees, drawn from what the official MCP server returns, and nothing about the shell, the join, or the other agents.

A vendor agent runs on **one port in one of three modes**: `deterministic` (no model), `llm` (model + MCP), `llm` without MCP (model + stub backend).

### 9.5 Multi-account

One app, one install, any number of accounts. Each account's credential lives in the vault, keyed `(app, account)`, the shell's account manager; slot naming and the AgentsPool's dispatch unit `(endpoint, credential)` are by `(app, account)`. The Planner chooses accounts (§7). An account is added through the authority tile or the shell's add-an-account action, both opening the same sign-in (§8). Its label comes from the sign-in — the ID token's display claims, its stable `sub` keeping one account signed in twice as one — otherwise "<App> account N"; it is renamed in the App Library.

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
| **Planner**          | ◆     | Intent + candidate cards, platform readers on demand → dispatch list, capability gaps, synthesis slot or not, the layout surface in the shell catalog (§5.6). Never sees vendor data.            |
| **Synthesizer**      | ◆     | All partitions (names and values) + the Planner's brief + the shell catalog → the synthesize data model: entity resolution as checked match claims, derived data model of formulas, synthesis tree, sorts, note. May decline. Emits wiring, never values; knows only the shell catalog. |
| **AgentsPool**       | ▪     | A2A connections. Dispatch unit `(endpoint, credential)`. Parallelism, per-source deadlines, quiescence.                                           |
| **UIComposer**       | ▪     | Mechanical tree assembly: namespace, mount, catalog scope, provenance + attribution, subtree replacement. Understands nothing.                    |
| **BindingEvaluator** | ▪     | Spreadsheet/signals semantics over derived formulas. Every local change, zero model cost.                                                         |
| **IntegrityChecker** | ▪     | Per-binding validity: does the ref's key still resolve; per referenced array: did a key appear; per unread surface: was it repainted. Gates whether the Synthesizer runs. |
| **Validator**        | ▪     | Agent trees against their declared catalog; LLM output against its schema.                                                                        |
| **AuthVault**        | ▪     | Credentials by `(app, account)`, in an owner-only file in the state directory: a generic OAuth client, refreshing silently, revoking at uninstall. Checks the card before dispatch; triggers consent, never paints it. |
| **Registry**         | ▪     | The installed apps' cards, verbatim, and the catalog table — the orchestrator's persisted state, written only by the orchestrator through install, uninstall and install-over; booted from alone, an empty registry a valid platform. Serves the orchestrator's AgentCard and indexes it under the reserved `shell` id beside the installed apps' cards, so the platform routes like any app.                        |
| **IntentJournal**    | ▪     | Per turn: free-form intent descriptor + embedding. The thin machine-facing projection is left unbuilt.                                            |
| **Composition**      | state | §6. One per canvas, held for the session; every client message names the canvas it acts on.                                                      |

A registry entry is an app's card under its id (§9.1). The client holds no catalog of its own: it reads the catalog table and fetches each artifact through **`orchestratorApi`**, the client's non-A2A channel to the orchestrator — HTTP, IPC under a native shell — preloading the table at boot and loading lazily a catalog a surface arrives in that it does not yet hold, so an install while the client is open needs no reload; an artifact is served as immutable content and cached by hash; a paint in a catalog the registry does not hold, or outside the painter's entitlement, is refused at the hub and fails that slot with no Retry, its words naming the publisher. Install, uninstall and install-over are orchestrator operations on the same channel; the Store page and the store loop are their UI. Install refuses the whole app on a coverage miss in either direction or a failed static gate — the descriptor conforms, the schema is a valid A2UI catalog whose id agrees, the host-interface version is one the platform supplies; the client checks the running code at load — the exports, the catalog id, the collision detector — and a catalog it cannot load fails that slot with a cause of its own, Retry kept; the marketplace checks behaviour at publish. Installing a held id replaces its card and artifacts in place; uninstall removes the card, an artifact living while any installed card names it; canvases already composed keep what they hold, a dispatch running when its app is uninstalled finishes under the entitlement it was sent with, and a later dispatch to it fails its slot as not installed. A catalog id is held at one hash: an artifact for it at another hash is refused while another installed app names the id. The registry keeps each card as installed and changes it only by install-over; each run uses the card fetched at its startup, an app whose card cannot be fetched then staying installed and unroutable for the run; a damaged registry refuses the boot. The write operations take a token the orchestrator writes into its state directory at startup. Sign-in starts and completes on the same channel (§8).

Open seams, task-internal: where the Composition object is canonical (client or orchestrator); whether Validator is one class or two.

Routing is **taxonomy-free**: no intent enums; embedding retrieve → LLM rerank over skill descriptions and examples.

Entity resolution runs top-down. The Planner, choosing the sources, states the join hypothesis in its brief — the entity, its kind, each source's cue — and the Synthesizer confirms it against the arrived data inside its one call, as a match claim the validator checks (§5.2). The hypothesis is one of two kinds: **anchored**, when the question owns the entities through one source ("my cameras"), whose instances are the rows and to which every other source attaches or does not; or a **union**, when the question ranges over all of the things wherever they are ("all cameras across the stores"), whose rows are every instance any source lists, the same thing across sources merged into one row, an unmatched entry a row of its own. A deterministic pre-pass — exact overlaps, then embed-and-match, the model on the ambiguous middle — is the unbuilt later stage for scale, feeding candidates into the same claim shape.

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
M3s  the shell as an agent   the platform's card routed like any app's
     proves the Planner authoring `shell:main` · platform readers on demand, never vendor data · capability gap as a slot ·
     the Store page and App Library stay trusted, the model paints only an affordance into them
M4   + entity resolution   entity join — a work item across Linear · GitHub · CircleCI   ← differentiator proven
     proves the Planner's join hypothesis and the Synthesizer's checked match claim · relations · the join disclosed on the values ·
     navigation from a merged cell · re-synthesis on appearance · two agents written to their vendor
M6   late-arrival + failure   per-source deadlines · failure tiles · decline · late absorb on request
M5   durable composition   the trail · a past canvas as a tab · ask this again · add/drop source · "compare these" · the way back inside a fragment
M7   app bundle + registry   the card as the app · catalog artifact + Stellify · local install · registry no longer hardcoded
M8   authority surfaces   auth-required · the authority tile as consent · AuthVault · no credential input on the canvas ·
     multi-account (S5)
M9   marketplace + publish   local index · package hosting · publish step · hello-fragment smoke test
M10  shell trusted pages   Store page · App Library · accounts
M11  store loop   capability gap → marketplace index → install → resume
M12  ecosystem run   publish a new app → discover → install → compose with an existing one → act inside it.
     One sitting, no code changes. Deliverable is the recording.
```

Until M7, the registry is hardcoded; from M7 the orchestrator boots from its persisted registry alone.

M0 to M6 build the composition runtime. M7 onward builds the ecosystem around it: app install, authority, the marketplace and the Store.

---

## 13. Repositories

Three repos, one per trust domain.

```
a2uiverse/              platform monorepo
  apps/                 client · orchestrator · marketplace — the local processes
  packages/             sdk · shell-catalog — libraries
a2uiverse-apps/         vendor apps, one folder per app: agent · <vendor>-catalog
a2ui-github/            origin of the GitHub app; unchanged. Copied into a2uiverse-apps/github/ at the end of Phase 1.
```

**Vendor dependency rule.** Per half:

- **Agent half** — the A2UI/A2A protocols and the **agent kit** (the vendor-agent SDK/CLI published from `a2uiverse-apps`, M1k); the kit itself depends on the protocols alone. Nothing a2uiverse-specific reaches the vendor wire: the kit's one shell convention is `paintMeta` (§14), which is optional and degradable — an agent that never emits it composes, with cause-derived titles and question surfaces painted as ordinary surfaces.
- **Catalog half** — the A2UI protocol, its design-system library, and, available to it, the platform sdk: its contracts (`packages/sdk/contracts`, normative JSON) with a single JS projection, **`@a2uiverse/sdk`**, carrying a contract test against the JSON. Available, not required — the projection's realized consumers today are all platform-side (client, orchestrator, `shell-catalog`, marketplace); no vendor catalog builds against it. **Stellify** (§9.1), the pack tool, is the catalog half's one build-time dev dependency on the platform, consumed as a `github:` dependency at a pinned ref with its build output committed so the install needs no workspace sibling; nothing of it reaches runtime.

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
| Auth-required state naming the scheme and the missing scopes by their keys on the agent's card, in the card's own `security` requirement shape as a data part of the status message — the consent's words come from the card as installed; a key the installed card does not declare makes the request invalid (§8) | upstream candidate — A2A's `TaskStatus` carries only free text, and its in-task authorization names no field for the scheme or the scopes |
| Cross-partition qualified refs `ref(source, path)` in bindings                                                                                                                                                                                                                    | upstream candidate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Path predicates (key-based refs) — a `[key=value]` segment in a ref's pointer, conjoining fields where one does not identify the element, selecting the array element whose fields equal the values. The only ref form: resolution is validity, positions are not refs. Never required of vendors. A vendor reusing an identifier for a different entity resolves silently to the wrong element — accepted, not solved (§6.2)                                                                                                                                                                                                                        | upstream candidate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Arithmetic and aggregate functions (`min`, `max`, `sum`, …), source selectors (`argmin`, `argmax`, `source`), and relations (`equal`, `contains`, `judged`) over two refs in the shell catalog                                                                                                                                                                                                  | local convention — the upstream basic catalog _schema_ declares validators, formatters and boolean logic (`and`/`or`/`not`) only; its React _implementation_ ships binary arithmetic and comparison (`add`, `subtract`, `greater_than`, …) undeclared; neither has aggregates. Declared as catalog `FunctionDefinition`s, executed in the BindingEvaluator. Flat: one operator over N refs, no nesting. Aggregates skip absent inputs and carry their contributor count. Relations are the match claim's evidence (§5.2), only inside `match`: text compares as token sequences, numbers and instants by value when both sides read as one, lists of plain values as lists; `judged` holds while both values resolve |
| Time is read by the runtime — any value carrying a year and a clock is an instant whatever the vendor's spelling, a range its start; the client sorts by it and `DerivedValue`'s `datetime` format renders it in one human form. Vendors paint time as they like; the Synthesizer converts nothing; a value the runtime cannot read stays text, sorted and shown as painted. No operator is added (the model names the criterion and the format; the runtime converts) | local convention |
| The synthesize data model — the data model for a2ui composition: a free-form derived data model of formula leaves with a match claim under `match` on each object the Synthesizer judges a join, a shell-catalog tree bound to it, sort declarations — a path through the enclosing arrays with `*` for a list inside every row — a note — on A2A message metadata, as the synthesis half of the A2UIVerse extension                                                                                                                                                                      | upstream candidate — the same shape as surface placement above: composition rides the envelope, the A2UI the shell paints stays standard. Resolved client-side before render, so no renderer or component understands a ref                                                                                                                                                                                                                                                                                                           |
| A formula-bound cell must render through the shell's derived-value component                                                                                                                                                                                                      | normative rule, machine-checked — the synthesis tree is model-authored, so the guarantee that a partial value never renders as a complete one cannot live in the tree; the orchestrator's validator rejects a tree that binds any other component to a formula path. The `Attribution` pattern (§4.3) applied to values rather than fragments                                                                                                                                                                                                                                                                                                 |
| A claimed object's join is disclosed on its values by the shell's derived-value component; the tree binds no path under `match`                                                                                                                                                                            | normative rule, machine-checked — carried by the derived-value rule, so a claimed join never renders like a plain one; the orchestrator's validator rejects a tree that binds a path under `match`                                                                                                                                                                                                                                                                                                 |
| Contributor state and a claimed join ride one mark — the value's own contrast, escalating with a glyph only when the tie broke — and a value speaks on hover or focus only where the shell has admitted a mark or a contributor set short of what the formula declared; elsewhere the audit is the tap into the vendor's fragment (§5.4, §7) | local convention — the disclosure requirement is that a partial or claimed value never render like a complete plain one, which one channel satisfies. Two families of glyph spent the vocabulary on the states that already announce themselves, left `partial` — the one state whose value reads as whole — carrying the least, and narrated the shell's own joining on every correct cell. Drawn as a stroke under the value it borrowed the idiom that means "error", multiplied on a value that wraps, and stopped discriminating once a whole row's values were marked together. Accepted weakness: `guessed` is carried visually by color alone; the hover detail, the always-full accessible name and `broken`'s own glyph are what hold it up |
| A value the reader must act on is drawn in a danger tone — the Synthesizer lists the column's danger words on the derived-value component, the runtime compares each value against them word by word and draws a match with a ✕-circle, red only where the value is complete and unmarked (§5.4) | local convention — the tone is a fact about the world, not about the shell's certainty, so it rides its own channel beside the one mark; which words mean failure is the model's judgment, the client only compares |
| A grafted fragment's boundary is not drawn — no border, edge, background or hover state — and neither is a reserved slot (§4.3) | local convention — a rectangle per fragment made the fragment graft read as the tiling it replaces and boxed a vendor's own cards inside a second box. Attribution and whitespace carry the separation; the landing ring still marks where a navigation lands |
| A failed vendor slot carries its cause and the vendor's words on the `Slot` — the cause a closed vocabulary, the message when the vendor spoke — and the shell draws the failure tile from them: one statement — the vendor's words when it spoke, otherwise the client's reason for the cause — then Retry; Retry sends again what failed, to that slot alone — the action inside the fragment that failed, otherwise the plan's request — and includes it on arrival, drawing at once an answer held past the hard cap (§8) | local convention — the tile is the slot's state made legible, so its facts ride the same repaint the state does and the timeline replays them |
| A merged view's column is marked to its source — a literal presentation prop on the Table, written from plan time — so a column for a source the merge landed without stays reserved, its cells drawn by the client from the slot's state — loading, unavailable, or not included while the source waits for Include — and filled in place once the source is included (§4.5) | local convention — the reserved-slot rule applied to a column; the cells have no refs, so the disclosure that the source has not answered comes from the slot's state the client already holds |
| Include and Try again — client operations on the composition, beside Retry, each a data part of its own to the orchestrator carried by the A2UIVerse extension: Include folds the late-arrived sources into the merged view through the inline re-synthesis, and after a decline makes the merge over every arrived source; Try again makes again a merge whose call failed, over every arrived source (§5.3); the turn's first synthesis is its only automatic Synthesizer call | local convention — a source arriving after the merge mounts for free, and every call after the first has the reader's press behind it |
| A fragment's step and the canvas's close — client operations on the composition beside Retry, Include and Try again, carried by the A2UIVerse extension: a step names one source and `step`, the paint id the fragment now shows — one paint per `createSurface` the source relays, counted alike on both sides, never reused — the paint's data model riding `a2uiClientDataModel`, so the orchestrator writes the source's partition from what is on screen; a close names no source and ends the canvas — its dispatches cancelled and each vendor sent A2A's `tasks/cancel`, its composition let go (§6.4, §6.5) | local convention — the client holds every paint and the list of visits, the orchestrator only the paint each source has on screen and the wiring accepted per combination of them, so a step back to a combination seen is a restore with no call |
| A collapsed merge slot carries its cause on the `Slot` — the home source failed; fewer than two sources arrived, with the sources that answered and, by id, the ones that did not, which the line's Retry covers; the merged view couldn't be made — or the decline's reason, and the shell draws one line from it where the view's label would have sat (§4.5) | local convention — the reserved slot's promise is withdrawn in words: the Synthesizer's for a decline, the client's for every other cause |
| Partitioned data model on a shared surface (agents address paths as root; shell namespaces) — enforced at the hub as the outbound partition filter                                                                                                                                | upstream candidate — prior art: the upstream orchestrator sample strips `a2uiClientDataModel.surfaces` to the target agent's own surfaces via a client interceptor (§18); ours generalizes surface → partition                                                                                                                                                                                                                                                                                                                        |
| Surface placement on A2A event metadata: the stamp's `source` names the layout `Slot` a surface fills                                                                                                                                                                              | upstream candidate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| surfaceId namespacing `<source>:<surfaceId>` at the hub, the source naming the app and the account it painted under (§9.5), reversed on inbound actions | local convention |
| Vendor terminal states demoted to non-final `working` on relay; the hub emits the turn's single final                                                                                                                                                                             | local convention — several vendor tasks resolve onto one client task under fan-out, so relaying a vendor's final would end the turn at the first agent to answer                                                                                                                                                                                                                                                                                                                                                                      |
| A fragment source's stream end marked on the stamp — `settled`, an optional field of the composition stamp, set on one event the hub emits after the source's last, carrying no A2UI parts; the client judges that source's fragments there, not at the turn's end | local convention — a vendor's own final is demoted, so the stamp says where a source ends; a paint the canvas cannot draw is reported before the merge reads it |
| Unsuppressable attribution on a grafted fragment                                                                                                                                                                                                                                  | local convention                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `ChoicePicker` document-global radio group name in `@a2ui/react` (patched locally)                                                                                                                                                                                                | upstream bug report — `_dev/a2ui-findings.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Unsatisfiable `catalogId` clause in `server_to_client.json` prose                                                                                                                                                                                                                 | upstream bug report — `_dev/a2ui-findings.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Scoped per-catalog stylesheet layer — a catalog artifact ships CSS styling the basic components' runtime DOM under its own scope class                                                                                                                                              | local convention                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Product components appended to a themed basic catalog — the basic catalog verbatim, plus components for what its vocabulary cannot express, declared in the artifact's schema and implemented in its package (§9.2) | local convention |
| A data-bindable semantic tone on the basic catalog's `Text` (e.g. success · danger · warning · neutral), so a themed catalog can vary a row's look by data without a product component | upstream candidate — the basic catalog's only style hints (`Text.variant`, `Button.variant`) are enums fixed per template, and no data reaches the DOM as anything a stylesheet can select on, so a per-row state cannot be colored |
| Dead CSS-module class maps in `@a2ui/react` `v0_9` basic catalog (classless Button/variants, unshipped `index.css`)                                                                                                                                                               | upstream bug report — `_dev/a2ui-findings.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Bound `DynamicValue` props and their generated setters typed by the union's literal branches in `@a2ui/web_core`'s generic binder                                                                                                                                                 | upstream bug report — `_dev/a2ui-findings.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| A prop dropped by `updateComponents` keeps its last value in `@a2ui/web_core`'s generic binder, which merges each rebuild over the last | upstream bug report — `_dev/a2ui-findings.md` |
| The v0.9 streaming parser's `loading_*` placeholder is the basic catalog's `Row` in `a2ui-agent-sdk`, so a surface on any other catalog streams components its catalog does not declare | upstream bug report — `_dev/a2ui-findings.md` |
| The A2UI extension's card `params` are keyed by version (`v0.9`) in `server_capabilities.json` and written flat by the extension guide's example and the Python agent SDK; A2UIVerse reads both shapes | upstream bug report — `_dev/a2ui-findings.md` |
| `paintMeta` — a per-paint shell object (`{surfaceId, title?, kind?}`) riding the A2A stream as a dedicated data part marked `application/json+a2ui-shell`, emitted ahead of the `createSurface` it names; carries the agent-authored paint title and the declared question marker. The orchestrator emits one for its own layout surface, carrying the Planner's title for the canvas (§5.6), which names the trail's entry (§6.4); a vendor's names its fragment's paints, the arrows of its way back named by them (§6.5) | local convention — the agent kit's one shell convention (§13). Optional and degradable: absent, titles fall back to cause-derived and question surfaces paint as ordinary surfaces, so an unmodified A2UI agent still composes. Sits beside A2UI, never inside it: the A2UI extractor never takes a `paintMeta` part                                                                                                                                                                                                                  |
| A **canvas** is an A2A context: the utterance that opens one is sent with no `contextId`, the orchestrator minting it, and every later client message on the canvas — action, press, step, close, error report — carries it; an utterance inside a context the session holds is refused; the opening utterance of a child canvas names the context it was asked from as `parent` under the stamp key, which is two-directional; a vendor's conversation is per canvas. The orchestrator holds a composition per canvas for the session (§6.4) | local convention — one session holds many live canvases, each a context of its own, so the context says which composition a message acts on; replaces the client's fork context, which named a paint the orchestrator never read |
| A catalog the client could not load is reported as A2UI's generic client error under the A2UIVerse extension's own code, `CATALOG_LOAD_FAILED`, carrying the catalog id; the hub fails the slot the surface fills with the `load` cause, Retry kept (§10) | local convention — the protocol's generic error admits the extra field; the slot's facts ride the shell's repaint as every other failure's do |
| `@a2ui/web_core`'s `MessageProcessor` takes its catalogs once, in its constructor, and has no way to add one; a client loading catalogs at runtime pushes into the array the processor was built over, which web_core holds by reference | upstream bug report — `_dev/a2ui-findings.md` |
| Catalog implementation delivery — A2UI negotiates catalogs by id on both sides (`supportedCatalogIds` in the agent's card and in `a2uiClientCapabilities`) and has no way to deliver a catalog implementation or to say where one is; A2UIVerse resolves it with a store-side catalog table keyed by `catalogId` (§9.1), the artifact outside the wire, the card never extended | upstream candidate — a pre-existing gap in the protocol, not a deviation from it: the protocol assumes the client compiled every catalog it renders in |
| No credential input painted on the canvas — the hub refuses a paint containing one, whatever it is for; the shell catalog carries none (§8) | normative rule, machine-checked |
| One provider and one CSS setup per catalog artifact, scoped to the fragment boundary (§9.2)                                                                                                                                                                                         | normative review rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `sendDataModel`, multi-catalog `MessageProcessor`, `catalogId` scoping                                                                                                                                                                                                            | already in protocol — no delta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

Every future deviation is added here, tagged _local convention_ or _upstream candidate_.

---

## 15. Reused vs. new

| Reused                                                             | New                                                                                      |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Canvas shell, timeline, hold-and-swap                              | Orchestrator: Router · Planner · Synthesizer · AgentsPool · IntegrityChecker             |
| A2A transport, AgentCard as the app's whole description, extensions, `securitySchemes`; A2UI catalog negotiation by id | UIComposer + one-tree graft runtime                                                      |
| A2UI validation, `sendDataModel`, multi-catalog, local functions   | Shell catalog + composition primitives                                                   |
| `a2ui-github` as the GitHub app                                    | Derived-binding table + BindingEvaluator                                                 |
| Catalog authoring skills, GitHub agent                             | Catalog export and artifact contracts (`sdk`) · Stellify · Registry · Marketplace · Store page · AuthVault · IntentJournal |
| Primer as GitHub's catalog                                         | Vendor catalogs for Gmail, Google Calendar, Linear and CircleCI, each its own vocabulary |
| Material 3's design language for Gmail and Google Calendar         | Agent building kit (`a2uiverse-apps`)                                                    |
| A2UI basic catalog + `--a2ui-*` tokens as the mock stores' catalog |                                                                                          |
| Radix Themes, the client shell's own design system                 | Shell catalog as a Radix Themes mapping of the basic catalog                             |

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
- A credential the user types into the utterance is the user's own act: it reaches the Planner, the intent journal, the canvas's header and the trail, and nothing detects it.
- An account's label — an email address, a username — reaches the Planner, which chooses accounts by it (§7, §9.5).

---

## 17. Out of scope

Named so they do not creep in: native shell · catalog-implementation isolation · third-party catalog-implementation review/signing · OS bridge · machine-facing intent projection · cross-vendor transactions · act-on-synthesis-surface · local-model inference · per-user shell catalog (theme) · deployment.

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
