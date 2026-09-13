# Task 6.2 — Shell catalog: platform UI

The shell catalog's share of Phase 6 (`_dev/docs/spec/phase-6-shell-as-agent.md`, decisions 5–7): the shell's closed action set, the guidance for drawing UI about A2UIVerse itself, and the capability tile. SPEC §4.2, §7, §8.

## Scope

- The two shell actions declared in the shell catalog and implemented.
- The shell catalog built by a factory taking the host's shell-action handler.
- The guidance doc renamed for synthesis, and a new guidance doc for the platform's own UI, both exported.
- A `gap` state on `Slot` drawing the fixed capability tile.

## Locked decisions

### 1. The shell actions are catalog functions

`openStore`, with an optional `query`, and `openAppLibrary`, with no arguments: functions returning nothing, declared in the shell catalog beside the basic catalog's `openUrl`, invoked by a button's `functionCall` and run on the client. This is the A2UI mechanism for a client-side action, so SPEC §14 gains no row.

### 2. The catalog is built by a factory taking the host's handler

The shell catalog is constructed by a factory the host calls with its shell-action handler, and the two functions call that handler — the shape of upstream's basic-functions factory closing over host options. The orchestrator's validation catalog is built with a handler that does nothing. The static catalog export the client and fixtures import becomes the factory call.

### 3. The shell functions carry no presentation

A shell function only calls the host's handler. What opening the Store or the App Library looks like belongs to the host: until Phase 13 a notice and a journal report (task 6.5), then the trusted pages Phase 13 builds.

### 4. Two guidance docs, named by subject

- `synthesis-guidance.md` — the current `guidance.md` renamed, content unchanged: how several agents' answers become one composed view. The Synthesizer's one consumer line in the orchestrator follows the rename.
- `platform-ui-guidance.md` — new: how the shell draws UI about A2UIVerse itself.

Both are exported by the shell catalog under those names. The Planner does not read `platform-ui-guidance.md` in this task; its prompt builder (6.3) and the Planner (6.4) consume it. Layout — where slots sit, one `Slot` per source — is not in either doc; it is the Planner's prompt builder's (6.3).

### 5. What `platform-ui-guidance.md` covers

Imperative register; per-component meaning stays in `catalog.json`'s descriptions.

1. What a platform answer is — what A2UIVerse is and what is there: the platform's skills, the installed apps and their skills, what is on this canvas, recent turns — written from what the platform readers returned and from the platform's card.
2. The components that serve it: `Text` for the shell's own words with `variant` for hierarchy; `DataList` for one thing's facts; `Table`, or a templated `Column` of `Card`s, for a list of like things; `Card` to hold an answer as one surface.
3. The literal data model: lists sit in the data model as plain values and the tree templates over them; every value is a literal, never a formula, never a ref.
4. Affordances: a `Button` whose action is `openStore` — with a query when the user named what to look for — or `openAppLibrary`, only when the answer leads to a trusted page. No other action.
5. Never paint: vendor data; a Store listing or anything from the marketplace; install, uninstall, consent or account controls; a credential input.

Component prohibitions are not in the doc: the prompt builders show each author a pruned catalog (6.3).

### 6. The capability tile is a `gap` state on `Slot`

`Slot` gains a `gap` state beside `pending`, `failed` and `collapsed`. It draws a fixed tile — a minimal line and a button raising `openStore` with the capability as query, through the handler the factory closes over. No model wording in it.

### 7. `Frame` stays in this task

`Frame` is untouched here; it is removed in 6.4 with the painter change that frees it.

## Invariants

- Descriptions in `catalog.json` target the authoring model and never name the design system.
- Every commit keeps `pnpm verify` green.

## Open items

- The capability tile's wording beyond a minimal line — Phase 14.
