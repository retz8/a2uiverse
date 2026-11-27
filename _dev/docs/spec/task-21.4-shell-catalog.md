# 21.4 — The shell catalog

The shell catalog brought onto `@a2ui/web_core` and `@a2ui/react` 0.16.1, on the wire as it is: its workaround for upstream's binder and the deprecated API it reads given way to what the release ships, its parity tests and its functions held. Sub-task 21.4 of Phase 21 (`_dev/docs/spec/phase-21-v1-0-migration.md`). The upstream check (phase decision 17) read `upstream/main` at `36725eee0` of 2026-11-26 and found no event: no release since 0.16.1 of 2026-11-23, and upstream pull requests 4171, 4170, 4347 and 3930 still open.

## Scope

- The shell catalog's pins on `@a2ui/web_core` and `@a2ui/react`, peers included, and the lockfile.
- Its components where the release changes what they receive: `Button`'s label, and the props and ids `Slot` and `Attribution` read.
- The upstream functions it declares, its parity tests and its render test.
- How 21.4 reaches `main`, and the lines of sub-tasks 21.4 and 21.5 in `_dev/TODO.md`.
- The root README's table of upstream packages and the shell catalog's design record.
- A finding in `_dev/a2ui-findings.md`.
- Out: the client on 0.16.1 and the two local patches — sub-task 21.5; the orchestrator's pin — sub-task 21.6, the orchestrator reading the shell catalog's schema on 0.16.1 beside its own 0.14.0 until then; finding 9's own text in the findings file — sub-task 21.9; the shell catalog's new catalog id and v1.0's catalog API — sub-task 21.12; the other components' accessibility and validation state handed to upstream's binding, which takes no Backlog line.

## Locked decisions

### 1. The pins

`@a2ui/react` and `@a2ui/web_core` are at 0.16.1 exactly, in the shell catalog's dev dependencies and in its peer dependencies. `@a2uiverse/shell-catalog` keeps its version, 0.1.0.

### 2. Button's label sits on the button

From 0.16.0, `@a2ui/react` applies a component's `accessibility` on the element hosting it, labelled as a group, unless the component hands `accessibilityRef` to the element that should carry the label (upstream pull request 3869). `Button` passes `accessibilityRef` to its Radix button and no longer sets the label itself. The other components take upstream's default.

### 3. Slot and Attribution read the binder's props

Up to 0.14.0, upstream's binder kept a prop that a repaint dropped (finding 9 in `_dev/a2ui-findings.md`), and `Slot` and `Attribution` read their component model's own properties instead (task-16.6 decision 5). From 0.16.0 the binder drops a removed prop (upstream pull requests 3869 and 3937). `Slot` and `Attribution` take the binder's resolved props, and the shell catalog's own reading of the model goes. Their tests that drive a repaint dropping props stay.

### 4. The catalog reads nothing 0.16.0 deprecated

`Slot` and `Attribution` no longer read the deprecated `context`. Each is the factory's implementation with a `view` of its own, as `Table` is: its props read through the node's view, its component id from the node, and its surface from the enclosing surface (`useA2uiSurface()`).

### 5. The upstream functions are the v0.9 specification's

From 0.15.0, `BASIC_FUNCTIONS` also carries the eleven deprecated functions 0.9.x shipped (upstream pull request 3658), and the specification's fourteen are exported as `V09_SPEC_FUNCTIONS`. The shell catalog takes `V09_SPEC_FUNCTIONS`, in the catalog it renders with and in the schema catalog the orchestrator reads. Its declared functions are unchanged.

### 6. The render test requires every child a sample names to be defined

From 0.15.0, `@a2ui/react` draws nothing for a child that has not arrived (upstream pull request 3723), so the render test's check for the renderer's loading text goes. In its place, every child id that a sample's components name is a component the sample defines. The test's other requirements stay.

### 7. 21.4 lands with 21.5

21.4 is worked on a branch of its own and is not merged to `main` alone. Sub-task 21.5 branches from 21.4's branch, and the two reach `main` in 21.5's merge. The lines of 21.4 and 21.5 in `_dev/TODO.md` say so, in place of the two running in parallel.

### 8. The documents

The root README's table of upstream packages lists the shell catalog with the packages on 0.16.1. The shell catalog's design record (`docs/design/shell-catalog.md`) loses its passages on `Slot` and `Attribution` reading their own model: the paragraph on `Slot`, the line on `Attribution` and the row in its table of engineering decisions.

### 9. Finding 34

`@a2ui/react` 0.16.1 deprecates `ReactComponentImplementation.render` in favour of `view`, while the interface still requires `render` and leaves `view` optional, at the commit 0.16.1 was released from and on `upstream/main`. This is recorded as finding 34 in `_dev/a2ui-findings.md`, with the shell catalog's way of keeping the field (decision 4).

### 10. What proves it

1. The shell catalog's typecheck, tests, build and lint green on 0.16.1 on 21.4's branch, the parity test and the schema test unchanged.
2. Decision 6's check green over the render test's whole sweep.
3. A `Button` test: with `accessibility.label` set, the label is on the button exactly once, and its host element carries neither `aria-label` nor `role="group"`.
4. `Slot`'s and `Attribution`'s tests of a repaint that only drops props green on the binder's props, and their presses naming the same surface id and component id as before.
5. The design-check page opened through the tunnel beside `main`'s, in light, in dark and with no host theme, and any difference traced.
6. `pnpm verify` green on the combined result at 21.5's merge, 21.4 ticked with it.

## Invariants

- Nothing the person sees or does on a shell surface changes.
- The catalog id and `catalog.json` are unchanged.
