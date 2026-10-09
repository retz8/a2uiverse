# Task 12.14 — Design records + READMEs

Spec for sub-task 12.14 of Phase 12 (`_dev/docs/spec/phase-12-authority-surfaces.md`): `docs/design/authority.md`, the area's record over one running example (phase decision 30); every design record and README brought to Phase 12's end; every amendment task 12.13's decisions call for (task-12.13 decision 18).

## Scope

- `docs/design/authority.md` over one running example, with captures.
- The other design records: each one's part of authority in brief, linking to `authority.md`; task 12.13's decisions 19–56 carried into every record they change.
- Every README in `a2uiverse` and `a2uiverse-apps`.
- The amendments task 12.13's decisions call for in SPEC.md, the phase spec, Phase 12's sub-task specs and earlier specs; SPEC's remaining `(endpoint, credential)` lines.
- `_dev/TODO.md`'s 12.14 line restated to this scope.

## Locked decisions

### 1. The running example

"What needs my attention today?" on the deterministic roster, over Gmail, Calendar, GitHub and Linear.

### 2. The example's script

In order:

1. GitHub and Linear are signed in, each as its one fake account; Gmail and Calendar hold no account.
2. The question: GitHub and Linear paint; Gmail and Calendar each take the full tile and are not dispatched; the merged view joins GitHub and Linear, a reserved column for each of the other two reading not signed in.
3. Gmail's Sign in: the waiting form, the window on the kit's account chooser, `you` chosen, the slot painted in place and included in the merge on arrival. Calendar is left.
4. A thread opened in Gmail's fragment: the chip and its card asking "Read your email". Not now drops the press; Allow opens the window and the thread opens.
5. An utterance asking to add a Gmail account: the add-account tile, the window, `personal` chosen.
6. The question asked again: Gmail's two accounts each labelled and merged; Calendar the quiet line "Not signed in · Sign in".

### 3. The side cases

The credential bar (refusal, repair, fallback), Connect with Shop B's key page, "not supported here", refresh, and uninstall with revocation each take a short section of their own outside the example.

### 4. What `authority.md` carries and what the other records keep

`authority.md` tells the whole story: the AuthVault, the agent kit's sign-in front door, the surfaces, the client's window, poll and resume, the credential bar. `client.md`, `orchestrator.md` and `agent-kit.md` each keep their own part in brief with a link to it, as `client.md`'s "Merged view on the client" does for `synthesis.md`. `shell-catalog.md` keeps its authority components at the level of their props and links to `authority.md` for the story. `app-install.md`'s credential section points to it.

### 5. Captures

Fresh captures of the running example on the deterministic roster, taken through the tunnel with Claude-in-Chrome: one per step of the script, step 3 a GIF. Fake accounts only. The side cases have no captures.

### 6. Every record carries task 12.13's decisions

Each of task 12.13's decisions 19–56 that changes the design is carried into every design record it touches, sign-in or not, checked against the code.

### 7. Every README

Every README in both repos is checked against the code as it stands and every stale line fixed, the mock stores' `--agents-dir` run command included.

### 8. The amendments

Every amendment task 12.13's decisions call for is made wherever the statement it replaces stands: SPEC.md, the phase spec, Phase 12's sub-task specs 12.2 to 12.12, and the earlier specs of tasks 2.5, 2.6, 5.7, 7.8 and 10.7; task 12.5's journal outcome "cancelled", dropped by task-12.13 decision 5, included. An amended decision in a spec keeps its text, with an `*Amended by task 12.13 decision N.*` paragraph under it stating the decision as it now stands. The a2uiverse contract's `clientSession` already carries `now` and `timeZone`. The phase spec's open items are left as they are.

### 9. SPEC's dispatch unit

SPEC's three lines naming the dispatch unit `(endpoint, credential)` — §10's AgentsPool row, the turn diagram and §18 — name it (app, account), as phase decision 19 and §9.5 do.

### 10. Back still skips a question's paint

Task-12.13 decision 37 replaces promotion and the overlay for a question over the empty stage. Task-9.7 decision 2 — a question's paint a placeholder the arrows skip — stands, not amended; `client.md` states both.

### 11. Worked on `main`

The work is done directly on `main`, with no worktree; the `a2uiverse-apps` READMEs on that repo's `main`.

### 12. The Planner's prompt names two shell actions

The Planner's rules doc listed `addAccount` among the shell's actions, beside `openStore` and `openAppLibrary`, while its output schema had it a `Slot`. The rules doc names two actions and has the Planner place a `Slot` holding `addAccount`. Replaced: `addAccount` named an action in the rules doc.

### 13. A Retry holds the fragment's presses

The orchestrator refused a press into a fragment while an earlier press or Allow's resume ran, but not while a Retry of that app ran (task-12.13 decision 46). A Retry marks its source as being sent again for as long as it runs, and a press into that source's fragment meanwhile is refused, journaled refused, the app sent nothing. The mark is apart from the presses in flight, so a Retry holds no merge. Replaced: a press sent beside a running Retry.

### 14. The question marker taken out by hand

CircleCI's rerun proposal, in its recording and its deterministic answer, and Linear's status proposal, in its recording, were declared questions, painted under the prompt before task-12.13 decision 40. The marker is taken out of those three files by hand; what the model painted stays as recorded. A live re-record of both apps is a backlog item. Replaced: a proposal declared a question in the roster's recordings and answers.
