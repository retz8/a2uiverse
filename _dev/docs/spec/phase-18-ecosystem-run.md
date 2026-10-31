# Phase 18 — Ecosystem run

Publish a new app → discover → install → compose with an existing one → act inside it, in one sitting; the deliverable is the recording (SPEC §12, M12). The new app is an upstream A2UI sample agent, installed unchanged through the Store (Phase 10 decision 3). Edits the root README.

## Scope

- The restaurant finder published, discovered from a question, installed from its offer, composed beside Google Calendar, and a table booked inside it, live, on the recording.
- A dry run of the whole sitting before the recording; the platform fixes it forces, landed before the sitting.
- The recording — GIFs with stills — in the root README.
- The sitting log in `_dev/docs/`.
- Precondition, off-phase: the two developer-worded notices the Backlog holds — a press held back (found in 12.13) and a plan refused twice (found in 17.7) — done any time before the dry run.
- Out: a merge; the sign-in on the recording; any change to the sample; Phase 20's use of the recording.

## Locked decisions

### 1. The new app is upstream's Python ADK restaurant finder

The new app is the Python ADK restaurant finder from `samples/agent/adk/restaurant_finder` on `upstream/main`, installed unchanged. It declares only the public v0.9 basic catalog, so publish and install take its card URL alone, nothing packed. The Node restaurant finder is the fallback if the Python one cannot compose unchanged.

### 2. The partner is Google Calendar, live, signed in before the recording

The existing app the restaurant finder composes with is Google Calendar, running live against Google. Its sign-in is done before the recording starts, on the day; the recording opens with Calendar connected.

### 3. Layout only

The sitting's question asks two things side by side; no synthesis slot is aimed for. If a dry run shows the Planner reserving a merge, the question is rephrased, never the plan forced.

### 4. Discovered through the gap

The question is asked with the restaurant finder not installed. The Planner dispatches Calendar, searches the Store for the restaurant part, and the slot takes the offer; Install in the slot passes the consent card, and the slot fills in place beside Calendar's fragment with no second plan. The Store page is not browsed by hand for the discovery.

### 5. Published through the trusted page, by a fresh publisher claimed in the sitting

Publish runs on the trusted page's Publish: the publisher name claimed in the sitting, the token shown once, the sign-in, the publish with the card URL and no artifact, the gate and the hello-fragment smoke test, the listing with its preview. The publisher's name says where the agent comes from and does not claim to be the A2UI project.

### 6. The sitting starts from the platform as it stands

The marketplace holds the seven apps it has today, the registry has them installed, Calendar signed in; the restaurant finder is published by no one and installed nowhere; no publisher is held on the orchestrator; a fresh page load opens the session.

### 7. Act inside it runs through to the confirmation

Inside the restaurant finder's fragment: Book on a restaurant, the booking form filled against Calendar's evening, submit, the confirmation. Whether the way back inside the fragment is shown on the way is the storyboard's call.

### 8. The recording is GIFs through Claude in Chrome over the tunnel

Claude drives the sitting in the controlled browser over the tunnel and records it: one GIF per stage — the publish, the question with the offer and the install, the booking — with stills of the key screens, into `docs/images/`.

### 9. The README carries the recording, the sitting log carries the evidence

The root README gains a section of its own for the ecosystem run, with the GIFs and stills, and "Where it's headed" moves on past M12. A sitting log in `_dev/docs/` records the day, the upstream commit the sample ran from, the sample's model and key, the platform's settings, each stage's instants from the journal — the publish's smoke test, the plan, the offer, the install, each fragment, the three presses — whatever was found, and every take. Design records change only if code changes. SPEC §12's milestone line stays as written.

### 10. Findings from the dry run

A finding on the platform is fixed as a sub-task of this phase before the sitting, and the dry run repeated. A finding in the sample is never fixed here: it is recorded in `_dev/a2ui-findings.md` and taken upstream on its own track, and the run falls to the Node restaurant finder if the Python one cannot compose unchanged. The sitting itself changes no code.

### 11. The chore is off-phase

The two developer-worded notices are a standalone chore on `main`, with no spec, done any time before the dry run. This spec names it as a precondition only; the plain words are the chore's own call.

### 12. The sample runs from a worktree at `upstream/main`, as its README says

The sample runs from a git worktree of the fork at `../A2UI/` checked out at `upstream/main`, the commit of the day recorded in the sitting log; the fork's own branch is left alone. It runs exactly as its README says, its `.env` holding the project's existing Gemini key, its default model left as upstream ships it. `MODEL_NAME` is the one knob if the default model is withdrawn or too slow on the day, and the log says so.

### 13. The platform runs at Phase 17's defaults, untouched

The Planner on Claude Sonnet 5.5 at `low`, the Synthesizer on `gemini-3.8-flash` at `low`, the agent kit's apps on `gemini-3.8-flash` at `low`, the plan cache on — the defaults the Phase 17 model trial notes' section 4 records — with nothing moved for the recording. The sitting log states the six values.

### 14. Retakes are per stage, every take named

A stage that breaks is retaken from a reset the log describes: the question stage after an uninstall from the App Library; the booking stage on a new question; the publish stage after unpublish, a claimed name being spent, so a retake claims another. The GIFs published are the takes that reached the stage's end; the sitting log names every take and why it was retaken. One sitting means one day on one platform state moving forward, not one unbroken take.

## Invariants

- The sample is never changed; the sitting changes no code.
- Every run is live: Calendar against Google, the sample on its own model.
- The platform runs at Phase 17's defaults.

## Open items

- Whether Phase 20's live demo reuses the recording or shoots again — Phase 20's grill, as the Phase 10 spec left it.
