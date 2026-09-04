# Task 4.6 — Two mock storefronts

Spec for sub-task 4.6 of Phase 4 (`_dev/docs/spec/phase-4-synthesis.md`): the two quarantined mock vendors the synthesis machinery is exercised against — the tier they live in, the shared dataset, the two instruments, and the run modes. An `[apps]` sub-task: the code lands in `a2uiverse-apps`. Consumes the wiring contract (`task-4.2-synthesis-wiring-contract.md`), the orchestrator's synthesis core (`task-4.4-orchestrator-synthesis.md`) and the client's evaluator (`task-4.5-client-synthesis.md`).

## Scope

- The quarantined tier: its directory, the two mock apps inside it, their identities, catalogs and ports.
- The shared product dataset and how each store's listing derives from it.
- The two instruments — drill-down and in-place reorder — and the non-product capability that makes decline provokable.
- What the three run modes mean for an app with no MCP behind it.
- The three agent-kit changes this sub-task's requirements entail.
- Beats and the mocks' own tests.

Not in scope: the launcher and registry opt-in (4.7), whether the client installs the mock catalogs (4.7), end-to-end acceptance and the platform-side beat (4.8).

## Locked decisions

### 1. The dataset: cameras, five products, four fields

The shared dataset is five cameras with `id`, `name`, `price` and `rating`. The id is the join's ground truth even though this phase's refs address by index, and is what Phase 5's key-based refs will bind to. Price and rating run in opposite directions, so `max`/`argmax` is as natural a choice for the Synthesizer as `min`/`argmin` and no synthesis is forced into one shape. Five rows keeps the merged view narrow enough to sit beside two vendor fragments and small enough to record.

### 2. Inventories overlap but are unequal

Three cameras are stocked by both stores; one is exclusive to each. The two listings therefore differ in length, their indices do not line up, and the wiring carries a mix of two-argument and one-argument cells. Under identical inventories in identical order the wiring would be a straight index-for-index zip that a Synthesizer ignoring the partitions could produce correctly, which would leave the clean-room bed unable to check the thing it exists to check. Unequal inventories also exercise the orchestrator's malformed check against a ref into a store that does not stock the product.

A partial cell at rest is impossible by construction: the orchestrator rejects a wiring whose refs do not resolve at synthesis time, so the Synthesizer can never author one. The honest wiring for a product only one store carries is a narrower formula, and that cell reads complete. Partial is a runtime state, and the drill-down is the only thing that produces it.

### 3. One authored dataset artifact

The dataset is a single file in the tier holding the whole picture — the five cameras and both stores' listings over them — which each agent reads and slices for its own store. A clean-room bed's value is that the correct merge is knowable by inspecting the fixture, and one artifact showing both listings is what gives that. It is also the only arrangement in which the two stores cannot disagree about what a given camera is. Per-app self-containment is given up, which is a vendor-app property mocks already do not have.

### 4. No fixture files

Deterministic responses and the stub and live tools are all built from the dataset. The scaffold's generated stub fixture is dropped. Fixture files would reintroduce one layer down exactly the drift decision 3 exists to prevent, where a deterministic reorder response could disagree with what the live tool returns for the same action. Building everything from the dataset is also what makes the modes agree by construction, which is what lets deterministic stand in for live in beats and tests.

### 5. The tier: `mocks/`, one level down

The two mocks live at `mocks/shop-a/` and `mocks/shop-b/`, each mirroring the vendor layout verbatim. Nesting one level below the repo root *is* the quarantine: launcher discovery scans the immediate subdirectories of the agents dir for a manifest, and the tier directory has none, so its children are never reached. `mocks` is the word the apps repo's CLAUDE.md and README already use, so no third term is introduced. Mirroring the vendor layout means the scaffold CLI generates the mocks with no special-casing and the launcher runs them unchanged once pointed at the tier, which makes this the first genuine non-authored use of the Phase 3 kit.

Display names are "Shop A" and "Shop B". The app id is user-visible: `DerivedValue` renders the app id rather than the display name, both for an `argmin`/`argmax` winner and for an absent source.

### 6. Basic-themed catalogs, one accent per store

Each mock gets its own catalog package in the scaffold's basic variant, with its own token theme. Authoring components would spend real effort on the half of the system this phase is not testing. A different accent per store is one file each and buys what acceptance needs: a screen where the merged view is visibly merging two distinct sources rather than reformatting one. It also keeps the tier useful as a regression bed for scoping between two themed basic catalogs.

### 7. Ports 12001 and 12002

The mocks take a band of their own rather than continuing the vendor sequence. The scaffold suggests a port one above the highest found in *sibling* manifests, so continuing the sequence would set a trap: the next vendor scaffolded at the repo root sees only the vendor ports and would suggest one already taken by a mock, and duplicate ports are fatal to the launcher. A separate band makes the quarantine hold mechanically and keeps sibling-based suggestion correct inside both the tier and the repo root. Mocks need no tunnel row, since the browser only ever talks to the orchestrator.

### 8. Differentiated AgentCards

The two cards describe stores with their own character rather than being a matched pair. The Router applies no similarity threshold — it ranks by cosine and slices to the shortlist cap, leaving the semantic selection to the Planner — so with a roster of two and the default cap both stores always reach the Planner regardless of how differently their cards read. The residual risk is a Planner judgment: if a card's character ever produces a one-slot plan for a comparison query it surfaces as a skipped synthesis, and the fix is the card's wording.

### 9. Two instruments, both action round-trips

The stores carry clickable rows and a sort control, and nothing else. Both instruments are actions that reach the owning agent, which answers with `updateDataModel` against its own surface — the only path that reaches the orchestrator's partition and so the only one that can bump a generation.

A client-local reorder is not an acceptable alternative for the second instrument: it would reorder the list in the client's own data model and re-evaluate, showing a silently re-pointed merged view with no stale marker, because a generation bumps only on an applied vendor update compared against the orchestrator's snapshot. The orchestrator would learn only on the next dispatch.

### 10. The drill-down replaces the same surface's root

Clicking a camera replaces the list surface's data model with a detail object, so `/items` is simply gone; a back control restores it. The slot keeps its surface, its attribution and its placement throughout, so the generation rule is exercised against one object across the whole round trip and the return leg is genuinely the same refs reconnecting. Painting a new detail surface and deleting the list would additionally leave the orchestrator holding a partition for a deleted surface, a state nothing else produces and nothing has a rule for.

### 11. No third, client-local control

The client's re-evaluation on a two-way edit inside a vendor fragment is not exercised here. Storefront data is read-only from a shopper's side, so any editable field a wiring would reference has to be invented against the fiction, and the one editable thing that is natural — the store's own ordering — is precisely the case decision 9 requires to be a round trip. The path gets its honest end-to-end test in Phase 5, whose fragments already carry two-way-bound content the user adjusts.

### 12. A non-product capability per store, so decline is deterministic

Each store carries one text-shaped capability with no array, a policy surface. If both stores only ever returned product listings, every pair of results would overlap and the Synthesizer would never have cause to decline. Asking only one store gives fewer than two sources, which journals as skipped rather than declined; asking each store about a different camera leaves two detail objects a Synthesizer could reasonably merge, so whether it declines is a judgment call and the test is flaky. A policy surface is the cheapest capability that produces two structurally unjoinable partitions, and it is the only surface in the tier the Synthesizer must look at and reject.

Phase decision 18 puts the two mocks alone in the roster so a gated acceptance run has no routing variable; provoking decline from a mixed-roster run would make a gated item reachable only in the configuration that decision calls an extra.

### 13. Each run mode has a real job

`deterministic` maps each action name to a response and runs no model, so the instruments work exactly and repeatably. `stub` runs the model with the same tools and its writes acknowledged and ignored, which is the kit's own stub semantics and leaves stub meaning "the model paints, but the instruments are inert". `live` runs the model over a mutable per-session store built from the dataset, so a reorder genuinely reorders. Stub's usual reason to exist — running the model without touching a vendor's MCP — is absent for a mock, and this is what gives it one instead. Putting the instruments in both the repeatable path and the real one, and having the two agree, is itself worth something.

### 14. Prose pins the surface id and the data model, not the tree

Prose fixes one surface and the data-model shape the refs address; how that renders is left to the model in LLM modes. The refs address the data model and nothing else, so that is exactly the surface area a regression bed has to control. Leaving the tree free is a standing check that synthesis depends on partitions rather than on presentation, which is the invariant the whole design rests on.

### 15. The beat recorder's `createSurface` rule moves to the beat

A turn is good if it completed and delivered at least one A2UI message; the requirement that a `createSurface` reached the client moves from every turn to the beat as a whole. Under decision 10 both instruments deliver only `updateDataModel` against an existing surface, so neither could be recorded as the rule stands. The rule encodes "a paint is a new surface", which the protocol does not say and the kit's own prose contradicts, so this is a defect fixed rather than a rule bent for a special case. Calendar's RSVP toggle becomes recordable as a side effect, and the existing apps' beat gate is re-run to confirm nothing that passed before now fails.

### 16. Update-only turns validate as updates, not as broken surfaces

The kit judged every model turn with `validate_surface`, which requires a `createSurface` and a
`root` by definition, so an in-place update was rejected and the model was corrected until it
re-created the live surface. That made decision 10 unreachable in an LLM mode, and it silently
did the same to Calendar's in-place RSVP toggle. A turn that creates a surface is still judged
whole; one that does not is judged as an update — component conformance and
binding-on-literal-prop always, binding resolvability whenever it repaints components, and
nothing that lives on the client. Found by recording: the model complied with the prose and the
kit forced the re-create.

This is the same false premise as decision 15's, in a second place, and a third instance sits in
the examples gate — an example of an update-only turn is validated as an update.

### 17. `live` accepts plain tools, not only an MCP toolset

The kit's live toolset factory may return a list of plain tools as well as a toolset, the way stub tools already accept plain functions. The raise-if-missing stays, so a vendor that forgets its MCP still fails fast. "Live means MCP" is an assumption inherited from three vendors that happened to have one, not something the kit's contract should assert, and the phase spec already calls for a `live` mode the kit cannot currently express. Phase 3 extracted this code so apps stop carrying platform assumptions; a fake-toolset shim inside a mock would push one back in.

### 18. Four beats per store

The list paint, then the drill-down, the return, and the reorder, chained into one conversation. Both stores record all four, being a matched pair. It is four rather than three because the beat driver sends one prompt per beat, so the drill-down's round trip — going absent and coming back — is two. The instruments are most of what the mocks exist for, so recording everything except them would leave the tier's own regression evidence missing its subject.

### 19. What the mocks' tests assert

Dataset integrity — that every listing id exists in the shared product list and the three-shared/one-exclusive structure holds. Both instruments' deterministic responses — that the drill-down removes the products array and the reorder changes its order and nothing else. And that the prose states the pinned surface id and data path. No hand-computed expected merge: the mocks repo cannot run the Synthesizer, so such a test would pass while the real system produced something else. The join gets its honest test in 4.8.

## Invariants

- **A mock is an instrument, not a vendor app.** It has no MCP, it is not in the roster, and it is kept rather than deleted once the work that motivated it lands.
- **The quarantine is structural, not conventional.** The tier is invisible to default discovery because of where it sits, not because anything agrees to skip it.
- **The dataset is the single source of truth.** Every mode, every response and every tool derives from it.

## Carried consequences

- The apps repo's workspace glob gains a pattern reaching the tier's catalog packages.
- The apps repo's CLAUDE.md and README record the tier's directory and its port band; the platform's tunnel-environment doc gains the mock band in its port table.
- Both stores carry both instruments and the policy capability.
- Everything lands in the apps repo apart from the tunnel-doc line.

## Open items

- Whether the client installs the two mock catalogs by default or only under the profile — 4.7's, alongside the registry opt-in.
