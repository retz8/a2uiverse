# Handoff — task 7.15, the reserved merge slot

Not started. This is what 7.14 left in place for it.

## The design canvas is the golden source

**https://claude.ai/artifact/W324EkZXFze2CxddzNve1o** — the Final page is the reference UI for
7.14, 7.15 and 7.16, and for Phase 8's failure tile (F6) and Phase 9's trail (F5). The canvas UI is
built to match it almost exactly: take spacing, type, colour and copy from its boards' source
(Artifact `read`, `project/F-*.dc.html`), not from memory or approximation. 7.15's boards are F2
(merging: the slot reserved at full height, planned column headers over skeleton rows), F3
(landed: the table filling exactly that box) and F8 (the same under a clipped paragraph).

## What 7.14 built

- **The question heads the canvas** — `QuestionHeader`: the utterance verbatim from Enter until the
  next one, display size on one line, a fixed 4-line box past it with "Show all" opening it over
  the page. It sets its height at Enter, so it never moves what is below it.
- **The progress line** — `turnProgress` (pure, off the store) and `ProgressLine`: planning, a tick
  per vendor source, then "Joining … / Joined …". The join names the **apps' display names**
  ("Joining Linear, GitHub and CircleCI"), because the join hypothesis's nouns never leave the
  orchestrator. The boards say "Joining Linear issues to GitHub PRs and CircleCI runs": that is
  7.15's, from the hypothesis published to the client at plan time (see its TODO line).
- **Store:** `question`, `slotStates` (each `Slot`'s painted state by source, from
  `slotStatesOf` in `composition/roster.ts`), and the in-flight cause's kind.
- **Chrome:** the status strip names the app only; the Ask pill, strip and head take `--a2v-*`
  tokens in `CanvasApp.css` (light and dark); a 56px left gutter with Back in it; the head 24px
  from the top; the notice stack above the Ask pill.
- **Shell catalog:** `Row`/`Column` gap is `var(--a2v-layout-gap, var(--space-3))`; the client sets
  32px on the stage content and unsets it inside fragments and shell content. Captions sit 8px
  from their fragment.
- **Beats:** `?beat=long-question` is beat 9 under a 6-line paragraph. E2E:
  `apps/client/e2e/question-header.spec.ts`, 1440×900 baselines.
- SPEC §4.3 gains the header; §5.6 drops "a restated question". Design record:
  `_dev/docs/design/client.md` — "The question heads the canvas".

## Where 7.15 starts

Today the synthesis slot is a one-line "Painting…" (`packages/shell-catalog/src/components/slot/slot.tsx`,
shell-content pending) with no height, so the table landing still pushes the fragments down — the
reflow F2→F3 must remove. The client learns nothing of the table before the Synthesizer runs: at
plan time it gets only the roster (app ids, display names, the `content: "shell"` slot).
