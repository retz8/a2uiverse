# Task 15.7 — The kit's two catalog ids

Sub-task 15.7 of Phase 15 (`_dev/docs/spec/phase-15-store-loop.md`, decision 14), `[apps]`: the agent kit's card naming an old catalog id beside a new one, each answer painted in whichever of them the hub advertises for the app, so a kit app ships a breaking catalog change as a suggested update. Lifts the one-id limit task 13.8's decision 6 recorded. SPEC §9.1 already states it. This spec fixes how.

## Scope

- The id a turn is painted in: a new surface, an action on a surface on screen, an action on a surface whose id the kit cannot paint in, a request with no capabilities, a request naming neither id.
- What a kit app declares for its old line, and what that line carries.
- The kit's tests and its README.
- Out: every app in the roster, the scaffolder, the hub, the A2UI wire, SPEC and its protocol delta register, the design records.

## Locked decisions

### 1. A new surface is painted in the newer id

When the hub advertises both ids, a new surface is painted in the newer one, by the kit's own order, not the order the hub lists them in.

### 2. An action's turn is written in the pressed surface's id

A turn answering an action on a surface on screen is written whole in that surface's id — a change to it in place and any new surface the turn paints alike. A text request — a new question, or a Retry sending the plan's request — is answered in the newer id.

### 3. A surface's id the kit cannot paint in falls to the newer advertised id

When the kit knows the pressed surface's id and cannot paint in it — no line held for it, or the id not advertised — the turn is painted in the newer advertised id, as a fresh surface in the model's modes; the deterministic answers stay the app's own, in place or not. A surface whose id the kit does not know — painted before the agent last started — is answered in the newer advertised id as today, a change in place allowed.

### 4. No capabilities: the newer id

A request carrying no client capabilities is painted in the newer id, as today.

### 5. Neither id named: no UI, one fixed sentence

A request whose capabilities name neither of the kit's ids gets no UI, as upstream's catalog negotiation has it: the kit answers with one fixed sentence of its own, naming the app by its card's name — "Shop A has changed and can't show this here." — alike in every mode, with no model call.

### 6. Exactly one old line beside the new

A kit app names at most one old line beside its current one. The current config's catalog fields stay the new line; one optional addition names the old line. Retiring the old line is deleting it. The card lists both ids, the newest first. The kit refuses to start when the old line's id is the new line's.

### 7. The old line carries everything that names its catalog's components

The old line carries its catalog schema with its kind, its examples, its brand guidance, its question policy and its deterministic answer pair. The identity, the role and workflow prose, the domain doc, the tools, sign-in and the model are shared by both lines.

### 8. The kit only

15.7 changes the kit alone, proven by the kit's own tests over fixture catalogs. No app in the roster changes. Phase decision 19's seventh item is 15.11's: its run makes Shop A's breaking catalog change for the run through the kit's old line, in place of task 13.8's temporary patch.

### 9. The kit README, with the code

The kit README gains the old line's field in its quick start and a short section on shipping a breaking catalog change — the current line moved to old, the new one added, the old retired by deleting it. The design record's mention is 15.12's, noted there as found in 15.7.

## Invariants

- Nothing on the A2UI wire changes: the card lists its ids and each surface's id is chosen at its creation, as A2UI's catalog negotiation already has it.
- The hub stays as it is, advertising the ids the installed card names.
