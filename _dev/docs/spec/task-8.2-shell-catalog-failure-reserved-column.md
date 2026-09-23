# Task 8.2 — shell-catalog: the failure tile, the reserved column, the declined merge's line

The shell catalog's part of Phase 8 (`_dev/docs/spec/phase-8-late-arrival-failure.md`, decisions 5, 7, 8, 9 and 12): the `Slot`'s failure drawn as board F6 of the 7.14 design canvas, the Table's reserved column, and the collapsed shell slot as one line. SPEC §4.5, §5.4, §8, §14.

## Scope

- The `Slot`'s failure prop and its failed branch redrawn to board F6, with Retry.
- A `noun` prop on vendor slots for the tile's line.
- The Table's per-column source mark and the reserved column's cells and heading.
- A `declined` prop on the shell slot and the collapsed shell branch as one line.
- The host seams the three need: a retry handler and a slot-state context.
- The catalog schema's descriptions for the new props, one sentence in the synthesis guidance, the design-check fixture and the tests.

## Locked decisions

### 1. Two host seams, by kind

Handlers and stable lookups go on `createCatalog`'s options: `onRetry` beside `onNavigate`, and without a handler no Retry button is drawn. State that changes over time goes through a context beside `SlotContentContext`: a slot-state resolver the host fills, source to pending, filled, failed or collapsed, which the Table reads.

### 2. The failure prop carries four causes and a message

The `Slot` gains a failure prop with a cause from a closed vocabulary of four — `vendor` (the vendor ended its task failed), `unreachable` (the connection or stream broke, nothing said), `timeout` (no answer within the time allowed), `invalid` (the paint arrived and could not be rendered) — and the vendor's message, which rides only with `vendor`.

### 3. A `noun` prop on the vendor slot

Each vendor slot carries the join noun for its source, written by the painter at plan time beside `label`. The tile's line is composed in the catalog from the two: the noun with its leading display name stripped reads "CircleCI couldn't show its runs."; a noun that does not start with the name reads "couldn't show pull requests"; no noun reads "couldn't answer".

### 4. The words beneath Retry, per cause

A muted heading names the speaker. With `vendor` and a message: "CircleCI said" over the message. With `vendor` and no message: nothing beneath; the line and Retry stand alone. With the other three causes, "What happened" over the shell's reason: "CircleCI couldn't be reached." for `unreachable`, "No answer within the time allowed." for `timeout`, "CircleCI answered, but its screen couldn't be shown." for `invalid`.

### 5. The tile's look

One face throughout: the vendor's message and the shell's reasons are both set in the UI face, no monospace. The tile keeps no box and the reserved floor. The line is at body size in ink; 16px between the line, Retry and the words; Retry a size-2 outlined gray button with a refresh glyph; the heading and the words at caption size in the muted register.

### 6. `columnSources` marks a column to its source

A parallel array to `columns`, the same length, each entry a source id or null for a column that belongs to no single source, on both the Table and the shell `Slot`. The Planner writes it on the shell slot at plan time beside `columns`; the Synthesizer writes it on the Table beside its own, starting from the plan's. The lengths are checked.

### 7. The Synthesizer writes the cell; the Table overrides it by state

The synthesis guidance gains one sentence: in a column whose source brought no data, write the empty cell, a dash in the quiet register, keeping one cell per column. The Table reads the column's source state from the host context and, while the source is pending, draws a skeleton bar in that column's cells in place of the authored cell; while failed, the dash; once filled, the authored cell.

### 8. The reserved column's heading carries a state word

"CI build · loading" while the source is pending, "CI build · unavailable" once it failed, the plain heading once filled. The words are the client's, computed from state, in the heading's muted register and in its accessible name. Not "failed", which in a CI column reads as the builds having failed.

### 9. A `declined` prop on the shell slot

The painter sets the decline's reason on the shell `Slot` in the repaint that flips it to collapsed. The collapsed shell branch draws one line in the Synthesizer's words at the label row's geometry: the 24px row where the merged view's label would have sat, caption size in the quiet register, nothing beneath, no transition. A vendor's collapsed slot resting on prose is unchanged.

### 10. Standing rules

The three painted props, `failure`, `declined` and `state`, are described in the catalog schema as painted by the runtime and never written by an author; `noun` and `columnSources` on the slot are the Planner's to write. Retry is not a shell action function and appears in no keep-set. The shell slot's own failed branch stays the quiet line. The design-check fixture and the tests gain the new states.

## Invariants

- Every word the tile and the reserved column show is the catalog's, composed from props on the wire, except the vendor's message and the decline's reason, which are shown as given.
- One cell per column in every row; a reserved column changes rendering, not the tree.
