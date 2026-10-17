# Task 14.8 — Client, the App Library

Sub-task 14.8 of Phase 14 (`_dev/docs/spec/phase-14-shell-trusted-pages.md`, decisions 13–21): the App Library destination of the trusted page, following the design canvas's App Library boards (https://claude.ai/artifact/QSAou36Pu9UztpmT1Cgzpw) — the installed apps with their states in plain words, the update, uninstall, and each app's accounts: sign out, rename, permissions, add account.

## Scope

- The App Library in place of 14.6's placeholder: the list of installed apps with their update states, and an app's view with its state, its accounts and Uninstall.
- The update from the list and from an app's view, through 14.7's consent card and Update press.
- The accounts: sign out, rename, permissions, add account and sign in again, with no canvas.
- The installed list saying whether each app was reached.
- The SPEC amendment this makes; the page's unit tests.
- Out: the Store (task 14.7); Publish (task 14.9); the end-to-end coverage and the snapshot (task 14.10); the design record (task 14.12).

## Locked decisions

### 1. The check runs on each entry

The update check runs every time the App Library is entered — from a closed page, from the Store, from Publish — and not when moving between the list and an app's view inside it. Check again runs it again. The header's time is when that check began.

### 2. An app not reached

The installed list says whether each app was reached — at startup, or by an update check since, which fetches every app's card again. On the list, an app that was not reads "Couldn't be reached" in place of its update state. Its view keeps the update state and adds a notice saying it can't answer right now and Check again tries it once more, with Check again. Its accounts and Uninstall work as for any app.

### 3. The check runs again after an update

After an update, the page runs the check again, so the updated app and each app that followed it read their state as checked.

### 4. A list row's Update

A row's Update turns to Updating, and the outcome shows as a notice at the top of the list naming the app: updated, with the apps updated along with it, or refused with its words and press. Updates and uninstalls run one at a time across the page; account acts stay independent.

### 5. An app that isn't installed

An address naming an app that isn't installed says "This app isn't installed.", with Find it in the Store — the Store's view of that app — and Your apps. After an uninstall, the address drops the app by replacing its history entry, so Back doesn't land on the removed app's view.

*Amended by task 14.11 decision 28.* An app's view opened from "Your apps" is pushed onto the history over the list, so an uninstall there returns to the list by going back over the view's entry, as the view's own way back does; a view opened with no list behind it is replaced by the list. Either way Back doesn't land on the removed app's view.

### 6. The publisher on an app's view

An app's view reads the app's Store listing and shows "by" its publisher, linking to the Store filtered to that publisher. With no listing, the line is left out.

### 7. An app that asks no sign-in

An app that asks no sign-in has no Accounts section; one quiet line says it doesn't ask you to sign in. Uninstall's note and its question say nothing of accounts.

### 8. Permissions the app doesn't describe

For an account whose app gives no words for its permissions, Permissions still opens and says the app doesn't say what it can do with this account.

### 9. What sign-out says

An account signed out leaves the list with a line saying it is signed out. Access cancelled and nowhere to cancel read the same. When cancelling failed, the line adds that the app couldn't be reached to cancel its access and that it can be removed from the app's own account settings. Uninstall's notice carries the same sentence for each account whose cancel failed.

### 10. Cancel and leaving while a sign-in waits

As on the canvas: Cancel turns the waiting form back to Add account with the cancelled line, and the attempt is still watched while the app's view stays open, so a sign-in finished afterwards shows the account added. Leaving the app's view or the page stops watching; an account finished later shows the next time the accounts are read.

### 11. Add account for an app connected with a key

The same Add account press. Its note says it opens a page to connect the app with its key, in a new window, and the waiting form uses its connecting words.

### 12. Docs and tests

SPEC §10 is amended in this task: the installed list says whether each app was reached, and an app not reached at startup stays unroutable until a check reaches it. The page is covered by unit tests here; the end-to-end coverage and the snapshot are task 14.10's, the design record task 14.12's.
