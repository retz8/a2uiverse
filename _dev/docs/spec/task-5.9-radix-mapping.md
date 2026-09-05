# Task 5.9 — `shell-catalog`: Radix Themes mapping

The shell catalog's implementation becomes a mapping of each basic component onto its Radix Themes counterpart, the way `primer-a2ui-adapter` maps onto Primer, replacing the token-themed re-export of upstream's implementation. Phase 5 (`_dev/docs/spec/phase-5-heterogeneous-shapes.md`) decision 24; task 5.3 decisions 1 and 6; SPEC §4.2, §9.2, §15.

## Scope

- Every basic component of the shell catalog implemented on Radix Themes, its own design system, brought by its Provider.
- The shell's own primitives that still render as plain elements moved onto Radix as well.
- The token-themed re-export of upstream's basic implementation removed from the package.
- A design-check fixture matrix and a parity test over the mapped catalog.
- The SPEC amendments, a design record for the package, the package README, and a Backlog entry.

The catalog schema, its descriptions, the guidance doc and the composition doc are not touched.

## Locked decisions

### 1. The basic catalog's surface, Radix underneath

The catalog keeps the basic catalog's prop surface exactly: `catalog.json`, the React-free schema face, component names, props and enums are unchanged. Only the React implementations change, translating the basic props onto Radix's. Radix affordances the basic catalog cannot name are fixed by the implementation, never authored. Everything that authors against the catalog — the Synthesizer's prompt and examples, the guidance doc, the orchestrator's headless validation, the client's fixtures — is untouched. Adopting Radix's own prop surface the Primer way was judged the ideal and set aside for its cost; it is revisited once the milestones are complete.

### 2. All eighteen basic components are mapped

The thirteen with a Radix Themes counterpart are implemented on it; the five without one (`Image`, `Icon`, `Video`, `AudioPlayer`, `DateTimeInput`) are implemented on plain elements under the Theme's tokens, inside the Provider. The `basicCatalog` re-export leaves the package entirely, and the shell's `--a2ui-*` token bindings go with it. `@a2ui/react` remains only as the adapter layer.

### 3. `Icon` renders Radix Icons

Named icons come from Radix's own icon set through a table over the basic schema's sixty names; a name with no honest counterpart falls back to a stated nearest glyph, never a blank. `{svgPath}` stays an inline SVG. No font, no stylesheet.

### 4. Body `Text` keeps upstream's markdown contract

`Text` honors the host-supplied markdown renderer through upstream's context: markdown when a host installs one, plain text otherwise. No renderer is brought into the package; whether the client installs one is a client question for 5.7.

### 5. `DerivedValue`, `Attribution` and `Frame` move to Radix

The three primitives still rendered as inline-styled plain elements are rendered on Radix in this task, alongside `Slot` and `SortControl` which already are. Rendering only: their schemas, behavior and existing tests stay fixed.

### 6. The fixture sweeps the whole catalog

The design-check fixture shows every component in every value of every enum prop, under Radix light, Radix dark and no host Theme, plus the task 5.11 timeline example rendered as one merged view, plus the existing scoping proof. It is generated from the catalog schema where possible and rendered through the real renderer from A2UI trees, so the binder path and the schemas are exercised.

### 7. The parity test is render parity

Generated from `catalog.json`: for every component and every enum value of every enum prop, a minimal valid tree renders through the real renderer under the Provider with no validation error, no console error, and a rendered element. Hand-written tests only where behavior is non-trivial — two-way binding on the inputs, `ChoicePicker` selection, `Modal` opening into the portal root, `Icon`'s name table over all sixty names. The existing name-level parity between schema and runtime stays.

### 8. Five documents

SPEC §4.2 inverted to state the shell catalog maps each basic component onto Radix Themes, its own design system, brought by its Provider; a SPEC §15 row under New for the shell catalog as a Radix Themes mapping; a new `_dev/docs/design/shell-catalog.md` design record; the package README rewritten past "until 5.9"; a Backlog line for revisiting the catalog's surface the Primer way once the milestones are complete.

## Invariants

- One provider and one CSS setup per catalog bundle, scoped to the fragment boundary (SPEC §9.2); the scoping proof stays as built.
- The client's fragment-boundary chrome reads Radix variables directly once the shell's token bindings are gone; nothing visible changes.
- Radix Icons is pinned exactly, as Radix Themes is.
