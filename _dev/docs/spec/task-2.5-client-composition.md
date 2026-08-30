# Task 2.5 — Client composition

The client half of Phase 2's layout-only composition: rendering one shell surface and N vendor fragments on one canvas, mounting fragments through slots, validating them, and isolating them. Parent: `_dev/TODO.md` 2.5 and `_dev/docs/spec/phase-2-layout-composition.md`.

## Scope

- Multi-catalog processor and catalog registration.
- Placement map, slot mounting, and the fragment boundary.
- Composition-aware turn semantics: stage candidacy, teardown, timeline capture.
- Client-side validation and `VALIDATION_FAILED` reporting.
- Question handling under composition: shell-granted promotion.
- Collision detector.
- ChoicePicker `pnpm patch`.
- Deferred from 1.3: unknown-component degradation at the composition layer; shell re-skin on Radix tokens.

## Locked decisions

### 1. Catalog registration covers only real catalogs

The client registers `shell-catalog` and `github-catalog`. Gmail and Calendar are added when 2.6/2.7 publish them, with a memo left at the registration site recording that later addition. An unknown catalogId encountered at runtime is a fragment-level failure, never a boot-time crash.

### 2. Role-based routing inside the existing turn runner

The composition stamp decides stage candidacy. A `role:'shell'` surface is the turn's paint and keeps Phase 1's hold-and-swap semantics unchanged. A `role:'fragment'` surface never contends for the stage or the timeline; it exists to be mounted through its slot.

### 3. No special case for a one-slot composition

A single-agent utterance renders as shell plus one slot, like any other composition — one render path, no mode switch between utterances. Visual weight adapts to composition size instead: a lone slot is full-bleed, several slots gain the separation that makes them read as distinct sources.

### 4. Placement rides the stamp, and the beat format carries it

Placement is read from the A2A event's composition stamp, threaded to the turn handle through a seam mirroring the existing `paintMeta` acceptor, one stamp per batch. The beat fixture format grows a stamp field so recorder and replay carry it, and a composed synthetic beat covers tests before 2.9 re-records. A surface arriving with no stamp is treated as a shell-role stage paint, so existing fixtures and tests remain valid.

### 5. The placement map lives in the canvas store

The map is store state keyed slot to surface, so filling a slot drives a re-render through the existing subscription. A slot holds one surface: when a vendor paints more than one, the most recently created claims the slot and the earlier is retired. The new shell surface's creation is the teardown signal for the previous composition — its fragments are deleted and the map cleared — and teardown snapshots before deleting.

### 6. The timeline captures the whole composition

A timeline entry widens from one surface to the composition's surface set plus its placement map, and the parked session rebuilds them all through the existing per-surface path, sharing the resolver with the live stage. A slot that failed is captured faithfully without extra machinery, because the shell tree already encodes slot state. A composition whose slots all collapsed renders nothing and is treated as a non-paint under the existing net-effect rule. An entry's last-resort title falls back to the cause phrase.

### 7. The slot content resolver owns the fragment boundary

The resolver returns a slot's complete content: boundary, then catalog Provider, then surface. The boundary is a real element carrying a stable attribute, because 2.8 anchors scoped styles and the portal root to it. The visible attribution marker stays orchestrator-painted as the slot's sibling, where the fragment cannot address it.

### 8. Validation reports at turn end, structural failures immediately

Validation errors stay deferred and are judged at turn end against the settled surfaces, as they are today, so streamed partials never report. Failures that cannot self-heal — an unknown catalogId on surface creation — report immediately. One report per failed fragment. A failure of the shell surface is local-only. An unknown component type inside an otherwise valid tree degrades at that node and the fragment stays up; the degradation is restyled into a quiet placeholder.

### 9. The failure report goes out on a side channel

`VALIDATION_FAILED` is dispatched without beginning a turn: no cause, no timeline entry, no cancellation of in-flight work, and its shell repaint is applied directly. It rides the same conversation context, carries the namespaced surface id, and reuses the existing message-metadata builder. A report is dropped when its composition has already been superseded.

### 10. Fragments never claim the modal overlay; the shell grants promotion

The modal overlay is reserved for shell-painted questions. A fragment that declares a question is expressed through shell-granted promotion instead: the client dims the rest of the canvas and raises that slot, and the fragment never moves from its slot. Authority stays with the shell — a vendor requests attention and the shell decides how to express it. The wire-level request/grant protocol is the M8/M10 growth path, not built here.

### 11. Promotion is per-slot and plural

Several fragments may be promoted at once; the scrim dims the complement rather than singling one out, and each promoted slot drops back as it is answered. Emphasis reads without the scrim, so the all-promoted case still communicates. Because promotion is plural it is not a modal: no focus trap, no modal semantics; each promoted boundary is named accessibly and the shell announces the count. Promotion clears when a slot fails and when the composition is torn down.

### 12. The collision detector is three layers

A static scan of installed catalogs' CSS and a jsdom mount test both run inside the repo's verify gate; a browser spec covers what only a real cascade can show — stylesheet-based scoping and the anchored portal root. The detector lives with the client, the one workspace depending on every catalog, and enumerates installed catalogs rather than naming them. A real CI workflow is filed as a separate chore.

### 13. The detector is prefix-agnostic and polices reads

It collects every custom property, class, and keyframe each catalog defines, whatever the namespace, rather than assuming one. Two catalogs sharing a name is expected and permitted; writing outside the boundary is the failure. Resolution is asserted on the overlap the scan discovers. Every variable a catalog reads must be satisfied inside its own boundary or carry an explicit fallback, so a catalog's appearance never depends on what else is installed.

### 14. The ChoicePicker patch is React-only

Only the bundle the client actually loads is patched, with the instance-unique group name from the upstream React fix. Angular and changelog changes stay out. A regression test covers two surfaces whose pickers share a component id. Both upstream findings are already reported, so no report-filing work remains in this phase.

### 15. The re-skin covers the new composition chrome and dark mode

The shell re-skin builds this task's new chrome — boundary, promotion, adaptive weight, pending slot treatment — from the shell catalog's token vocabulary, and wires dark mode, which the token binding claims but nothing currently exercises. Existing client chrome keeps reading Radix variables directly.

## Invariants

- Slot identity and position are fixed for the turn; fragments are never re-parented.
- Composition state is canonical in the orchestrator; the client holds only the placement map.
- The visible attribution marker is orchestrator-painted and outside the fragment's reach.
- No catalog writes shared variables outside its fragment boundary, and none leaves DOM outside it.

## Open items

- The wire-level request/grant protocol for fragment-initiated overlays — deferred to M8/M10.
- A real CI workflow for the gate the collision detector runs in — filed as a separate chore.
