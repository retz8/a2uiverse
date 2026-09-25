# Task 5.8 — Design records + sdk README

The closing sub-task of Phase 5 (`_dev/docs/spec/phase-5-heterogeneous-shapes.md`, Scope): the design records rewritten to the synthesize data model as the Synthesizer authors it and the client evaluates it, and the sdk README rewritten to what the sdk exposes. TODO 5.8.

## Scope

- `docs/design/synthesis.md` rewritten in full.
- `docs/design/orchestrator.md` and `docs/design/client.md` corrected wherever Phase 5 changed the design.
- `packages/sdk/README.md` rewritten.
- `packages/sdk/docs/composition.md` amended where the README work finds a vocabulary gap.
- `docs/design/shell-catalog.md` checked, not rewritten.
- Written directly on `main`, no worktree.

## Locked decisions

### 1. `synthesis.md` is the narrative

`synthesis.md` stays the end-to-end story of a merge turn, rewritten in full to the Phase 5 design: detailed, friendly, with diagrams where they help. The per-class records stay in the orchestrator and client records; the narrative describes each class once, in the record that owns its process, and maps to them.

### 2. The process records are corrected everywhere Phase 5 reached

The edits to `orchestrator.md` and `client.md` are not confined to their Synthesizer sections. Every place the Phase 5 design changed is corrected: in the orchestrator the turn walkthrough, the Composition bullets, the Planner's synthesis-slot and prompt rows, the journal entry and the tests paragraph; in the client the runtime graph table, the synthesis section and the timeline capture. Sections Phase 5 did not touch stay as they are.

### 3. The sdk README is written for a platform developer new to the repo

The reader knows A2UI and has not read SPEC §5 or §14. The README introduces the synthesize data model in its own words before naming the tools that operate on it. The vendor catalog half's view of the sdk is one short paragraph inside that, not a second audience.

### 4. The composition doc is in scope

A vocabulary gap found while writing the README is fixed in `packages/sdk/docs/composition.md` in the same session.

### 5. A composition-doc edit is verified by its kind

A wording edit is verified by the gates plus the orchestrator's gated live Synthesizer smoke. An edit that adds or changes a rule is a behavioural change and is verified by the pinned live run through the tunnel over the real roster. The session decides per edit which applies.

### 6. The README's spine is by export

One section per thing the sdk ships: the contract, the composition stamp, the synthesize data model, the validator, the resolution kit, the prompt builder. Each says what it is, who calls it and where. The synthesize data model's section comes before the three tools that operate on it and opens in plain language ahead of any field name. Consuming stays at the end.

### 7. Provenance tags only

A decision that would puzzle a reader carries its task or phase-decision tag, and each record states which task it is current as of, as the records do today. No sentence describes what the design used to be; where a choice needs justifying, the reason the decision gives is stated, not the alternative it replaced.

### 8. 5.7's non-synthesis additions enter the records

The orchestrator record gains the per-request, per-relay and per-turn log lines as part of the executor's and pool's surface. The client record gains the recorder keeping the synthesis payload beside the stamp, with beat 5 as the temporal merge's replay. One line each. The turbo passthrough stays in the tunnel doc.

### 9. Acceptance

Gates green. Every file path, export name and symbol the four documents name is checked to exist in the tree as written. Two cold reads by a fresh agent with no session context: one reads only the sdk README and writes back what the sdk exposes and what the synthesize data model is; one reads only `synthesis.md` and walks a merge turn from utterance to the merged view. Where an explanation comes back wrong or missing, the document is fixed. Results recorded in this spec under evidence. The user's manual review closes the task.

## Invariants

- Diagrams are ASCII, matching the records' existing convention.
- Commits are `docs(phase-5)`.

## Evidence

- **Gates.** `pnpm verify` green after the rewrite (15 turbo tasks, eslint warnings only, prettier clean after formatting the README).
- **Reference check.** Every file path and symbol the four documents name was checked against the tree: all resolve. The one script's leftovers were its own blind spots (relative module names without extensions, enum lists, a glob), each confirmed by hand.
- **Composition doc.** One wording edit (decision 4): the re-synthesis section named a `stale` state that left with task 5.10; it now says a ref that stops resolving. Verified per decision 5 as a wording edit: the gated live Synthesizer smoke passed in one attempt with the re-embedded doc (5.7 s).
- **Cold read, sdk README.** A fresh agent read only the README and explained the exports, the synthesize data model, the validator's scope and the four resolution failures back correctly. It listed twelve terms it could not place (partition, slot, fragment, generations' reader, the derived-value rule, the selector operators' result, the checklist, the Planner, the agent kit, the predicate grammar, `/sorts/N` versus `dataModel`, whether a tree may bind a branch) and four statements to verify (internal-yet-git-dependency, ref-less formulas versus sort keys, who reads generations, "resolves" in the validator's wording). Each was fixed in the README: a vocabulary paragraph up front, the predicate grammar spelled out, the selectors' mapping to an app id, branch versus leaf binding and the rule named, the evaluated model versus `dataModel`, the checklist and re-synthesis defined where first used, the consuming paragraph reworded, and the validator's sort-key rule stated as a lookup with its reason.
- **Cold read, `synthesis.md`.** A fresh agent read only the narrative and walked the turn, the drill-down, the sort change, and refs, keys and cells back correctly. It found one real error — the evaluated example's rows were not in the order its own sort declared — and five ambiguities read as contradictions: "the only second call" against re-synthesis, the generations paragraph, "never a component tree" against the previous document, `shell` as canvas and as source id, and the checklist's resolve-now against the client's absent. All fixed, with the client's stage, timeline, parked and sandbox words, the side channel, the text seam and the fixed display zone now defined where they appear, and `DataList` given its place in the narrative.
- **Manual review.** The user's, to close the task.
