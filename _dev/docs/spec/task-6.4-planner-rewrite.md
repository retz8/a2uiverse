# Task 6.4 — The platform's card and the Planner rewrite

The orchestrator half of Phase 6 (`_dev/docs/spec/phase-6-shell-as-agent.md`, decisions 1–4, 6, 8), on 6.3's base and its carried decisions (`_dev/docs/spec/task-6.3-restructure.md`): the output schema `{dispatch, tree, dataModel}`, a `Slot` with exactly one of `source`/`gap` plus `weight`, all Planner validation in orchestrator/planner. SPEC §4.3, §5, §5.6, §8, §10.

## Scope

- The platform's own AgentCard with hand-authored skills, indexed in the Registry under `shell`.
- The Planner rewritten as the author of `shell:main`: text output, its own rules doc, `platform-ui-guidance.md` as its first reader, the pruned layout catalog, worked examples, one retry.
- The three platform readers as the Planner's closed tool set behind one seam.
- All Planner validation in orchestrator/planner.
- The painter on the model-authored tree: `Attribution` as the wrapper of a vendor slot, `weight` carried, gap slots left to the catalog's tile.
- `Frame` removed from the shell catalog. `direction`/`archetype` removed with the plan schema.
- The journal recording the Planner's output, its attempts and its tool calls; a bounded in-memory ring backing the recent-turns reader.

## Locked decisions

### 1. Only vendor-fragment slots get `Attribution`

The painter wraps a `Slot` in `Attribution` only when its `source` is a vendor. The `shell` synthesis slot and gap slots stay bare: they are the shell's own content and carry no attribution, as SPEC §4.3 states. Phase spec decision 3's "every `Slot`" was wrong wording and is corrected to "every vendor-fragment `Slot`".

### 2. `weight` is proportional flex, and stays on the `Slot`

`weight` is the flex proportion among the siblings of its parent `Row` or `Column`, along that parent's main axis, default 1. It stays on the `Slot` the Planner authored; the painter copies it onto the `Attribution` wrapper of a vendor slot, so wrapped and bare slots size by the same rule. 6.4 validates it as a positive number; rendering it is the shell catalog's and 6.5's.

### 3. `Attribution` is the wrapper

`Attribution` gains `child` and `weight` and becomes the container of its `Slot`: its view renders the marker above the child and applies the weight as the flex child. The painter replaces the `Slot`'s id in its parent's children with the `Attribution`'s id and emits the `Attribution` immediately before the `Slot` in the component list, so the client's roster pairing keeps working until 6.5. `Attribution` stays outside the Planner's keep-set.

### 4. `Frame` leaves the shell catalog completely

6.4 removes `Frame` from the shell catalog's schema and implementation. The one client recording, the synthetic beat builder and the roster test that carry it are transformed mechanically, `Frame` → the `Row`/`Column` it stood for, as 6.3 transformed `Slot`'s `name`. 6.5 re-records on top.

### 5. The readers are one interface, adapted to tools, four steps per attempt

One `PlatformReaders` interface with the three readers — installed apps, this canvas, recent turns — is injected into the Planner; a thin adapter turns it into the AI SDK's tool set, so the readers stay plain functions testable without a model and the adapter is the only AI SDK-shaped code. Each attempt has a fixed budget of four tool steps; running out without a tagged block counts as a failed attempt. Reader results reach the model as JSON for installed apps and this canvas, and as an array of one-line strings for recent turns.

### 6. The retry continues the same conversation

After a validation failure the retry continues the same message list: the failed answer stays as the assistant turn, the reader calls and their results stay in place, and the findings are appended as the next user message. The readers remain callable with the retry's own four-step budget. A second failure is a broken turn: the A2A task fails with the findings.

### 7. Recent turns come from an in-memory ring of journal entries

The IntentJournal keeps an in-memory ring per conversation, filled at each turn's close from the entry it appends, bounded to five. The reader projects it to one line per turn. Nothing is seeded from the file; a restart starts empty, as the composition state does.

### 8. The prompt mirrors the Synthesizer's, with three worked examples

The system prompt carries a role as the shell's designer and voice, a rules doc `planner.md` read at boot, `platform-ui-guidance.md` as the UI description, the pruned layout catalog, the output schema, and three hand-authored worked examples, each a full `{dispatch, tree, dataModel}`: a fan-out with a reserved merged view whose vendor requests ask for the join field, a platform answer that calls one reader, and a capability gap. Output is one tagged block, tag `layout-surface`, through the shared extractor, with the Synthesizer's failure taxonomy: no block, not JSON, then validation.

### 9. The platform's card enters the Registry at construction

The Registry takes the platform's card in-process, no fetch, and indexes it under `shell` with the same blended document and vector a vendor gets; `routable()` includes it, so the Router ranks it and the shortlist carries it as a normal entry. Its record has the shell catalog's id and package and the orchestrator's base URL, one record shape for all. The installed-apps reader excludes it: the platform is not an app. The dispatcher never dispatches `shell`. The card's skills — what A2UIVerse is, what the canvas can do, installed apps, how apps are found and installed — are hand-authored beside `palette`, their wording reviewed at implementation. The Router changes nothing: one blended vector per card, top five, no threshold.

### 10. Validation, in order, in orchestrator/planner

Output schema first. Then the tree through the sdk's A2UI validator against the pruned layout catalog, which already rejects `Frame`, `Attribution`, unknown components and any action but the two shell actions. Then slot accounting: exactly one `Slot` per dispatch entry, matched by `source` or by the exact `gap` string, none unmatched; a `shell` entry only with two or more vendor entries; every vendor `source` on this turn's shortlist, none twice, no blank request. The Planner may write only `source`, `gap` and `weight` on a `Slot`; `state`, `label` and `content` are painter-owned and rejected if authored. Every data-model leaf is a literal; any formula or ref shape is rejected.

### 11. The painter keeps the model's tree

The painter keeps the model's tree and ids, wraps each vendor `Slot` per decision 3, writes `state`, `label`, and `content: shell` on the synthesis slot, and leaves gap slots as authored — the catalog's `Slot` draws the tile. Repaints stay whole-tree `updateComponents`, locating each `Slot` by `source`. The data model goes out as an `updateDataModel` on `shell:main`. Composition state is keyed by `source` and gains the utterance and the synthesis outcome with its decline reason, for the this-canvas reader. A turn with no vendor dispatch and no synthesis closes right after first paint. An empty shortlist no longer ends the turn.

### 12. The model call keeps today's settings

Same model and effort settings as today, default low. Whether tree authoring needs thinking is measured in 6.6.

### 13. The journal records the output, the attempts and the tool calls

The entry's plan becomes the Planner's output `{dispatch, tree, dataModel}`, plus attempts as the Synthesizer records them and tool calls as name, arguments and result.

### 14. Tests

The Planner is tested with the AI SDK's mock model driving tool-call steps and a fake readers implementation. Existing Planner fakes are rewritten to the new output.

## Invariants

- The Planner never authors `Attribution`; the shell's own content carries none.
- Vendor partitions never reach the Planner.
- The pruned catalog shown in the prompt is the catalog the output is validated against.
- `pnpm verify` stays green on every commit; 6.5 runs in parallel and must not be blocked.

## Open items

- Whether `Slot` should draw its own attribution and `Attribution` leave the tree — deferred; decision 3 is "for now".
- Until 6.5, the client may not read `shell:main`'s data model; platform answers bound to paths render empty in the meantime.
- If the platform card ranks poorly under the blended per-card vector, that is 6.6's finding.
