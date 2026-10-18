# Phase 15 — Store loop

M11 of SPEC §12, the store loop: a capability no installed app serves, found in the marketplace, installed in its slot and resumed there; the update on the canvas for an app whose catalog the canvas cannot draw; beside them, the sweep of the Gemini model the platform and the apps name. Amends SPEC §5.6, §9.3, §10 and §16.

## Scope

- The install on the canvas itself: the missing capability's slot offering apps from the marketplace, one installed through the consent card in the slot, the slot filling with the installed app's answer.
- The Planner's use of the marketplace, through a tool set the marketplace provides.
- The slot when nothing can be offered; an install asked for on the canvas.
- The catalog version threads carried here from sub-task 11.8 and Phases 13 and 14: an app painting in a catalog it is not installed with; an app ahead of the Store, a new permission on its live card included; the forced update for a retired line; the migration window; an action inside an older canvas after an update. The install-over that showed only after a reload was resolved by Phase 14's per-canvas builds, except where an update lands while a canvas is open.
- The agent kit's card naming an old catalog id beside a new one (`[apps]`).
- The Gemini model sweep, across both repos.
- The design canvas of the slot's new states, drawn before the UI work.
- Dev harness, integration through the tunnel, the doc edits, the design records.
- Out: the upgrade of the packages the A2UI project publishes — the renderer packages, the agent SDK, the new agent toolkits — a phase of its own after this one, followed by the vendor-agent model trial and then the ecosystem run.

## Locked decisions

### 1. The install happens in the slot

When a question needs something no installed app can do, the slot that names it offers apps from the marketplace, each by name and publisher with Install, beside "More in the Store", which opens the Store page on the same words. Install passes through the consent card the Store uses, in the slot; once the app is installed, the slot fills with its answer, nothing else on the canvas moving.

### 2. The Planner reaches the marketplace through a tool set

The Router stays over the installed apps; the marketplace is not embedded into it. The Planner uses a tool set the marketplace provides over its HTTP routes, called when the Planner needs it, as it calls the platform readers. The model reads the marketplace only through the tools' answers, never its index. A plan that calls the tools waits on the marketplace, within the limit the orchestrator holds each request to the Store to; a plan that does not call them never waits on it.

### 3. The offer names its apps, each with its request

For the missing capability the Planner writes into the plan the apps it chose from the tools' answer, by app id, a request to each — as it writes one to an installed app — and the search words. The slot offers exactly those apps, drawn by the shell from the marketplace's entries: the model chooses the apps and writes the words, never a word on the tile. Once an app is installed, the slot sends it the request the Planner wrote, with no second plan. The plan check accepts an offered app only when this plan's own tool call returned it and it is not installed.

### 4. Several apps, the person choosing

The slot offers as many apps as the Planner judges fit from the tools' answer, and the person chooses which to install. How many fit in the slot, and what each shows, are the design canvas's.

### 5. Only the slot the install came from fills

An install fills the slot it came from: a press in the slot, or an install on the Store page opened from that slot's "More in the Store", the slot filling at once beneath the page. Every other slot offering the same app, on any canvas, turns to a one-press "Show it here", with no second consent. An installed app the slot did not offer leaves the slot as it is; the Store's after-install line, "Try asking … on your canvas", stays the way in.

### 6. When there is nothing to offer

When the tools' answer is empty, when nothing in it fits, or when the marketplace cannot be reached, the slot stands as one quiet line in the shell's own words — "Nothing in the Store can do this yet.", or "Couldn't reach the Store." — with "Search the Store" opening the page on the words. The orchestrator chooses the line from its own record of the tool call, never from the model. Nothing resumes, no request having been written; an app found later on the page is reached by asking again.

### 7. An app that needs sign-in takes a second step

Install comes first. The slot is then checked before dispatch like any slot, taking the sign-in tile — or its quiet line, once the full tile has shown this session — and the sign-in's completion sends the request. The install's consent and the sign-in stay two consents.

### 8. The installed app joins the merge on arrival

A plan can reserve a merged view and name a missing capability together. The merge does not wait for the missing capability and lands over the sources that answered; the installed app's first answer is included in the merge on arrival, the Install press standing as its Retry, as a slot waiting on sign-in is. Whether the Planner may plan a column for it is its sub-task's.

### 9. An install ask gets the same offer

An utterance asking to install an app gets the same offer slot: the Planner calls the tools and offers the apps it finds, writing a request only when the utterance also asks something of the app. An offer without a request says, once the app is installed, that it is installed, and invites the person to ask it something; an offer with one fills with the answer.

### 10. The installed slot is a slot like any other

A missing capability's slot on a past canvas installs and fills the same way, a past canvas being actable. Once filled, the slot reads like any source's in the progress line, the journal and the this-canvas reader. An install refused in the slot says why there, in the Store's words.

### 11. One update tile

When an app cannot paint in what it is installed with — caught before the call, its live card's catalog ids sharing nothing with its entitlement, or after it, today's refusal of a paint outside the entitlement — the slot takes one update tile in the shell's words, its line chosen by what the Store holds:

- The Store has a version the app can paint in: "Shop B needs an update to show this.", with Update — straight through, or through the consent card when the update asks for more — and the slot sends its request again once the update lands. This is also the forced update, the installed line retired.
- The Store has none yet: "Shop B has changed, and the Store is waiting on its publisher, Acme.", with no press, the orchestrator reporting the change to the marketplace as it does today.

For the catch after the call, the orchestrator fetches the live card again before choosing the line.

### 12. Access is judged on the card as installed

A slot's access is judged against the card as installed; the live card is read only to detect that the app has changed. An app ahead of the Store whose live card asks a new permission takes decision 11's waiting line, not the needs-more-access tile, and the new permission is asked only through the update's consent card once the Store has the card. Task 13.8's decision 27 is replaced.

### 13. A paint is drawn in the build the registry holds when it arrives

A paint arriving on an open canvas is drawn in the build of its catalog that the registry holds when the paint arrives; a surface already on screen keeps the build it was drawn in, and so does a paint the way back returns to. Each canvas no longer holds the first build of each catalog it loaded (SPEC §10; task 11.5's decision 6 as Phase 14 amended it). The paint after a slot's Update and the answer to an action pressed in a past canvas are drawn in the app as it now is.

### 14. The kit's card names an old catalog id beside a new one

The agent kit's card can name an old catalog id beside a new one, and the kit paints each answer in whichever of them the hub advertises for the app, so a kit app ships a breaking catalog change as a suggested update. The hub stays as it is, advertising the ids the installed card names. The one-id limit task 13.8's decision 6 recorded is lifted. `[apps]`.

### 15. What follows an update

An update that asks for more passes the consent card, and a slot whose account then lacks the new permission takes the needs-more-access tile — two steps, as in decision 7. Every other slot waiting on the same update, on any canvas, turns to "Show it here" once it lands. A slot whose app was uninstalled keeps "This app isn't installed anymore." with Retry, and offers no reinstall.

### 16. The Gemini model sweep

Code, configuration and the docs that describe the present, in both repos, move from `gemini-3.7-flash` to `gemini-3.8-flash`. Records of past runs keep what they say: the recordings' `model` field, the run logs of earlier specs, plans and handoffs, the Backlog's measurements. The vendor-agent model trial's baseline moves. `[apps]`, worked on `main` in both repos.

### 17. The design canvas comes before the UI work

The slot's new states are drawn as a design canvas of their own, after the doc edits and before the shell catalog and client work, reusing Phase 14's consent card: the offer, the consent card in the slot, installing, the slot filling, "Show it here", the two lines with nothing to offer, the update tile's two lines, the install ask's installed line.

### 18. Two known consequences

SPEC §16 gains two: a published app's card text reaches the Planner whenever the tools run, where only installed apps' cards did before; and the marketplace learns the words of every question's missing capability, sent by the Planner with no press from the person.

### 19. What proves the phase

Through the tunnel, on the deterministic roster with the marketplace running, the Planner a live model call:

1. The loop: a question needing an app published but not installed, the offer, Install through the consent card in the slot, the slot filling, the merged view taking it in on arrival.
2. A sign-in app offered, installed, the sign-in tile, filled.
3. "More in the Store": an install on the page opened from the slot filling that slot, another canvas's slot for the same app showing "Show it here".
4. The two lines with nothing to offer.
5. The install ask, with and without a request.
6. The update tile every way in: the Store having the update, and the repaint; ahead of the Store, the new-permission variant included; the forced update; the catch after the call.
7. The kit's two catalog ids: a kit app's breaking catalog change shipped as a suggested update, with no temporary patch.
8. Per-paint builds: a new paint on an open canvas after a newer build lands drawn in it, the surfaces on screen unchanged.
9. A clean regression pass.

### 20. Docs

SPEC §5.6 (only a plan that calls the marketplace's tools waits on the marketplace), §9.3 (the model reads the marketplace only through the tools' answers), §10 (the Router's one index, the marketplace reached through the Planner's tools; the per-paint build) and §16 (decision 18), and every other section these decisions change. The earlier decisions they change are amended: task 11.5's decision 6, task 13.8's decisions 6 and 27, and Phase 6's open item on what the capability tile says and whether its slot collapses or stands. The Backlog's item on the capability gap's terminal state is answered by decision 6 and leaves the Backlog.

## Invariants

- The shell draws every pixel of an offer, a consent and an update tile, from the marketplace's entries and the card as installed; the model chooses the apps and writes the search words and the requests.
- The model reads the marketplace only through the tools' answers.
- A permission is granted only on words from the card as installed.
- Nothing on screen changes its look under an update.
- The canvas stays mounted beneath the trusted page.
- Nothing A2UIVerse-specific rides the vendor wire.
