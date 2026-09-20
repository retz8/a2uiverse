# Task 7.9 — Integration + acceptance

Spec for sub-task 7.9 of Phase 7 (`_dev/docs/spec/phase-7-entity-resolution.md`): the phase's acceptance run — the entity join seen working end to end over the real roster, live through the tunnel. Phase decision 13, its nine items; phase decisions 8 and 9; SPEC §7; task 7.5 decision 12; task 7.8 decisions 2 and 4.

## Scope

- How each of the nine acceptance items is proven, and on which bed.
- The broken state's deterministic provocation.
- What a tap on an absent cell does.
- The home source's vanish.
- The nested sort on a rendered canvas.
- The entity-join turn recorded as a client beat; dead air.
- The live roster's setup for a rerun a merged row reads.
- The outward actions the run takes, and who takes them.
- The inherited findings: the four failing visual baselines, the palette's dropped input, the landing ring's duration.
- The order of work, and the doc amendments.

## Locked decisions

### 1. The broken state is provoked on a synthetic client beat

A scripted repaint on a synthetic client beat changes the field an `equal` relation reads. The values it cut off are marked broken, the detail shows both values, and a row joined by `judged` is untouched — asserted in a canvas-level test and one Playwright case. The orchestrator's half, a broken fact firing nothing, stays with its existing turn-level test. Acceptance item 5.

### 2. An absent cell is not a button

The evaluator gives a cell no target when none of its refs resolves, as it gives none to a cell with no refs. A value navigates to where it is; a cell showing no value goes nowhere. Acceptance item 7 loses its absent-cell clause. The fragment boundary stays the landing for a resolved value that nothing renders, the slot for a source whose fragment is not mounted.

### 3. Appear asserts the property

Acceptance item 4 passes when, after a live rerun on a run a merged row reads, the row tells the truth about CI — through an appeared entry and a re-synthesis, or through a value changing in place with no model call. Which path it took is written up. On the deterministic bed the recorded rerun chain, on the run of the pull request that is not a row, is replayed once as the negative case: an appearance no row reads fires nothing.

### 4. The mocks compose; the claim is observed

The mock storefronts run in deterministic mode with Phase 4's pinned comparison, reorder and decline utterances, and pass when they compose as before. Whether the comparison's document carries a match claim, and how its values are marked, is written up and not required. Nothing is re-recorded.

### 5. Vanish gains the home source

Acceptance item 3 gains: opening an issue inside Linear's fragment turns the rows' Linear values absent at once, and what the re-synthesis leaves shows nothing false — a decline with its reason, a row rebuilt from the detail, or the rows kept with absent home cells. Which one is written up. Checked on the deterministic bed and once live. GitHub's vanish is checked live only; CircleCI's on both beds.

### 6. The nested sort is proven on a synthetic beat

A synthetic beat carries a list inside a row with its count, and a Playwright case asserts that the one sort control reorders that list in every row. The real roster is not asked to produce one; a live document that writes a list is written up.

### 7. Beat 9 is the entity-join turn

The pinned utterance over the live roster, recorded through the hub: the fragments and the merged view with its match claims, as they arrived. A replay smoke assertion and a row in the client README's beat table. No chained follow-up is recorded. Dead air on the deterministic and the live bed, with the utterance and roster, is appended to the backlog's streaming item in 4.8's format. Acceptance item 9.

### 8. The four failing visual baselines are diagnosed, then acted on

The diff images are read first. Rendering drift is retaken with its cause named in the commit; a real change in what is painted is fixed or owned. The e2e suite is green before any tunnel pass. No tolerance is added to the comparison.

### 9. The palette's dropped input is a watch item

The sittings wait a moment after a load before typing and note every drop. If it reproduces it is diagnosed in-session and fixed when the cause is small; otherwise it goes to the backlog with what was observed.

### 10. Item 1 passes on three landings in a row, and one live

On the deterministic bed, three landings in a row through the canvas — task 7.13's convention, carried forward as a convention. On the live bed, one landing with every property of item 1 true; a live failure is diagnosed and the landing repeated, each attempt written up. The properties are asserted, the layout is the model's. A guessed or broken mark on data that carries a confirming fact is a failure.

### 11. Item 2 rests on the existing tests

The validator's match-claim tests and the orchestrator's turn-level retry tests, in `pnpm verify`, are item 2's evidence, named in the write-up. A validator rejection the sittings journal is written up with its finding and whether the retry landed.

### 12. Navigation, live

One tap per vendor fragment lands on the element's row, and the browser's network shows no request leaving the client. The degradation clause is tapped live when the landed document offers a cell whose field no fragment renders; otherwise it rests on the navigation beat's Playwright spec, and the write-up says which.

### 13. Regression runs deterministic

The temporal merge, a single-agent turn and the platform question on the deterministic real roster, one pass each; the mocks per decision 4.

### 14. The ring's duration is the user's to judge

The user looks at the landing ring on the synthetic navigation beat in their own tab during the tunnel gate and says whether it changes; they are pinged when the gate starts. Unseen, it stays at 1.5 seconds.

### 15. Code first, then three passes

Before any browser pass: decisions 1, 2, 6 and 8 land, with `pnpm verify` and the e2e suite green. Then, through the tunnel: the mocks deterministic; the real roster deterministic; the real roster live. Written up once. Defects a sitting finds are fixed in the same session and named in the commit message; anything the run changes about a decision is amended into this spec and marked as added during the run.

### 16. Pull request #8 gets a Linear issue

A Linear issue for pull request #8's topic, in progress, linked by "Fixes" and its identifier in #8's description. The live roster has four rows, one with failing CI and a rerun its fragment offers. The deterministic beats stay as recorded, with three rows. Amends task 7.8 decisions 2 and 4.

### 17. Outward actions

The user creates the Linear issue. The assistant edits #8's description once and confirms one rerun on #8's failing run in the live sitting. Anything beyond those two is asked first.

### 18. Unmatched, per bed

A2U-7's empty cell, disclosed as 0 of 0, is the issue with no pull request on both beds. The pull request with no issue is #8 on the deterministic bed, and live whatever pull requests outside `a2uiverse` GitHub answers with; when it answers with none, that half of item 6 holds on the deterministic bed only, and the write-up says so.

### 19. Worked on `main`

The code is worked directly on `main`, no worktree.

### 20. Doc amendments

- Phase spec: decision 9's tappable sentence follows decision 2; decision 13's items 3, 4 and 7 and its regression sentence follow decisions 5, 3, 2 and 4; the open item on the broken state's provocation is closed by decision 1.
- Task 7.5 decision 12: the target's fallback follows decision 2.
- Task 7.8 decisions 2 and 4 follow decision 16.
- SPEC §7: the navigation row follows decision 2.
- TODO: the 7.9 line rewritten to the decided scope.
- For 7.10: the design records gain that an absent cell is not a button.

## Found and fixed during the run

Each surfaced by a tunnel pass; fixed in the same session, with tests.

- **The hub kept a surface the canvas had retired.** The live CircleCI, GitHub and Linear agents paint a detail as a new surface and never delete their list. The client keeps one surface per slot, so the list left the canvas and every ref into it went absent; the orchestrator's partitions kept it, every ref still resolved there, and the drill-down fired no re-synthesis. The deterministic beats repaint one surface id, so the bed never showed it. The partitions now retire a source's earlier surface when it creates another (SPEC §4.1, repaint is surface replacement). Seen live after the fix: opening pull request #8's run re-pointed A2U-8's build status into the run detail and detached the other rows' runs, the note saying so.
- **The join's detail named apps by their ids after any action.** Every turn empties the store's roster as it opens, and an action turn carries no shell paint to refill it, so "From Linear" became "From linear". App names are now read off the shell paint mounted on the stage, the live one's as a parked one's; the store's roster is the fallback.
- **Four visual baselines** — decision 8: glyph-edge rasterization moved with macOS 27, installed 2026-09-15; the baselines dated from 09-06 and 09-13, Playwright 1.62.1 throughout, layout identical. Retaken.

## Evidence

- **Item 1, deterministic real roster.** Three landings in a row: one row per Linear issue — A2U-5, A2U-7, A2U-6 — 14 joined cells, every one unmarked, A2U-7's three attachments the empty cell, sorted by last update with the control changing the order both ways; one attempt each. The claims varied by landing — the issue's title equal to the pull request's, Linear's link containing the pull request's number, the branch containing the issue key — each a fact that held.
- **Item 1, live.** Four rows, A2U-8 attached to pull request #8 and its failing run; 21 joined cells unmarked, one attempt; landed twice on the canvas and once on the recorder's turn. Plan 6–7 s, the dispatches settling at 27–30 s, 33–36 s and 51–65 s.
- **Item 2.** `synthesizer.test.ts`: a fact that holds against the partitions passes and its counterpart is refused, the finding never offers `judged`, a `DerivedValue` or any other component bound under `match` is refused, an operator inside a claim and a relation outside one are refused by path. `orchestrator.test.ts`: a refused answer is retried once with its errors and the corrected answer paints; malformed after the retry behaves as a decline. No validator rejection was journaled in any sitting.
- **Item 3.** Opening a CircleCI run: the rows' build cells absent, a re-synthesis handed the absent refs, the note saying what changed — deterministic twice, live after the fix. Opening pull request #8 in GitHub's fragment, live: the pull request cells absent for every row and detached, since GitHub's detail surface carries no data-bound field. Opening an issue in Linear's fragment, the home source: deterministic, one row rebuilt from the detail with its pull request and build, the update time sourced from the pull request and the note saying so; live, one row rebuilt from the detail with its pull request number from Linear's own entry, the unrelated CircleCI run left unattached. Nothing false was shown. On an action turn the vendor's repaint and the re-synthesis reach the canvas together (SPEC §5.5), so the absent state is seen between them only on the deterministic bed.
- **Item 4, deterministic.** The recorded rerun chain on the run of the pull request that is not a row: proposal, confirm, the run repainted with a new `verify` attempt; the journal shows no synthesis on either action.
- **Item 5.** The synthetic `join` beat: `synthesisSession.test.ts` and `e2e/join.spec.ts`.
- **Item 6.** A2U-7's empty cells on both beds. Deterministic, pull request #8 is not a row; live, the three `a2ui-project/a2ui` pull requests GitHub answered with are not rows and stay in its fragment.
- **Item 7.** Deterministic and live: a tap on a pull request value lands on it in GitHub's fragment, a tap on a build value on the run in CircleCI's, a tap on a Linear status on the issue's row by degradation — Linear draws the status as an icon bound to no text. No request left the client, no marker stayed in the DOM. No absent cell was a button on any bed.
- **Item 8.** The mocks: the comparison composed with an `equal` claim on the three cameras both shops list and none on the two single-shop rows, every value unmarked; the in-place reorder fired no synthesis; the decline spoke its reason into the slot. The deterministic real roster: the temporal merge composed over four sources, Linear now among them; "How are my CircleCI builds doing?" went to CircleCI alone; "what apps do I have?" was answered by the shell with no vendor.
- **Item 9.** Beat 9: 179 batches, 69.6 s, four rows, the synthesis payload on one batch; fixture privacy check clean; replay smoke in `e2e/canvas-surface.spec.ts`. Dead air in the backlog item.
- **Gates.** `pnpm verify` 15 of 15; Playwright 38 of 38.

## Findings, not fixed

- **Item 4 does not hold live.** After the one authorized rerun on pull request #8's run the row did not tell the truth about CI until an unrelated re-synthesis ran. The rerun proposal is a question surface that takes CircleCI's slot and retires the run detail; the re-synthesis it fires detaches CircleCI from the row, correctly. After the confirm the live agent repainted the detail under another shape — `currentWorkflow` and `previousWorkflows` where it had painted `workflows` — so no watched array held a new key, the document held no ref into CircleCI, and nothing fired: the build cell stayed the empty cell while CircleCI's fragment showed the run running. The next re-synthesis, fired by the GitHub vanish, attached the run by `judged` and the row read "Running", marked guessed. Open: what tells the Synthesizer that a source it detached has painted again.
- **A request through the tunnel is sometimes lost before it reaches the orchestrator.** Three of about thirty POSTs — two canvas actions and one utterance — hung for 100.1 s and failed with "Failed to fetch". A socket-level trace on the orchestrator showed no connection opened for the hung request; every request that arrived came on a fresh connection from the tunnel's relay, so Node's 5 s keep-alive is not reused and not the cause. GETs and other POSTs to the same host went through during a hang. The loss is in the tunnel's relay or service; A2U-7 is this. What remains in this repo's reach is a client-side timeout and retry.
- **The palette dropped what was typed twice in eight loads**, both times with the input focused and open; typed again, it went through. The page takes about 30 s to load through the tunnel and the automation's tab reports `visibilityState: hidden`. Not seen by a person typing; to the backlog as observed.
- **An orchestrator test times out under load.** With a bed running, the first `orchestrator.test.ts` case to boot the app took 14 s against its 5 s limit, a different case on each run; green with the machine quiet, before and after this task's change.
- **The `source` operator's value is the app id.** The temporal merge's Source column reads "linear", "github", "gmail".
- **The live GitHub pull request detail binds nothing.** Its surface carries no data model the merge can read, so a row cannot be re-pointed into it — the §4.4 fallback.

## Invariants

- Live verification drives tunnel URLs, never localhost.
- The vendor agents are unmodified.
