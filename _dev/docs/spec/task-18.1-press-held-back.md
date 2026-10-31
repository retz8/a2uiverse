# 18.1 — A press held back, in plain words

The client's notice for a click inside an app's fragment held back while a paint is in flight, "Hold on — a paint is in flight. Try again when it lands.", said for customers. Sub-task 18.1 of Phase 18 (`_dev/docs/spec/phase-18-ecosystem-run.md`, decision 11); the Backlog's finding from 12.13. Parallel with 18.2 and 18.3, before the dry run.

## Scope

- The words the client shows when it holds a click back while a paint is in flight.
- The client's unit tests for the notice.
- The client design record's passage that quotes the old line.
- Out: the hold-back rule itself; the orchestrator's side, already in plain words.

## Locked decisions

### 1. Two lines by what is in flight

When the app the person pressed in is itself still redrawing from their earlier press in it, the notice borrows the words the sibling hold-back already uses, on the client and the orchestrator alike: "Google Calendar is still working on that. Try again once it has finished.", the app named as the sibling names it, with the same "This app" fallback when the name can't be read. In every other case — the question's answer still arriving, another app redrawing, the merged view being redone — the screen line shows.

### 2. The screen line

"This screen is still loading. Try again once it has finished." A statement followed by what to do, the shape of the client's other lines in its own voice; no opener.

### 3. An app done while the turn runs on

An app whose own stream has already ended while the turn runs on gets the screen line: the app is done, the screen is not.

### 4. Verified by unit tests alone

The existing test re-pointed at the screen line, and one new test for the borrowed app line. No live look; the dry run in 18.4 is the live check if the situation arises on the way.

## Invariants

- The hold-back rule is untouched: which clicks are held back, and when, stays as it is.
- The client design record is rewritten in the same session as the words change.
