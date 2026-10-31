# 17.11 — Integration + acceptance

The six end-to-end prompts run again through the tunnel with everything landed, each number beside the baseline's; the defaults for Phase 18 decided from the write-up and set on both sides; the write-up closed. Sub-task 17.11 of Phase 17 (`_dev/docs/spec/phase-17-latency.md`), `[apps]`, worked on the phase branch in both repos (phase decision 3).

## Scope

- The six end-to-end prompts — the notes' 1, 4, 6 and 10, the control "show my open pull requests" and the camera comparison — through the tunnel on the configuration the sub-tasks chose, one pass, passes two and three on the person's approval.
- The acceptance's numbers beside the baseline's, and the two streamings' before and after over the six prompts, deferred here by 17.9 and 17.10.
- The plans, the merges and the apps' answers read beside the baseline's; Linear's answers at the kit's `low` on prompts 4 and 10 among them (found in 17.8).
- The defaults for Phase 18: each seam's model and effort decided and written; the two that move set in the code on both sides.
- The results entry, an extract of each turn's numbers beside it, the notes' closing section, the Backlog lines the decision closes.
- Out: the design records, the READMEs' prose and the SPEC edits — 17.12.

## Locked decisions

### 1. One pass, the rest on approval

A pass is the six prompts once. The first pass runs; its real cost is read, and passes two and three run on the person's approval. The pass spends about $2.5–3 on Gemini — the apps and the Synthesizer — and about $0.25 on Claude — the Planner — estimated from the baseline's passes, 17.7's Planner requests and 17.8's tiers; the estimate is put to the person before the pass runs.

### 2. The configuration under test, set by settings

The Planner on Claude Sonnet 5.5 at `low` (17.7); the Synthesizer named on `gemini-3.8-flash` at `low`; the kit on `gemini-3.8-flash` at `low` (17.8); both prompt caches on (17.6); the plan cache off (task-17.6 decision 10); the vendors live. The configuration is set by settings for the run; the code's defaults move after the reading and the decision (decision 7).

### 3. Run as the baseline ran

The pass runs as task-17.5 decisions 7–12 ran the baseline: one utterance turn per prompt on a fresh canvas, nothing pressed inside the answer; sent through the tunnel by Claude-in-Chrome and read from the turn's journal line on the orchestrator's clock, the tunnel's leg not counted; every sign-in held, both Gmail accounts checked by name before the pass, Shop A installed just before the camera comparison and uninstalled after it; as they fall, the first turn after a boot marked; a failed turn counted as it fell, a setup failure fixed and that prompt sent again.

### 4. The browser's instants beside the orchestrator's

What the browser draws is sampled in the page as 17.10 sampled it — the layout's first piece, each fragment's first paint, the merged view's tree and its first row — and stated as a second column beside the orchestrator's clock, never in the comparison with the baseline. A view reaching the browser late, as 17.10's first merge did, is recorded as that Backlog line's second sighting.

### 5. Two readings, each against its own before

The baseline table, in the baseline's shape: plan time, time to each fragment, dead air, time to the settled screen, each beside the baseline's median and range on the same prompt. A streaming table per turn, in 17.9's and 17.10's shape: the Planner's first token, the apps asked and the layout's first piece against the turn's own `planMs`; the Synthesizer's first token and first row against the merge's own `deadAirMs`; each with how much earlier, and earlier as a share of the wait. Both on the orchestrator's clock, decision 4's column beside the streaming table.

### 6. Three readings, the person's

The plans and merges by task-17.7 decision 5's two checks — the plan asks the same apps as the baseline's on that prompt, and where the baseline planned a merge, one on the same join — the columns and the merge's outcome read, not checked. Every app's answer by task-17.8 decision 7's two checks — the answer passes the app's catalog on the first try, without the kit's correction retry, and what the prompt asks is on the screen — Linear's answers on prompts 4 and 10 read closest. Each is read beside what the baseline's results entry records of that prompt; the verdict is the person's, per prompt. The entry states the limits of the reading: the baseline's answers survive as outcomes, not screens, and the repos' data has moved since 2026-10-29.

### 7. The defaults set in the code

The Planner's default model in the code becomes Claude Sonnet 5.5; a default boot then needs both keys, and the orchestrator README's quick start says so. The kit's default thinking tier becomes `low`. Both defaults are pinned by scripted tests: the orchestrator's config test asserting the Planner's default and the Synthesizer staying on its own default when nothing is named; the kit's default-effort test moved to `low`. The Synthesizer's default model and effort stay as they are.

### 8. The default decision closes the notes

`_dev/docs/phase-17-model-trial-notes.md` closes with the default decision as a table of six rows — each seam's model and effort, the Planner, the Synthesizer and the kit, moved or stayed — each row naming where its reading is, a stayed default saying why it stayed; the plan cache's default noted under it.

### 9. A lever read against stays

A seam whose acceptance reading goes against its chosen lever — by decision 6's checks or its numbers — stays at today's default, the reason written in its row of decision 8's table. No further run is made on this sub-task beyond the passes approved under decision 1; re-opening the lever's sub-task is the person's, afterwards.

*Amended on 2026-10-31.* On the person's request after the pass, the Synthesizer ran on Claude Sonnet 5.5 beside `gemini-3.8-flash` over prompts 1, 6 and 10, the vendor agents in `deterministic` mode. The Synthesizer stays on `gemini-3.8-flash`; its row in decision 8's table names that run.

### 10. The Backlog

Closed by this sub-task: the Synthesizer's effort line, by decision 8's row for the Synthesizer; the Store-search plan-time line (found in 15.11), if the acceptance's camera-comparison plan reads near 17.7's, the number written on the line as it closes. Staying: the merged view reaching the browser late (found in 17.10); the Planner on Sonnet writing plain reasoning before its block (found in 17.9).

### 11. The README default values move with the code

The stated default values alone — the orchestrator README's Planner model row and its quick-start key line, the kit README's thinking-tier row — change in this sub-task with the code. The prose on bring your own model, the keys and the effort stays 17.12's. The 17.11 TODO line carries the `[apps]` tag.

### 12. The write-up

An entry in `_dev/docs/latency-and-token-experiment-results.md` in the baseline's shape, with decision 5's streaming table and decision 4's browser column, the three readings of decision 6 and their verdicts, the first tries, the tokens per seam and the pass's cost. Beside it, each turn's numbers in the baseline extract's shape, grown by the streaming and browser instants, `_dev/docs/phase-17-acceptance-extract.json`. The per-agent numbers come from the agents' own records during the pass (task-17.5 decision 13).

## Invariants

- Nothing the models wrote and nothing the apps returned is committed.
