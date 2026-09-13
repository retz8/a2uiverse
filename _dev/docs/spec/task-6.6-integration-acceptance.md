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

## Found and fixed during the run

- **Two headings over a merged view.** The Planner's rules told it to frame the screen with "a heading that restates what was asked", and the Synthesizer's guidance gives its view an `h3`; every merged screen carried both ("Comparing camera prices" over "Camera Prices in Shop A and Shop B"). The Planner's rule now reads: a screen made of slots carries no heading of yours, since the shell labels every agent's slot and the merged view arrives with its own title; `Text` only where the shell has words of its own. The fan-out worked example loses its heading. Re-run on the mocks: the Planner's tree was the merged view's slot over the two shops' row and nothing else, the screen titled once by the Synthesizer. Re-run on the real roster through the recorder: the temporal merge's tree the same shape over three sources, Planner 3.4 s, one attempt, the layout on the client at 3.4 s and the first fragment at 16.9 s.

- **A reader called and not written from.** The mixed utterance called `installed_apps` on every run and wrote its result on some; "What can I do here?" called `this_canvas` and wrote none of it. The Planner's rule now reads: a reader you called is a reader you write from, and a result you would not write is a call you do not make; the mixed-utterance sentence says the shell's words come from the reader, beside the agent's slot. Re-recorded as beat 8: Calendar's description, a skills table bound through the data model, and the Calendar slot; the replay spec asserts the skill names, which are the card's.

The run's other additions: `planMs` on the journal's plan record and a per-turn log line; the recorder's layout and first-fragment offsets; beat 4 re-recorded as the side-by-side, beat 8 recorded for the mixed utterance, their replay specs and the beat 4 baseline; the client README's beat rows.

## Evidence

Run on 2026-09-13 over the live roster (GitHub · Gmail · Calendar, `--mode live`, the Gmail pseudonymizer armed), Planner and Synthesizer on `gemini-2.5-flash` at low effort. The recorder drove the orchestrator on `localhost`; the browser drove it through the tunnel with Claude-in-Chrome. Every plan was accepted on the first attempt, so decision 6's rerun at default effort never triggered.

**First paint.** The Planner's interval from the journal (`planMs`, the shortlist included), and the recorder's client-side offsets where it drove the run:

| Utterance | Planner interval | Layout on the client | First vendor fragment | Turn |
|---|---|---|---|---|
| "What needs my attention today?" (recorder) | 3348 ms | 3357 ms | 19167 ms | 49.6 s |
| "What needs my attention today?" (browser) | 3666 ms | — | — | 55.4 s |
| "Put my inbox and my calendar side by side." (recorder) | 2700 ms | 2714 ms | 17902 ms | 34.7 s |
| "Put my inbox and my calendar side by side." (browser) | 2413 ms | — | — | — |
| "What can I do with my calendar?" (recorder) | 4098 ms | 4101 ms | none painted | 10.6 s |
| "What can I do with my calendar?" (browser) | 6375 ms | — | — | — |
| "What apps do I have?" | 5982 ms | — | — | 6.0 s |
| "What can I do here?" | 4222 ms | — | — | — |
| "How do I add apps?" (twice) | 4782 ms · 4279 ms | — | — | — |
| "What's on my screen?" | 6683 ms | — | — | 6.7 s |
| "Book me a flight to Tokyo next Friday." | 1927 ms | — | — | — |
| "Show me the open pull requests on a2ui-project/a2ui that need review." | 2379 ms | — | — | — |
| "Compare camera prices across both shops" (mocks, deterministic) | 3222 ms | — | — | 22.5 s |

The number of decision 5 is the temporal merge's: 3.3 s to 3.7 s on the orchestrator's clock, the layout on the client 9 ms behind it. The first vendor fragment follows fifteen seconds later; the screen settles after fifty. A platform answer is the whole answer and takes 4 s to 7 s of blank canvas. The wire and render add nothing measurable on `localhost`.

**Item 1, the platform questions.** Each answered in `shell:main`, no vendor dispatched, the journal naming the reader:

- *"What apps do I have?"* — `installed_apps`; a `Table` bound over `/apps` in the literal data model, three rows, and a "Manage apps" button raising `openAppLibrary`. Pressed: the App Library placeholder overlay (`data-page="appLibrary"`), the journal line `openAppLibrary on surface shell:main in shell`, payload `{}`, closed in 10 ms.
- *"What can I do here?"* — answered from the platform's card as three labelled items (ask several apps, a merged view, past interactions) in a `DataList`. The Planner also called `this_canvas`, which the utterance did not need; it read the previous turn's composition, no slots.
- *"How do I add apps?"* — `installed_apps`; a heading, one sentence, and two buttons, "Open the Store" (`openStore`, no query) and "Open the App Library". The Store button pressed: the Store overlay (`data-page="store"`, no query). Its report to the journal is the first finding below.
- *"What's on my screen?"*, asked after the temporal merge — `this_canvas`; the reader returned the utterance, three slots `arrived`, `mergedView.state: live`; the answer bound it through the data model: "You asked", "Merged view: live", a three-row table of app and status, a "Manage apps" button.

**Item 2, the mixed utterance.** Both runs dispatched Calendar with the utterance forwarded verbatim and called `installed_apps`. The recorded run (beat 8) wrote a heading, "Your Calendar", above the slot and nothing else from the reader. The browser run wrote the slot under a heading and, beneath it, a `Card` of "What it can do" and the four skills from the reader. Calendar answered in prose both times ("You can view your schedule, check for conflicts, propose and create new events…") and painted no surface, so its slot rests on the prose. The Planner's share of the layout varies run to run; the vendor's answer to a capability question is prose.

**Item 3, the gap.** No reader, no dispatch, the tree one `Slot` with `gap: "flight booking"`, the tile's line and button, no shell prose. The tile's button: the Store overlay with `data-query="flight booking"` and "Searching for “flight booking”".

**Item 4, regression.**

- *Temporal merge, browser.* A heading, the merged view's `Slot` above a `Row` of three weighted vendor slots; all three arrived; the Synthesizer's document on one attempt, dead air 17.7 s; Gmail and GitHub on one time axis, Calendar in its own table beneath with a sort control. The note: Calendar's times carry no date, so Calendar is grouped apart, and two events judged not to need attention were left out.
- *Single-agent turn.* One GitHub slot under the heading "Open pull requests on a2ui-project/a2ui", the fragment attributed; live GitHub had no open review requests that day.
- *Side by side, browser.* A `Row` of two weighted slots, no shell slot: Gmail at x=16 and Calendar at x=433 with the same top edge, the control prompt side by side. The replay spec on beat 4 asserts the row by bounding boxes; the baseline shows it.
- *Mock comparison, deterministic.* A heading, the merged view's `Slot`, a `Row` of the two shops; the Synthesizer's second attempt was accepted after the first referenced a camera Shop B does not stock, the validator's catch; the merged `Table` over three shared cameras with a Shop A price sort, dead air 19.2 s.

**Item 6, the vocabulary checks.** The four rejections are the tests in `apps/orchestrator/test/plannerValidate.test.ts`: "Attribution, Frame and a formula view are unknown components; openUrl an unknown function" (the model-authored `Attribution` and the unknown action), "a formula leaf and a ref, anywhere in the model, are refused by path" (the formula in `shell:main`), and "every dispatch entry has exactly one Slot, and every Slot a dispatch entry" (the missing source `Slot`). The suite ran green in the gate.

**Fixtures.** Beat 4: 69 batches, 34.7 s. Beat 5 re-recorded after the heading fix: 110 batches, 52.5 s, no Planner heading. Beat 8 re-recorded after the reader rule: 4 batches, 15.3 s, the Planner 5.4 s. All three replay green. The pseudonymizer was armed and the new fixtures carry `example.com` addresses only; `check:fixtures` was not run, since its forbidden-string list is not in the session's environment.

## Findings, not fixed

- **A shell action's report through the tunnel is delayed or lost.** Four presses: the App Library button's report arrived in 1 s; the Store button's first press hung as a fetch for 100 s and never reached the orchestrator, nothing logged, nothing journaled; its second press reached the orchestrator 40 s after the press and was journaled; the tile's press failed in the console with `shell action report failed TypeError: Failed to fetch` about 110 s after the press, never arriving. Every utterance sent through the same tunnel arrived at once, and the recorder's turns on `localhost` matched the orchestrator's timings to the millisecond. The report goes out on the side channel as a streaming `message/send` like an utterance; what differs is only that the orchestrator answers it with a final status in milliseconds. The same shape as the "Failed to fetch after about seventy seconds" item in the backlog, seen three times in one session on the side channel alone; the backlog item is amended with these timings. Disposition: the report path is verified in code — the client's turn-runner tests and the orchestrator's shell-action turn test — not in the browser; item 1's "raising its action into the journal" rests on those and on the one press that landed live.
- **The mixed utterance's shell content varied** between a bare heading and the reader's card, and "What can I do here?" called `this_canvas` for nothing; both fixed above by the reader rule. Variance in the model's output beyond that is normal and not chased.
- **Three weighted slots on one row squeeze the GitHub fragment.** At the tunnel browser's 868 px width the temporal merge's `Row` gave each vendor a third of the width, and Primer's pull-request list broke its title and labels one character per line. Equal weights are the Planner's choice; a fragment's minimum width is not known to it.
- **A streamed component is validated before it is whole.** On the side-by-side turn the console logged `Validation failed for component 'Text' (thread-subject): text: Invalid input` during Gmail's progressive apply. The recording shows why: Gmail's first `updateComponents` carried `{"id":"thread-subject","component":"Text"}` with no `text` yet, and the next batch completed it with `text: {path: "subject"}`. The partial component fails the catalog's schema, the whole one passes, the inbox list rendered. The progressive apply's cost, not a vendor value; left as it is.
- **Calendar's times carry no date**, so the Synthesizer grouped Calendar apart on the temporal merge, as 5.7 saw. The S1 property held.
- **Two headings over a merged view.** The Planner titles the screen ("Comparing camera prices", "Your attention today") and the Synthesizer titles its document beneath it ("Camera Prices in Shop A and Shop B", "Needs attention today"); neither author sees the other's. Before Phase 6 only the Synthesizer's existed. Disposition open: the platform UI guidance could tell the Planner not to title a screen that reserves a merged view, since the merged view titles itself and the vendor panels carry their attributions.

## Streaming decision

Deferred. The Planner's interval on the temporal merge is 3.3 s to 3.7 s against a 15 s wait for the first vendor fragment and 18 s of dead air, so streaming the layout would move the blank canvas by a few seconds of a fifty-second turn; the platform answer's 4 s to 7 s is where it would show most. No streaming sub-task is added to Phase 6; the item and its numbers go to the backlog.
