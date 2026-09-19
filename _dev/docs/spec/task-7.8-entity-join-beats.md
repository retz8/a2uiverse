# Task 7.8 — `[apps]` Entity-join beats

The entity-join turn recorded per vendor agent in live mode over this repository's work — its Linear issues, their pull requests and their CI runs: the deterministic bed for 7.9, integration and acceptance, and the recorded shapes for 7.13, the Synthesizer's work-item worked example. Phase 7 (`_dev/docs/spec/phase-7-entity-resolution.md`) decisions 2, 3, 12 and 13; SPEC §9.4.

## Scope

- The work-status turn recorded from Linear, GitHub and CircleCI in live mode, on the requests of one live run.
- The pull requests, Linear links and CircleCI runs the join needs, set up on this repository.
- CircleCI's and Linear's follow-up recordings re-recorded onto the work-status turn.
- The deterministic bed verified through the canvas.
- The Planner's fan-out stance: SPEC §7, the Planner's rules doc, its examples, its model, measured live.
- The pinned utterance changed, with the phase spec and SPEC §3, §9.4 and §12 following.
- The recording's code lands in `../a2uiverse-apps/` on its `main`; the fan-out stance lands in this repository on `main`, beside the new placeholder pull request on GitHub.
- Not here: the entity-join turn as a replayable canvas beat (phase decision 13, item 9), which is 7.9's; the Synthesizer's work-item worked example, which is 7.13's.

## Locked decisions

### 1. Recorded now, re-recorded on a changed ask

The beats are recorded before 7.13 and 7.9. They are re-recorded only if 7.9 changes what the vendors are asked.

### 2. The pull requests on this repository

#6, linked to Linear issue A2U-5 by its branch name, and #7, linked to A2U-6 by "Fixes A2U-6" in its description, stay as they are. One new placeholder pull request is added, not meant to be merged, with no Linear issue. A2U-7 stays the Linear issue with no pull request.

### 3. The new pull request fails CI

Its change carries a deliberate formatting violation, so its CircleCI run fails. #6 and #7 stay green.

### 4. The new pull request's topic

Its topic is one no Linear issue covers.

### 5. Gmail holds no part

No GitHub notification mail about these pull requests reaches the mailbox the Gmail agent reads: with email notifications for participating activity and "Include your own updates" on, opening the new pull request and a comment on #6 and on #7 sent none. The plan does not dispatch Gmail, and its corpus stays as it is. No mail is written by hand.

### 6. The utterance never changes

The live run uses the pinned utterance, "what's the status of what I'm working on?". If its plan carries no merged view, no join hypothesis, or a dispatch list other than Linear, GitHub and CircleCI, recording stops: the gap is fixed in the orchestrator within this task, and the live run is repeated.

### 7. The prompts are the Planner's requests

The per-vendor requests of that live run are read from the intent journal and pinned verbatim as the beats' prompts.

### 8. What GitHub answers is recorded

GitHub's answer is recorded as it comes, pull requests outside `a2uiverse` included.

### 9. The work-status turn is the replayed text answer

For Linear, GitHub and CircleCI the work-status turn becomes the one text answer their deterministic mode replays. The "today" recordings stay committed, so the temporal merge's replay can be rebuilt from them.

### 10. The follow-up chains are re-recorded onto the work-status turn

With their real side effects accepted: CircleCI's open run, open failed job, rerun proposal and confirm, on the new pull request's failing run; Linear's open issue and status change. The follow-up prompts stay as they are, unless one is a no-op against the current state.

### 11. GitHub gets no follow-up

A tap on a GitHub row on the deterministic bed stays an unhandled event.

### 12. The model

The beats are recorded on `gemini-3.7-flash`. A vendor that does not show the field its cue needs is re-run once on a stronger model as a diagnostic, not committed.

### 13. Done

The beats recorded and committed, the deterministic corpora derived from them, the apps repo's gates green, and one deterministic composed pass through the canvas over the tunnel in which the pinned utterance paints all four fragments. The pass judges nothing about the merged view.

### 14. The Planner answers the question the user means

An utterance about the state of one kind of thing gathers from every installed app that holds part of it, whether or not the user names them. A command or lookup inside one app's object, or an utterance that names its app, goes to that app alone. The Planner is taught this as a stance in its role, beside the costs of each added agent, not as conditions.

### 15. The stance in the SPEC

SPEC §7's fan-out section states the stance. The Planner's rules doc carries it in its own words.

### 16. The Planner's examples

A minimal pair over the orders cards: "Where are my orders?" fans out over the orders example's three fixture cards, and a single-app command over the same three cards goes to the store alone. A second domain: a status question in one app's own noun, "How are my job applications going?", merged over every agent holding a part of it, with an agent holding no part left out.

### 17. The Planner's model

The Planner runs on `gemini-3.7-flash` at effort low. The Synthesizer stays on `gemini-2.5-flash`.

### 18. The stance is measured live

On the real roster, three runs each, the plan's dispatch read from the journal: "what's the status of what I'm working on?" dispatches Linear, GitHub and CircleCI with a merged view; "What needs my attention today?" fans out; "How are my CircleCI builds doing?", "What's assigned to me in Linear?" and "Open pull request #6." each stay with their app; a platform question is answered alone. It passes when every run lands on its side. Nothing is committed as a gate.

### 19. The pinned utterance

"what's the status of what I'm working on?" replaces "where do my pull requests stand?". The merged view's rows are Linear issues, the home source; a pull request with no issue is not a row. Phase 7 decisions 2, 3 and 13 and SPEC §3, §9.4 and §12 follow.

## Invariants

- Nothing a2uiverse-specific reaches the vendor wire; the Planner's requests are plain prose.
- No vendor prompt, domain doc, tool policy, agent card, or live-mode code changes for the merge.
- The canned corpora are derived from a live run, never authored.

