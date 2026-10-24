# Task 15.8 — Shell catalog: the slot's new states

Sub-task 15.8 of Phase 15 (`_dev/docs/spec/phase-15-store-loop.md`, decisions 1, 5, 6, 9, 11, 15 and 17): the shell catalog's half of the slot's new states — the offer and every state a person can land on from it, the two lines with nothing to offer, the update tile's four lines and the states after Update, the install ask's installed line — drawn after the design canvas *Store loop — UI reference* (https://claude.ai/artifact/AzEEqot8FAFyeHLgedM1Bo). This spec fixes what the shell catalog draws, from what, and what the slot carries.

## Scope

- The shell catalog's `Slot`: the offer, its rows' states, the two lines with nothing to offer, the update tile and its states, the installed line; the capability tile removed.
- The seam the client fills for the presses on them.
- What the orchestrator paints on the slot between an install or an update and the app's first answer.
- The refusal words, shared by the slot, the Store and the App Library.
- The reserved column's words for the update tile's lines.
- The design-check page.

## Locked decisions

### 1. The shell catalog draws every pixel in the slot

The shell catalog draws the slot's new states and the states of a press on them: on the offer, Installing, then Installed with Loading…, every other row's Install disabled, a refusal on its row, "Show it here"; on the update tile, Updating, then Updated with Loading…, a refusal on the line, "Show it here". It draws them from one new handler for Install, Update and Show it here, called inside the click with the element pressed, and one new context the client fills: for each slot, the press running or how it was refused, and the apps the client holds installed with their versions. The consent card stays the client's.

*Amended by task 15.11 decision 40.* After Update the line reads "Shop B is updated." with Loading…; a tile whose app was updated elsewhere reads "Shop B is updated." with Show it here.

### 2. The slot changes once

Until the installed app's first answer, the slot the orchestrator repaints keeps the offer it came from and which app was installed there; after Update, it keeps the update facts its line was drawn from. The shell catalog draws the offer, or the update line, with Installed or Updated and Loading… from them, the app's marker held back until the answer or the sign-in tile lands. Task 15.4's decision 11 is amended.

*Amended by task 15.11 decision 40.* The update line is drawn as "Shop B is updated." with Loading….

### 3. The refusal words live in the sdk

The Store's words for a refused install or update — each cause's words, tone and press — move from the client to the sdk, beside the update states' words. The Store, the App Library and the shell catalog read them; the client tells the shell catalog only the refusal's cause.

### 4. The update tile's short words

The reserved column and the progress line's step say each update line in one short phrase: "needs an update", "waiting on its publisher", "couldn't check for updates" when the Store could not be reached, "no update available" when the Store has no update for the app.

### 5. The installed line with no example

An offer with no request, once its app is installed, reads "Shop B is installed. Ask it something." when the app's card has no example question.

### 6. Apps updated along with an install or an update

An install or an update made from a slot names the apps that followed it onto a new build in the canvas's notice line, in the Store's words.

### 7. The capability tile goes

A slot holding a gap carries its offer or the app installed there; one carrying neither is refused.

### 8. The Store opened from the slot

"More in the Store" and an offered app's name raise the shell's existing open-the-Store action, naming the slot by its component id — "More in the Store" with the gap's words, an app's name with the app. The app is set only by the shell's own components; the Planner's open-the-Store action is unchanged.

### 9. The canvas as drawn

The offer: the fixed line "None of your apps can do this. From the Store:", then each app as a row — its letter tile, name, publisher, a description held to two lines, Install — in the Planner's order, with no box, and "More in the Store" beneath; the offer and the installed line carry no marker. The two lines with nothing to offer: a magnifying glass, the gray sentence, a dot, "Search the Store". The update tile: one line under the app's marker with a circled up-arrow; the waiting line with no dot and no press; "Shop B has changed, and the Store couldn't be reached." with Retry; "Shop B has changed, and the Store has no update for it." with no press.

*Amended by task 15.11 decisions 32, 36, 39 and 46.* The offer opens with "From the Store:" alone once an app it offered is installed, here or elsewhere, and when its plan asks nothing of the apps it offers; it is at most 880px wide, the Store page's column, at the slot's leading edge. The waiting line carries a dot and Check again.

### 10. The design-check page

The shell catalog's design-check page shows every new state — the offer with one app and with several; each row's states, Installing, Installed with Loading…, disabled, the four refusals, Show it here; the two lines with nothing to offer; the update tile's four lines with Updating, Updated with Loading…, the refusals and Show it here; the installed line with and without an example; the reserved column's four update words — and the capability tile leaves it. It is checked through the tunnel against the canvas's boards. The render tests cover the same states.

*Amended by task 15.11 decisions 39 and 40.* The page shows the waiting line with Check again, and "Shop B is updated." with Loading… and with Show it here.

### 11. SPEC edits

SPEC §14's offer and update tile rows: the slot keeping the offer it came from, or the update facts, until the app's first answer. SPEC §8: the reserved column's "couldn't check for updates" and "no update available".

### 12. Notes for later sub-tasks

The client's sub-task (15.9): the new handler and context filled; the consent card over the slot; the Store page opened from a slot; the progress line's steps for the update tile, "Shop B updating" and the four short words among them; the reserved column's update states; the notice line of decision 6. The design records and READMEs (15.12): the refusal words in the sdk, and the shell catalog's new handler and context.

## Invariants

- Install, Update and Show it here are disabled wherever a press cannot be made today.
- One press at a time on an app holds for Install, Update and Show it here.
- The slot's announcements follow its existing patterns.
