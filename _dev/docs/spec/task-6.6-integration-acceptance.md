# Task 6.6 — Integration + acceptance

Spec for sub-task 6.6 of Phase 6 (`_dev/docs/spec/phase-6-shell-as-agent.md`): the phase's acceptance run — phase decision 10's six items over the real roster live through the tunnel, first paint measured for the first time, and the streaming decision of phase decision 9 taken against the number.

## Scope

- The rule for what the run does with a defect it finds.
- What first paint means, where it is measured, and which run's number the streaming decision reads.
- The Planner's effort level for the run.
- The utterances and beds behind each acceptance item, and which become recorded beats.
- How the run is driven and how it is written up.
- The two handoff notes dropped from the item list.

## Locked decisions

### 1. Defects follow the 5.7 pattern

A defect that is a wrong decision or touches a component's contract becomes a new numbered sub-task placed before 6.6, and 6.6 pauses on that item until it lands. A local bug with an obvious fix is fixed inside 6.6's own branch. Anything not blocking an acceptance item goes to the backlog with its evidence.

### 2. First paint is the layout painting

The interval from the utterance sent on the canvas to the canvas showing the Planner's `shell:main` tree, slots pending, nothing from vendors yet. The first vendor fragment's instant is recorded beside it on the same runs. Dead air is not re-measured; the backlog holds it.

### 3. Two clocks; the journal's number decides

The plan record gains a timing field in the journal, the way the synthesis record gained its dead-air interval: the Planner's own interval, utterance received to the tree accepted. The beat recorder's existing per-event stamps give the client-side reading on the runs it drives, recorded beside the journal's number to show what the wire and render add. The streaming decision reads the journal's Planner interval.

### 4. No pre-set threshold

The number is recorded and the streaming decision is taken in chat against it, with the prior that the Planner's output will be streamed eventually. If the number calls for it, streaming becomes sub-task 6.8, ordered before 6.7 so the design records describe the Planner as it ends the phase. If it does not, the item stays a later note.

### 5. The temporal merge's interval is the number

"What needs my attention today?" produces the heaviest tree the Planner writes on the real roster, so its interval is the number the decision reads. Every other acceptance run's interval is listed beside it; no statistic is taken across them.

### 6. The Planner stays at low effort

The acceptance runs at low. An utterance is rerun at default effort only if it needs a validation retry or breaks the turn. The Synthesizer's effort is not a Phase 6 item; a backlog line records the view that the Synthesizer, not the Planner, is the call where thinking would pay, so it is taken up with the streaming discussion.

### 7. Beat 4 becomes the side-by-side control prompt

The Planner reserving a merged view for "What needs my attention this morning?" is a correct reading, not a defect. Beat 4 is re-recorded with 5.7's control prompt, "Put my inbox and my calendar side by side", so the fixtures keep one layout-only fan-out and the control prompt's evidence is a replayable fixture.

### 8. One new beat, the mixed utterance

"What can I do with my calendar?" is recorded as a new beat: a vendor slot and the shell's own prose in one layout, a shape the fixtures do not hold. The three remaining platform questions are beat 6's shape behind a different reader and stay journal evidence. Beats untouched by 6.6 are re-recorded only if a fix changes what reaches the wire.

### 9. The model's Store button is checked, not forced

"How do I add apps?" is run live and checked for a Store button; if present it is pressed and the journal line and overlay recorded. If absent, that is a finding under decision 1, not a prompt change made ahead of the run. The gap tile's button is pressed separately, since the two reach the client by different paths.

### 10. "What's on my screen?" follows the temporal merge

The question is asked after "What needs my attention today?", so the canvas reader projects three vendor slots and a merged view's state.

### 11. The regression utterances

The single-agent turn is beat 1's utterance, "Show me the open pull requests on a2ui-project/a2ui that need review." The mock-roster comparison runs the storefronts in deterministic mode with 5.7's comparison utterance, one run. The temporal merge and the side-by-side are decisions 5 and 7's runs.

### 12. The vocabulary checks are the existing tests

The four validator rejections — an unknown action, a formula in `shell:main`, a model-authored `Attribution`, a missing source `Slot` — are evidenced by the four existing tests in the orchestrator's Planner validation suite, named in the write-up. No live probe.

### 13. Two drivers, each for what it gives

The beat recorder for the new fixtures and the client-side timing on the fan-out runs. The tunnel browser, driven with Claude-in-Chrome, for the platform questions, the button presses, the overlay, the mixed utterance, the gap and the regression screens. The journal is read for every run from either driver. The client-side timing is the local process's number, without the tunnel hop.

### 14. The write-up is in this spec

The run's record is written into this file under "Found and fixed during the run", "Evidence" and "Findings, not fixed", as 4.8 and 5.7 did. The numbers of decisions 2, 3 and 5 go under "Evidence" with the streaming decision written beneath them. Stills are not committed.

### 15. Two handoff notes dropped

Router ranking quality for the platform card and the check that vendor requests adapt to the utterance, both observations written into 6.4's handoff and never called for, are not items of this run and leave no note.
