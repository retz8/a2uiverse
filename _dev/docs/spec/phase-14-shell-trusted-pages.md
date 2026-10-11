# Phase 14 — Shell trusted pages

M10 of SPEC §12, shell trusted pages: the one trusted page over the canvas — the Store, the App Library and Publish — and the publisher who is also a user. Amends SPEC §7, §9.3, §10, §11, §13, §15 and §16.

## Scope

- One trusted page in the client, an overlay over the canvas the canvas is never unmounted beneath, with three destinations: the Store, the App Library, Publish. Addressable.
- The Store over the marketplace, read through the orchestrator: search, listings with the publisher's name and the captured preview rendered live, install and update, a publisher's listings by name.
- The App Library over the local registry: installed apps with their update states and the update, uninstall, and each app's accounts — sign out, rename, permissions, add account.
- Publish: the publisher's side of the marketplace on the same page — claim, sign-in, the listings with their notices, publish from packed artifact directories, unpublish.
- The orchestrator's side: browser writes authorized without the token; the account routes; sign-in with no canvas; the Store's reads and the publisher's calls relayed to the marketplace; the publisher's secret held; the installed-apps reader's update state.
- The shell catalog's third action, open Publish, and the Planner's vocabulary.
- Two ways in: the Planner's shell actions and a manual entry point in the client shell.
- The design canvas of the page, drawn before the client work.
- Dev harness, integration through the tunnel, SPEC amendments, the design record.
- Out: the loop from the capability gap through install to the resume, the install result on the canvas, the pre-dispatch checks for an app ahead of the Store and the forced update (Phase 15); a page served by the marketplace process; `[apps]` work — none is in sight.

## Locked decisions

### 1. The design canvas comes after this spec, before the client work

The page is drawn as a design canvas, the way Phases 7 and 12 drew theirs, in a sub-task of its own after the doc edits and before any client sub-task, attached to the phase heading. This grill locks what the page holds; the canvas settles its look, and each client sub-task matches its boards.

### 2. The Store installs

Phase 6's decision holds: the Store page sits in front of the install grant, so the whole path from browsing to grant is model-free. Phase 15 adds the loop from the capability gap and the resume, not the install.

### 3. The client reaches the marketplace through the orchestrator

The client talks only to the orchestrator. `orchestratorApi` gains the Store's reads — the search, the index, an app's entry, its captured preview and the preview's artifact files for catalogs the registry does not hold — the orchestrator relaying to the marketplace it already knows the address of, each listing annotated with what only the orchestrator holds: whether the app is installed, and its update state. The browser knows one address.

### 4. One trusted page, with Publish on it

A publisher can be a user of A2UIVerse. The publisher's page is not a page the marketplace serves; it is a destination of the client's one trusted page, beside the Store and the App Library. The marketplace serves no page. Stellify stays, for a publisher who does not run A2UIVerse.

### 5. The browser never holds the publisher's secret

The orchestrator keeps the publisher's name and token in its state directory, with the protections the vault's accounts have, and relays every publisher call to the marketplace with the bearer attached. The client shows Publish; the orchestrator is the publisher's hands. One publisher per orchestrator: claimed from the page with the token shown once, or pasted from an earlier claim; forgotten on the page's sign-out.

*Amended by task 14.4.* The publisher is held with the marketplace that issued the token, the only one it is sent to; one held for another Store is shown by its name alone. A pasted token comes with its name and is checked at once, through a marketplace route that answers whose a token is. A claim or a sign-in waits for sign-out while any publisher is held, and sign-out is the only way the token is forgotten.

### 6. What Publish covers

Claim a name; sign in with the token; the listings as Stellify's `list` prints them — each app's card version, each catalog id at its build, the retired lines, the ahead-of-the-Store notice — each with its captured preview rendered live; unpublish; and publish from the page: the publisher picks the packed artifact directories Stellify wrote, gives the card URL and, for a sign-in app, the preview file Stellify captured; the page posts the same publish body the command line does and shows the gate's findings or the summary. Pack and preview capture stay in Stellify, on the publisher's terminal: pack runs in the catalog's checkout, and preview captures a paint with the publisher's own credential.

### 7. A publisher's own listings is a filter by name

As task 13.4's decision 10 has Stellify's `list` keep the index entries whose publisher is the file's name, the Store shows a publisher's listings by filtering the public index on the name. No secret is needed to see them.

### 8. Browser writes are origin-checked

The orchestrator's write routes — install, update, uninstall, sign-out, rename, the publisher's calls — accept a request from an allowed browser origin without the write token: the origin list CORS already admits, the check the vault's key page already runs against forged requests, a JSON body required. The token stays for callers that are not a browser, the launcher and the registry command. SPEC §10's token sentence is amended.

*Amended by task 14.3.* The allowed origins are localhost and 127.0.0.1 on any port and the hosts of the orchestrator's own dev tunnel on any port, read from its base URL — one list for CORS and the write check. Every write, with the token or without, carries the JSON content type.

### 9. Two ways in

Asking opens a destination through the Planner's shell actions. A manual entry point in the client shell, beside Back and Trail, opens the page by hand. Where it sits and how it looks is the design canvas's.

### 10. Three destinations

The Store, opened with or without a query; the App Library; Publish, behind its sign-in. The shell actions open the Store and open the App Library land on the first two. Whether Publish is a third tab beside them or a mode switch above them is the design canvas's.

### 11. The page is addressable

The page, its destination and the Store's query live in the URL, pushed onto the browser's history when the page opens: browser Back closes the page to the canvas untouched beneath, a reload lands on that page over a fresh session, a link opens the Store on a query. The canvas itself stays unaddressed, since a reload starts fresh (SPEC §6).

*Amended by task 14.2.* Open the App Library takes an optional app, as open the Store takes its query, and lands on that app's view. The URL carries the app too, so a link opens one app in the Store or the App Library.

### 12. A third shell action, open Publish

The shell catalog declares open Publish beside open the Store and open the App Library; the Planner's vocabulary names it, and a question about publishing is answered from the platform's card with a button that lands on Publish.

### 13. The installed-apps reader sees the update state

The reader hands the Planner each app's update state as last computed — one plain word per app, with when the check ran — and never runs a fresh check inside a plan. A plan never waits on the marketplace or a live card.

### 14. The App Library's update states

Carried from Phase 13: each installed app's state from the orchestrator's check, in plain words — a newer build quietly, a major update as a suggestion, a card update with its new scopes or catalogs named, an update required for a line the agent retired, ahead of the Store as waiting for the publisher, no longer published — and the update as the install from the marketplace by id. The App Library reads fresh states from the browser.

### 15. Sign-in from the App Library runs with no canvas

Add account and sign in again open the same popup and poll the same way; nothing resumes, the account appears on the page. Slots on open canvases waiting on that app load on their own press, as SPEC §8 says.

### 16. Sign-out is per account

An account's tokens are revoked where the server advertises revocation and dropped from the vault, the way uninstall does for a whole app. Canvases already composed keep what they hold; a later dispatch to that account asks for sign-in again.

*Amended by task 14.3.* The sign-out answers with what became of the access — cancelled, nowhere to cancel, or failed to cancel — the account dropped in every case. Signing in on a slot bound to the signed-out account brings that account's number back.

### 17. Rename changes the label the vault holds

The Planner and new paints read the new label; canvases already painted keep the old one.

### 18. The permissions view is read-only

The scopes the account holds, in the card's own words, as the authority tile says them; a key account says it is connected with a key. The way to drop a permission is sign out and sign in again, since a token's scopes cannot be trimmed.

### 19. Uninstall asks once

The App Library's uninstall asks once, saying it also signs the app's accounts out, then runs Phase 11's uninstall.

### 20. A Store listing for an installed app shows its state

Installed, or the update waiting, in place of Install. Nothing opens the app from the Store; asking does.

### 21. Every act on the page is journaled

Install, update, uninstall, sign-out, rename, publish, unpublish.

### 22. Two known consequences

Into SPEC §16: a vendor catalog's code runs in the client to render a Store preview before the app is installed; the orchestrator holds the publisher's secret beside the accounts'.

### 23. What proves the phase

On the deterministic roster through the tunnel, the marketplace running under the launcher's publish flag, each item fixed on the spot in the reader's UX and design points as Phases 8, 9 and 12 did:

1. The page opened three ways — a Planner's button, the manual entry point, a URL carrying the destination and a query — and browser Back closing it to the canvas untouched beneath.
2. Store: search over the published roster, a listing with its publisher's name and its preview rendered live, an app installed from it and composed in the same session without reload.
3. App Library: each update state shown in plain words and the update taken; uninstall; an account signed out, renamed, its permissions read, an account added; the two Gmail accounts.
4. Publish: a name claimed on the page, an app published from packed directories with its preview file, the gate's refusal shown for a breaking schema, unpublish, the ahead-of-the-Store notice on a listing.
5. The Planner answering "is anything out of date?" from the reader, and landing on Publish from its button.
6. A clean regression pass and the write-up.

### 24. Docs

SPEC §7 (the third shell action), §9.3 (the one trusted page and its three destinations; the publisher who is a user; Publish), §10 (browser writes origin-checked, the token for the rest; the Store's reads and the publisher's calls relayed; the publisher's secret held; the reader's update state), §11 (the trusted page as an addressable overlay over the canvas), §13 (Stellify beside the page), §15, §16 (the known consequences above). Phase 6's decision on the two shell actions and task 6.5's open item on addressability amended. The Phase 15 note in `_dev/TODO.md`.

*Amended by task 14.1.* §4.2 (the action set), §5.6 (the reader's bullet) and §12 (the M10 line) as well, each carrying one of the decisions above. A design record for the trusted page; `marketplace.md`, `app-install.md`, `authority.md`, `client.md` and `orchestrator.md` keeping their parts; every README.

## Invariants

- The browser holds no secret: neither an account's credential nor the publisher's token, which passes through the claim's answer once, kept by no page and never read again.
- The model authors neither the Store nor the App Library nor Publish, and never reads the marketplace index; it paints an affordance into them.
- The canvas stays mounted beneath the page.
- The client talks only to the orchestrator.
