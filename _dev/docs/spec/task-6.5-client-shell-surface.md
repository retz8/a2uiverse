# Task 6.5 — Client: the shell surface, the shell actions, the fixtures

The client half of Phase 6 (`_dev/docs/spec/phase-6-shell-as-agent.md`, decisions 3, 6, 7, 8), on 6.4's painter output (`_dev/docs/spec/task-6.4-planner-rewrite.md`, decisions 1–4, 11). SPEC §4.3, §7, §8.

## Scope

- `shell:main`'s literal data model, arriving as plain A2UI, proven to render.
- The roster on the model-authored tree: `Attribution` paired to its `Slot` through `child`.
- `weight` rendered by the shell catalog, on the `Attribution` wrapper and on bare slots alike.
- The two shell actions handled locally: a placeholder overlay for the Store and the App Library, and the action reported to the orchestrator for the journal.
- The orchestrator's intake of a shell-source action: journaled, nothing painted.
- Fixtures re-recorded on 6.4's shapes, plus two new beats.
- The phase spec's decision 7 and acceptance item 1, and the Phase 14 note in `_dev/TODO.md`, amended as decision 10 states.

## Locked decisions

### 1. 6.5 absorbs `weight` rendering and pairing through `child`

6.4 deferred two things to 6.5 without naming them in the TODO line: rendering `weight` and moving the client's roster from list-order pairing to following `Attribution`'s `child`. Both are 6.5's. The question of whether `Slot` should draw its own attribution and `Attribution` leave the tree stays closed, deferred as 6.4 left it.

### 2. The Store and the App Library are an overlay over the canvas

The Store is not a separate page: it is an overlay over the canvas. 6.5 lands a placeholder overlay with minimal text in place of decision 7's ambient notice. The overlay is the one landing for a shell action; there is no separate notice.

### 3. The placeholder overlay's contract

It names the page and shows the query when `openStore` carries one. Both actions open the one overlay component with different text. It is dismissable, closing back to the untouched canvas beneath, and the canvas is never unmounted. It is a layer of its own, distinct from the existing overlay that mounts a pending question surface.

### 4. The overlay and the journal report are decoupled

The overlay opens immediately. The report goes out fire-and-forget; a failed report is logged and nothing else happens. Every raise is reported, even while the overlay is open, because each raise is an intent for the journal; the overlay's text follows the latest query.

### 5. 6.5 carries the orchestrator's shell-action intake

An action on `shell:main` has no vendor to relay to. The orchestrator journals it as an action turn and completes the task with nothing painted. The TODO line for 6.5 names this clause so the "Client" heading is not misleading.

### 6. The report is a standard A2UI action on `shell:main`, sent on the side

The client sends an A2UI action on surface `shell:main`, named `openStore` or `openAppLibrary`, with the query in the action's context. It rides the client's side channel, the one the client-error report uses: no runner turn, no status strip, no timeline row. A reply is expected to carry nothing; whatever it does carry is applied the way the error report's reply is applied, not dropped. Nothing is invented beyond A2UI, so nothing enters SPEC §14.

### 7. The roster on the model-authored tree

The roster pairs an `Attribution` with its `Slot` by following `child`, regardless of list order or nesting. Gap slots stay catalog-internal: no roster entry, the catalog's `Slot` draws the tile. A vendor-source `Slot` that is not the `child` of any `Attribution` is refused: not mounted, reported to the orchestrator through the existing client-error path so the slot flips to `failed`. A vendor fragment never renders unattributed.

### 8. `shell:main`'s data model gets no client-side guard

The data model is plain A2UI, treated as a vendor surface's data model is. The orchestrator's validator already rejects any formula or ref shape, and on the client such a shape is inert. The deliverable is a test proving a bound platform answer renders, and fixing whatever that test finds.

### 9. Fixtures

The five recorded beats are re-recorded live against the 6.4 orchestrator; the synthetic beats are rewritten to the painter's shape; the visual snapshots are refreshed. Two beats are added: a platform answer carrying a bound data model and a Store button, and a capability gap. A visual spec clicks the gap tile into the overlay. The mixed utterance stays 6.6's live check.

### 10. Docs

The phase spec's decision 7 and acceptance item 1 are amended from the notice to the overlay. The Phase 14 note in `_dev/TODO.md` is rewritten: the Store and the App Library are an overlay over the canvas; URL addressability and whether they are one route with two tabs or two routes remain Phase 14's. SPEC is untouched: §7 already states the client opens the trusted page and reports to the orchestrator for the journal.

## Invariants

- `Attribution` is added by code, never by the model; the client is the last code before pixels and holds the line.
- A shell action is handled locally, no turn.
- `Attribution` applies the copied `weight` as the flex child of its `Row` or `Column`, and the `Slot` inside fills its `Attribution`, so wrapped and bare slots size by the one rule of 6.4's decision 2.

## Open items

- Whether `Slot` should draw its own attribution and `Attribution` leave the tree — carried from 6.4, still closed for this phase.
- URL addressability of the overlay and one route or two — Phase 14.
