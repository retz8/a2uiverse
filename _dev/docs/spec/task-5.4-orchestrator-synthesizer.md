# Task 5.4 — Orchestrator: the Synthesizer authors the synthesize data model

The orchestrator's Synthesizer becomes the author of the merged view: it writes the synthesize data model as text against the shell catalog, the orchestrator validates it, paints the tree, and sends the client the payload. Phase 5 spec decisions 2, 7–9, 13, 16–18, 22; task 5.2 (the contract); SPEC §5, §5.2, §10.

## Scope

- A prompt builder for synthesis in `@a2uiverse/sdk`, the counterpart of the upstream SDK's, with the composition doc and worked examples; the shell catalog ships its guidance doc; the orchestrator assembles.
- The Synthesizer as a text call: one tagged block, extracted, validated by the sdk, one retry, then the catalog-dependent checks.
- The tree validated through the client's own runtime, headless.
- Painting the model-authored tree; the payload under `a2uiverseSynthesis`.
- Predicate refs through the IntegrityChecker over the sdk kit.
- Re-synthesis handed the previous document and the change account.
- The journal recording the whole conversation.
- The Planner's prompt: the synthesis brief and the vendor merge asks.
- The legacy wiring (`wiring.ts`, `composition.v0.2.json`) removed by whichever of 5.4 and 5.5 lands second — the client imports it until 5.5.
- Not here: the quiet pending state (client, 5.5); model and effort settings.

## Locked decisions

### 1. The prompt is assembled the kit's way

Five parts, the same shape the vendors' prompts have: a role; the composition doc in a2uiverse words (partitions, refs and predicates, formula leaves, sorts, the note, decline); the shell guidance doc (how to build a merged view out of the shell catalog, the derived-value rule); the shell catalog's `catalog.json` verbatim plus the contract's schema; worked examples of a synthesize data model, at least a comparison and a timeline. The two docs are checked-in markdown, authored like the vendors' docs.

### 2. The builder and the docs live with what they explain

The sdk ships the prompt builder, the composition doc and the examples; the builder takes the catalog schema and the UI guidance as inputs and never knows the shell catalog. The shell catalog ships its guidance doc beside `catalog.json`, as a package export. The orchestrator calls the builder with the role, the sdk's doc, the shell catalog's schema and guidance, and the examples; its own prompt module is the two file reads and the role. The examples are validated by the sdk's own validator in its tests. The role text has a default in the builder, overridable.

### 3. The model writes one tagged block

The answer is one JSON document inside a tag of its own — not `<a2ui-json>`, since the content is not A2UI and a client-side A2UI extractor must never take it — with nothing outside the block. Extracted by a function of its own, so streaming can later read the same boundary.

### 4. The retry carries the errors and the failed document

The validator's error lines, one per finding with its path, and the model's previous document, so it fixes rather than rewrites. One retry; a second failure is `malformed`. The same "previous document" slot of the turn builder serves re-synthesis.

### 5. The tree is checked through the client's runtime, headless

The shell catalog exports a React-free subpath with its component schemas — upstream's from `web_core`, its own primitives' — as a catalog of APIs. The orchestrator feeds the model's components through `web_core`'s `MessageProcessor` against it; a failure goes back to the model as the retry. The derived-value rule runs after it over the accepted tree: only a binding that resolves, absolutely or through its enclosing template, to a formula leaf must be `DerivedValue`'s; binding to a branch is how a list templates over an array; `SortControl` binds `/sorts/N`. The declared-operator check reads the operator names from `catalog.json`.

### 6. A re-synthesis hands back the whole document and what changed

Tree, derived model, sorts and note as the model wrote them, plus the runtime's account of why the call is happening: which refs went stale under which surfaces' generation bumps, and which went absent. The instruction: keep the view, re-point what broke, change the shape only if the data no longer supports it, say what changed in the note. The user's current sort is not sent; the runtime re-applies it.

### 7. The journal records the whole conversation

The synthesize data model as accepted, the note, the outcome, and the attempts — for each, the raw text the model returned and the validator's errors when it failed — and on re-synthesis the change account that was sent. `deadAirMs` as before.

### 8. Nothing on the wire for the quiet pending state

The slot vocabulary stays; the stamp's `source: shell` is the signal the client renders on. The clause moves from 5.4's TODO line to 5.5's.

### 9. The Planner's prompt describes the medium, asks for the brief, asks for the merge fields

The merged view is the shell's own view over the other slots' answers — a comparison across sources, a timeline on a shared axis, a list with counts, whatever serves the utterance. The shell slot's request says what the view should show, what it compares or orders by, and what matters. When the plan has a merged view, each vendor's request also asks in plain words for the fields the merge will depend on. No shell vocabulary in a vendor request; the rules stay enforced by the checklist.

### 10. Painting is unchanged in shape

`shell:synthesis` as `createSurface` plus `updateComponents` carrying the model's components verbatim, the payload under `a2uiverseSynthesis` beside the stamp; a re-synthesis replaces the same surface. Decline prose and the collapse repaint stay as they are.

### 11. Tests follow the pattern

`FakeSynthesizer` emits a synthesize data model; the live smoke test stays env-gated and asserts a validated document; the integration tests cover the retry, malformed after retry, re-synthesis with the change account, and a predicate ref surviving a bump.

## Invariants

- The Synthesizer emits wiring, never values; the model never sees generations.
- Planner and Synthesizer know only the shell catalog.
- Nothing a2uiverse-specific reaches a vendor's request.

## Open items

Task-internal: the tag's name; the exact prompt wording of the two docs; the journal's field names; how the template resolution of the derived-value rule is implemented.
