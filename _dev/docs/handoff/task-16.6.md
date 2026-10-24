# Handoff — 16.6, the shell catalog on the pinned runtime

## Where it stands

Built and committed on `phase-16/6-shell-catalog` (`2e39aac`), pushed, not merged. 16.6 stays `[WIP]`: it lands on `main` with 16.7 (spec decision 2).

Green on the branch: the shell catalog's typecheck (now over its tests and the design-check page), its 519 tests and its build; the orchestrator's typecheck and tests (683 passed, 11 skipped); the marketplace's (80 passed). The design-check page, served through the tunnel on 5173, matched `main`'s in layout (page height, every heading, every table's column widths and row heights) and in text, its way-back example drawing its arrows.

Red on the branch alone, as expected: the client's typecheck, 23 errors between its 0.10.x packages and the shell catalog's 0.14.0, so the root `pnpm verify` fails until 16.7. The client's 867 tests pass.

## What's next

- 16.7, cut from `phase-16/6-shell-catalog`.
- At the merge: `pnpm verify` green over both, then both merge to `main` and both are ticked.
- 16.6's done commit on `main` records in `_dev/a2ui-findings.md` (spec decision 9); the code's comments already point at §17 and §18:
  - §17 — a prop declared as a plain array of strings (`DerivedValue.danger`, `Table.columns`) is typed by web_core 0.14.0 as a child list, `(string | ResolvedChildRef)[]`; at runtime only a prop marked with the `ChildList` reference resolves children.
  - §18 — `@a2ui/react` 0.14.0 hosts every React component in an element of its own, `a2ui-react-<name>`, `display: contents`, with no way out: a row component's `<tr>` lands inside it under `<tbody>`, which React reports as invalid nesting; a list item's `<li>` the same under `<ul>`.
  - §9 restated — on 0.14.0 a repaint that only drops props leaves the binder's props identical, so a component reading its own model is not rendered again; `Slot` and `Attribution` now subscribe to the model's `onUpdated`.

## For 16.7

- web_core 0.14.0 loads Lit into the client; Lit's development build, which Vite's dev server and Vitest pick, logs "Lit is in dev mode". A production build does not.
- `A2uiSurface` 0.14.0 sets web_core's process-wide markdown renderer from `MarkdownContext` and never clears it.
- web_core's event emitter awaits each listener in turn: a listener subscribed after the resolver's hears an update a microtask later, so a test awaits the repaint.
