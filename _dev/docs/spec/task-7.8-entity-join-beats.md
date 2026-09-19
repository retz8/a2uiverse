# Task 7.8 — `[apps]` Entity-join beats

The entity-join turn recorded per vendor agent in live mode over this repository's pull requests: the deterministic bed for 7.9, integration and acceptance, and the recorded shapes for 7.13, the Synthesizer's pull-request worked example. Phase 7 (`_dev/docs/spec/phase-7-entity-resolution.md`) decisions 2, 3, 12 and 13; SPEC §9.4.

## Scope

- The pull-request turn recorded from GitHub, CircleCI, Linear and Gmail in live mode, on the requests of one live run.
- The pull requests, Linear links, CircleCI runs and GitHub notification mail the join needs, set up on this repository and in the apps' accounts.
- CircleCI's, Linear's and Gmail's follow-up recordings re-recorded onto the pull-request turn.
- Gmail's recording boundary letting GitHub notification subjects through.
- A write-up of what the roster shows and of the live run's synthesis.
- The deterministic bed verified through the canvas.
- Code lands in `../a2uiverse-apps/` on its `main`. In this repository only `_dev/` moves, beside the new placeholder pull request on GitHub.
- Not here: the entity-join turn as a replayable canvas beat (phase decision 13, item 9), which is 7.9's; the Synthesizer's pull-request worked example, which is 7.13's.

## Locked decisions

### 1. Recorded now, re-recorded on a changed ask

The beats are recorded before 7.13 and 7.9. They are re-recorded only if 7.9 changes what the vendors are asked.

### 2. The pull requests on this repository

#6, linked to Linear issue A2U-5 by its branch name, and #7, linked to A2U-6 by "Fixes A2U-6" in its description, stay as they are. One new placeholder pull request is added, not meant to be merged, with no Linear issue. A2U-7 stays the Linear issue with no pull request.

### 3. The new pull request fails CI

Its change carries a deliberate formatting violation, so its CircleCI run fails. #6 and #7 stay green.

### 4. The new pull request's topic

Its topic is one no Linear issue covers.

### 5. Gmail's threads are real GitHub notification mail

GitHub's email notifications for participating activity, with "Include your own updates", are turned on and delivered to the mailbox the Gmail agent reads. Real activity gives each of the three pull requests its thread: opening the new pull request, and a comment on #6 and on #7. No mail is written by hand.

### 6. The utterance never changes

The live run uses the pinned utterance, "where do my pull requests stand?". If its plan carries no merged view, no join hypothesis, or a dispatch list other than GitHub, CircleCI, Linear and Gmail, recording stops: the gap is fixed in the orchestrator as a change of its own, outside this task, and the live run is repeated.

### 7. The prompts are the Planner's requests

The per-vendor requests of that live run are read from the intent journal and pinned verbatim as the beats' prompts.

### 8. What GitHub answers is recorded

GitHub's answer is recorded as it comes, pull requests outside `a2uiverse` included.

### 9. The pull-request turn is the replayed text answer

For all four agents the pull-request turn becomes the one text answer their deterministic mode replays. The "today" recordings stay committed, so the temporal merge's replay can be rebuilt from them.

### 10. The follow-up chains are re-recorded onto the pull-request turn

With their real side effects accepted: CircleCI's open run, open failed job, rerun proposal and confirm, on the new pull request's failing run; Linear's open issue and status change; Gmail's open thread and reply proposal. The follow-up prompts stay as they are, unless one is a no-op against the current state. Gmail's labels recording stays as it is.

### 11. GitHub gets no follow-up

A tap on a GitHub row on the deterministic bed stays an unhandled event. The write-up records it.

### 12. Gmail's recording boundary passes GitHub's notification subjects

Threads from GitHub's notification sender keep their real subject and show the sender as GitHub. Snippet, body and every address stay scrubbed. The publishability test accepts that one sender. Gmail's live behaviour, prompt and domain doc are untouched.

### 13. The model

The beats are recorded on `gemini-3.7-flash`. A vendor that does not show the field its cue needs is re-run once on a stronger model as a diagnostic, read into the write-up and not committed.

### 14. The write-up

Per app: what it showed for the fields its request asked for, and whether each cue picks out the right pull request. The live run's synthesis as observed, read from the journal: its outcome, attempts, match claims and their relations, home source, and dead air. Nothing in it is acted on in this task.

### 15. Done

The beats recorded and committed, the deterministic corpora derived from them, the apps repo's gates green, the write-up written, and one deterministic composed pass through the canvas over the tunnel in which the pinned utterance paints all four fragments. The pass judges nothing about the merged view.

## Invariants

- Nothing a2uiverse-specific reaches the vendor wire; the Planner's requests are plain prose.
- No vendor prompt, domain doc, tool policy, agent card, or live-mode code changes for the merge.
- The canned corpora are derived from a live run, never authored.

## Open items

- Whether phase decision 2 ("the pull requests are those of the `a2uiverse` repository") is amended, decided with the recording in hand.
