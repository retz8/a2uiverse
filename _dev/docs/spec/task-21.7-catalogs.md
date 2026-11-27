# 21.7 — The catalogs

The nine catalog packages of `a2uiverse-apps`, the seven catalogs and the scaffolder's two catalog templates, brought onto `@a2ui/web_core` and `@a2ui/react` 0.16.1 through Stellify 0.13.0, on the wire as it is, with what 0.16.1 changes in the GitHub catalog settled. Sub-task 21.7 of Phase 21 (`_dev/docs/spec/phase-21-v1-0-migration.md`), `[apps]`.

The upstream check (phase decision 17) read `upstream/main` at `36725eee0` of 2026-11-25 and found no event: `@a2ui/web_core` and `@a2ui/react` are at 0.16.1 on npm, `a2ui-core` at 0.7.1 and `a2ui-agent-sdk` at 0.12.1 on PyPI, and upstream pull requests 4171, 4170, 4347 and 3930 are open.

## Scope

- The nine packages' pins on `@a2ui/react`, `@a2ui/web_core` and Stellify, and the apps repo's lockfile.
- The seven catalogs' versions.
- In the GitHub catalog: the functions `not`, `and` and `or` on 0.16.1's reading of a boolean; `ActionBar.Menu`'s `trailingVisual` and `overflowIcon`; the audit of decision 6.
- A finding in `_dev/a2ui-findings.md`.
- `_dev/TODO.md`: notes on the lines of sub-tasks 21.8, 21.9, 21.12 and 21.18.
- Out: the registry snapshot and the replay suites — sub-task 21.8; the fleet republished and the live pass of all seven catalogs — sub-task 21.9; finding 18's passage on a union of an id and text — sub-task 21.9; the catalogs on v1.0 — sub-task 21.18.

## Locked decisions

### 1. The pins

`@a2ui/react` and `@a2ui/web_core` are at 0.16.1 exactly in the nine packages, as peer dependencies and as dev dependencies. Stellify is pinned at `3f8760a8a6d2541831b82e3ff2dc9382e7b823aa`, the commit of `main` where sub-task 21.5 landed (task-21.5 decision 7), Stellify 0.13.0. The lockfile moves with them: `@a2ui/markdown-it` to 0.2.4 and `dompurify` to 3.5.0 follow `@a2ui/react`, `redos-detector` and `regjsparser` leave, and nothing else moves.

### 2. Each catalog at its next minor version

Calendar and Gmail move from 0.4.0 to 0.5.0. GitHub and the two shops move from 0.2.2 to 0.3.0, and Linear and CircleCI from 0.2.1 to 0.3.0. The scaffolder's two catalog templates stay at 0.1.0, and the scaffolder, `create-a2ui-agent`, keeps its own version, 0.1.0.

### 3. The GitHub catalog's `not`, `and` and `or` take 0.16.1's reading of a boolean

The three functions keep delegating to `@a2ui/web_core`. On 0.16.1 the delegate reads its argument as the protocol specifies: a boolean as it is, a validation result as its `valid`, a string as true only when it reads "true", a number as true when it is not zero, anything else as false. On 0.14.0 it read JavaScript truthiness. The test of `not` over a string asserts the new reading, and the comment in `not.ts` states it. What the GitHub agent sends today, `not` over `required` and over `length`, reads as before.

### 4. `trailingVisual` and `overflowIcon` are plain strings in the Zod schema

`ActionBar.Menu`'s `trailingVisual` and `overflowIcon` are declared as plain strings in the Zod schema, where each was a union of a component id and another string option. The component receives each as written, at the top level of the menu and inside a submenu, and draws an id that names an `Icon` from that component's model. The catalog schema (`catalog.json`), the wire, the agent's prompt and the recordings stay as they are. The catalog's parity test is checked against the change; if it holds these two properties' types against `catalog.json`, that comes back to the owner.

### 5. Tests for the two cases no test held

`ActionBar.Menu` takes a test of a top-level entry whose `trailingVisual` is text, and one of `overflowIcon` written `none`.

### 6. The audit of the GitHub catalog

Seven places in the GitHub catalog are checked on 0.16.1 against 0.14.0, for what the component receives and draws:

1. `variant` on `FormControl.Validation`, `RadioGroup.Validation` and `CheckboxGroup.Validation`, each a union of a value and a data binding.
2. `selectedItemIds` on `Autocomplete.Menu`, a union of a list and a data binding.
3. The three files that look a component up by its written id: `slotted-child-list.tsx`, `selectpanel.tsx` and `actionmenu.tsx`.

Each takes a test where none holds it today, and what differs is fixed. A difference that is not a plain fix comes back to the owner before another way is chosen. The unions of plain values and the function arguments typed `z.any()` or `z.unknown()` are read and take no further test. The other eight packages hold no union, intersection or open type in a schema.

### 7. Finding 36

On 0.16.1, a property declared as a union of a component id and another string option arrives as a built child's id whatever was written, so the other option is never received: text, and the literal `none`. This is recorded as finding 36 in `_dev/a2ui-findings.md`, written once the behaviour is read in 0.16.1's own source and on `upstream/main` and upstream's issues are searched for prior art. Finding 18's passage on a union of an id and text stays as it is until sub-task 21.9.

### 8. No convention

The catalog conventions and the `design-catalog-component` skill stay as they are.

### 9. `_dev/TODO.md`

Four lines each take a note, "From 21.7", stating facts and nothing of what those sub-tasks do with them. Sub-task 21.8's: the seven catalogs' new versions. Sub-task 21.9's: finding 18's passage on a union of an id and text describes 0.14.0, and the GitHub catalog's two changes of behaviour (decisions 3 and 4). Sub-tasks 21.12's and 21.18's: on 0.16.1, a property declared as a union of a component id and another string option receives a built child's id whatever was written (finding 36).

### 10. The open item of task-21.5 is closed

None of the nine packages imports `inlinePeerAndLocalRefs` or `linkCatalogs`, and none imports `useA2uiSurface` or `useNodeView`. They import from `@a2ui/react/v0_9`, `@a2ui/web_core/v0_9` and `@a2ui/web_core/v0_9/basic_catalog` alone.

### 11. The documents

No README in the apps repo names the pins, and none changes for them. A document that describes `not`'s reading of its argument or the menu's two properties moves with decisions 3 and 4.

### 12. What proves it

1. `pnpm verify` green in the apps repo, the scaffolder's test that generates both templates and runs each among it.
2. Each of the seven catalogs packed once, its descriptor naming Stellify 0.13.0 and the host-module interface `0.16.1`.
3. The GitHub app installed into a running A2UIVerse and painting once, through the tunnel.

## Invariants

- Beyond decision 3's reading of a boolean, no change in behaviour: a paint the seven agents send today draws as it drew on 0.14.0.
