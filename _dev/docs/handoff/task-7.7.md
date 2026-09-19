# Handoff — task 7.7, the client's half of the entity join

Done. Platform `1db1ba0` (the implementation, on `main`, no worktree); spec `0c4d2bf`, amended at close (decisions 2, 6, 13 and 14); pickup amendments `47bdd56`. Gates green: `pnpm verify` — 15 of 15 tasks, client 380 tests, sdk 125, no lint error, prettier clean. Playwright: `e2e/navigation.spec.ts` 4 of 4; 31 of 35 overall, the four failures being visual baselines that fail the same way on a clean `main` (below).

## What was built

- **sdk** — `locatePointer(root, pointer)`: the resolution beside the concrete path it resolved to, positions for predicates, the longest resolved prefix where it does not resolve; `resolvePointer` is built on it. Tests, README row.
- **Evaluator** (`canvas/synthesis/bindingEvaluator.ts`) — an object's `match` evaluated into relations (`holds` · `fails` · `absent`, two sides with app, ref, value) and handed to the shell catalog's `cellJoin` for every cell under it, down to the next object carrying its own; `match` left out of the evaluated model; every cell with a ref carries its `target` — the winner for a selector, the first contributor otherwise, the first declared ref when none resolves; `sortInPlace` runs over every array the sdk's `reachSortPath` reaches, so `/rows/*/runs` orders the list in every row by one choice.
- **Host relay** (`canvas/hostRelay.ts`, was `shellActionRelay.ts`) — `host: {onShellAction, onNavigate, appDisplayName}`, one `bind`. `resolveCatalogs` takes the three; `createCanvasWiring` exposes `host` and `bindingIndex`; app names from the live roster, a parked view's from its own shell paint (`rosterOfSurface`).
- **Reverse index** (`canvas/navigation/bindingIndex.ts`, `decorateCatalog.tsx`) — vendor catalogs decorated in `resolveCatalogs`, the shell catalog not; components register while mounted; bound = a property `{path}` (call arguments included), a template instance's root, a template child list's owner; `nearest` walks the located path up, first in document order. Markers render only for the candidates of one lookup, between two `flushSync` renders.
- **Landing** (`canvas/navigation/landing.ts`, the ring in `CanvasApp.css`) — bound element → fragment boundary → the source's `Slot` → a warning; scroll to center, focus after the scroll ends through a temporary `tabindex="-1"`, a ring in the shell's layer following the element's box for 1.5 s.
- **Synthetic beat `navigation`** — the fixture's storefronts in `shop-a-catalog` and `shop-b-catalog` under a document with a rendered field, a field neither renders, one row joined by `equal`, one by `judged`. The synthesis fixture is untouched.

## Spec decision 2 changed during implementation

The marker with no box moved the recorded beats' baselines: 155,958 pixels on beat 4 — Calendar's event cards lost their fill, Gmail's rows their weight; the themed basic catalogs are styled by child selectors. Hidden sibling markers, the spec's fallback, still moved it by 9,058 pixels: the vendors' `:first-child` and `:only-child` rules. Markers now exist only during a lookup; beat 4 passes unchanged. The spec's decision 2 states this.

## The tunnel sitting — deterministic real roster, 2026-09-19

`pnpm dev:all --agents-dir ../a2uiverse-apps --mode deterministic`, Claude-in-Chrome through the tunnel, "what's the status of what I'm working on?", Synthesizer live on `gemini-3.7-flash`; the turn landed three times out of three.

- One row per Linear issue — A2U-5, A2U-7, A2U-6 — pull request and CI attached; 14 cells with a join, every one `none`; A2U-7's row carries no claim and its three attachment cells are absent.
- The detail names the app and the relation in the Synthesizer's words: "From GitHub · issue identifier in PR branch · PR branch matches CI branch", "From CircleCI · PR branch matches CI branch"; app names are the roster's — Linear, GitHub, CircleCI.
- A tap on A2U-6's pull request value lands in GitHub's fragment on `retz8/a2uiverse#7`; a tap on A2U-5's CI value in CircleCI's on the run of `ekkicb71/a2u-5-say-on-the-canvas-when-an-utterance-fails`, the stage scrolled 648 px; a tap on a Linear value on the issue's row in Linear's fragment. No request left the client; no marker stayed in the DOM.
- The sort control reorders the rows both ways.

## Findings

- **A `focus()` during a smooth scroll cancels it in Chrome**, and a tab in the background animates no smooth scroll at all (the automation tab reports `visibilityState: hidden`): the first sitting left CircleCI's run 632 px below the fold. Fixed: focus waits for `scrollend` or 700 ms, and what is still out of view is then brought in at once.
- **The nested sort was not seen on a real document.** All three documents of the sitting attached one entry per source, no list inside a row. It is covered by the evaluator's tests over a hand-written payload; 7.9 meets it if the Synthesizer writes a list.
- **An issue with no pull request is not tappable.** The Synthesizer writes its attachment cells as formulas with no refs — the empty cell, 0 of 0 — and a cell with no refs has no target (task 7.5 decision 12). The boundary and slot stops are covered by the jsdom tests. Phase spec acceptance item 7's "a tap on an absent cell lands on the fragment boundary" does not hold for this shape — 7.9's to settle.
- **Primer's elements keep their own `tabindex="0"`**; the landing adds none where one stands.
- **Four visual baselines fail on a clean `main`** by 1, 1, 2 and 5 pixels — beats 1–3 and `synthesis-merged.png`. Not from this task; not re-taken.
- **The palette drops what is typed in the first seconds after a load through the tunnel**; typed again, it goes through.

## Left

- For 7.10: the client record and the client README still name `shellActionRelay` and `createShellActionRelay()`; the relay is `hostRelay.ts` now, and the record has no index, landing or navigation beat yet.
