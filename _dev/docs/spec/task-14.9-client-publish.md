# Task 14.9 — Client, Publish

Sub-task 14.9 of Phase 14 (`_dev/docs/spec/phase-14-shell-trusted-pages.md`, decisions 4–7, 11 and 21): the Publish destination of the trusted page, following the design canvas's Publish boards (https://claude.ai/artifact/QSAou36Pu9UztpmT1Cgzpw) — claim or sign in, the secret shown once, the listings with their notices, publish from packed folders with the sample answer file, the Store's findings or summary, unpublish and sign-out — over the orchestrator's publisher routes of task 14.4.

## Scope

- Publish in place of 14.6's placeholder: the claim and sign-in forms, the secret shown once, the listings, the publish form, the outcomes, the two confirms.
- Each answer of the read of who is signed in drawn: signed out, accepted, no longer accepted, the Store unreachable, held for another Store.
- The page's own checks before a claim and before a publish.
- Publish's form in the page's address.
- The SPEC amendment this makes; the page's unit tests; 14.6's tests that assert the placeholder.
- Out: the Store (task 14.7); the App Library (task 14.8); the end-to-end coverage and the snapshot (task 14.10); the design record (task 14.12).

## Locked decisions

### 1. A held secret the Store no longer accepts

A notice in place of the listings — "The Store no longer accepts your publisher secret for" the name — with Sign out. Sign out asks once, as the canvas's sign-out confirm does, then shows the claim and sign-in forms.

### 2. A publisher held for another Store

A notice in place of the listings saying the person is signed in as the name for a different Store and must sign out first to publish here, with Sign out asking once. The other Store's address is never shown.

### 3. The Store unreachable on entry

The header as when signed in — "Publishing as" the name, with Sign out — and in place of the listings, "The Store can't be reached right now." with Try again, which runs the check and the listings again. Publish an app is hidden until the Store answers; Sign out still works.

### 4. A claim whose secret this computer couldn't keep

The secret's board — shown once, Copy, the tick, Continue unlocking with it — saying the name is the person's but A2UIVerse couldn't keep the secret on this computer, to save it now and then sign in with it. Continue leads to the sign-in form with the name filled in.

### 5. Leaving the secret's board

Nothing stops leaving the secret's board before Continue; once left, it is gone.

### 6. The check runs on each entry

The read of who is signed in, and the listings with it, run every time Publish is entered, and not when moving between the listings and the publish form. After a publish or an unpublish, only the listings are read again.

### 7. Publish's form is in the address

The publish form is an entry on the browser's history, as an app's view is: the address names the form, and the app for an update. Browser Back from the form returns to the listings. A reload lands on the form with the app id and the app's address filled in again from the listing; the dropped folders and the sample answer file are gone.

### 8. A publish belongs to Publish, not to the form

Once sent, a publish is followed across Publish: if the person went back to the listings, its outcome shows as a notice at the top of them, and the listings are read again. While one runs, Publish an app, Publish an update and Unpublish are held — one act at a time across Publish. Leaving Publish drops the outcome; the next entry's listings show what landed.

### 9. Unpublish

After its confirm, the listing's Unpublish turns to Unpublishing…; the outcome is a notice at the top of the listings — the app left the Store — and the listings are read again. A refusal is a notice, and the listing stays.

### 10. How a refusal reads

Each kind of refusal has a plain lead the page writes from its status and reason — the name already another publisher's, the Store not taking this version with the listing unchanged, the app no longer in the Store, and the rest. Beneath it, the Store's findings verbatim under "What the Store found (findings)", as the term beside the plain words.

### 11. The secret refused mid-session

A publish or an unpublish refused because no publisher is signed in here, because the publisher is held for another Store, or because the Store no longer accepts the secret runs the read of who is signed in again and lands on the matching view — decision 1's, decision 2's, or the claim and sign-in forms — the act's own outcome saying in plain words why it didn't go through. The publish form and its files are left behind. A claim or a sign-in refused because a publisher is now held does the same.

### 12. The ahead-of-the-Store notice names its causes

One notice: "Your app is ahead of the Store (ahead of the Store).", then each cause in plain words — a look the Store doesn't have, with its catalog ids beside as terms; a version the Store doesn't have, naming it; the two joined when both hold — then that no one new can install it until the publisher publishes an update.

### 13. A listing's facts

An app drawn only in the basic look reads "Drawn in the basic look (basic catalog)". An app with several looks has one "Its look (catalog) … at build …" line for each. The build is shortened as Stellify's `list` shortens it, and the catalog id cut from the left; the full id and build are readable on hover and selectable. Listings are ordered by the app's name.

### 14. The sample answer file is always on the form

The field is always on the publish form. Its hint: for an update to an app that asks people to sign in, the canvas's line; for an update to an app that doesn't, that the app doesn't ask people to sign in so the file is left out, the Store asking it its own question; for a new app, that it is needed only if the app asks people to sign in. A wrong choice is the Store's checks', worded as decision 10 has it.

### 15. What the page checks before a publish

Each dropped folder must hold the descriptor at its top; a folder without one is refused on the spot, saying it wasn't packed by Stellify and to drop the folder it wrote. A folder is labelled from its descriptor: the package name and the number of files. The sample answer file passes the sdk's preview check, and its app must be the form's app id. Everything else is left to the Store's checks.

### 16. The publisher name checked before a claim

On Claim, the page checks the name against the sdk's grammar before sending: a name breaking it gets the canvas's line with a suggested name made from what was typed; a name too long, the limit; a reserved name, that it is kept for A2UIVerse. A name taken is the Store's answer: it belongs to another publisher. A new app's id on the publish form gets the same check and words.

### 17. The published outcome

The plain lead — the app and its version are in the Store — and one plain line for the case: a first publish, that people can now find it in the Store; an update, the canvas's App Library line; an app back after an unpublish, that it is back in the Store. Beneath, the summary and each note verbatim under "Summary (publish summary)". The same words serve decision 8's notice.

### 18. A publish with no clear answer

The Store unreachable, the orchestrator unreachable, or an answer the page can't read: "The Store didn't answer, so this version may or may not be in the Store.", then that the person's apps show what the Store has now, the listings read again. The form keeps its fields and files behind Back to the form.

### 19. Docs and tests

SPEC §11 is amended in this task: the page's address carries Publish's form, and the app it updates. The page is covered by unit tests here, and 14.6's tests asserting the placeholder are updated; the end-to-end coverage and the snapshot are task 14.10's, the design record task 14.12's.
