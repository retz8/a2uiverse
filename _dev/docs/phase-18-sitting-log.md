# Phase 18 sitting log — the ecosystem run

The sitting of 2026-11-01: upstream's Node restaurant finder published on Publish by a fresh publisher, found from a question no installed app could answer, installed from the Store's offer, composed beside Google Calendar, and a table booked inside it, with no change to its code. Every instant is Korea Standard Time, the journal's UTC plus nine hours, taken from the orchestrator's journal (`apps/orchestrator/.state/intent-journal.jsonl`, its lines of the sitting) unless the 18.6 record is named beside it.

---

## 1. The day and the sample

| Item | Value |
| --- | --- |
| Day | Sunday 2026-11-01, from 12:35 to 13:01, the sitting's first journal line to its last |
| Driven | by Claude in Chrome through the dev tunnel, the browser on its far side |
| The sample | the Node restaurant finder, `samples/agent/node/restaurant_finder` |
| Its commit | `upstream/main` `825beac2` of 2026-10-30, run from `../a2ui-upstream/`, a worktree of the fork at `upstream/main` |
| How it ran | as its README runs it, unchanged: the project's existing Gemini key as `GEMINI_API_KEY` in its environment, `PORT=11006` since its default, 10002, is the marketplace's |
| Its model | `gemini-3.6-flash`, the sample's default, `MODEL_NAME` not set |
| Its card | Restaurant Agent, version 1.0.0, one skill, Find Restaurants Tool, its example "Find me the top 10 chinese restaurants in the US"; no catalog declared, so the basic catalog; no sign-in |

---

## 2. The platform's settings

Phase 17's defaults, as section 4 of the [Phase 17 notes](phase-17-model-trial-notes.md#4-the-defaults-phase-18-records-with) records them, nothing moved for the sitting:

| Part | Model | Effort |
| --- | --- | --- |
| The Planner | Claude Sonnet 5.5, `anthropic/claude-sonnet-5-5` | `low` |
| The Synthesizer | `gemini-3.8-flash` | `low` |
| The apps | `gemini-3.8-flash` | `low` |

The plan cache on. The question's plan searched the Store, so it was written fresh and not kept.

- **The seven apps** live from one launcher that installs nothing, each staying installed from the Store; only Calendar was asked. The `MODEL_NAME` line removed from all seven agents' git-ignored `agent/.env`, each on the agent kit's default; Calendar's requests logged on `gemini-3.8-flash`.
- **Calendar** signed in before the sitting to the dedicated test account, its demo calendar as the dry run seeded it, the Seoul day unchanged: Vendor sync from 02:00 to 02:45 and Team standup from 23:30 to 23:45, in Seoul hours.
- **The start state** of the phase spec's decision 6: the marketplace holding its seven apps, the registry with them installed, the restaurant finder published by no one and installed nowhere, no publisher held on the orchestrator; a fresh page load before the question.
- **The browser window** maximized, the remote screen refusing a resize: a 1920 × 897 viewport at 100% zoom, the recorder scaling every frame to 1568 × 733.

---

## 3. The publish

Take 2's instants. Take 1 and its reset are in section 7.

| At | What |
| --- | --- |
| 12:46:18.1 | `a2ui-samples-mirror` claimed on Publish, the token shown once, the publisher signed in |
| 12:48:44.6 | Published, about 35 s after Publish was pressed (the 18.6 record): the card URL `http://localhost:11006/.well-known/agent-card.json`, nothing packed; "published restaurant-finder · card 1.0.0 · basic catalog" and "app id "restaurant-finder" is now a2ui-samples-mirror's" |

The gate and the hello-fragment smoke test ran inside the publish; no record times the smoke test apart from it (section 8).

On Publish: "Restaurant Agent 1.0.0 is in the Store.", the listing at version 1.0.0, drawn in the basic look, its sample answer painting — "Top Chinese Restaurants", Xi'an Famous Foods and Han Dynasty first. In the Store: the finder's listing among the seven apps', then its own page, by a2ui-samples-mirror, the same sample painting, "Restaurant Agent doesn't ask you to sign in."

---

## 4. The question

The words, as the dry run's spec has them in its decision 3: "I want to book a table at a Chinese restaurant in New York for dinner tonight. Show me today's calendar too, so I can pick a time that fits."

| At | Since the question | What |
| --- | --- | --- |
| 12:52:43.4 | 0 | The question reaches the orchestrator, from a fresh page |
| | 0.02 s | The Router's shortlist |
| | 1.6 s | The Planner's first request: its first token |
| | 2.1 s | It ends in one tool call, `search_store` with "restaurant table booking", answered in 13 ms: Restaurant Agent by a2ui-samples-mirror |
| | 5.1 s | The Planner's second request: its first token at 5.09 s, the layout's first piece leaving at 5.13 s, the plan whole at 5.14 s |
| 12:52:48.5 | 5.1 s | Calendar dispatched |
| 12:52:49.0 | 5.6 s | Calendar's Google token refreshed by the vault, with nothing shown |
| 12:53:00.4 | 17.1 s | Calendar's agenda painted |
| 12:53:05.4 | 22.1 s | Calendar's answer ends, and the turn's final with it |

The plan, on its first attempt: the title "Dinner tonight in New York"; a row of two slots of equal weight — Calendar, asked "Show today's calendar as a compact list of events. For each event, include its title and its full start and end date and time, so I can see which evening hours are free for dinner.", and the gap "restaurant table booking" offering `restaurant-finder`, its request "Find Chinese restaurants in New York for dinner tonight, with their names, neighborhoods and ratings, so I can choose one to book a table at."; no merge reserved.

| Planner request | Tokens in | Of them cached | Written to the cache | Out |
| --- | --- | --- | --- | --- |
| 1, the search | 34,789 | 0 | 31,904 | 79 |
| 2, the layout | 35,022 | 31,904 | 0 | 317 |

No reasoning tokens on either. The offer's slot, drawn by the client from the marketplace's entry: "None of your apps can do this. From the Store:", Restaurant Agent by a2ui-samples-mirror with Install, and More in the Store.

---

## 5. The install

| At | What |
| --- | --- |
| before 12:55:18 | Install on the offer; the consent card over the slot, "Install Restaurant Agent?" and "Restaurant Agent doesn't ask you to sign in."; Install |
| 12:55:18.4 | Installed from the marketplace by its id, with no catalog to fetch |
| 12:55:20.8 | `useApp` naming `restaurant-finder` and the gap: the request the Planner wrote sent to the finder, no second plan |
| 12:55:35.9 | 15.1 s after: "Chinese Restaurants in New York" painted in the slot beside Calendar's agenda, five restaurants, Xi'an Famous Foods first |
| 12:55:41.1 | 20.3 s after: the finder's answer ends |

---

## 6. The booking

| At | What |
| --- | --- |
| 12:56:45.8 | Book Now on Xi'an Famous Foods, the first of the five: `book_restaurant`, its address 81 St Marks Pl, New York, NY 10003 |
| 12:56:51.0 | 5.3 s after: the form "Book a Table at Xi'an Famous Foods", its party size prefilled 2 |
| 12:56:54.1 | 8.3 s after: the finder's answer ends |
| | 2 people, 2026-11-01 and 19:30 set, the dietary requirements left blank |
| 12:58:16.6 | Submit Reservation: `submit_booking`, a party of 2 at 2026-11-01T19:30:00, no dietary requirements |
| 12:58:24.3 | 7.6 s after: the confirmation, "Booking at Xi'an Famous Foods", "2 people at 2026-11-01T19:30:00", "Dietary Requirements: None", "We look forward to seeing you!" |
| 12:58:26.5 | 9.8 s after: the finder's answer ends, its reply said once |

Each of the three presses — Install on the offer, Book Now, Submit Reservation — sent one request to the finder, painted in its slot; the canvas made no second plan.

---

## 7. Every take

| Stage | Take | From | Reached its end | Why |
| --- | --- | --- | --- | --- |
| The publish | 1 | 12:35:14.7, `a2ui-samples-mirror` claimed | no | The token board missing from the claim's frames: the recorder adds no frame for a screenshot |
| The publish | 2 | 12:46:18.1, `a2ui-samples-mirror` claimed again, from take 1's reset | yes | |
| The question | 1 | 12:52:43.4 | yes | |
| The booking | 1 | 12:56:45.8 | yes | |

Take 1's reset: signed out on Publish at 12:45:01.3; the marketplace stopped, the publisher's record removed from its ledger, the marketplace started again holding seven. Nothing had been published on take 1.

---

## 8. What was found

- **The recorder** adds no frame for a screenshot, lands the frames of actions sent together late, and repeats a click's frame stale at times, found on the publish's first take and two probes. From then on each state a GIF holds was a whole-viewport zoom at full scale, one action per call, and each still the zoom of its state, saved as a PNG; the 18.6 spec's decisions 4 and 5 amended so.
- **The Store still** is the finder's own page in the Store with its sample painted, the Store's list with the finder among the seven in the GIF; the 18.6 spec's decision 6 amended so.
- **The two mock shops' `MODEL_NAME` lines** removed with the five apps', all seven on `gemini-3.8-flash`; the 18.6 spec's decision 10 amended so.
- **The window size** stood at the maximized browser's, 1920 × 897, the remote screen refusing the resize to 1280 × 800.
- **The pictures are blank.** The sample writes each restaurant's picture as an address on its own port, `http://localhost:11006/static/…`; the browser across the tunnel reads `localhost` as its own machine, the finder's port stays unforwarded and the sample unchanged, so no picture is drawn, on the canvas or in the Store's sample.
- **The booking form's date and time fields** are the browser's own, worded in its Korean locale, 19:30 reading "오후 07:30".
- **Calendar's agenda** lists the Seoul day's events in Seoul hours while the test calendar keeps Eastern time, as on the dry run.
- **Calendar's sign-in** held from before the sitting: the vault refreshed its token at the dispatch, with nothing shown.
- **The finder's reply** was said once, the confirmation's words not doubled.
- **The smoke test has no instants of its own.** The journal writes its publish line when the marketplace answers the publish, and the marketplace logs one line per publish with no time on it, so the publish's end is all the records hold; its length from Publish, about 35 s, is the 18.6 record's.

---

## 9. The reset after

| At | What |
| --- | --- |
| 13:00:29.2 | Restaurant Agent uninstalled from the App Library |
| 13:00:59.0 | Unpublished on Publish |
| 13:01:15.8 | Signed out on Publish |
| after | The marketplace stopped, the publisher's record removed from its ledger, the ledger byte for byte as before the sitting, the marketplace started again holding seven; the finder stopped |

---

## 10. The images

Seventeen files in [`docs/images/`](../../docs/images/), every frame and still 1568 × 733. The six segments are the recording's units; the two stage joins put a stage's segments end to end with their timings; the booking's one segment is its stage. The publisher's token is masked with a flat box on the claim board's frames. On every GIF identical and near-identical neighbouring frames are folded, across a join too, and an action frame holds 1.2 s, a state 2.5 s, a wait 3 s and a segment's last frame 4 s.

| File | Stage | What it is | Frames | Length |
| --- | --- | --- | --- | --- |
| `ecosystem-run-publish-claim.gif` | the publish | Segment: Publish opened, `a2ui-samples-mirror` typed, Claim, the token shown and masked, the publisher signed in | 6 | 13.9 s |
| `ecosystem-run-publish-check.gif` | the publish | Segment: the card URL entered, Publish, the check's wait, the published line, the listing with its sample on Publish | 7 | 18.2 s |
| `ecosystem-run-publish-store.gif` | the publish | Segment: the Store page, the finder's listing among the seven, its own page with its sample painting | 5 | 11.4 s |
| `ecosystem-run-publish.gif` | the publish | The stage: the claim, the check and the Store joined | 16 | 43.5 s |
| `ecosystem-run-question-ask.gif` | the question | Segment: a fresh page, the question typed and sent, the layout landing, Calendar's agenda in its slot, the offer in the other | 6 | 13.9 s |
| `ecosystem-run-question-install.gif` | the question | Segment: Install, the consent card, Install confirmed, the slot filling with the five restaurants beside Calendar | 6 | 14.4 s |
| `ecosystem-run-question.gif` | the question | The stage: the ask and the install joined | 11 | 28.3 s |
| `ecosystem-run-booking.gif` | the booking | Segment and stage: Book Now on Xi'an Famous Foods, the form, 2 people, 2026-11-01, 19:30, Submit Reservation, the confirmation | 6 | 13.9 s |
| `ecosystem-run-publish-claim.png` | the publish | Still: the claim form with `a2ui-samples-mirror` typed, before Claim | | |
| `ecosystem-run-publish-form.png` | the publish | Still: the publish form with the finder's card URL and nothing packed, before Publish | | |
| `ecosystem-run-publish-listing.png` | the publish | Still: the published line and the listing with its sample on Publish | | |
| `ecosystem-run-publish-store.png` | the publish | Still: the finder's own page in the Store, its sample painted | | |
| `ecosystem-run-question-offer.png` | the question | Still: Calendar's agenda beside the Store's offer of Restaurant Agent by a2ui-samples-mirror | | |
| `ecosystem-run-question-consent.png` | the question | Still: the consent card over the offer's slot | | |
| `ecosystem-run-question-composed.png` | the question | Still: the finder's five restaurants beside Calendar's agenda | | |
| `ecosystem-run-booking-form.png` | the booking | Still: the form filled, 2 people, 2026-11-01, 19:30 | | |
| `ecosystem-run-booking-confirmation.png` | the booking | Still: the confirmation beside Calendar's agenda | | |
