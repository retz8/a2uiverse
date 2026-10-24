# Task 14.7 — Client, the Store

Sub-task 14.7 of Phase 14 (`_dev/docs/spec/phase-14-shell-trusted-pages.md`, decisions 2, 3, 6, 7, 11, 20–22): the Store destination of the trusted page, following the design canvas's Store boards (https://claude.ai/artifact/QSAou36Pu9UztpmT1Cgzpw) — browsing, search, a publisher's apps, an app's view with its sample, the consent card, install and update with their outcomes — and the catalog loader telling two builds of one catalog id apart.

## Scope

- The Store in place of 14.6's placeholder: every app by name, search, the browsing states, a publisher's apps, an app's view with its sample rendered live.
- Install and Update from the Store through the consent card, and their outcomes on the page.
- The consent card in both shapes — install, and the update that asks for more — and the Update press, built once for the Store and the App Library.
- The catalog loader: a preview's build apart from the canvas's, and a new canvas taking the build the registry holds now.
- The orchestrator's install answer: the apps that followed, and a refusal's cause.
- The publisher in the page's address.
- The SPEC amendments these decisions make; 14.6's tests and snapshot that assert the placeholder.
- Out: the App Library's page (task 14.8); Publish (task 14.9); the new end-to-end coverage over the page (task 14.10).

## Locked decisions

### 1. The first build loaded wins per canvas

A preview draws apart from every canvas, with its own renderer and its own lookup of the catalog's provider, and never changes what a canvas holds. Builds are told apart by their artifact id, so a preview and a canvas on the same build share one load. Each canvas keeps the builds it loaded; a canvas started after an install or update moved a catalog to a new build loads the new one. Canvases already on screen keep what they show.

*Amended by task 14.11 decision 39.* A canvas keeps its build's look as well as its components. Each surface of a loaded build is marked with its artifact id, on a box-less element around the catalog's Provider. A stylesheet inside an artifact is read as text, its relative addresses made whole against its own, and its rules wrapped as written in an `@scope` rooted at that build's mark, then adopted onto the page in the order the artifact asked for them. Fonts, keyframes, a layer order and rules aimed at `:root`, `html` or `body` stay page-wide. A browser without `@scope` takes a link per sheet.

### 2. The install answer names the apps that followed

The orchestrator's install answer carries the installed apps that followed the install onto a new catalog build. The page names them by their card names on the line after an install.

### 3. A search runs on Enter

Typing changes nothing until Enter; then the search runs and the address takes the query. Clear, or emptying the box, returns to every app by name. A query that arrives from the capability tile, a Planner's button or a link searches at once.

*Amended by task 14.11 decisions 29 and 31.* The search box clears with a 28px ✕ icon button, inset from the box's edges so its hover never meets them. While the Store is open, each list it has shown — every app, a search's matches — is held. Shown again — the search cleared, back from an app's view, the same search again — it is not read again until the registry changes (an install, update or uninstall from the Store), or on Try again. Another tab or closing the page lets go of them.

### 4. A publisher's apps live in the address

The publisher filter is part of the page's address, replaced on history as the query is: a link opens one publisher's apps, and a reload or Back keeps the filter.

### 5. The sample cannot be pressed

The sample is a picture of an answer: nothing in it takes focus or a press.

### 6. A refused install carries its cause

The orchestrator's refused install answer carries a cause from a closed set — the Store behind the app, the app unreached, the checks failed, the Store unreached — beside its findings. The page draws each refusal's words and press from the cause.

*Amended by task 15.11 decisions 44 and 48.* The closed set gains the app no longer in the Store: "Shop B isn't in the Store anymore, so nothing was installed.", or "…so nothing changed." for an update, with nothing to press, on a slot's offer row, the Store page and the App Library alike. An answer naming no cause the page knows says "That didn't go through, so nothing changed.", with Try again.

### 7. The consent card and the Update press are built here, once

The consent card in both shapes — install, and the update that asks for more — and the Update press with its outcomes are built in this task and used by the App Library (task 14.8).

### 8. Try asking

The app's view lists the first example of each of the card's skills, up to three; the line after an install suggests the first as plain text.

### 9. The app's tile

The first letter of the card's name.

### 10. What signing in says

The app's view and the consent card say what signing in will be, from the card's sign-in requirements: no sign-in, that it doesn't ask you to sign in; OAuth, the scopes in the card's own words; a key or a token, that it will ask you to connect with a key; a sign-in the platform does not support, that signing in to it isn't supported here, Install still allowed.

### 11. The sample's caption

Captured by the Store: "Made by the Store when the app was published", with the date. Captured by the publisher: "Made by the publisher with their own account", with the date.

### 12. The way back from an app's view

The link above an app's view returns to the list it came from, keeping the query or the publisher filter, and is named for it: "All apps", "Back to results", or "Apps by" the publisher.

### 13. An app the Store doesn't list

A link to an app the Store does not list says the app isn't in the Store, with Show every app.

### 14. Order

With no query, by the card's name; with a query, by the search's rank.

*Amended by task 14.11 decisions 27 and 30.* With a query, the Store lists the apps the search answers, in its order: an app whose name every searched word starts, in any case, first, then the apps scoring at least 0.15 and within 0.095 of the best score, in rank order. A search no app reaches answers none, and the Store says so.

### 15. Docs and tests

The SPEC amendments are written in this task: the publisher in the address (§11); the install answer's apps that followed and a refusal's cause, and the first build winning per canvas (§10). 14.6's tests asserting the placeholder and its overlay snapshot are updated here.
