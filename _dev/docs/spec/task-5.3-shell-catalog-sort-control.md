# Task 5.3 — `shell-catalog`: `SortControl` over a sort declaration

The shell catalog's synthesis primitives follow the composition contract v0.3: `SortControl` drives a sort declaration, built on Radix Themes, with the catalog's Provider bringing Radix as the bundle's own design system. Phase 5 spec decisions 4, 19; task 5.2 decisions 4, 6; SPEC §4.2, §5.2, §9.2.

## Scope

- `SortControl` bound to a sort declaration's runtime state, rendered on Radix Themes.
- The Provider wraps a scoped Radix `Theme` and brings Radix's stylesheet; Radix Themes becomes the package's own dependency.
- `catalog.json` descriptions of `DerivedValue` and `SortControl` state what they bind to and how, for the Synthesizer's prompt.
- The sdk reserves the root key `sorts` in the derived model (a 5.2 follow-up landed in this session).
- The design-check fixture shows `SortControl` under Radix light and dark.
- `DerivedValue` untouched. No new operators.

## Locked decisions

### 1. The shell catalog becomes a Radix Themes mapping of the basic catalog

Each basic component implemented on its Radix Themes counterpart, the way `primer-a2ui-adapter` maps the basic catalog onto Primer. Radix Themes is the shell catalog's design system. This is its own sub-task, 5.9, after 5.3, parallel with 5.4 and 5.5, before 5.7, carrying the SPEC §4.2 amendment and the §15 table row. 5.3 builds `SortControl` on Radix from the start.

### 2. Sort state lives at the reserved root key `sorts`, indexed by declaration

The runtime writes each declaration with the user's current choice at `/sorts/N` of the synthesis surface's data model: `{path, options, key, direction}`. The tree binds `SortControl` with `sort: {path: "/sorts/N"}`. The contract reserves the root key `sorts` in the derived model and the sdk validator rejects a model that uses it.

### 3. `catalog.json` carries the authoring semantics; no new export

The `DerivedValue` and `SortControl` entries say what they bind to and how, in words a model can author against. The Synthesizer's prompt is assembled from the file in 5.4; rules about no one component belong there.

### 4. The Provider brings Radix

The Provider wraps a scoped Radix `Theme` and imports Radix's stylesheet; Radix Themes is the package's own dependency. Nested inside the host's `Theme` it inherits the appearance; tests and the fixture get Radix from the Provider alone.

### 5. The bound object is the sdk's `SortDeclaration`

`SortControl` imports the type from the sdk; the Phase 4 `SortObject` goes.

### 6. `DerivedValue` is untouched

Shape and behavior unchanged; its Radix rendering comes with 5.9.

## Invariants

- One provider and one CSS setup per catalog bundle, scoped to the fragment boundary (SPEC §9.2), the shell's catalog included.
- The model names, the runtime sorts: the component never orders anything.

## Open items

Task-internal: the Radix `Select` and `IconButton` specifics, the Provider's scoping details, the exact Radix version pin.
