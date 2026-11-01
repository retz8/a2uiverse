# 18.6 — The recording

The sitting live on the defaults untouched, recorded through the tunnel by Claude in Chrome as GIFs with stills into `docs/images/`. Sub-task 18.6 of Phase 18 (`_dev/docs/spec/phase-18-ecosystem-run.md`, decisions 6, 8, 9, 13 and 14), on the storyboard task 18.4 settled (`_dev/docs/spec/task-18.4-dry-run.md`, decisions 3, 6 and 7). After 18.5, before 18.7.

## Scope

- The three stages recorded as segments, each export a GIF of its own, the stage GIFs joined from them.
- Nine stills of the key screens.
- The post work that makes every file in `docs/images/` final: the token masked, identical frames folded, the pacing, the joins.
- The platform's start state as phase decision 6 has it, the agents' model pin removed, and the full reset after the last take.
- Out: placing the files in any README (18.7); the sitting log (18.7); any change to the sample; any code change.

## Locked decisions

### 1. The unit of capture is the segment

Each stage is recorded as short segments, each exported as a GIF of its own, six in all. The publish stage: the claim — Publish opened, `a2ui-samples-mirror` typed, Claim, the token shown, the publisher signed in; the check — the card URL entered, Publish pressed, the check's wait, "published restaurant-finder · card 1.0.0 · basic catalog", the listing with its sample on the Publish page; the Store — the Store page opened, the finder's listing among the seven's, its sample painting. The question stage: the ask — a fresh page, the question typed and sent, the layout landing, Calendar's agenda in its slot, the offer of Restaurant Agent by a2ui-samples-mirror in the other; the install — Install pressed, the consent card, Install confirmed, the slot filling with the finder's five restaurants beside Calendar. The booking stage is one segment: Book Now on Xi'an Famous Foods, the form, party of 2, tonight at 19:30, submit, the confirmation.

The stage GIFs phase decision 8 names are the segments of each stage joined on the Mac; the booking's one segment is its stage GIF.

### 2. The look of every export

Every recorder overlay off — click indicators, drag paths, action labels, progress bar, watermark. Export quality 3. The browser window resized at the start of the sitting so the viewport is 1280 × 800 if the remote screen allows it, otherwise left as it is; browser zoom 100%; one size for every segment and every still.

### 3. The token is masked in post

The claim board shows the publisher's token for the frames between Claim and Continue. On the Mac, a flat box is drawn over the token's code box on those frames before the segment is joined or published. No still shows the board.

### 4. A frame at each visible change, nothing else

While recording, the page is watched with text reads, which add no frame. A screenshot is taken only when the screen has changed into a state the GIF holds — the pending layout, Calendar landed with the other slot waiting, the offer in, the consent card, the slot installing, the slot filled, the form, the confirmation, the check's screen, the listing. A wait is one frame, held longer in post. The real instants go to the sitting log from the journal.

### 5. A still is a whole-viewport zoom saved as PNG

Each still is a zoom of the whole viewport taken right after its state's screenshot, saved on the Mac as a PNG. The zoom adds a frame of its own: the first segment's export, the claim, is read on the Mac before the second segment is recorded; a whole-viewport duplicate is folded in post, and a cropped or odd-sized frame turns the method, for the rest of the sitting, to the state's screenshot itself — its JPEG converted to PNG.

### 6. The nine stills

Publish: the claim form with `a2ui-samples-mirror` typed, before Claim; the publish form with the finder's card URL and nothing packed, before Publish; the published line and the listing with its sample on the Publish page; the Store page with the finder among the seven, its sample painted. Question: Calendar's agenda beside the Store's offer; the consent card over the slot; the finder's five restaurants beside Calendar's agenda. Booking: the form filled, 2 people, 2026-11-01, 19:30; the confirmation.

### 7. Each export reaches the Mac by hand, as it comes

The recorder exports by downloading in the controlled browser, on the Windows machine. Each export is named at export with its final name, and the person drops it onto `docs/images/` in the VS Code web explorer as soon as it is exported — six drops in the sitting, one more per retake, the claim's first.

### 8. The names

`ecosystem-run-<stage>-<moment>`, the area after the phase and the README section the files land in. Segments: `ecosystem-run-publish-claim.gif`, `ecosystem-run-publish-check.gif`, `ecosystem-run-publish-store.gif`, `ecosystem-run-question-ask.gif`, `ecosystem-run-question-install.gif`, `ecosystem-run-booking.gif`. Stage joins: `ecosystem-run-publish.gif`, `ecosystem-run-question.gif`. Stills: `ecosystem-run-publish-claim.png`, `ecosystem-run-publish-form.png`, `ecosystem-run-publish-listing.png`, `ecosystem-run-publish-store.png`, `ecosystem-run-question-offer.png`, `ecosystem-run-question-consent.png`, `ecosystem-run-question-composed.png`, `ecosystem-run-booking-form.png`, `ecosystem-run-booking-confirmation.png`. No take number in a name: the files in the repo are the takes that reached the segment's end; a retake exports under the same name and the newest is the one dropped.

### 9. Retakes are per stage, from the stage's reset

A stage's segments come from one pass. A broken segment retakes its stage from the reset phase decision 14 names, except the Store segment of the publish stage, a view of state, which alone can be taken again by opening the Store page afresh. Broken is any of: the stage did not reach its end as the storyboard has it — a slot failed, the check refused or ran past its limit, a press hung; the recording itself failed — frames past 50, a state missed, a wrong window size, an export that did not arrive; the sample's answer reached the end but reads wrong on screen — a wrong cuisine under the heading, words said twice. At most three takes a stage; after the third the best take stands and the sitting log says so. Every take is named in the sitting log with its reason.

### 10. The agents' model pin is removed before the sitting

The `MODEL_NAME` line is removed from the five agents' git-ignored `agent/.env` files before the processes start, so the apps run on the agent kit's default, `gemini-3.8-flash`, as phase decision 13 states; the sitting log names it so.

### 11. The post work is 18.6's, retimed by state

Once the exports are in `docs/images/`, on the Mac: the token mask, identical neighbouring frames folded, the two stage joins, and the pacing — an action frame about 1.2 s, a state frame about 2.5 s, a segment's last frame about 4 s before the loop, the exact values set by eye inside that shape. The segments are retimed as well as the joins, so a segment placed alone reads as it does inside its stage; a join keeps its segments' timings with nothing between them. 18.6 ends with every file in `docs/images/` final; 18.7 only places them.

### 12. The platform is reset after the last take

After the last take, the full reset of task 18.4 decision 7: the finder uninstalled from the App Library, unpublished, the publisher signed out, the marketplace stopped, the publisher's record removed from its ledger, the marketplace started again holding seven, the finder stopped. The run's facts go to the TODO line when ticked and to the sitting log.

## Invariants

- The sample is never changed; the sitting changes no code.
- The platform runs at Phase 17's defaults.
- Every run is live: Calendar against Google, the finder on its own model.
