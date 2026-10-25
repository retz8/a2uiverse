# Task 16.11 — Integration + acceptance

Spec for sub-task 16.11 of Phase 16 (`_dev/docs/spec/phase-16-upstream-upgrade.md`, decision 8): the phase's acceptance run through the tunnel, every agent in `live` mode on the new kit, the platform on `@a2ui/react` and `@a2ui/web_core` 0.14.0 and every catalog re-packed for the new host-module interface. It covers phase decision 8's list and every other change of the upgrade a person can see or do, and carries the question 16.8 left to the live run: whether the Planner and the Synthesizer still repair their output on a retry, reading `@a2ui/web_core`'s wording.

## Scope

- The two checks: the regression pass, and one sitting by hand through the tunnel.
- How the sitting is driven, how points found in it are handled, and where the code is worked.
- The agents' mode, and what the sitting touches.
- The starting state, and the state the sitting leaves.
- The temporal merge with Calendar's loop; the camera comparison with Shop B's loop; the entity join.
- Each fragment's reading presses, the two shops' chip sets, the quiet stand-ins; writes on the live accounts.
- The dark walk.
- Linear's newer build.
- The update tile every way in: Shop A's chain with the refused paint, CircleCI's chain, Shop B's no-update line.
- The old-interface pack refused.
- The Planner's and the Synthesizer's retry, forced.
- The journal after each case.
- What stays with the automated tests.
- The sitting's order and the record.
- Out: the amendments the sitting calls for, 16.12's.

## Locked decisions

### 1. Two checks

The regression pass:
- `pnpm verify` in both repos;
- the client's replay suite against the baselines on disk;
- the live suite, whole, run while the sitting's stack is down;
- each Python agent's tests, run apart.

It runs before the sitting, every failure and diff named and anything unexplained fixed before going on. It runs again after the sitting, the baselines retaken on disk and what changed named. Then there is one sitting by hand through the tunnel.

### 2. The sitting is driven case by case

Before each case Claude gives a brief of what it tests. On the reader's go, Claude drives the page in the reader's browser through Claude in Chrome on the tunnel's addresses, and runs every terminal command on the Mac. After each case the reader gives UX and design feedback, fixed on the spot before the next case.

### 3. Nothing is deferred

Every point the reader raises or the sitting finds is fixed on the spot, one at a time, agent side included — a difference the upgrade made, a fault it did not make, and a change of design the reader asks for alike — then seen again, and added to this spec as a numbered decision with what it replaced. A fix that changes behaviour is carried into SPEC by 16.12. A point asking for something a later phase builds is recorded as a finding for that phase.

### 4. Worked directly on `main`

The platform's code goes on `main`. The agents', the kit's and the catalogs' code goes on `a2uiverse-apps`' `main`. There is no worktree. Each fix is committed as it lands. The edits made for the run are never committed and are reverted by the end of the sitting.

### 5. Every agent runs `live`

The five vendor agents on their vendors' official MCP servers with the reader's accounts, the two shops on the model over their own data.

### 6. What the sitting touches

Phase decision 8's list, and every other change of the upgrade a person can see or do: the quiet stand-ins, navigation from a merged cell, each catalog's components pressed inside its fragment, the Store's live previews, an install while the client is open landing without a reload, an artifact packed for the old host interface refused, and the seven catalogs in dark. Each is produced live where the run's own means can make it; what cannot be is named in the write-up as left to the automated tests (decision 21).

### 7. The starting state

- The marketplace's state is wiped, its embedding model kept.
- The orchestrator runs on a fresh state folder holding only the embedding model's cache, named only in the sitting's own shells. The default orchestrator state folder is left as it is.
- The marketplace runs in its own terminal.
- The launcher runs both tiers in `live` under its publish, Calendar and Shop B published and left uninstalled. Every app passes the marketplace's publish gate, its hello-fragment smoke test included; the other five are installed from the marketplace by id.
- The tunnel's addresses are set for the agents' sign-in pages, but CircleCI's, which runs on a launcher of its own with its return address carried by hand in the window.
- Every account is signed in from its tile the first time its app composes, Shop B's key connected by the reader.
- The Planner, the Synthesizer and the seven agents run on `gemini-3.8-flash`.
- The client runs as a built preview if the dev server's module requests stall in the tunnel.

### 8. The temporal merge with Calendar's loop

A question about the day gathering from Gmail and GitHub that also needs a calendar:
- Calendar offered in its slot beside the merge reserved over them;
- Install through the consent card in the slot;
- Calendar's sign-in tile, and its sign-in window through the tunnel;
- the slot filling, and the merge taking Calendar in: the timeline over Calendar, Gmail and GitHub.

### 9. The camera comparison with Shop B's loop

"Compare camera prices at Shop A and Shop B.", asked with Shop A installed and Shop B not:
- the merge reserved over Shop A, and Shop B offered in its slot;
- Install through the consent card in the slot;
- Shop B's key connected;
- the slot filling, and the merge taking Shop B in.

Shop B's listing is opened in the Store for its live preview.

### 10. The entity join

Once the agents are up, Claude reads what Linear, GitHub and CircleCI answer for the linked set Phase 7 built: Linear issue A2U-8, in progress, linked to pull request #8 by "Fixes A2U-8" in its description, with a failing CircleCI run. Where it holds, the case runs as it is. Where it does not, it is rebuilt as task 7.9 did: the reader creates or moves the Linear issue, Claude edits the pull request's description once; anything beyond those two is asked first.

The join lands live, and a merged cell tapped lands on its element in the vendor's fragment.

### 11. Inside each fragment

- One reading press per app, then the fragment's back arrow: a pull request in GitHub, a message in Gmail, an event in Calendar, an issue in Linear, a run in CircleCI, a camera in each shop.
- The two shops asked something both filter, so two chip sets stand on one canvas: a chip picked in one leaves the other as it was.
- While each fragment streams in, the page is read for developer text where a child is still loading, and shows only the quiet stand-in.

### 12. No write on a live account without asking

No press writes to the reader's GitHub, Google, Linear or CircleCI accounts without the reader asked first, case by case. CircleCI's new permission, granted in its chain, is used for nothing. The only change planned is decision 10's one edit of the pull request's description, made only when the linked set needs it.

### 13. The dark walk

After the composition cases, the reader switches the browser to dark and Claude walks the trail back over the canvases the sitting made — the temporal merge, the camera comparison and the entity join, all seven catalogs among them — and opens the Store's previews.

### 14. Linear's newer build

Phase decision 8's newer build on an open canvas, as task 15.11 decision 15 ran it, live:
- A canvas has Linear's surfaces on screen. A second canvas showing Linear is left as a past canvas.
- Made for the run: a visible change to Linear's catalog, published at the same card. The App Library, opened over the canvas, has its check install the newer build.
- On the open canvas, a press inside Linear's fragment painting a new surface is drawn in the new build. The surfaces on screen keep the old look, and the fragment's back arrow returns to a paint keeping the old look.
- On the past canvas, an action pressed is answered in the new build.

### 15. Shop A's chain, with the refused paint

Task 15.11 decision 12's chain, as its decisions 39 to 41 left it, live. Made for the run: Shop A's current catalog moved to the kit's old line as published, and a new line holding a copy of its catalog under a new catalog id, with Video removed and one visible theme change.

1. **Suggested, not forced.** Shop A at a new card version with both lines, restarted and published. The App Library reads a major update. The camera comparison composes, Shop A painting in the old id, with no tile.
2. **Ahead of the Store.** The old line deleted, Shop A at the next card version, restarted and not published. A press reaches the agent, the call ends with no surface, and the card fetched again gives "Shop A has changed, and the Store is waiting on its publisher, a2uiverse-apps." with Check again. A second question is stopped before the call, on the card fetched.
3. **The refused paint.** Made for the run: Shop A's agent, holding only its new line, paints in it although the hub offers only the old. The hub refuses the paint, and the card fetched again gives the waiting line. The edit is reverted.
4. **The forced update and the repaint.** The new version published, retiring the old line. Check again gives "Shop A needs an update to show this.", and Update goes straight through. The slot sends its request again, and Shop A repaints in the new id with the new look while the other surfaces on screen keep the old. An older canvas's Shop A slot waiting on the same update reads "Shop A is updated." with Show it here.

### 16. CircleCI's chain

Task 15.11 decisions 13 and 14's new-permission variant, live:
1. CircleCI, signed in with read access, answers "How are my builds doing?".
2. CircleCI's card at a new version requiring `pipelines.write` beside read access, restarted and not published. The App Library is opened, its check fetching the live card again, and closed. The marketplace is stopped: a press gives "CircleCI has changed, and the Store couldn't be reached." with Retry. The marketplace restarted, Retry gives "CircleCI has changed, and the Store is waiting on its publisher, a2uiverse-apps." with Check again, not the needs-more-access tile.
3. The new version published, a card update. Check again gives "CircleCI needs an update to show this.". Update opens the consent card in the slot, asking for more in the card's words, and is allowed.
4. The slot sends again. The account lacks the new permission, so the slot takes the needs-more-access tile. The account is signed in again through the window, granting it, and the slot fills.

### 17. Shop B's no-update line

Shop B's catalog moved to a new id with no old line, Shop B restarted, and the dev publisher unpublishes it. The camera comparison's Shop B slot shows "Shop B has changed, and the Store has no update for it.", with no press.

### 18. The old-interface pack refused

Made for the run, in a scratch checkout: Shop B's catalog packed at `a2uiverse-apps`' commit before 16.9, `1f87a91`, with the Stellify it pinned then, for the old host interface. It is offered at publish and at install from disk, and each refuses it, the refusal naming the host interface.

### 19. The Planner's and the Synthesizer's retry, forced

Made for the run, in the orchestrator: the first attempt's output damaged after the model returns it, with a mistake `@a2ui/web_core`'s checks catch. Once for the Planner and once for the Synthesizer, on fresh canvases: Claude reads the findings the model was sent, and the second answer validates and paints. The edit is reverted.

### 20. The journal after each case

After each case, Claude reads the case's journal entries on the Mac and says whether everything the case did is there. A missing or wrong entry is a point like any other.

### 21. Left to the automated tests

Not produced live, each named in the write-up with the tests that hold it:
- the quiet stand-in for an unknown component, and for a child reference that cannot be resolved;
- the client's load gate refusing a build packed for the old host interface;
- an update refused;
- the no-update line for an app installed from your computer.

### 22. The state the sitting leaves, and the closing launch

- Every edit made for the run is reverted: in `a2uiverse-apps`, Shop A's two lines and versions and its refused-paint edit, CircleCI's new permission and version, Linear's catalog change and Shop B's new line, the checkout holding only the committed fixes; in the platform, the orchestrator's damaged first attempt.
- The scratch checkout of decision 18 is removed.
- The marketplace's state is wiped again, its embedding model kept. The sitting's orchestrator state folder is removed.
- On the live accounts, decision 10's linked set, if rebuilt, and the agents' own sign-ins stay.

Then a closing launch runs both tiers in `deterministic` under the publish, all seven apps published and installed by id, none left uninstalled. The Store's captures are recorded again from the closing launch only when a fix in the sitting changed an app's card.

### 23. The sitting's order

1. The regression pass before.
2. Decision 18's old pack made.
3. The starting state, then decision 10's linked set read.
4. The temporal merge with Calendar's loop.
5. The camera comparison with Shop B's loop.
6. The entity join.
7. The dark walk.
8. Linear's newer build.
9. Shop A's chain, with the refused paint.
10. CircleCI's chain.
11. The old-interface pack refused.
12. Shop B's no-update line.
13. The Planner's and the Synthesizer's retry, forced.
14. The stack down, and the state left.
15. The regression pass after.
16. The closing launch.

Each case's reading presses and checks inside its fragments (decision 11) run within the composition case that paints them.

### 24. The record

This spec is the record. Each on-the-spot fix is added as a numbered decision as it lands, with what it replaced.

The write-up has four parts: before the sitting, the sitting case by case, after it, and the findings. Findings for later phases go into their phase's notes in `_dev/TODO.md` at the write-up. Every amendment to the phase spec, SPEC.md and earlier sub-task specs that 16.11 calls for is made by 16.12.

### 25. The way back brings back a merge the Synthesizer set aside

A step to a combination of paints the merge was accepted over brings the merged view back when the Synthesizer declined, or couldn't make, the merge over the combination in between: the slot left as an accept leaves it, the shell repainted, with no call. A collapse the sources' state made stands. Replaced: the decline line kept over a wiring the orchestrator and the client had both restored.

### 26. GitHub's catalog lays a page out by its fragment's width

GitHub's `PageLayout` follows the width of the fragment it is drawn in, not the window's: below Primer's breakpoint, 48rem, Primer's narrow layout holds — the regions stacked, the pane at full width before or after the content, the dividers and what is hidden as their narrow variants say. GitHub's catalog at 0.2.1, republished at the same card; the registry takes the newer build at its check. Replaced: the pane beside the content in a 574px slot, the pull request's conversation 221px wide, a word to a line.

### 27. The deterministic roster after the first case

The temporal merge with Calendar's loop ran with every agent `live`. Every case after it runs on the deterministic roster, the Planner and the Synthesizer still on `gemini-3.8-flash`: the entity join on the deterministic set, Calendar's reading press on the deterministic roster's events, no write reaching a live account. Amends decisions 5, 7, 10 and 12. Replaced: every agent `live` through the sitting.

### 28. The way back restores the merged view's own tree

A step that restores a wiring the merge accepted puts back the merged view as it was accepted — its tree and its values — so a section a later re-synthesis added leaves with it, and returns with a step forward. Replaced: the remembered values over the latest tree, an empty "Calendar" section standing under the restored table.
