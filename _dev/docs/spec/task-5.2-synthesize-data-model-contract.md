# Task 5.2 — `sdk`: composition contract v0.3, the synthesize data model

The composition contract bumped to v0.3: its synthesis half redefined as the synthesize data model, the JS projection following, the sdk shipping a validator and the shared resolution kit. Phase 5 spec decisions 1–8, 16–18; SPEC §5.2, §14.

## Scope

- `contracts/composition.v0.3.json`: the stamp half unchanged; the synthesis half redefined as the synthesize data model, in both a model-facing and a client-facing schema.
- The JS projection (`@a2uiverse/sdk`) following: types, constants, the renamed metadata key, the bumped extension URI.
- A validator compiled from the contract, shipped by the sdk.
- The shared resolution kit: pointer and predicate resolution, the model walk, ref validity.
- Contract tests for the projection, the validator, and the kit.
- Consumers (orchestrator, client) switch in 5.4 and 5.5, not here.

## Locked decisions

### 1. The tree is the A2UI components list, verbatim

The model-facing output carries the same `components` array an agent puts in an `updateComponents`, in the shell catalog, plus its root. The contract references the A2UI version rather than restating a component; the tree is validated against the shell catalog by the consumer. The orchestrator wraps the `createSurface` and `updateComponents` around it. The tree does not ride metadata; it reaches the client as the painted surface.

### 2. A formula leaf is recognized by shape

In the free-form derived model, an object with exactly `op` and `args` is a formula; any other object is a branch whose values are walked; an array is a branch; a scalar anywhere is a violation. A zero-argument formula is legal: a value no source contributes to.

### 3. Predicate grammar

A pointer segment `[key=value]` selects the array element whose field equals the value. The key is one field name of the element. The value is a JSON literal, compared by JSON equality.

### 4. A sort declaration carries path, options, and the active choice

`path` names the sorted array in the derived model; `options` lists the sortable keys, each a key path inside the element with a label; `key` and `direction` are the initial choice. The model names, the runtime sorts, the user changes key or direction.

### 5. Decline is its own branch

The model-facing schema is a `oneOf`: a synthesis carries tree, derived model, sorts, note; a decline carries `declined: true` and a reason. The note exists only on the synthesis branch.

### 6. The client-facing half is the derived model, the sorts, and `computedAgainst`

Not the tree, not the note. It rides the synthesis paint's metadata under the key `a2uiverseSynthesis`, beside the `a2uiverse` stamp.

### 7. The sdk ships a validator

Compiled from the contract; the orchestrator validates the Synthesizer's output with it, the client validates the client-facing half with it. It checks what the contract states on its own: the output's shape, every leaf a formula, every ref well-formed, every sort path naming an array in the model and every option key resolving inside its elements. The tree against the shell catalog and the derived-value rule are the orchestrator's checks, after the validator, since they need the catalog.

### 8. The sdk ships the shared resolution kit

Pure and deterministic, used identically by both processes: pointer and predicate resolution against a data model (a value, or absent); the model walk enumerating every formula leaf with its path and every ref; ref validity given the generations computed against and the generations seen (a predicate ref never goes stale; an index ref is stale under a bumped generation). Not included: the orchestrator's generation bump, and operator execution, which stays with the shell catalog's functions in the client's evaluator.

### 9. One version line

The contract file, its `version`, and the extension URI move to v0.3 together. The metadata key `a2uiverseWiring` is renamed `a2uiverseSynthesis`.

### 10. Operators are not enumerated by the contract

A formula names a function the shell catalog declares, as today.

### 11. Published on the git-dependency channel

All consumers are in-workspace; nothing external moves.

## Invariants

- The A2UI the shell paints stays standard; composition rides the envelope.
- The sdk depends on nothing above it: no shell-catalog knowledge, no A2UI validator.
- Both processes compute composition semantics through the sdk, never a private copy.

## Open items

Task-internal: the exact field names; the validator library; how a predicate that matches nothing or several elements is classified by the kit.
