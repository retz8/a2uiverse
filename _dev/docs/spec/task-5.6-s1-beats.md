# Task 5.6 — `[apps]` S1 beats

The "today" turn recorded per vendor agent in live mode, giving the temporal merge a deterministic replay bed. Phase 5 (`_dev/docs/spec/phase-5-heterogeneous-shapes.md`) decisions 10 and 11; SPEC §3 (S1), §4.4.

## Scope

- The today turn recorded fresh from all three vendor agents — gmail, calendar, github — in one sitting, in live mode.
- github's deterministic text path brought onto the kit's fixture responder, so all three agents answer the today turn deterministically.
- What the real roster paints on that turn written up as a finding, including the §4.4 verdict where a vendor offers no usable time or id.
- The deterministic bed verified to paint before it is handed to 5.7.

All work lands in `../a2uiverse-apps/` on its `main`. In this repo only `_dev/` moves: this spec, the handoff, the TODO tick.

## Locked decisions

### 1. All three are recorded fresh in one sitting

Not github alone, and not new beats recorded alongside the existing ones. gmail's and calendar's today beats already exist but were recorded in a different sitting against a different day; the temporal merge needs one coherent "today" across the roster.

### 2. The prompt is the real Planner's request

A vendor never receives the user's utterance — it receives the Planner's per-agent request, which when a merged view is planned also asks in plain words for the identifiers and times the merge depends on. The composed turn is run live once, the three requests are read out of the intent journal, and those are pinned verbatim as the beats' prompts. Recording then runs through the normal driver, so what is committed is reproducible and what it reproduces is a request the Planner actually wrote.

### 3. github's deterministic text path converts to a fixture responder

The hand-authored echo/ack chat surface inherited from the a2ui-github chat shell is replaced by the kit's fixture responder over the recorded digest, matching gmail and calendar. This is not a decision-10 breach: what moves is the replay harness, not what GitHub does. No prompt, domain doc, tool policy, agent card, or live-mode code is touched, and the content is the vendor's own unmodified live answer.

### 4. The beats recorded are gmail 1–4, calendar 1–4, github 8

Each vendor's deterministic corpus is stitched together by id — the drill-down and toggle fixtures reference entries from the digest — so re-recording the digest alone leaves those fixtures acting on entries that are no longer on the screen. github has no tracked beats and its action fixtures were never id-coherent with any digest, so its today beat alone is the whole job. The real side effects of the write beats are accepted.

### 5. Only the today beat carries a Planner-voiced prompt

gmail 2–4 and calendar 2–4 keep their existing human follow-up prompts. Their purpose is to produce the action-response fixtures, and the deterministic executor's action path never sees a prompt.

### 6. The roster is taken as it is

The calendar is seeded, which is already its documented pre-record step. Nothing else is staged — not the mailbox, not the notification feed. A source that returns empty is recorded empty and written up as the §4.4 finding; content is never manufactured to fill it.

### 7. The task records, it does not act on what it finds

The sdk's `TODAY_TIMELINE` example, the operator set, and 5.7's scope are left as they are. Where the finding calls for a disposition — correcting the example, reopening decision 19, accepting the §4.4 fallback — the options are named in the finding and the decision is taken with the real data in hand.

### 8. The utterance escalates only if the plan carries no merged view

The composed turn is driven first with the plain today utterance the existing beats carry. Only if the Planner writes no shell slot is it re-driven with an utterance that names the timeline. Whichever produced the plan is pinned alongside the three requests, and which one was needed is itself recorded.

### 9. The committed corpus is recorded on the default rung

`gemini-3.7-flash`, the rung pinned in every agent's environment and the one every committed beat carries. A vendor that paints no usable time or id is re-run once on a stronger rung as a throwaway diagnostic, read into the finding and not committed, so the finding can separate a roster ceiling from a model ceiling.

### 10. github gains a derive script

github's recorded stream reaches its deterministic fixture through a `derive_corpus.py` of its own, deterministic half only — its stub fixtures already exist and are not regenerated. A hand-extracted fixture would leave canned data whose relationship to a real run cannot be re-established.

### 11. The task ends with the bed verified

Done means the beats recorded and committed, github's responder and derive script landed, the apps repo's gates green, the finding written, and one deterministic composed pass driven through the canvas over the tunnel confirming the three fragments paint. That pass asserts nothing about the merged view.

## Invariants

- Nothing a2uiverse-specific reaches the vendor wire; the Planner's request is plain prose.
- No vendor prompt, domain doc, tool policy, agent card, or live-mode code is changed for the merge.
- The canned corpora are derived from a live run, never authored.

## Open items

- The finding's disposition — whether `TODAY_TIMELINE` is corrected, decision 19 reopened, or the §4.4 fallback accepted — is decided after the recording, outside this task.
