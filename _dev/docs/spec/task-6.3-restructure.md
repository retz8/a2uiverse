# Task 6.3 — Restructure: sdk tools, contract v0.5, Slot `source`, Synthesizer in the orchestrator

The structural groundwork Phase 6's Planner rewrite (6.4) builds on (`_dev/docs/spec/phase-6-shell-as-agent.md`, decisions 3, 6, 8). No visible behaviour changes: today's Planner, screens and recorded beats keep working, apart from the renamed field. SPEC §4.1, §13, §14.

## Scope

- The sdk as generic tools plus the wire contract: an A2UI v0.9.1 validator, catalog pruning, contract v0.5.
- The shell catalog: `Slot`'s `source`, `gap` and `weight`; two keep-sets.
- The Synthesizer's authoring moved into the orchestrator, validated through the sdk's A2UI validator against its pruned catalog.
- One tagged-block extractor shared by the orchestrator's authors.
- The painter and the client on `source`.
- SPEC §4.1 and §14's placement row, and the sdk, shell-catalog and orchestrator READMEs, brought up to date.

## Locked decisions

### 1. The sdk holds generic tools and the wire contract

The sdk knows neither author and never knows the shell catalog. It holds what several consumers must agree on — the composition contract that crosses between orchestrator and client, and the shared meaning of a synthesis (`Ref`, `Formula`, `SortDeclaration`, the payload schema and its validator, the pointer and walk kit) — and generic A2UI tools. Each author's role, rules doc, examples, output schema, output validator and turn building live beside that author in the orchestrator. Evaluation of a synthesis stays in the client.

### 2. An A2UI v0.9.1 validator in the sdk, following upstream's

The sdk validates a tree the way upstream's Python `A2uiValidator` does: JSON Schema against the v0.9.1 spec's `server_to_client.json` and `common_types.json` plus a given `catalog.json` — known components, props, and function names through the catalog's declared functions — and the integrity checks: dangling children, root, cycles. Upstream's validator conformance cases (`conformance/core/validator.yaml`) run in the sdk's tests.

### 3. The spec schemas are a pinned, generated copy

The v0.9.1 spec schemas and the validator conformance cases are copied into the sdk from `upstream/main` by a script that records the upstream commit. Never hand-edited; refreshed by re-running the script after syncing the spec.

### 4. Catalog pruning in the sdk

One function takes a full `catalog.json` and a keep-set of components and functions and returns the pruned `catalog.json`, dropping shared definitions nothing references any more. It knows no author. The pruned catalog an author is shown in its prompt is the catalog its output is validated against.

### 5. The shell catalog exports two keep-sets

The shell catalog exports the keep-set for each of its two authors, named by the surface each paints.

- Synthesizer: `DerivedValue`, `SortControl`, `Table`, `TableRow`, `DataList`, `DataListItem`, `Text`, `Column`, `Row`, `Card`, `Divider`; the formula operators.
- Planner: `Slot`, `Row`, `Column`, `Card`, `Text`, `Divider`, `DataList`, `DataListItem`, `Table`, `TableRow`, `Button`; `openStore`, `openAppLibrary`.

`synthesis-guidance.md` drops its component prohibitions once the Synthesizer's catalog is pruned.

### 6. `Slot` is keyed by `source`

`Slot`'s `name` prop becomes `source`. `Slot` gains `gap` — a capability no installed app serves — and `weight`. The painter writes `source`.

### 7. Contract v0.5: the stamp places by `source`

The composition stamp drops `slot`; the client places a surface by the stamp's `source`, in its placement map, failure routing and roster lookup. The model-facing `synthesizeDataModel` shape leaves the contract. The contract and its extension URI go to v0.5.

### 8. The Synthesizer's authoring lives in orchestrator/synthesizer

Its role, rules doc, examples, output schema, output validator and turn building move from the sdk into orchestrator/synthesizer. The rules doc is `synthesis.md` (the sdk's `composition.md`, renamed), read at boot. Its prompt shows the Synthesizer's pruned catalog.

### 9. The Synthesizer's validation is consolidated

One validator in orchestrator/synthesizer covers what the sdk's `validateSynthesizeDataModel` and `checkSynthesis` check today: shape and structure, the tree through the sdk's A2UI validator against the Synthesizer's pruned catalog, the derived-value rule, operator names, and refs resolving against this turn's partitions.

### 10. Prompt assembly per author, one shared extractor

Each author assembles its own prompt. One tagged-block extractor lives in an orchestrator module both authors import.

### 11. The shell-catalog fixture keeps its own timeline example

The design-check fixture holds its own copy of the timeline example it renders.

## Decisions carried to 6.4

Made in this grill; 6.4 (the Planner rewrite) builds on them.

- **The Planner's output schema** is `{dispatch, tree, dataModel}`. A dispatch entry is `{source, request}` — `source: "shell"` for the merged view's brief — or `{gap}`, naming a capability. `tree` is `{components}`. `dataModel` holds literal values only. No `note`.
- **A `Slot` carries exactly one of `source` or `gap`**, matching its dispatch entry by that field, plus an optional `weight`. The painter owns `state`, `label` and `content`.
- **All Planner validation lives in orchestrator/planner:** its output schema, the tree through the sdk's A2UI validator against the Planner's pruned catalog, slot accounting, a merged view only with two or more sources, literal-only data, and app ids on this turn's shortlist.
- **Phase 11's multi-account** adds an account field beside `source` on the dispatch entry, the `Slot` and the stamp.

## Invariants

- The sdk depends on no author and never knows the shell catalog; the catalog and keep-sets reach it as inputs.
- Every commit keeps `pnpm verify` green.
- The regression suite and recorded beats pass unchanged apart from the renamed field.
