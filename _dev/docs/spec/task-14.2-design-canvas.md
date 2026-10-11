# Task 14.2 — Design canvas: the trusted page's boards

Sub-task 14.2 of Phase 14 (`_dev/docs/spec/phase-14-shell-trusted-pages.md`, decisions 1, 2, 9, 10, 11 and 14–20): the design canvas of the one trusted page — the entry point, the Store, the App Library with its accounts, Publish — drawn before the client work and attached to the phase heading as its UI reference. This spec fixes what the boards hold.

## Scope

- The boards: the entry point, the Store, the App Library with each app's accounts, Publish.
- Each board's main path and every state a person can land on.
- The two choices the phase spec leaves to the canvas, drawn on it: where the entry point sits and how it looks (phase decision 9); Publish as a third tab beside the Store and the App Library or a mode switch above them (phase decision 10).
- The canvas attached to Phase 14's heading in `_dev/TODO.md`.

## Locked decisions

### 1. Every state a person can land on

Each board draws its main path and every state a person can land on: no results, loading, the Store unreachable, an install refused, a publish refused by the gate, the confirm steps, the sign-in waiting form.

### 2. The Store with no query lists every published app, by name

Opened without a query, the Store shows the search box over every published app as result rows, ordered by name.

### 3. A result row opens the app's view

A result row carries the app's name, its publisher's name, a short description, and Install or the app's state. Pressing the row opens the app's own view: the live preview, what the app does, and the sign-in it will ask for.

### 4. Install passes a consent card

Install, from a row or from the app view, opens one card in the authority tile's shape: what the app is, who publishes it, and what it will ask to sign in to, in its own words. One Install press on the card confirms.

### 5. After an install the page stays in place

The consent card closes, and the row and the app view read Installed. A line names any other installed apps updated along with it. A line suggests a question to try, taken from the app's own example questions, as plain text.

### 6. The preview sits in a labelled sample frame

The live preview sits inside a visible frame headed by the question it answered, keeping the app's drawing apart from the page's own controls. A quiet line says when it was made and, for a sign-in app, that the publisher made it with their own account.

### 7. The App Library is a list that opens an app view

Each row carries the app's name and its update state in plain words. Pressing a row opens the app's view: the update, its accounts with their actions, Add account, and Uninstall at the bottom.

### 8. The update states and their presses

| State | Draft words, settled on the canvas | Press |
| --- | --- | --- |
| up to date | Up to date | none |
| newer build, held back | A small update is ready | Update |
| major update | A new version is available | Update |
| card update | An update that asks for more | Update |
| update required | Needs an update to keep working | Update |
| ahead of the Store | A newer version is on its way from the publisher | none |
| not published | No longer in the Store | none |
| unknown | Couldn't check for updates | Check again |

The same Update press stands in the Store wherever an installed app's listing shows a waiting update. The card update's Update passes the consent card, which shows only the new permissions or the new look the update brings; every other Update goes straight through.

### 9. An app installed from a local copy

Its row reads "Installed from your computer" in place of an update state. When the Store lists the app, its state shows as any other app's does, and Update replaces the local copy with the Store's version. It is one row state, not a board of its own.

### 10. Signing an account out asks once

For an account connected with a key, the question says the key will be needed again to reconnect.

### 11. Add account and Sign in again wait in place

Both use the canvas's sign-in waiting form, in place of the press inside the app view, and end with the account in the list under the label its sign-in gave it. The outcomes drawn: added, cancelled, expired, and refused because the identity is already one of the app's accounts. An account whose sign-in lapsed shows Sign in again on its own row, through the same form.

### 12. Publish leads with plain words, Stellify's term beside each

Publish's words are plain, each with the term Stellify prints beside it — "Your app's address (card URL)".

### 13. The publisher's token is guarded

After a claim the token is shown once, with Copy and one line saying it is the only way back to the name; Continue unlocks after a tick saying "I've saved it". Signing out of Publish asks once and says the token will be needed to sign back in.

### 14. Files come in by drag and drop or file upload

The publish form takes the app id, the app's address, zero or more packed folders, and the preview file for a sign-in app. The folders and the preview file come in by drag and drop or file upload; the page reads them and sends their contents.

### 15. A listing carries Unpublish and Publish an update

Unpublish asks once, saying people who installed the app keep it and the name stays the publisher's. Publish an update opens the publish form with the app id and the app's address filled in; the ahead-of-the-Store notice points at it.

### 16. The entry point opens the last destination

The manual entry point opens the destination last open this session, the Store the first time.

### 17. A press can land on one app's view

Open the App Library gains an optional app, as open the Store has an optional query. Manage apps and the Planner's button land on that app's view. The address carries the app, so a link opens one app in the Store or the App Library. Amends phase decision 11; the optional app is task 14.5's.

### 18. The entry point sits beneath Trail

An icon button third in the gutter, after Back and Trail, named "Apps" on hover and to assistive technology.

### 19. Publish is a mode at the header's right

The Store and the App Library are the page's two tabs; Publish is a separate button at the header's right edge, filled while it is open.

### 20. The canvas holds the final UI only

The options not chosen are removed from the canvas.

## Open items

- The Store ordered by number of installs, later.
