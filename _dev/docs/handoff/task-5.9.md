# Handoff — task 5.9, `shell-catalog` Radix Themes mapping

Spec: `_dev/docs/spec/task-5.9-radix-mapping.md`. Grilled and spec'd; **no code written**. The working tree is clean; nothing is in flight.

## Where it stands

- `5.9` is `[WIP]` in `_dev/TODO.md`. `5.11` landed this session (worked directly on `main`), so `5.7` now waits on `5.9` alone.
- Eight decisions locked in the spec. The two that shape everything else: the basic catalog's prop surface stays exactly as it is (schema, descriptions, guidance and composition doc untouched), and all eighteen basic components plus `DerivedValue` · `Attribution` · `Frame` are rendered on Radix.

## What to do

Implementation begins in a worktree, `phase-5/9-radix-mapping` off `main`, via `daily-work-harness:rebase-with-main`. Code only in the worktree; the five documents (SPEC §4.2 + §15, `_dev/docs/design/shell-catalog.md`, the package README, the Backlog line) are `main` edits at wrap-up.

Read the `a2ui-sdk-design` skill in full first — the repo rule for shell-catalog work.

## What is already there to build on

- `packages/shell-catalog/src/provider.tsx`: the scoped Radix `Theme`, the generated scoped stylesheet (`scripts/scope-radix.mjs`), and `PortalRootContext` for floating content. `SHELL_TOKENS` in the same file is what decision 2 removes.
- `components/sort-control/` and `components/slot/` already render on Radix — the in-repo shape for a mapped component: `*.schema.ts` + view + `createComponentImplementation`. `primer-a2ui-adapter` (`../a2ui-github/primer-a2ui-adapter/src/components/*`) is the precedent for the folder-per-component structure and the prop translation comments.
- `src/catalog.ts` spreads `basicCatalog` from `@a2ui/react/v0_9`; `src/schema.ts` is the React-free face and stays as is.
- `catalog.parity.test.ts` is the name-level parity that decision 7 extends; `fixture/main.tsx` is the matrix decision 6 widens.

## Facts gathered in the grill

- Radix Themes 3.3.0 counterparts: `Text`→Text/Heading · `Row`/`Column`/`List`→Flex · `Card` · `Divider`→Separator · `Tabs` · `Modal`→Dialog · `Button` · `TextField`→TextField/TextArea · `CheckBox`→Checkbox · `ChoicePicker`→RadioGroup/CheckboxGroup, chips as SegmentedControl · `Slider`. No counterpart: `Image`, `Icon`, `Video`, `AudioPlayer`, `DateTimeInput`.
- `Icon.name` is a sixty-name enum, `{svgPath}`, or a binding. Upstream renders a Material Symbols ligature that nothing loads today. `@radix-ui/react-icons` is not yet a dependency; pin it exactly.
- Upstream body `Text` reads a host-supplied `MarkdownContext` renderer; the client installs none.
- The upstream basic implementation's own stylesheet (`@a2ui/react/v0_9/index.css`) is imported by nobody, so the re-exported basics render unstyled today — the mapping loses nothing.
- The client's fragment-boundary CSS (`apps/client/src/canvas/CanvasApp.css`, the Composition block) reads `--a2ui-*` with Radix fallbacks; decision 2's removal of `SHELL_TOKENS` means it reads the Radix variables directly.
- The client also depends on `@radix-ui/themes` `^3.3.0`; the package pins `3.3.0`.

## Open thread

None flagged in the grill. The Radix Theme props the shell fixes when there is no host Theme are task-internal.
