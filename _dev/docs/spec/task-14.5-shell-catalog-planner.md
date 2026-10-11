# Task 14.5 — Shell catalog and Planner

Sub-task 14.5 of Phase 14 (`_dev/docs/spec/phase-14-shell-trusted-pages.md`, decisions 11–14): the third shell action, open Publish; open the App Library's optional app; the update result held as last computed, with when, and the installed-apps reader's update state read from it; an install, update or uninstall clearing the held state; the Planner's vocabulary. Carries task 14.2's decision 17, task 14.3's decision 10 and task 14.4's decision 2.

## Scope

- Open Publish declared in the shell catalog and handled beside open the Store and open the App Library.
- Open the App Library's optional app, and Manage apps naming its app.
- The update result held as last computed, with when the check began, and cleared by an act.
- The installed-apps reader's update state, in the App Library's words.
- The platform's card, the Planner's prompt and its worked examples.
- The client's existing placeholder carrying both actions through.
- Out: the trusted page itself, the address, the third action's landing on the real page (task 14.6); the App Library's page (task 14.8).

## Locked decisions

### 1. The held result stays in memory

The update result as last computed is held in memory only; the boot check refills it on every start.

### 2. A check that cannot reach the marketplace replaces it

As today: every app's state becomes unknown, and that replaces the held result.

### 3. An act wins over a check already running

An app installed, updated or uninstalled after a check began gets no entry from that check. The check's own install of a newer build is not such an act; the check computes that app's state itself.

### 4. An act clears every app whose installed record changed

The app acted on and each app that followed it onto a new catalog build lose their held entry, with no check run, and read as not checked until the next check.

### 5. When the check ran, as how long ago

The held result records when its check began. The reader hands it as how long ago, worked out when the Planner calls it — "checked 12 minutes ago".

### 6. The reader hands the App Library's words

One phrase per app, the design canvas's App Library words:

| State | Words |
|---|---|
| up to date | Up to date |
| a newer build | A small update is ready |
| a major update | A new version is available |
| a card update | An update that asks for more |
| update required | Needs an update to keep working |
| ahead of the Store | A newer version is on its way from the publisher |
| no longer published | No longer in the Store |
| unknown | Couldn't check for updates |
| no held entry | Not checked yet |

The words live in one place the App Library's page reads too.

### 7. An app installed from a local copy

An app installed from a local copy that the Store does not list reads "Installed from your computer". When the Store lists its app id, the computed state's words stand. The rule lives with the words of decision 6.

### 8. Open Publish takes no argument

It lands on Publish as it stands.

### 9. Open the App Library takes an optional app

Manage apps on the tile saying sign-in is not supported names its app.

### 10. The client's placeholder carries both

Open Publish opens a Publish placeholder; open the App Library's app rides the page state and the report to the orchestrator for the journal. Task 14.6 replaces the placeholder with the page.

### 11. The plan check refuses an app the registry does not hold

Open the App Library's app is checked against the installed apps, not the shortlist.

### 12. The platform's card

A new publishing skill, in the design canvas's words for the publishing answer: pack the app with Stellify in its own folder; open Publish; claim a publisher name once; give it the folders Stellify wrote and the app's address; an app that asks people to sign in also needs the sample answer Stellify captured with the publisher's own account; before it is listed, the Store fetches the app, checks its files and asks it one question. The installed-apps skill gains whether each app has an update, as of the last check, with examples such as "is anything out of date?".

### 13. The Planner's prompt and examples

The prompt names the three actions. One worked example is added: the out-of-date answer, with Open the App Library and a button naming an app. The publishing answer has no example.

### 14. Docs

SPEC §10 (decisions 3 and 4), §5.6 (decisions 5 and 6), §9.3 (decision 7). The shell catalog's platform-UI guidance, listing the three actions and no other; its README and its design record.
