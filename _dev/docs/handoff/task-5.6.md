# Handoff — task 5.6, `[apps]` S1 beats

Spec: `_dev/docs/spec/task-5.6-s1-beats.md`. All work landed in `../a2uiverse-apps/` on its `main`; nothing in this repo but `_dev/`.

## Where it stands

Done. Beats recorded and derived, github's deterministic text path converted, gates green in the apps repo, deterministic composed pass verified over the tunnel. Not yet committed — `wrap-up` owns that.

- **Recorded** (live, `gemini-3.7-flash`, `A2UI_RECORD_DIR` armed): gmail 1–4, calendar 1–4, github 8.
- **Gates:** gmail 103 passed · calendar 125 · github 144 · agent-kit 232 · `pnpm verify` 18/18, exit 0.

## The utterance and the three requests

The plain **"What needs my attention today?"** reserved a merged view on the first try — the escalation branch in decision 8 was never needed. **The Planner reaches for the merged view on its own; the differentiator is not opt-in by phrasing.**

Its requests, read from the intent journal and pinned verbatim as the today beats' prompts:

- **shell** — "A merged timeline of what needs my attention today, ordered by urgency, showing the source, a brief description, and a timestamp for each item. For GitHub, Gmail and Calendar."
- **github** — "What pull requests need my attention today? Provide a brief description, and the time it was last updated, along with an identifier."
- **gmail** — "What emails need my attention today, especially those waiting on a reply or unread? Provide a brief description of the thread and the time of the latest message, along with an identifier."
- **calendar** — "What calendar events or invitations need my attention today? Provide a brief description of the event or invitation, and its start time, along with an identifier."

## The finding: what the roster paints on the shared axis

| | time field | comparable? | identifier |
|---|---|---|---|
| gmail | `time: "2026-09-05 01:24 UTC"` | yes — absolute, date + time | `id` |
| github | `updatedAt: "2025-08-10T09:25:10Z"` | yes — ISO 8601 | `number` + `repository`, no single id field |
| calendar | `when: "11:00"`, `"11:00 – 12:00"` | **no — time of day, no date; ranges for clashes** | `id` |

**Calendar is the §4.4 fallback.** Asked in plain words for "its start time", it returned a start time — a wall-clock one, with no date and sometimes a range. Ordering it against the other two is string comparison, so in both live and deterministic runs calendar's entries sorted as a block against the ISO timestamps rather than into them. The identifier half of decision 9's ask landed everywhere; the time half landed on two of three.

Two things this corrects:

- The pre-recording assumption — that all three vendors paint bare display strings — was wrong, and came from reading the Phase 2 corpus. `TODAY_TIMELINE`'s ISO-8601 premise holds for gmail and github as recorded.
- Decision 19 (`value` and `count` only) is not obviously insufficient for the roster as a whole; it is insufficient for **one** source.

Dispositions, for the decision 7 conversation — none taken here:

1. Accept calendar as the §4.4 fallback and prove S1 over the two comparable sources plus the mocks.
2. Reopen decision 19 for an operator that parses a wall-clock time against the turn's date.
3. Leave it to the Synthesizer's prose to order a mixed axis, and measure how it does.

Also observed, not acted on: in the live run the Synthesizer bound calendar's `note` ("Overlaps Budget sync") to the merged view's **Source** column.

## Defects found and fixed

These blocked the deliverable; they are not deferred findings.

- **The gmail pseudonymizer leaked a real address into a tracked fixture.** Gmail's MCP returns the message body under `plaintextBody`, which `_TEXT_KEYS` did not list, so the body passed through whole and carried the mailbox owner's address into `app/fixtures/stub/get-thread.json`. `test_corpus_is_publishable` caught it exactly as its docstring predicts. Fixed twice over: `plaintextBody` added to the prose keys, **and** a class-level backstop — any string under any unrecognized key now has its addresses substituted, on the same reasoning `scrub_tool_result` already walks every branch rather than the branches we know. Gmail's `.recordings` was wiped and its beats re-recorded against the fixed boundary.
- **Derived corpora carried abandoned streaming skeletons.** A model paints `loading_*` placeholders and then replaces them; merging by id kept those orphans, which the live executor never sees because its topology pass rejects orphans. Invisible for gmail and calendar — their catalogs define the `Row` the placeholders use — and catalog-invalid for github, whose Primer catalog does not, which is how it surfaced. `settled_messages` now keeps only what is reachable from `root`. github's fixture went from 31 components to 16, matching its own `surface.dump.json` exactly.
- **`settled_messages` was duplicated verbatim** in gmail's and calendar's derive scripts. Lifted into `a2ui_agent_kit.corpus`; all three vendors import it. gmail and calendar re-derived and re-tested green.
- **Unrelated, pre-existing:** `create-a2ui-agent`'s scaffold snapshot still said "Phase 9" where the template says "Phase 10" (the Phase 2 roadmap renumbering). Snapshot updated so the gate could go green; nothing to do with this task.

## What changed in `a2uiverse-apps`

- `agent-kit`: `corpus.py` gains `settled_messages` + the reachability filter.
- `gmail/agent`: `tool_shaping.py` boundary fix; `derive_corpus.py` on the kit helper; `record_beats.py` prompt pinned; beats + both fixture corpora re-recorded.
- `calendar/agent`: `derive_corpus.py` on the kit helper; `record_beats.py` prompt pinned; beats + corpora re-recorded.
- `github/agent`: `build_text_response` now plays the recorded digest on `notifications-N` surfaces (was a hand-authored echo/ack chat surface); new `scripts/derive_corpus.py`; `record_beats.py` prompt pinned; first tracked `recordings/` and `app/fixtures/deterministic/notifications.json`; three text-path tests rewritten to the new contract.
- `create-a2ui-agent`: stale snapshot string.

## For 5.7

- Calendar's un-dated time is the merge's blocker over the real roster. Pick a disposition before driving S1 acceptance.
- github's identifier is two fields, not one — a predicate ref over it needs `repository` **and** `number`.
- Synthesis in the live discovery run: `synthesized`, one attempt, `deadAirMs` **14957**, index refs throughout — no predicate refs, despite every source carrying a usable key.
- The deterministic bed now answers the today turn from all three agents, so 5.7 can iterate without live MCP or model quota for the vendor half. The Synthesizer still calls its model in deterministic mode.
