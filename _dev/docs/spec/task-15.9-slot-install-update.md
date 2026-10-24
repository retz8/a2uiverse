# Task 15.9 — Client: the slot's install and update

Sub-task 15.9 of Phase 15 (`_dev/docs/spec/phase-15-store-loop.md`, decisions 1, 5, 9, 11 and 15): the client's half of the slot's install and update — the presses on the offer and the update tile, the consent card over the slot, the Store page opened from a slot filling it — after the design canvas *Store loop — UI reference* (https://claude.ai/artifact/AzEEqot8FAFyeHLgedM1Bo). This spec fixes what the client holds, what a press holds, and what the person sees around it.

## Scope

- The shell catalog's handler for Install, Update and Show it here, and its context, filled by the client (task 15.8's decision 1).
- The presses: the consent card, the install on `orchestratorApi`, `useApp` on the offer, the slot's Retry on the update tile.
- The installed apps the client holds, and each app's running install or update.
- The consent card over the slot.
- The Store page opened from a slot.
- The catalog table read again after the slot's Install and Update (found in 15.6), and after the App Library's uninstall.
- The progress line's steps and the reserved column's states for the update tile; the notice line naming the apps updated along with an install or an update from a slot (found in 15.8).
- The SPEC edits and the note for a later sub-task.

## Locked decisions

### 1. One install or update of an app at a time, everywhere

The client holds, in one place, the installed apps with their versions and each app's running install or update; the slots, the Store and the App Library read it. While an install or update of an app runs — from a slot on any canvas, the Store or the App Library — every Install, Update and Show it here for that app is held until it ends: the slot it came from reads Installing or Updating, every other one is disabled.

### 2. The consent card over the slot

The slot's consent card is the Store's card, its words and presses unchanged, in a frame anchored to the press and floating over the slot, on the canvas only. Escape, a click outside, and leaving the canvas — for another canvas, the trusted page or a new question — each count as Cancel, or Not now for an update. The Store and the App Library keep their centred card.

*Amended by task 15.11 decision 23.* While the card is open, the press it floats from stays where it is on screen: a paint that moves it, the merged view landing above, is scrolled back by the same distance.

### 3. The Store page opened from a slot

A Store page opened from a slot — by "More in the Store" or an offered app's name — stays tied to that slot for as long as it stays open, wherever the person goes in it. An install there of an app the slot offered fills the slot while it is still an unfilled offer; once it has filled, and for any app the slot did not offer, an install keeps today's line. The tie is never written into the page's address.

### 4. The notice line for the apps updated along with it

An install or an update from a slot names the apps that followed it onto a new build in the notice line of the canvas the slot is on, in the Store's words — "Shop B is installed." or "Shop B is updated.", then "Also updated along with it: Shop A." — only when at least one app followed. An install on the Store page opened from a slot puts nothing in the notice line.

### 5. A refusal stays on its slot

A refusal holds on its row, or on the update tile's line, until the next press in that slot, or until the app is installed or updated elsewhere. It belongs to its slot alone: the same app's row on another canvas does not show it.

### 6. The App Library's uninstall reads the catalog table again

An uninstall from the App Library reads the catalog table again, as an install and an update do.

### 7. The press during the entry read

From the press until the consent card opens, while the app's entry is read again, the press is held — the pressed button and every other hold of decision 1 — its words unchanged. A read that cannot reach the Store is a refusal on the row, in the Store's words for the Store unreached.

*Amended by task 15.11 decisions 44 and 45.* A read finding the app no longer in the Store refuses as such: "Shop B isn't in the Store anymore, so nothing was installed.", with nothing to press. A refusal before the card leaves Try again asking on the consent card; Try again goes with no second card only after a press that passed the card, or needed none.

### 8. Proof

Unit tests over the client's half. A check by hand through the tunnel of the install side, on the mock tier published with Shop B uninstalled: Install in the slot with the consent card over it, the key's connect as the second step, the merged view taking Shop B in; "More in the Store" from a second canvas's slot, the install on the page and the slot filling beneath it; a third canvas's row turning to "Show it here". The update tile is covered by the unit tests, and live by the integration run (15.11).

### 9. SPEC edits

Made in this task's implementation session: SPEC §8 and §9.3, the Store page opened from a slot by "More in the Store" or an offered app's name, tied to the slot while it stays open, an install of an app the slot offered filling it while it is an unfilled offer; §7's row for Install, Update and Show it here, one install or update of an app at a time, from a slot, the Store or the App Library; §8, an install or an update from a slot naming the apps that followed it in the notice line, in the Store's words.

### 10. Notes for later sub-tasks

The design records and READMEs (15.12): the client's design record on the one holder of the installed apps and each app's running install or update, the consent card anchored over a slot, and the Store page tied to the slot it was opened from.
