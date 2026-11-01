# Task 18.7 — README rewrite and sitting log

The root README rewritten as the hook document for the A2UI community ahead of Phase 20, carrying the ecosystem run; and the sitting log of the 18.6 recording in `_dev/docs/`. Phase 18 spec decision 9: the README carries the recording, the sitting log carries the evidence, design records change only if code changes, SPEC §12's milestone line stays as written. A prior round of README refinement; Phase 20's round is the next pass.

## Scope

- The root README rewritten end to end: the first screen, a proof section for the ecosystem run, the order of the page, and every section below made lighter.
- The launcher's documentation moved out of the root README into a new `scripts/README.md`.
- The sitting log in `_dev/docs/`.
- Out: every other README; the design records; SPEC §12; any code change.

*Amended on 2026-11-01.* CONTRIBUTING.md's opening line and its link to the README's setup made true to the page as rewritten.

## Locked decisions

### 1. The reader is the A2UI community member

The README is written for an A2UI community member first — someone who has built or is building an A2UI agent, or works on the protocol — with the general technical reader second, who must not be lost on the first screen. The contributor's material — the launcher's flags, the repo layout, the ports — is one link away, not on the hook page.

### 2. The temporal-merge GIF stays the hero

The recording that opens the page is the one that opens it today: one question, Gmail, GitHub and Linear filling their slots in their own looks, the merged table on one timeline. The ecosystem run is the proof under it, not the hero.

### 3. The first screen

Title; the tagline "The application ecosystem for A2UI agents." kept; the line "Ask one question. Several agents answer at once, each painting its own interface, and you get one screen, not three chat replies."; the A2UI-asks / A2UIVerse-asks contrast; one line placing the project on upstream's long-term roadmap — multi-agent coordination, an agent marketplace, full app composition — as one working answer to all three, built downstream of the protocol as it stands; the hero GIF with its caption; three claims, one line each, each linking down into the page, in this order: an A2UI agent built outside A2UIVerse composes here with no change to its code; each app paints in its own design system, its catalog installed, not compiled in; a merged view over their data, written by a model as wiring, never values, every join checked; a jump link to Try it, so the page still says at a glance that it runs. The SPEC sentence — "semantic application runtime … persistent, interactive surface" — is off the page. The phrase "as it is" appears nowhere; the claim is said as "unchanged" or "no change to its code".

*Amended on 2026-11-01.* The three claims are off the first screen, the jump link to Try it its one link. The line on upstream's long-term roadmap gives way to one in the page's own words naming what A2UIVerse runs — many agents on one UI, an agent marketplace, full apps composed from agents — built downstream of A2UI and A2A as they stand; the roadmap is not named, and an A2UI maintainer recognizes in the line the gaps in their roadmap it fills.

### 4. The proof section, "Your A2UI agent, unchanged"

Directly after the first screen, before everything else, and short — a heading, a few sentences, its images — so the next section is reached within the second screen. It opens on upstream's question to platform builders from its who-is-it-for page, "Do you ship your agent into other apps you don't necessarily control?", in one sentence; then the fact: upstream's own restaurant finder, published, found from a question, installed from the offer, composed beside Google Calendar, a table booked, no change to its code. Its images: the question-stage GIF as the one animation; two stills in a row for the stages it does not cover — the finder listed in the Store with its sample drawn live, and the booking's confirmation — each linking to its stage GIF. The six segment GIFs stay in `docs/images/`, reached from the sitting log. A closing sentence names the five apps with their kit and scaffolder in `a2uiverse-apps` and links the sitting log as the full account.

### 5. The order of the page

First screen → Your A2UI agent, unchanged → Why A2UIVerse? → What it does → Try it → How it works → How fast it answers → Built on → Where it's headed → Feedback · License.

### 6. Try it after What it does

The reader meets commands once A2UIVerse is explained in short, not before; and not at the bottom — Try it sits after What it does and before How it works, so the reader persuaded by the end of the feature list finds the command there, and the architecture, timings and versions stay below as reference. Its contents: the replay in two commands, "for real", "Every command" collapsed at one line each; the launcher's block leaves for `scripts/README.md`, which follows the per-package README convention, with one line in Try it pointing at it.

### 7. Why A2UIVerse? opens on the roadmap mapping

The section opens with three short bold-led paragraphs, each quoting the phrase from upstream's roadmap's long-term vision — "multiple agents contributing to the same UI", "agent marketplace integration", "full app composition" — and saying what A2UIVerse built for it. These replace the paragraph on agents as "first-class, composable application primitives"; "A2UIVerse = A2UI + Universe" is kept as the section's first words. The browser line, its table and the SPEC pointer follow as today.

*Amended on 2026-11-01.* The three paragraphs are in the page's own words, each bold lead naming what A2UIVerse built — many agents on one UI, an agent marketplace, full apps composed from agents — upstream's roadmap neither named nor quoted.

### 8. What it does is eight paragraphs and two images

Each paragraph two or three sentences: one question, one screen; a merged view across apps; honest when apps are slow or fail; every question kept, with the trail still; back and forward inside each app, with the two way-back GIFs; sign-in the shell draws, gaining that sign-in is read from the card; installed where it's needed, without its GIF; publish once, install by name, merging today's Store / App Library / Publish paragraph with the published-once paragraph. "Any A2UI agent can join" is gone, carried by the proof section; "App = MCP server + Agentic BFF + A2UI catalog" waits for Phase 20's guide. The store-loop GIF leaves the page: the proof section's GIF already shows an app offered in its slot and installed there.

### 9. How fast it answers keeps the models and the shape of the wait

The model table — Planner, Synthesizer, the apps, each with model, effort, the variable and the record behind it — and the paragraph on swapping models stay as they are. The six-run table, its token columns and the three bullets go; the "In short" paragraph carries the numbers in one line — six questions on 2026-10-31, the apps live: a plan in 2–8 s, the first app on screen at 10–75 s, the screen settled at 16–173 s, $2.53 for the six — and the link to every run with its setup stays.

### 10. Where it's headed is three bullets

The what's-built paragraph goes. Three bullets of what is next: A2UI v1.0 — a v1.0 agent accepted beside v0.9.1 ones, the full move once upstream's React package ships its v1.0 entry; a proposal to the A2UI community — the deviations the delta register tags as upstream candidates written up for upstream, with a guide to bringing your own agent; the apps' agents on Claude, once the kit's three limits on it are fixed.

### 11. How it works, Built on, Feedback and License stay as they are

*Amended on 2026-11-01.* How it works stays as it is, less its repository layout.

### 12. The sitting log

`_dev/docs/phase-18-sitting-log.md`, on the pattern of `_dev/docs/phase-17-model-trial-notes.md`. It records the day; the upstream commit the sample ran from, `upstream/main` `825beac2`; the Node restaurant finder on `gemini-3.6-flash` with its key in its environment; the platform's settings — the Planner on Claude Sonnet 5.5 at `low`, the Synthesizer and the apps on `gemini-3.8-flash` at `low`, the plan cache on; each stage's instants from the journal's entries of the sitting and the 18.6 record — the publish's smoke test, the plan, the offer, the install, each fragment, the three presses; what was found; every take and why it was retaken; and an index of all seventeen images in `docs/images/` — which segment each GIF is, which screen each still. The proof section links it as the full account, as How fast it answers links the latency results.

### 13. Docs only, on `main`

The sub-task changes no code: the root README, `scripts/README.md` and the sitting log, worked on `main` as 18.6's recording was, not in a worktree.

## Invariants

- No code changes; the design records are not touched; SPEC §12's milestone line stays as written.
- Upstream's words are borrowed in two places only, one sentence each — the roadmap line on the first screen and the who-is-it-for question opening the proof section — and everything else is in the page's own words.
- "As it is" is not on the page.

*Amended on 2026-11-01.* Upstream's words are borrowed in one place only, one sentence — the who-is-it-for question opening the proof section — and everything else is in the page's own words. Upstream's roadmap is neither named nor quoted on the page.
