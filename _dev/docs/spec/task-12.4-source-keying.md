# Task 12.4 — Slot naming and the dispatch unit by (app, account)

The orchestrator and the client keyed by the source `<appId>.<n>` (task-12.2 decision 3) wherever they are keyed by the app id today (`_dev/docs/spec/phase-12-authority-surfaces.md`, decisions 19 and 22). SPEC §7, §9.5, §16.

## Scope

- Every place in the orchestrator and the client keyed by the app id moves to the source; the app id is taken from the source only where the app itself is meant — its card, endpoint, entitlement and name.
- The accounts seam the vault fills in 12.5.
- The Planner's dispatch list in source ids and its checks over them.
- The account label on `Attribution`, one name per source on the screen and in the Synthesizer's prompt.
- The vendor conversation, the fault switch and the journal by source.
- Two accounts of one app proven in the orchestrator's and the client's tests.
- Out: the AuthVault, the credential and the card checked before dispatch (12.5); what the Planner is shown and how it chooses accounts, the add-account check (12.6); the sign-in popup (12.8).

## Locked decisions

### 1. Production unchanged, two accounts proven in tests

No card asks for sign-in and there is no vault, so every source in production stays the bare app id and nothing behaves differently. Two accounts of one app are proven in the orchestrator's and the client's tests, through the accounts seam filled with two Gmail accounts. The live proof is 12.11's and 12.13's.

### 2. The Planner names sources

The dispatch entry's `source`, `columnSources`, `join.home` and `join.nouns` are source ids, and the plan schema says so. The "dispatched twice" check and the shortlist check compare against every source of the shortlisted apps.

### 3. The accounts seam

The one place the orchestrator asks which sources an app has. Per app: the bare app id when the card asks no sign-in; one source per account the vault holds; `<appId>.<next n>` when the card asks sign-in and the vault holds no account (task-12.2 decision 4). Each source carries its account's label where it has one. The tests fill it; the vault fills it in 12.5.

### 4. The account label on `Attribution`

The shell painter sets `Attribution.account` from the seam on every fragment of an app with more than one account. TODO 12.8 no longer carries the account label in attribution.

### 5. One name per source

Each source has one name: the app's name, with the account's label when that app has more than one account. It rides `Attribution` into the client's roster, and every word naming a source — the progress line, the tiles, the derived value's disclosure, the merge's collapse lines — reads it by the full source. The slot's name lookup no longer reduces the source to the app id. How the name and the label are joined in words is decided in the plan, against 12.3's attribution drawing.

*Amended by task 12.13 decision 56.* Where the merge step names a source before its noun, a source named by its account says its app and its noun, the label after them in parentheses: "Joined Linear issues to GitHub PRs and CircleCI pipeline runs (ekkicb71@gmail.com)". Each step and each attribution still names the source by its one name.

### 6. The Synthesizer sees the same name

The Synthesizer's prompt names each partition by the source's name and the source. SPEC §16's line on the label is amended: the label reaches the Planner and the Synthesizer.

### 7. The vendor conversation is per source

The vendor's conversation is kept per canvas per source: two accounts of one app are two conversations with its agent.

### 8. The fault switch is keyed by source

`A2UIVERSE_FAULTS` is keyed by source; a bare app id matches every source of that app.

### 9. The journal names the source

The journal's records name the field `source`, carrying the source id. The transparency check reads `source` and takes the app id from it to reach the agent.

### 10. Names that hold a source are `source`

Every identifier, comment and doc string in the orchestrator and the client that holds a source is named `source`; `appId` stays only where the app itself is meant.

### 11. The boundary with 12.6

12.4 owns the plan checks and the schema's wording. The prompt's card listing, the installed-apps and this-canvas readers, and the fan-out rule one level down over accounts are 12.6's.
