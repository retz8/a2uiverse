# Task 7.4 — `sdk`: composition contract v0.6, the match claim

The composition contract bumped to v0.6: the match claim added to the synthesize data model as a word of its language, the sdk's validator checking its shape, the JS projection and contract tests following; the stamp's `generations` removed end to end. Phase 7 spec decisions 5, 6; SPEC §5.2, §14.

## Scope

- `contracts/composition.v0.6.json`: the synthesize data model gains the reserved key `match`; the stamp loses `generations`.
- The JS projection (`@a2uiverse/sdk`) following: types, the validator, the bumped extension URI.
- Contract tests for the projection and the validator.
- `generations` removed from the orchestrator's emission and the client's leftovers.
- The design records and the sdk README, for what this task changes.
- Not here: the relation operators and the evaluated form of `match` (7.5); "holds now" and the rule that the tree binds no path under `match` (7.6); live evaluation of `match` (7.7).

## Locked decisions

### 1. The match claim is language

The contract defines the match claim as a word the Synthesizer writes when it judges entries from different apps to be the same thing. No rule states which objects must carry one; whether entries are the same thing, and whether to merge them at all, is the Synthesizer's judgment.

### 2. The reserved key is `match`

`match` is reserved on any object of the derived model, the root included. A match claim at the root makes the whole view one merged thing.

### 3. Named relations, flat

`match` is an object whose keys are the Synthesizer's own words for what matched and whose every value is a relation formula. It holds at least one relation. It does not nest.

### 4. A relation is a formula over two refs in two different apps

Each relation is an ordinary formula, `op` over exactly two refs, the refs in two different apps. An app is the `appId` part of a ref's namespaced surface.

### 5. The sdk checks the shape only

The sdk's payload validator, run by the orchestrator on the Synthesizer's output and by the client at intake, checks every `match` it finds against decisions 3 and 4. Whether a relation's operator is a relation is checked by the consumers against the shell catalog's relation list, as they already check that an operator exists. The contract does not enumerate operators.

### 6. The usage rules are the orchestrator's

"Holds now" — each relation's refs resolved against the partitions and the shell catalog's own relation functions run over them — is checked by the orchestrator's validator at accept, in 7.6. So is the rule that the tree binds no path under `match`.

### 7. The evaluated form of `match` is the shell catalog's

What `match` evaluates into on the client — each cell's join, its mark and evidence — is defined by the shell catalog, on `CellObject`, in 7.5, and produced by the client's evaluator in 7.7. The contract describes what the Synthesizer writes.

### 8. `generations` is removed end to end

The stamp's `generations` goes from the contract and the sdk projection, from the orchestrator's partitions and relay (the snapshot, the bump, the stamping), and from the client's evaluator input and synthetic beats.

### 9. The records follow the change

The design records drop `generations` and gain `match` and v0.6 in the synthesis record's contract section; the stale contract file names in the design records and the sdk README point at v0.6. The phase's full design-record rewrite stays with 7.10.

### 10. One version line

The contract file, its `version`, and the extension URI move to v0.6 together.

### 11. Published on the git-dependency channel

Landed on `main`; every consumer is in the workspace.
