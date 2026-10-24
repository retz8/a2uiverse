# Task 15.4 — Orchestrator, the install loop

Sub-task 15.4 of Phase 15 (`_dev/docs/spec/phase-15-store-loop.md`, decisions 1–10 and 18): the orchestrator's half of the store loop — the Planner's use of the marketplace's tool set, the offer in the plan and its plan check, the offer painted, the install from the slot and the resume, the merge taking the installed app in, "Show it here", the two lines with nothing to offer, the install ask, the journal. This spec fixes how.

## Scope

- The marketplace's tool set and what its answer gives the model.
- The offer in the plan, its plan check, and a merged view beside it.
- What the painted offer slot carries.
- The press that fills the slot, and what the slot becomes.
- "Show it here".
- The install ask.
- The journal.
- The SPEC edits these decisions call for.

## Locked decisions

### 1. One tool, the search

The marketplace's tool set is one tool, a search taking words, defined in the orchestrator beside the platform readers and run over the marketplace's existing search route through the orchestrator's marketplace client, within its limit for each request to the Store. The marketplace gains no route. The tool filters out installed apps, projects each app for the model, and records the call.

### 2. What the search answer gives the model

Each app in the answer carries its app id, its card's name, description and skills — each skill's description and examples — and its publisher's name: the installed-apps reader's projection, with the publisher. Installed apps are left out of the answer. An app the marketplace flags ahead of the Store is in it and can be offered like any other; the install's live check decides, and a refusal says why on its row in the Store's words.

### 3. A gap's words are a search of this plan

A gap's search words are exactly the words of one of this plan's own searches; the plan check refuses a gap whose words this plan never searched, the one retry carrying the failure. This plan's searches are those of both its attempts. An offered app can come from any of them. The line for a gap that offers nothing comes from the record of the search its words name: unreached, "Couldn't reach the Store."; otherwise "Nothing in the Store can do this yet."

### 4. The plan check over offers

The plan check refuses an offered app this plan's searches did not return, one that is installed, and one app offered under two gaps of the same plan.

### 5. The Planner's step limit

The Planner's step limit is one step per tool and one for the answer: five. The live acceptance run checks it against the step counts the journal records.

### 6. A merged view beside an offer

A gap offering at least one app counts toward a merged view's sources: a merged view needs two or more, dispatched sources and gaps with an offer together, at least one of them dispatched. A merge that lands with fewer than two sources collapses to the line for fewer than two, its Retry over the sources that failed only. The installed app's first answer brings the merge in the way a Retry's arrival does — the collapsed merge made, or the landed one re-synthesized over it — the Install press its Retry.

### 7. Columns and the join hypothesis name dispatched sources only

A merged view's planned columns are marked to dispatched sources only, and the plan check refuses a column marked to an offered app; the offered app's column comes with the re-synthesis that takes its first answer in. The join hypothesis's home and nouns name dispatched sources only; an offered app that joins later has no noun, and the merge's progress step names it by its name.

### 8. What the painted offer slot carries

The painter stamps on the gap's `Slot` each offered app as its app id, name, publisher and short description, from the entry this plan's search returned, in the Planner's order. A gap offering nothing carries its cause instead — nothing found, or the Store unreached — from the record of its search. The requests the Planner wrote stay on the orchestrator.

*Amended by task 15.11 decision 36.* An offer whose plan asks nothing of the apps it offers — an install asked for and nothing else — is marked so when painted, and opens with "From the Store:" alone.

### 9. Install, then the fill press

Install is always the orchestrator's existing install, the call the Store page makes, its refusals carrying the Store's causes; the client shows the consent card first, built from the app's entry read again at the press. The slot fills on a press of its own on the canvas, `useApp`, after the account choice's `useAccount`: the one app the offer's request goes to, as its source, and the gap's words, naming the slot. Install in the slot, "Show it here", and an install on the Store page opened from the slot each end in that one press; "Show it here" is the press with no install before it.

### 10. When `useApp` is accepted

The orchestrator accepts `useApp` only when the canvas has that gap, the gap is unfilled, it offered that app, and the app is installed now; otherwise the press is refused and journaled refused. `useApp` is a press on that app under the rule of one press at a time.

### 11. What the slot becomes

An accepted `useApp` makes the gap's slot that app's slot, keeping its component id and its place, repainted as a vendor slot under the app's marker. Its account is resolved at the press as a dispatch resolves one: an app needing no sign-in, the bare app id, dispatched; an app with no account yet, its next account not signed in, taking the sign-in tile or its quiet line; one account, dispatched to it; two or more, the account choice holding the Planner's request. The dispatch sends the request the Planner wrote, with the press's own clock, under a Retry's deadline and hard cap, through the check before dispatch that task 15.5's update check joins. A request to an offered app follows the rules of every vendor request, the merge's data asked for when a merge is reserved.

### 12. An offer with no request

`useApp` on an offer with no request dispatches nothing and checks no sign-in. The slot stays bare and repaints to an installed state carrying the app id and one example question: the installed card's first skill's first example, the one the Store's after-install line uses; a card with no example gives none. The app's sign-in waits for the first question to it.

### 13. Asking to install an installed app

An utterance asking to install an app that is already installed gets a platform answer in the Planner's words on the layout surface, the shell action opening the App Library on that app available to it. No gap is named.

*Amended by task 15.11 decision 37.* The answer is one line in the shell's words, as the line an install leaves: "Shop A is already installed. Try asking “What cameras do you have?”", one of its skills' example questions, with "Manage Shop A" into the App Library. The installed-apps reader carries each skill's example questions, and a worked example shows the answer.

### 14. "Show it here"

The client holds the installed apps, read at boot and after every install, update and uninstall made through the page or a slot, and every canvas's offer rows read them: an offered app that is installed reads "Show it here". An install made outside the page is caught at the Install press: the entry read again there says the app is installed, the row turns to "Show it here" and the press sends `useApp` with no consent card. The orchestrator pushes nothing.

### 15. The journal

No new entry kind. A search is a tool call in the plan's record like a reader's — its words its arguments, its result the answer the model saw or the unreached marker with its cause — and that one record serves the plan check, the line with nothing to offer and the journal. `useApp` is an operation entry, refused when refused. The install is the registry line any install through the page writes.

### 16. SPEC edits

Made in this task's implementation session: SPEC §14's offer row naming `useApp`, as the account choice's row names `useAccount`, and the refusal of one app offered under two gaps; §7's row for Install and "Show it here", the install through `orchestratorApi` and the slot filling on `useApp`; §5.6, a gap's search words a search of this plan, and a gap with an offer counting toward a merged view's two sources.
