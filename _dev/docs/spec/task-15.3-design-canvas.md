# Task 15.3 — Design canvas: the slot's new states

Sub-task 15.3 of Phase 15 (`_dev/docs/spec/phase-15-store-loop.md`, decisions 1–11, 15 and 17): the design canvas of the slot's new states — the offer, the consent card in the slot, installing, the slot filling, "Show it here", the two lines with nothing to offer, the update tile's two lines, the install ask's installed line — drawn before the shell catalog and client work and attached to the phase heading as its UI reference. This spec fixes what the boards hold.

## Scope

- The offer and every state a person can land on from it.
- The two lines with nothing to offer.
- The update tile and every state a person can land on from it.
- The install ask's installed line.
- The Store page opened from a slot, as far as the slot and the page's after-install notice go.
- The canvas attached to Phase 15's heading in `_dev/TODO.md`.

## Locked decisions

### 1. Every state a person can land on

The canvas draws every state a person can land on, beyond the phase spec's list: an install refused in the slot; the sign-in after an install; the Update press's own path — the consent card for an update that asks for more, updating, an update refused, the slot sending its request again; the needs-more-access tile after an update that asks for more; the uninstalled slot's failure tile; the merged view beside an offer, landing without the offered app and taking it in on arrival; the progress line; the slot filling beneath the Store page opened from it. Today's sign-in tile, needs-more-access tile and failure tile are drawn as they are, only as the step that follows an install or an update. The merged view is drawn beside an offer with no column for the offered app.

### 2. A fixed line heads the offer

One line in the shell's words heads the offer, the same every time. Draft, settled on the canvas: "None of your apps can do this. From the Store:"

*Amended by task 15.11 decisions 32 and 36.* Once an app the offer offered is installed, here or elsewhere, the line reads "From the Store:" alone above its rows; so does an offer whose plan asks nothing of the apps it offers, an install asked for and nothing else. An offer asking something of its apps, none of them installed, keeps the full line.

### 3. What each offered app shows

Each offered app shows its name, its publisher, its short description from the marketplace's entry held to one or two lines, and Install.

### 4. Every offered app, in the Planner's order

The offer shows every app the Planner offered, as one list, nothing hidden, in the order the Planner wrote them.

### 5. The offer has no box

The fixed line heads the offer and the apps follow as rows in the Store's result-row style, set apart by spacing or a hairline. No box is drawn around the offer.

*Amended by task 15.11 decision 46.* The offer — its line, its rows and More in the Store — is at most 880px wide, the Store page's column, at the slot's leading edge.

### 6. An offered app's name opens its view in the Store

Pressing an offered app's name opens that app's view in the Store. A Store page opened from the slot this way is one opened from the slot, as "More in the Store" is: an install there fills the slot. Amends phase decision 5, from "More in the Store" to a Store page opened from the slot.

### 7. The consent card floats over the slot

Install opens the Store's consent card, its words and presses unchanged, floating over the slot and anchored to the Install pressed. The offer stays behind it and nothing on the canvas moves.

### 8. One install at a time

While one offered app installs, every other row's Install is disabled. A refused install brings them back; an install that lands gives the whole offer to its answer. Once the slot fills, the offer is gone.

### 9. From Install to the answer the slot changes once

The pressed row reads Installing, then Installed with Loading…, the rest of the offer staying as it is. The whole slot changes once: to the installed app's answer under its marker, or to the sign-in tile under its marker for an app that needs sign-in.

### 10. A refused install says why on its row

An install refused in the slot shows on that app's row: one line in the Store's words under its name and description, with the press the Store's own refusal carries for that cause. Every other row's Install comes back.

### 11. "Show it here" turns the row

In a slot offering several apps, an app installed elsewhere turns its own row: Install becomes "Show it here", with a quiet "Installed" beside it. The other rows keep Install. A slot waiting on an update that lands elsewhere turns its Update to "Show it here".

*Amended by task 15.11 decisions 32 and 40.* The turned row sits under "From the Store:" alone. A slot waiting on an update that lands elsewhere reads "Shop B is updated." with Show it here.

### 12. The merged view says nothing of an offered app

The merged view says nothing about an offered app until its answer arrives, then takes it in as any source arriving on a Retry. No new words on the merged view.

### 13. No progress-line step for the offer

The offer has no step on the progress line. The installed app joins the line as a source the moment it is installed.

### 14. The two lines with nothing to offer are quiet lines

"Nothing in the Store can do this yet." and "Couldn't reach the Store." take the sign-in's quiet-line form: a glyph that does not mean sign-in, chosen on the canvas, the gray sentence, a dot, then "Search the Store" as a link, on one row.

### 15. The update tile is always one line

The update tile is one line at the quiet line's size, in every slot and every time, under the app's marker. It has no full form.

### 16. The update tile follows the offer's rules

The update tile takes the quiet-line form: a glyph, the gray sentence, a dot, then Update as a link; the waiting line carries no dot and no press. Update for an update that asks for more opens the Store's update consent card floating over the slot, anchored to the press. While it runs, the press reads Updating, then Updated with Loading…, and the slot changes once when the answer arrives. A refused update shows on the line in the Store's words, with the press the Store gives that cause.

*Amended by task 15.11 decisions 39 and 40.* The waiting line carries a dot and Check again, the slot's Retry. While Update runs, the press reads Updating, then the line reads "Shop B is updated." with Loading….

### 17. The update tile's step on the progress line

The update tile's step reads like the sign-in's: the tile's glyph with "Shop B needs an update" or "Shop B waiting on its publisher", "Shop B updating" while the update runs, then the bare name, ticked once it answers.

*Amended by task 15.11 decisions 40 and 43.* Once updated, the step reads "Shop B updated" until the answer lands. While an app's resend runs — a Retry, or the resend after a sign-in or an update — its step spins, even while the answer it showed before is still on the canvas under its tile.

### 18. The install ask's installed line

An offer with no request, once installed, gives way to one line in the shell's own words, with no app marker and no progress-line step: a tick and, in ink, the app installed and one of its own example questions as plain text. Draft: "Shop B is installed. Try asking "…"".

### 19. The Store's notice for an install that fills a slot

On a Store page opened from a slot, an install that fills that slot reads "**Shop B is installed.** It's answering on your canvas.", with "Back to your canvas", which closes the page to the canvas. Draft, settled on the canvas. Every other install keeps today's line, "Try asking "…" on your canvas."

### 20. The roster's real apps

The boards use the deterministic roster's apps. The main story is "camera prices" with Shop A installed and Shop B, from Northlight, offered beside a merged view: Install, the consent card, the key connect as the second step, the merge taking Shop B in. The offer of several apps is the same question with neither shop installed, both offered. The update tile's boards use Shop B and Northlight; the update that asks for more, and the needs-more-access tile after it, use CircleCI.

### 21. Phase 14's form

The canvas takes Phase 14's form: a design canvas artifact, light, its boards 1200×780 on pages and rows, each titled "<code> · <description>" with a mono state label, its stylesheet carried over. Where the code and the earlier canvases differ, today's tiles are drawn as the code has them. The canvas holds the final UI only. Three pages: the offer; the update tile; the Store and other canvases.

### 22. Words

The phase spec's quoted words stay as written. The drafts in this spec are settled on the canvas.

## Open items

- A merged-view column for an offered app — whether the Planner may plan one is task 15.4's (phase decision 8); the canvas draws none.
