# Task 12.6 — The Planner choosing accounts

What the Planner is shown of an app's accounts, how it chooses among them, the account choice the shell draws when a command names no account, and the add-account action in its vocabulary (`_dev/docs/spec/phase-12-authority-surfaces.md`, decisions 19 and 20). SPEC §4.2, §5.6, §7, §9.5.

## Scope

- The prompt's listing of the available agents, by source.
- The plan check's reading of a bare app id.
- The fan-out rule one level down over accounts, and when the canvas names the account.
- The account choice: the Planner's dispatch entry, the tile the shell draws, the press — the contract, the shell catalog, the orchestrator and the client, proven in the orchestrator's and the client's tests.
- When the Planner paints the add-account action.
  *Amended by task 12.13 decision 27.* The Planner places the add-account tile, a `Slot`, not an action.
- The installed-apps, this-canvas and recent-turns readers over accounts.
- The amendments to the phase spec's decisions 19 and 20 and to SPEC §4.2, §5.6 and §7.
- Out: the add-account press opening the sign-in popup (12.8).

## Locked decisions

### 1. The listing shows sources; the Planner names a source

Each app in the Planner's listing of the available agents carries its sources with their account labels. An app whose card asks sign-in and has no account held carries the source its next sign-in will create, marked as not signed in yet. The Planner's dispatch names source ids.

### 2. A bare app id with one source is rewritten

A bare app id in a plan, for an app with exactly one source — no account yet, or one account — is rewritten to that source wherever the plan names it. For an app with two or more accounts a bare app id is refused.

### 3. A command naming no account is asked about

When a command names no account and its app has two or more accounts, the Planner asks which account instead of dispatching.

### 4. The canvas can name the account

An utterance names an account when it says it, or when it points unambiguously at something on the canvas it was asked from and only one account of that app holds a slot there.

### 5. The account choice is drawn by the shell

The Planner asks through a dispatch entry naming the app and carrying the request it wrote for it, with a `Slot` for it in the tree. The shell draws the slot: one line in plain words and one press per held account, labelled with the account's label from the vault.

### 6. The press dispatches the request in place

A press on an account dispatches the entry's request to that account, painting in that slot — no second plan; every other slot is untouched. An entry waiting on an account does not feed a merged view's columns or join.

### 7. An account choice with one source is rewritten

An account choice for an app with one source or none is rewritten to a dispatch to that source, as in decision 2.

### 8. Add an account only when asked

The Planner paints the add-account action only when the utterance asks for it — including a question about which accounts an app has.

*Amended by task 12.13 decision 27.* Adding an account is a `Slot` holding `addAccount`, an app id, which the Planner places when the utterance asks to add an account to an app, or which accounts it has, with no dispatch entry; it writes nothing else for it. The plan check refuses it on an app off the shortlist or asking no sign-in, and a second one for the same app.

### 9. The readers over accounts

- **Installed apps**: each app says whether its card asks sign-in, and lists its accounts by source and label; none listed reads as not signed in.
- **This canvas**: each slot of an account carries its label; a slot waiting on the account choice has its own state.
- **Recent turns**: each line names a source by its one name — the app's name, with the label when the app has more than one account (task-12.4 decision 5).

### 10. 12.6 builds the account choice end to end

The account choice — the contract, the shell catalog's tile, the orchestrator and the client — is 12.6's, proven in the orchestrator's and the client's tests.

### 11. The design amended on `main`

The phase spec's decisions 19 and 20 and SPEC §4.2, §5.6 and §7 are amended with this spec.
