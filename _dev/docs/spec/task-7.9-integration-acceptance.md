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

## Invariants

- Live verification drives tunnel URLs, never localhost.
- The vendor agents are unmodified.
