# 16.6 — Shell catalog

The shell catalog brought onto the upstream releases Phase 16 pins, its parity tests holding against them, landing on `main` with the client. Sub-task 16.6 of Phase 16 (`_dev/docs/spec/phase-16-upstream-upgrade.md`).

## Scope

- The shell catalog's dependencies on the pinned runtime, at exact versions, and what the move changes in it: the catalog's constructor, its child references, the components the renderer now hosts each in an element of its own, the workarounds tied to `_dev/a2ui-findings.md`.
- Its parity tests and its render test.
- The design-check page on the pinned runtime.
- What its typecheck covers.
- The orchestrator's relation call, which names web_core's `DataContext`.
- The upstream findings the move found.
- Out: the README and the design record, which 16.12 carries; the client's and the orchestrator's own moves, 16.7's and 16.8's.

## Locked decisions

### 1. Exact pins, peers included

`@a2ui/react` and `@a2ui/web_core` at `0.14.0` exactly, as dev dependencies and as peer dependencies.

### 2. 16.6 lands on `main` with 16.7

16.7 is built on 16.6's branch, and the two merge to `main` together once `pnpm verify` is green over both. 16.6 writes the orchestrator's relation call without naming a web_core version's `DataContext`; 16.8 lands independently of the two.

### 3. Function parity is exact

The parity test holds the runtime catalog's functions equal to the functions `catalog.json` declares, both ways, as it holds the components.

### 4. `Table` draws its rows

`Table` draws each row's `<tr>` itself through 0.14.0's `view`, from its `TableRow` children; only the cells' content renders through the renderer, inside each `<td>`. The native table and Radix's `Table` stay. `TableRow`'s own implementation draws when it is rendered alone. Should this not work, `Table` and `TableRow` draw elements with the ARIA roles `table`, `row`, `cell` and `columnheader`, laid out to look as now. The schema does not change.

### 5. `Slot` and `Attribution` read their props from their component model

`Slot` and `Attribution` subscribe to their component model's `onUpdated` and read their props from the model, so a repaint that only removes a prop re-renders them without it (finding 9). Their tests drive a real repaint through the message processor that only drops props.

### 6. The render test catches a failed component

For every component and every value of each enum prop, the render test requires no error reported on the surface, rendered content inside each component's element and no pending child, beside no console error or warning. The check for the old react patch's placeholder goes.

### 7. Child references are marked as component ids

`DataListItem.child` and `Attribution.child` are marked as component ids with upstream's `componentId()`. `catalog.json` declares `Attribution.child` a component id, as it already declares `DataListItem.child`.

### 8. The rest of the move

- The catalog targets protocol version `v0.9.1`.
- A shell action or a `Slot` press with no surface in its data context raises nothing.
- `DerivedValue.danger` and `Table.columns` are cast to plain string arrays.
- The workarounds for what upstream fixed go: the cast on `SortControl`'s setter for its binding-only `sort`, and the string guard on `DateTimeInput`'s bound `min` and `max`. The comments say what is.
- The tests that select a component's direct children follow the element each component now renders in.
- `catalog.json` stays hand-written, held to the code by the parity tests.

### 9. Three findings, in 16.6's done commit

16.6's done commit on `main` records in `_dev/a2ui-findings.md`: a prop declared as a plain array of strings typed as a child list; the element each React component now renders in breaking HTML that ties a parent to its child — a table's rows, a list's items; and finding 9 restated against 0.14.0 — a component reading its model does not re-render after a repaint that only removes props. The protocol delta register does not change.

### 10. The typecheck covers the tests and the design-check page

The shell catalog's typecheck covers its tests and its design-check page beside its source. The type errors standing in them are fixed: the design-check page names sources through `sourceName`, and its way-back example draws its arrows.

### 11. What proves it

- The shell catalog's typecheck, tests and build green on `0.14.0`, with the tests of decisions 3, 5 and 6 and the typecheck of decision 10.
- `Table` rendering with no console error.
- The orchestrator's typecheck and tests green with decision 2's relation call.
- The design-check page, through the tunnel, looking as it did in light, in dark and with no host theme: the merged view's table, an `Attribution` drawing its slot, `DataList`'s values, the layout of rows and columns; its way-back example drawing its arrows.
- The platform's `pnpm verify` green over 16.6 and 16.7 together before either lands on `main`.
