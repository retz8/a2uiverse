# Task 12.13 — Integration + acceptance

Spec for sub-task 12.13 of Phase 12 (`_dev/docs/spec/phase-12-authority-surfaces.md`): the phase's acceptance run — the sign-in surfaces, the AuthVault, the credential bar and multi-account on the deterministic roster through the tunnel; real sign-in with each vendor and real write escalations in live mode; CircleCI's live sign-in and a live recording through the kit's beat driver, moved from 12.12; a regression pass before and after. SPEC §3, §8, §9.5, §10.

## Scope

- The two checks: the regression pass, and a live run through the tunnel — the deterministic half, then the live half.
- How the reader's feedback during the run is handled, and where the code is worked.
- The journal's sign-in records for an escalation request and for Not now.
- A sweep for the secrets a sitting created.
- The deterministic half: its starting state and its ten cases.
- The live half: its starting state, its accounts and its cases.
- CircleCI's live sign-in and a live recording through the kit's beat driver, their localhost return carried by hand.
- The screens against the UI reference canvas.
- The sitting's order and the record.

## Locked decisions

### 1. Two checks

`pnpm verify`, the client's Playwright replay suite against the baselines on disk, and 12.12's live sign-in test through the real popup are the regression pass. It runs before the live run — every failure and diff named, anything unexplained fixed before going on — and after it, the baselines retaken and what changed named. One live run through the tunnel, with the reader watching the screen: the deterministic half, then the live half.

### 2. The work at the Mac is done from the unit

CircleCI's live sign-in and the live recording through the kit's beat driver run from the reader's browser through the tunnel; each localhost return address that browser cannot reach is carried by hand. For CircleCI through the vault, the agent's sign-in page and CircleCI's return to the agent are each opened again in the sign-in window on the agent's tunnel address. For the beat driver, the return it waits for on a loopback address is delivered on the Mac. `_dev/docs/tunnel-environment.md` gains one line on carrying a return by hand.

### 3. Nothing is deferred

Every point the reader raises during the run is fixed on the spot, one at a time, agent-side included, seen on reload, and added to this spec as a numbered decision with what it replaced. A point asking for something a later phase builds — the App Library's sign-out per account, renaming, the permissions view, its "Add account"; the Store; the marketplace — is recorded as a finding for that phase.

### 4. Worked directly on `main`

The platform's code is worked on `main`, the agents' and the kit's on `a2uiverse-apps`' `main`; no worktree. Each fix is committed as it lands; `a2uiverse-apps` is pushed at the end.

### 5. The journal records an escalation request and Not now

Before the run, the journal gains a sign-in record for an escalation request — the source, the missing scope keys, valid or invalid — and one for Not now, as task-12.5 decision 11 lists them. That decision's "cancelled" outcome is dropped: task-12.8 decision 2 keeps Cancel in the client, so the orchestrator never learns of it.

### 6. A secret sweep

A committed, tested dev script collects every secret a sitting created — the vault file's tokens and keys, each agent's sign-in store, shop-b's demo key — and searches the journal and every process's captured output, reporting counts per file and never a secret. It runs after each half. What reaches the browser is not searched; that rests on the vault's own test.

### 7. The deterministic half's starting state

A fresh orchestrator state folder holding only the embedding model's cache, and each agent's sign-in store moved aside, so the vault and the agents start empty. The launcher installs the five apps in deterministic mode, their sign-in pages on tunnel addresses. The stores moved aside are put back at the end of the sitting; the existing orchestrator state folder is left as it is.

### 8. The deterministic half's cases

In this order:

1. **First paint, nobody signed in.** "What's the status of what I'm working on?" — Linear, GitHub and CircleCI each take the full tile and none is dispatched; the progress line names each as not signed in; the merge collapses to a line with no press, its home source needing sign-in.
2. **Sign in and resume.** GitHub: the waiting tile, Cancel, the tile back when the canvas regains focus, then signed in through the kit's account chooser on its tunnel address and painted in place. Linear signed in: the merge comes back, CircleCI's column reading "not signed in". CircleCI is left.
3. **The full tile once, then the quiet line.** "What needs my attention today?" — Gmail and Calendar take the full tile, GitHub and Linear paint; Gmail is signed in, Calendar left. A third question touching Calendar and CircleCI: both are the quiet line, and Calendar is signed in from it. Back on the second canvas, Calendar's tile loads on its press with no window. After a reload, CircleCI takes the full tile again.
4. **Escalation.** A thread opened in Gmail's fragment: the chip and its card asking "Read your email". Not now drops the press and the fragment stays; then Allow opens the window and the thread opens.
5. **Two Gmail accounts.** An utterance asking to add a Gmail account: the add-account press, the window, `personal` chosen, the progress line naming the account added. A question about mail: both accounts' fragments, each labelled, merged. An utterance naming the personal mail: that account alone. A command naming no account: the account choice. `you` added again: already added.
6. **The credential bar.** The orchestrator restarted with the credential fault on GitHub: on the plan's dispatch, the paint refused and repaired; on every dispatch, the fallback tile with Continue on GitHub.
7. **Refresh.** Decision 9.
8. **Install-over and uninstall.** Gmail installed over keeps both accounts; Gmail uninstalled, its accounts leave the vault and each is revoked at the agent; installed again, it takes the full tile.
9. **The token page.** The mock stores launched beside the roster and installed by hand; the camera comparison: Shop B's tile opens the orchestrator's token page, the demo key is entered, Shop B paints and merges with Shop A.
10. **Not supported here.** Decision 10.

### 9. Refresh by one restart of Linear

Linear's agent is restarted by hand on its port with its store emptied and a 90-second access token. Its next dispatch fails the vault's refresh and the slot asks to sign in again. Signed in again, a Linear question more than 30 seconds later is refreshed silently: the journal's refresh record, nothing on screen.

### 10. "Not supported here" from a throwaway card

A card served from the scratchpad and never committed, declaring `http` basic as its required sign-in, is installed by hand from its card URL. A question naming it takes the tile saying sign-in isn't supported here; Manage apps opens the App Library; the app stays installed. Then it is uninstalled.

### 11. The screens against the UI reference

Each case's screen is set beside its frame on the design canvas *Authority surfaces — UI reference* (https://claude.ai/artifact/VsSwaLrgPWJyBiL4zjkJAX). A difference is a point under decision 3; where a sub-task spec settled it otherwise, the spec stands and the difference is recorded.

### 12. The live half's starting state

A second fresh orchestrator state folder, the agents' stores emptied again, the agents in live mode. Every live sign-in is a first sign-in from the tile.

### 13. The live half's accounts

The dedicated test Google account for Gmail and Calendar; the reader's own GitHub and Linear; the test CircleCI account that follows the demo project. If the test account's inbox is too thin to merge, a few messages are sent to it during the run.

### 14. The live half's cases

In this order:

1. **GitHub.** Its first sign-in through the tile and GitHub's own sign-in; one read painted live.
2. **The attention merge.** "What needs my attention today?" — Gmail and Calendar each signed in to Google; Calendar's write escalation adding an event; the demo calendar re-seeded; Linear signed in, its agent registering itself at Linear; the question asked again over the seeded calendar, the merge over live data.
3. **CircleCI and the work-item join.** CircleCI signed in with its return carried by hand (decision 2), its projects found through CircleCI's API with the account's token; the join over live data.
4. **GitHub's write escalation.** Decision 15.
5. **The live recording.** Decision 16.
6. **The secret sweep** over the live half.

### 15. The live write escalations

Calendar's escalation, made to re-seed the demo calendar, is the vendor-side scope expansion at Google. GitHub's write is an issue opened through the canvas in a private scratch repository created for the run and kept: from a press in GitHub's fragment where the agent paints one, otherwise from an utterance; which path appeared is recorded.

### 16. One live recording, nothing derived

GitHub's beats are recorded live through the kit's beat driver, signed in through the browser with the loopback return carried by hand, into a scratch folder. Nothing is derived or committed.

### 17. The sitting's order

The journal records of decision 5 and the sweep of decision 6; the regression pass before; the deterministic half's start and its cases; its sweep; the live half's start and its cases; the agents' original stores put back; the regression pass after; the tunnel line of decision 2; the write-up.

### 18. The record

This spec is the record. Each on-the-spot fix is added as a numbered decision as it lands, with what it replaced. The write-up — before the run, the deterministic half, the live half — carries each case's evidence: the screen, the journal's lines, the reference frame compared; the sweeps' counts; the regression runs before and after; the findings for later phases. Every amendment to the phase spec, SPEC.md and earlier sub-task specs that 12.13 calls for is made by 12.14.

## Invariants

- A credential never reaches the client, the models, a partition, the journal or the logs.

### 19. Not now takes the chip away

Not now on Gmail's request for more access left the chip and its card on the row: the orchestrator dropped the request and repainted, but `Attribution` read the binder's resolved props, which upstream merges over the last repaint (`_dev/a2ui-findings.md` §9), so the dropped `escalation` stood once the press settled. `Attribution` reads its literal props from its own component model, as `Slot` does. Replaced: a request that stayed on the row after Not now or Allow.

### 20. The chip moves nothing

The chip, a button taller than the attribution marker's line, grew the row on arrival and moved the fragment down 8 px. Its overhang reaches into the gap above and below, so the row keeps its height when the request arrives. Replaced: a row that grew by the chip's height.

### 21. An add-account window is said at once

After the add-account press the canvas showed nothing until the sign-in ended and its line came — "Added … to Gmail." or "… was already added to Gmail." — so a reader could take the wait for a fault. While the window is open, the progress line shows a working step at once, in the waiting tile's words, "Gmail signing in" — "Signing in" until the orchestrator has answered for the attempt, which now names the app on every answer — replaced by the account's line when the sign-in ends. The canvas getting the focus back, or a sign-in ending without an account, takes the step away, as for the tile. The button stays as it is. Replaced: task-12.8 decision 6's button left as it is with nothing said until the outcome.

### 22. The key page spaces its field and its button

On the token page, "Paste your key" sat flush against Connect: the card spaces its own children, but the field and the button live in its form, which had no layout of its own. The form takes the card's grid and gap. Replaced: a form whose field and button touched.

### 23. The cards name where a person finishes

The credential fallback drew no "Continue on GitHub" and Shop B's key page no help link: no card on the roster declared `provider` or `documentationUrl`. The kit's app config takes both and writes them on the card. Each vendor agent names as its provider the vendor whose service it fronts, at the vendor's own site — GitHub, Google's Gmail and Calendar, Linear, CircleCI — and the mock stores a storefront of their own; each names its README in `a2uiverse-apps` as its help page. Replaced: cards naming neither, the fallback with no way out.

### 24. Signing in again to an agent that lost the account

Linear restarted with its store emptied had forgotten the account; its sign-in page refused the vault's `login_hint` ("login_hint names no account here"), and Sign in again ended without an account every time, the tile put back silently — a dead end. A hint naming no account binds nothing: the agent lets the person choose. On signing in again only, an account that comes back as another identity is re-bound to it — its tokens, its `sub` and its label replaced, the journal's sign-in record marked re-bound — and the client says it on the progress line of the slot's canvas, "Signed in to Linear as …"; one the app already holds as another account is refused, "that account is already added". A request for more access stays bound to its account; an agent that still knows the account binds to it as before. Replaced: an unknown hint refused, and a different identity on signing in again failed.

### 25. The deterministic half's run is the first pass, with its fixes run again

The first pass of the ten cases, driven in the reader's browser with the reader watching, is the deterministic half's run; its journal and logs are its evidence. On a fresh stack the reader then runs again what that pass changed or could not do: the chip and Not now (decisions 19 and 20), add-account's waiting step (21), the key page with the demo key entered by the reader (22), "Continue on GitHub" (23), signing in again to an agent that lost the account and the silent refresh after it (24), and the waiting tile put back when the canvas gets the focus back. Replaced: a second full run of the ten cases.

### 26. A sign-in window open is said until it ends

A sign-in window can open as a tab hiding the canvas, so the canvas getting the focus back says nothing of it. The waiting form stays — on the authority tile, the quiet line, the request for more access and the add-account tile — until the sign-in ends, Cancel, or the attempt expires. The full waiting form is the statement, the spinner line, and under it Open the sign-in again and Cancel; Open the sign-in again opens a new window on a new attempt, and whichever finishes is the outcome, the other let go. Replaced: task-12.8 decision 1's tile put back when the canvas regains focus, and decision 21's "Gmail signing in" step on the progress line.

### 27. The add-account tile is the shell's

Adding an account is a `Slot` holding `addAccount`, an app id, which the Planner places when the utterance asks to add an account to an app, or which accounts it has, with no dispatch entry; it writes nothing else for it. The plan check refuses it on an app off the shortlist or asking no sign-in, and a second one for the same app. The painter wraps it in the app's marker and paints, from the vault and the card, the app's name, its accounts already added by label, and what a new account lets the app do. The shell catalog draws it laid out as the authority tile's full form: "Add another Gmail account.", "Already added: …", "Gmail will be able to" with the scopes, Add account, "Opens Gmail's sign-in in a new window"; while its window is open, the waiting form of decision 26. An account added is said on the progress line as before, and the tile's `retry` repaints it listing the account. Replaced: phase-12 decision 20's add-account shell action — a button the Planner wrote calling it — and task-12.8 decisions 5 and 6's press from that action.

### 28. The token page's form keeps its origin

The key page's Connect answered "This sign-in can't start": the orchestrator's pages were served with `Referrer-Policy: no-referrer`, under which a browser posts a form with `Origin: null` (Fetch, "append a request `Origin` header"), and the form's route admits only the orchestrator's own origin. The pages are served with `same-origin`, which keeps the origin on the orchestrator's own form and sends no referrer elsewhere. Replaced: `no-referrer` on the sign-in routes' pages.

### 29. The token page's form through a dev tunnel

With decision 28 in place, Connect was still refused: the dev tunnel hands the form's post on with `Origin` rewritten to the orchestrator's local address, `http://localhost:10001`. The form's route admits the orchestrator's own origins, its public one and its local one, and logs the origin of a post it refuses. Replaced: the public origin alone.

### 30. A pasted key or token says Connect

An app whose sign-in is a pasted key or token — `apiKey` or `http` bearer — is painted with the authority cause `connect`, beside `signIn`. Its tile says "Connect Shop B to show it here.", Connect, and "Opens a page to paste your Shop B key"; its quiet line "Not connected · Connect"; its waiting form "Finish connecting Shop B in the window that opened.", "Waiting for you to finish connecting", Open the page again and Cancel; the progress line "Shop B not connected" and "Shop B connecting". Replaced: task-12.3 decision 4's one wording, "Sign in", for every scheme.

### 31. The window says it closes

A sign-in that ends well names the app — "You're signed in to Google Calendar", or for a pasted key or token "You're connected to Shop B" — says "This window closes in 5 seconds.", counts down beside Close now, then closes; where the browser keeps it open, it says the window can be closed. One that ends badly stays open: "Sign-in didn't finish", or "Shop B wasn't connected" with "Close this window and try connecting again." Replaced: "You're signed in" for every app, the window closing itself 0.6 seconds later.

### 32. The merged view says not connected

A source needing a pasted key or token is, to the shell catalog, a slot in the state `connect`, beside `authority`: the merged view's reserved column reads "· not connected", and a home source's collapse line "…and Shop B isn't connected. Connecting Shop B brings it back." Replaced: "not signed in" and "isn't signed in. Signing in to …" for every scheme.

### 33. GitHub's sign-in asks for notifications

In the live half, "What needs my attention today?" painted GitHub's slot as a failure: GitHub's MCP server answered `list_notifications` with 403, `WWW-Authenticate: Bearer error="insufficient_scope", scope="notifications"`, and the lost session failed the calls beside it. The agent asked GitHub for `repo` and `read:org` alone, which GitHub's REST API takes for notifications and its MCP server does not. The agent asks GitHub for `notifications` beside them, for both its read and its write scope. Replaced: `repo` and `read:org` alone, the read scope promising notifications it could not show.

### 34. A merge still too few names who answered since

GitHub, back through Sign in again over a merge collapsed because no source answered, painted, and the merge's line still read "The merged view needs at least two sources, and none answered." with Retry GitHub, the progress line "No app answered, nothing to join": the arrival found a merge still impossible and left the collapse as it was written. A source arriving over a merge collapsed for too few, through Retry or the resume after a sign-in, writes the line afresh from the sources arrived — "Only GitHub answered, nothing to join", no Retry for it. Replaced: the line written once, when the merge collapsed.

### 35. Retry takes a source that answered in words alone

GitHub answered the attention question in words alone, its slot collapsed to them; the merge's line, carrying Retry over every source that did not arrive (task-8.7 decision 24), offered Retry GitHub, and the orchestrator refused the press — "GitHub has not failed." — with nothing said on the canvas. Retry takes a source that answered in words alone as it takes a failed one: the plan's request goes to it again. Replaced: Retry refused for any slot that had not failed or asked to sign in.

### 36. A failure said in words is worded for the person

GitHub's answer in words alone read "…the connection to GitHub encountered a 403 Forbidden error. Please check your GitHub authorization and permissions…": every agent's prompt keeps prose for a failure it must report and said nothing of its wording, so the model passed the vendor's error on. The kit's prompt assembly gives every app one rule, ahead of the app's own workflow blocks: a failure reported in prose is read on the screen by a person who may not work in tech — what didn't work, and what they can do about it when there is something, in their words; never a status code or error name, an exception, a tool or API name, a URL, or a sign-in or protocol term. Replaced: a failure's wording left to the model.

### 37. No promotion: a question is the app's own paint

Calendar's proposal, declared a question, was promoted — raised with an accent ring over a scrim dimming the rest of the canvas — and read as a dialog that, once pressed, closed into the same UI in its slot. Nothing is raised and nothing dimmed: a paint declared `kind="question"` is a paint like any other, a fragment in its slot or a paint on the stage, and the overlay for a question over the empty stage is gone with it. The progress line says the source "needs your answer", with a circled question mark, from the paint until a press inside it. Replaced: task-2.5 decisions 10 and 11 — shell-granted promotion, the scrim and the count announced — and the overlay for a question over the empty stage.

### 38. A press running outranks the waiting words

Discard pressed under a request for more access left the progress line saying "Google Calendar needs more access" while the press ran: the request's words outranked the press. While a press made inside a source's fragment runs, its step is the source working, its name alone; when the press ends, the step says what still waits on the reader — the request for more access, the question — or that it is done. A sign-in window open still says signing in. Replaced: the sign-in words above every other state of the step.

### 39. A later press drops a request for more access

A request for more access holds the press that needed it, for Allow to send again: after Create event asked for more access and Discard was pressed, the chip stayed, and Allow would have created the event that was discarded. A later press inside the same fragment drops the request — the chip and its card go, the press it held with them — and the journal records it as superseded, its scope keys named. A later press that needs more access itself asks again. Replaced: a request kept until Allow or Not now whatever was pressed after it.

### 42. An app's dialog opens over its own slot

A vendor may draw a dialog; Primer's `ConfirmationDialog` in GitHub's catalog is fixed over the viewport, so it painted over the whole canvas from inside its fragment. The fragment boundary is the containing block of what the app positions fixed — CSS layout containment, which clips nothing — so an app's backdrop and its dialog cover that app's slot alone, and several apps may hold one open at once. The slot holding the focus paints above its neighbours. Replaced: `docs/design/client.md`'s known limit that visual containment isn't DOM containment.

### 40. A proposal is not a question; a dismissed one repaints settled

Calendar's proposal for an event the reader had just asked for was declared a question, and Discard left it on screen with its buttons live, what happened said only in a passing line. The kit's prompt gives every app two rules beside its failure wording: a write the app drafts for the person to confirm is a proposal and is never declared a question — a question is for a choice it cannot go on without; and a proposal dismissed outright — Discard, Not now — is repainted as the same surface settled, its buttons gone, one plain line saying what did not happen. Backing out of a confirm step to edit returns to the draft. The roster's prompts drop the lines saying otherwise: a declined proposal painting nothing, a proposal listed among questions, the shell raising a question. The deterministic answers already repaint a dismissed proposal settled. These are the kit's guidance and the roster's own quality: an app that does otherwise still works on the canvas. Replaced: a proposal declared a question, and a dismissed proposal left as it was.

### 41. Calendar's proposal is as wide as what it holds

Calendar's proposal card stretched across its whole slot for two lines of content. Calendar's prompt has it put the proposal's Surface inside a vertical Stack aligned to start, its catalog's own way to size a card to its content. Replaced: a proposal stretched across the slot.

### 43. GitHub's question policy runs one way

GitHub's question policy tied the question marker and a `ConfirmationDialog` root both ways, so a write proposal drawn as a dialog had to be declared a question. A surface declared a question still needs a `ConfirmationDialog` root; a `ConfirmationDialog` confirming a write GitHub proposed is not a question and is not declared one. GitHub keeps its dialogs. Replaced: the marker and the dialog root implying each other.

### 44. Gmail's surfaces test reads every account's answers

With decisions 40, 41 and 43 the catalogs' test caches missed, and Gmail's surfaces test failed: it read each entry of the deterministic answers' folder as a file, and since task 12.11 that folder holds one set per fake account. The test walks the folder, rendering both accounts' answers. Replaced: a flat read of the folder, its failure hidden by the cache.

### 45. A turn updating a surface painted before is sent

Discard on Calendar's proposal was answered with the same card repainted settled — an update to the proposal's surface, no `createSurface` — and the canvas never changed: the kit's stream parser holds a surface's components back until it has seen that surface created in the same parse, and a delete likewise, so a turn that only updates or deletes a surface an earlier turn painted streamed nothing; the kit validated the whole response, logged it valid and completed. At the end of a valid turn the kit sends every message of the validated response whose surface and kind the stream did not send, whole and in order. A surface created in the turn streams as before. Replaced: an update or a delete to an earlier turn's surface dropped in live mode.

### 46. One press at a time into a fragment

After Allow, Calendar's resume re-sent Create event and ran for seventy seconds with the proposal still on screen; Create event pressed again went through beside it, and two events were created. A press into an app's fragment while a press on that app still runs — an action, Allow's resume, a Retry — is refused by the orchestrator, journaled refused, the app sent nothing; the client holds it back itself and says in the notice line "Google Calendar is still working on that. Try again once it has finished." Replaced: presses into one fragment sent side by side.

### 47. Each request says the person's now

Asked for an event "tomorrow at 10am" on 9 October, Calendar proposed "Tomorrow" and created the event on 27 August: nothing in the platform told an app what "now" is, and the model assumed a date its prompt told it not to. The client sends the person's local time, RFC 3339 with its offset, and their IANA time zone on every message, beside the page's session — the a2uiverse contract's `clientSession` gains `now` and `timeZone`, read whole or not at all. The orchestrator says it in each text request it writes to an app, after the guidance sentence: "The person's local time is Friday 9 October 2026, 14:20 (Asia/Seoul)." — the press's own clock for a Retry, Allow's resume or an account chosen, else the question's. Nothing a2uiverse-specific rides the vendor wire; a request with no clock says none. Replaced: requests carrying no time.

### 48. Calendar's proposal holds the exact time

With decision 47 a request states the person's local time, but a press does not, and Calendar's proposal held only the words "Tomorrow, 10:00 – 10:30 AM", so Create event worked "tomorrow" out again with no clock. A time sentence beside the action was not the way: an agent reading a message's text before its action — the kit does — would take the press for a request and lose it. Calendar resolves the start and end when it drafts, keeps them in the proposal's data model as RFC 3339 values beside the words shown, and creates the event from them. Replaced: a relative date worked out again at the press.

### 49. What waits on the person gathers every app holding a part

"What needs my attention today?" planned Google Calendar, Gmail and GitHub and left Linear out — four of eight runs of the real Planner over the roster's cards, with Linear on the Router's shortlist and its card showing the issues assigned to the person: the Planner's gathering rule named where one kind of thing stands, and "never to fill the screen" decided the rest. The rule also covers what is waiting on the person — what needs them, what is on their plate — whatever their apps hold for them to act on: a review asked of them, mail to answer, a meeting to attend, an issue assigned to them. An app not signed in yet is dispatched all the same, the shell asking for the sign-in in its slot; an agent whose card shows no part is left out. Eight of eight runs then planned Linear. Replaced: the gathering rule over the state of one kind of thing alone.

### 50. A held account asked for more access says so

On the attention question Gmail, signed in to see the inbox, opened a thread before it painted and asked for "Read your email"; its slot took a first sign-in's tile, "Sign in to Gmail to show it here.", and the progress line read "Gmail not signed in". The press already asked Google for the added scope on the same account; only the words were a first sign-in's. A slot whose account is held and asks only for more access — a request before any paint, or an account short of what the card now requires — is painted with the authority cause `more`, beside `signIn` and `connect`. Its tile says "Gmail needs more access to show it here.", "Gmail will be able to" over the missing scopes, Allow, and "Opens Gmail's sign-in in a new window"; its quiet line "Needs more access · Allow"; the progress line "Gmail needs more access"; the merged view's reserved column "· needs more access", and a home source's collapse line "…and Gmail needs more access. Allowing Gmail more access brings it back." The waiting form keeps the sign-in's words. Replaced: a first sign-in's words for a held account short of scopes.

### 51. A range whose end is a full date and time reads as its start

The attention question's merged view drew Calendar's time as written, "2026-10-09T21:00:00-04:00 – 2026-10-09T21:30:00-04:00", beside GitHub's and Linear's "Sep 18, 2026, 7:51 AM", and sorted it as text: the runtime cut a range to its start only when its end was a bare clock. A range's end may also be a full date and time, so Calendar's spelling reads as its start, drawn and sorted with the others. Replaced: a range read only with a clock for its end.

### 52. Every time the shell shows is the viewer's

The merged view drew every time in US Eastern — Gmail's 06:53 UTC as "Oct 9, 2026, 2:53 AM" for a reader in Seoul, for whom it was 3:53 PM — and read a time written with no zone as Eastern wall time: task 5.7 fixed the form as English, US Eastern, after the unit's browser drew it in Korean. The shell reads and shows time in the viewer's zone, as their runtime reports it — the zone the client sends with each request (decision 47) — still in English: a reader in Seoul sees Seoul time, one in New York Eastern. A time with no zone of its own is the viewer's wall time. The shell catalog's tests view from US Eastern, pinned. Replaced: task 5.7's US Eastern for every viewer.

### 53. A time an app shows is the person's where a tool gives it so, never converted by the model

The apps' own cards showed time as their tools gave it: Calendar raw, "2026-10-09T21:00:00-04:00 – …", in the calendar's own zone, tomorrow at 10 in Seoul listed under Today, and "Attendees: None"; Gmail "2026-10-09 05:46 UTC"; Linear "Sep 20, 2026, 4:40 AM UTC"; GitHub once "GMT+9". A model converting a time itself is the error a reader never checks — Calendar's own prompt forbids it, and SPEC axiom 5 keeps what must hold every time in code. The kit's prompt gives every app one rule beside decisions 36 and 40: pass the person's time zone, which the request states (decision 47), on every call to a tool that takes one, a wider second search included; where a tool takes none, show the time as the tool gave it, its zone named; never convert a time yourself. A time is written for a person to read, never a raw timestamp, its date and year kept where the request asks for the full date and time; today and tomorrow are the person's, by the date the request states, said only of a time in their zone; no code value such as None, null or true is shown. Seen live: Calendar asked for Seoul's day in Seoul's zone and said tomorrow's event is not today's; Gmail, whose tools take no zone, names UTC. This is the kit's guidance and the roster's quality: an app that does otherwise still works on the canvas. Replaced: a time shown in whatever form and zone the tool returned.

### 54. "My" names no account

"What's the status of what I'm working on?", with CircleCI signed in to two accounts — retz8 and ekkicb71@gmail.com — sent CircleCI's request to the account labelled with the person's email alone: five of eight runs of the real Planner over the roster's cards asked both, the other three the email account only. The Planner's account rule says a question about state gathers from every account of the app; it also says so beside a merged view, each account a source of its own, and that "my", "mine" and "I" name no account — every account is the person's, a label telling them apart, never a reason to leave one out. Eight of eight runs then asked both; commands still go to one account or the account choice. Replaced: the account rule read as allowing "my" to pick the email-labelled account.

### 55. The live sign-in test keeps its agent's store in a scratch folder

The regression pass after the live half ran task 12.12's live sign-in test right after the agents' original stores were put back: the test's orchestrator ran on a scratch state folder, but its GitHub agent, started by the launcher, kept its sign-in store in the checkout, and the test's sign-in wrote into GitHub's restored store. The launcher takes `--agent-state <dir>`, each agent started with `--state-dir <dir>/<app>`, and the live sign-in test passes a scratch folder cleared at its start. Seen: the test passes, its agent's store in the scratch folder, GitHub's store in the checkout untouched. Replaced: the checkout's own store written by every run of the test.
