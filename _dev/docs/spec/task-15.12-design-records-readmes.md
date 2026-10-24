# Task 15.12 — Design records + READMEs

Spec for sub-task 15.12 of Phase 15 (`_dev/docs/spec/phase-15-store-loop.md`, decision 20): `docs/design/store-loop.md`, the store loop's record over one running example; the records the phase changes; every README in both repos; every amendment task 15.11's decisions call for; the design canvas's boards those decisions change.

## Scope

- `docs/design/store-loop.md` over one running example, with captures.
- The other design records: each one's own mechanism the phase added, and its part of the store loop linking to `store-loop.md`; task 15.11's decisions carried into every record they change.
- Every README in `a2uiverse` and `a2uiverse-apps`.
- The amendments task 15.11's decisions call for in SPEC.md, the phase spec and the earlier sub-task specs.
- The boards of *Store loop — UI reference* that task 15.11's decisions change.
- `_dev/TODO.md`'s 15.12 line restated to this scope.

## Locked decisions

### 1. A record of its own

`docs/design/store-loop.md` tells the store loop end to end: the Planner's use of the Store's tools, the offer and the install in the slot, the update tile on the canvas, per-paint builds and the kit's two catalog ids.

### 2. The running example

One camera comparison canvas, on the deterministic roster:

1. "Compare camera prices at Shop A and Shop B.", asked with Shop A installed and Shop B published and not installed: the merge reserved over Shop A, Shop B offered in its slot with Install.
2. Install through the consent card in the slot; Shop B's key connected as the second step.
3. The slot filling, and the merge taking Shop B in on arrival.
4. Shop A's 0.2.0 card naming its old catalog id beside a new one, published: Shop A painting in the old id with no tile, the App Library offering a suggested update.
5. Shop A's 0.3.0 dropping the old line, not published: a Retry reaching it, the call ending with no surface, the card fetched again, and "Shop A has changed, and the Store is waiting on its publisher" with Check again.
6. 0.3.0 published, retiring the old line: "Shop A needs an update to show this.", Update straight through, the slot sending its request again and Shop A repainting in the new build while the surfaces on screen keep the old look; an older canvas's Shop A slot waiting on the same update turning to "Show it here".

### 3. A fresh run, with captures

The example is run afresh through the tunnel on a scratch marketplace and orchestrator state, launched with Shop B published and left uninstalled, the Planner on `gemini-3.8-flash`; the developer's own state is left as it is. Shop A's 0.2.0 and 0.3.0 cards are a temporary edit in `a2uiverse-apps`, reverted and never committed. Every id, version and line in the example is the run's.

Captures are taken through the tunnel with Claude in Chrome, one per step of the example, into `docs/images/`, and one GIF of the install in place: the consent card in the slot, the slot filling and the merge taking Shop B in. Fake accounts only. The side cases have no captures.

### 4. The side cases

Each takes a short section of its own outside the example:
- A sign-in app offered: Calendar installed from its slot, then its sign-in tile, the install's consent and the sign-in two consents.
- "More in the Store" and "Show it here": an install on the Store page opened from a slot filling that slot beneath the page, another canvas's row for the same app turning to "Show it here".
- Nothing to offer, and the install ask: the two quiet lines with "Search the Store", chosen from the orchestrator's own record of the tool call; "Install Shop B." with and without a request, "From the Store:" alone when the plan asks nothing.
- The update that asks for more: CircleCI ahead of the Store with a new permission taking the waiting line, not the needs-more-access tile; once published, Update through the consent card in the slot, then the needs-more-access tile as a second step.
- The slot's refusals: the update tile's two lines with no Store answer, "This app isn't installed anymore." with Retry and no reinstall, an install refused on its row in the Store's words.
- A past canvas and the way back after a new build: Linear's newer build answering an action pressed on a past canvas, the fragment's back arrow returning to a paint keeping the old look.

### 5. What `store-loop.md` carries and what the other records keep

`store-loop.md` carries the story, the running example, the side cases and the decisions of the loop as a whole. Each part's record holds its own mechanism at its own depth, in the section where that machinery lives, a short "Store loop on the …" section linking to `store-loop.md`, and its stale lines fixed:
- `orchestrator.md`: the Planner with the Store's tools and the plan check; the update check before every dispatch and the catch after the call; the stamp naming builds.
- `client.md`: per-paint builds and the move on a change in place; the one holder of the installed apps and each app's running install or update; the consent card over a slot; the Store page tied to the slot it was opened from.
- `shell-catalog.md`: the offer and the update tile with their props, in place of the capability tile; the new handler and context.
- `app-install.md`: the set of builds per canvas and its decision row.
- `agent-kit.md`: the card naming an old catalog id beside a new one.
- `marketplace.md`: the tool set the Planner reaches it through.
- `authority.md`, `synthesis.md` and `trusted-page.md`: a few lines each — the sign-in as the second step, the merge taking an installed app in on arrival, the Store page opened from a slot.

### 6. Every one of task 15.11's decisions is carried

Task 15.11's decision 5 and decisions 23–51 are each checked against SPEC.md, the phase spec, every earlier sub-task spec, every design record and every README, and amended wherever a statement it replaces stands. `_dev/TODO.md`'s list for 15.12 is the floor.

An amended decision in a spec keeps its text, with an `*Amended by task 15.11 decision N.*` paragraph under it stating the decision as it now stands.

### 7. The design canvas's boards that task 15.11 changed

*Store loop — UI reference* is amended on the boards task 15.11's decisions change, and only those: "From the Store:" alone (decisions 32 and 36), Check again on the waiting line (39), "is updated" with Show it here (40), "isn't in the Store anymore" on the refused install (44), and the offer at most the Store page's column wide (46). Each amended board carries a note naming the decision it follows. The canvas is read before it is touched.

### 8. Every README, in both repos

Every README in `a2uiverse` and `a2uiverse-apps` is checked against the code as it stands and every stale line fixed. `_dev/TODO.md`'s named items are the floor: the client README's builds a canvas keeps, which recorded beats need the marketplace, beats 31 to 34 recorded over the mock roster launched with Shop B left uninstalled, and the replay's `&byhand`; the sdk README's stamp row naming `builds` and the refusal words; the shell catalog README's offer in place of the capability tile, and its new handler and context; the launcher's option publishing apps left uninstalled.

### 9. A fault found is fixed on the spot, worked on `main`

A fault the fresh run or the check against the code finds is fixed on `main` with its test, and added to this spec as a numbered decision with what it replaced. A point asking for something a later phase builds is recorded in that phase's notes in `_dev/TODO.md`.

The work is done directly on `main` in both repos, with no worktree.

### 10. A step back restores the merge made over its paints

The orchestrator's memory of the merged view, filed per combination of the paints on screen, keeps a copy of the merge's set: a source leaving the merge afterwards — its press failed, its slot taking a tile — leaves the entry filed before as it was. Replaced: the entry holding the composition's own set, which the failed press emptied of Shop A, so a step back to the paint the press had failed on, after Show it here repainted Shop A, said "Only Shop B answered, so there's nothing to combine." with Retry Shop A beside Shop A's answer.

### 11. A Retry answered on the surface its failure took down shows on it

A failed slot's fragment leaves the canvas as a copy. Once a Retry makes the slot pending again, an answer the app gives on that surface rather than a fresh one brings it back from the copy into its slot, the answer landing on it, and the way back returns to it again. While the slot stands failed, a message for it is still dropped. Replaced: the answer dropped as a late message, Shop A's slot on "Loading…" for good after its Retry sent "open camera" again and Shop A answered on its list's surface, the merged view's Shop A cells absent (task-8.5 decision 3's "a retried answer lands fresh").
