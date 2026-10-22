# Task 15.10 — Dev harness

Sub-task 15.10 of Phase 15 (`_dev/docs/spec/phase-15-store-loop.md`, its scope's dev harness): the end-to-end coverage of the store loop — the offer and the update tile in the slot — with the visual specs and an end-to-end test of per-paint builds, and the test debt the phase's earlier sub-tasks left: the snapshot world's update states naming their new permissions, beat 7, and the specs still drawing the capability tile.

## Scope

- Published apps left uninstalled for the loop.
- The live suite's stories of the loop.
- The replay suite's visual specs of the slot's states, over recorded beats, synthetic beats and the snapshot world.
- An end-to-end test of per-paint builds.
- The snapshot world's update states naming their new permissions.
- Beat 7 re-recorded on today's Planner, and the specs still drawing the capability tile moved to the offer and its lines.
- Out: the acceptance items through the tunnel, the update tile live and the kit's two catalog ids (task 15.11); the READMEs and design records (task 15.12).

## Locked decisions

### 1. Two suites, each with its job

As task 14.10 split them. The live suite — a real orchestrator, the live Planner, the marketplace — drives the loop's real flows, each once end to end. The replay suite — the built client on the preview server, no orchestrator — carries every state of the slot as a visual spec over the fixed snapshot world.

### 2. Published apps left uninstalled

The launcher gains an option, under its publish, that publishes named apps and leaves them uninstalled. The live suite's stack and task 15.11's tunnel run both use it.

### 3. The live loop on Calendar

Calendar joins the live stack, published and left uninstalled. A question gathering from Gmail and GitHub that also needs a calendar: Calendar offered in its slot beside the merge reserved over them; Install through the consent card over the slot; Calendar's sign-in tile and its real sign-in window; the slot filling and the merge taking Calendar in. The story uninstalls Calendar at its end.

### 4. "More in the Store" and "Show it here", live

A second live story: "More in the Store" from a canvas's offer of Calendar, Calendar installed on the Store page, the slot filling beneath it; another canvas's slot offering Calendar turned to "Show it here" and pressed. Nothing to offer, the install ask and the update tile are not live.

### 5. A visual baseline per board

One baseline per board of the UI reference canvas *Store loop — UI reference* (https://claude.ai/artifact/AzEEqot8FAFyeHLgedM1Bo), light theme.

### 6. Recorded where the Planner writes, synthetic where the orchestrator paints

What the Planner writes reaches the replay suite through recorded beats, recorded through the Install and `useApp` presses so the fill replays. What the orchestrator paints on its own — the update tile's lines and states, "Couldn't reach the Store." — reaches it through synthetic beats. The update tile's synthetic beats are Shop B's: Update straight through on the world's own state; the update that asks for more naming a permission on Shop B's update state for that test alone; the slot's Retry after Update a press the beat answers.

### 7. The recorded beats

Five, on today's Planner with the marketplace up, the apps set up through decision 2's option:

- Shop B offered beside Shop A — Shop A installed, Shop B not — through Install, Shop B's key connect as the second step, and the fill with the merge taking Shop B in.
- Both shops offered, neither installed, stopping at the offer.
- The install ask with no request, through to the installed line.
- The install ask with a request, through the connect and the fill.
- Beat 7 (decision 8).

Each utterance is fixed at recording. The beats pass the fixture privacy check.

### 8. Beat 7 and the capability tile

Beat 7 keeps its utterance, "Book me a flight to Tokyo next Friday.", and is re-recorded on today's Planner as the nothing-to-offer line; the client's replay of the recorded beats takes it back in. The specs still drawing the capability tile move to the line: the canvas-surface spec's beat 7, the shell-surface spec's tile test and its baseline, and the ways-in spec's capability tile, which gains "More in the Store" and an offered app's name as ways into the Store.

### 9. The snapshot world's update states

Calendar's major update and Shop B's retired line carry an empty list of new permissions, as the orchestrator computes them from their unchanged cards; the world's legality test passes again. The update that asks for more stays CircleCI's card update. The trusted-page tests failing beside the legality test pass on the legal world; one that does not is a finding.

### 10. Uninstalled per test

The offer's tests narrow the world's installed apps for that test alone — Shop B, or both shops — and answer the read after Install with the app included. The fixed world and its baselines are unchanged.

### 11. Per-paint builds over a second build of Shop A

The snapshot gains a second build of Shop A's catalog, one visible theme token changed, made when the snapshot is built from the pinned package and packed with Stellify; the world's table keeps naming the first. A synthetic beat paints Shop A in the first build, then a new paint in the second: the surface on screen keeps the first build's mark and look, the new paint takes the second's.

### 12. Carried from task 14.10

The live suite's marketplace and dev publisher are its own, on scratch state. Each story leaves the stack as it found it. The live suite asserts no journal lines. Variants are made from built output.

### 13. Done

The whole replay suite and the whole live suite pass, today's failures on `main` among them. Each new baseline is compared against its board on the UI reference canvas, and the differences are listed before the task lands.

### 14. Notes for later sub-tasks

`_dev/TODO.md`: 15.11, its tunnel run set up on decision 2's option; 15.12, the launcher's new option and the client README's line on which recorded beats need the marketplace.

## Invariants

- The developer's own publisher file, marketplace and apps checkout are never touched by a run.
- No app is built in this repo, and nothing made for a variant is committed.
- Records of past runs keep what they say: of the recorded beats, only beat 7 is recorded again.
