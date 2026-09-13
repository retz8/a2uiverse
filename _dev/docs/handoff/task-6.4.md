# Handoff — task 6.4, the Planner rewrite (pick-up from 6.3)

Not started; no spec written. 6.3 landed on `main` (`d783fb8`), `pnpm verify` green. 6.4's line in `_dev/TODO.md` is the scope; 6.3's "Decisions carried to 6.4" (`_dev/docs/spec/task-6.3-restructure.md`) are its locked inputs — output schema `{dispatch, tree, dataModel}`, a `Slot` with exactly one of `source`/`gap` plus `weight`, all Planner validation in orchestrator/planner. 6.5 can run in parallel.

## What 6.3 built for 6.4 to use

- **sdk** (`@a2uiverse/sdk`): `createA2uiValidator({catalog})` → `validate(messages)` returns `A2uiFinding[]` (`{category, message, path?, componentId?}`), `formatA2uiFinding` for retry lines; `pruneCatalog(catalog, keepSet)`; `schemaErrors(ajvValidate, input)`. A payload with no `createSurface` is treated as an incremental update (no root required, no orphan check).
- **shell catalog**: `LAYOUT_SURFACE_KEEP_SET` (`Slot`, `Row`, `Column`, `Card`, `Text`, `Divider`, `DataList`, `DataListItem`, `Table`, `TableRow`, `Button`; `openStore`, `openAppLibrary`) from `@a2uiverse/shell-catalog/schema`. `Slot` schema: `source` | `gap`, `weight`, `state` (`pending|failed|collapsed`), `label`, `content`. A `gap` slot renders the capability tile; its Store query is the gap.
- **orchestrator**: the pattern to copy is `src/synthesizer/` — `prompt.ts` (`readSynthesizerFiles` prunes at boot; the prompt shows the pruned catalog it validates against), `document.ts` (output schema), `validate.ts` (one validator, structure-gated), `synthesizer.ts` (text loop, one retry). The shared extractor is `src/authoring/taggedBlock.ts` (`extractTaggedBlock(text, tag)`).
- `@a2uiverse/shell-catalog/platform-ui-guidance.md` ships but nothing reads it yet — 6.4 is its first reader.

## State of the code 6.4 changes

- The Planner is still the Phase-5 one: structured output, `planSchema.ts` with `direction`/`groups`/`archetype`, `checkPlan.ts`, `archetypes.ts`.
- The painter (`composition/shellPainter.ts`) lays out `Frame`s from the plan and writes each `Slot` with `source: appId`; component ids and the orchestrator's composition state are still keyed `slot-<appId>` (`composition/constants.ts` `slotNameFor`) — internal only, nothing on the wire depends on it.
- The stamp carries no `slot`; the client places by `source` and reads the roster by pairing each `Attribution` with the `Slot` of the same source that follows it.
- `SCHEMA_CATALOG` (shell catalog, headless `web_core` catalog) is no longer used by the orchestrator.

## Open threads

- Five 6.3 choices were reported to the user and not yet confirmed: `Slot`'s `state: "gap"` removed in favour of the `gap` prop; orphan components now rejected in model-authored trees (upstream strict); the client's synthesis fixture keeps its own camera-comparison copy; the five recorded beats were transformed mechanically, not re-recorded; `ajv` added to the orchestrator, `yaml` (dev) to the sdk.
- Playwright: `canvas-surface-beat-1` fails on relative-time text only (the recorded dates aging against today) — baseline refresh, unrelated to 6.3.
