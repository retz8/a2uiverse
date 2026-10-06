# @a2uiverse/client

The canvas: you ask in words, and the answer is a full screen of UI composed from several apps, each in its own design system and labelled with who painted it. It talks only to the orchestrator, never to an app.

<p align="center">
  <img src="../../docs/images/composed-inbox.png" width="640" alt="One question answered by Gmail, GitHub and Linear on one screen">
  <br>
  <em>One question, answered by Gmail, GitHub and Linear, each in its own slot and look. The table on top is the merged view.</em>
</p>

## What it does

### One screen, many design systems

Each app's UI renders with its own catalog: GitHub in Primer, Gmail and Calendar in Material 3, CircleCI and Linear each in a catalog of its own in its product's design language, side by side on one page. Every catalog keeps its styles inside its own slot, and the client's collision tests fail if any leak onto the page or into another app.

The shell draws everything around the apps in Radix Themes: the question, the progress line, the palette, Back and Trail, the layout, and each app's name above its slot. It never reaches inside a slot.

### A merged view that stays live

The merged table isn't something a model drew. The orchestrator sends formulas pointing into each app's data, and the client evaluates them itself, again on every change to that data, with no model call. Sorting it is local and free.

Each value shows how sure it is by how strongly it's drawn, and says where it came from on hover. Clicking it scrolls to the element it came from in that app's slot and highlights it.

### Paints as answers arrive, never half-drawn

The layout lands first, with every slot waiting, and each app's UI fills its slot as it arrives. The line under the question says where things stand in the client's own words: a tick per app, then the merge, like "Joining Linear issues to GitHub PRs and CircleCI runs".

A new paint over one already on screen is built and checked off screen, then swapped in whole, so the screen never shows half of something. An app that fails shows a failure tile with Retry in its own slot, and nothing else moves.

### Keeps every question

<p align="center">
  <img src="../../docs/images/past-canvas.png" width="720" alt="A past answer under its Parked band">
  <br>
  <em>A past answer: parked, stamped with when it was asked, with Ask this again now and Return to live.</em>
</p>

Every question gets its own answer, and none is thrown away when the next one is asked. Going back to one shows it as it was left, under a band with the time it was asked. It still works like a live tab: clicks, presses and sorts land in it, and anything it was still loading keeps arriving in the background.

"Ask this again now" asks its question again as a new answer and leaves this one as it was. "Return to live" goes to the newest question. Here the palette reads "Ask from this view": whatever you ask is a follow-up to this answer. It all lives in memory; a reload starts fresh.

### History that branches

<p align="center">
  <img src="../../docs/images/trail-branches.png" width="276" alt="The trail drawer: four questions on two branches">
  <br>
  <em>The trail: four questions on two branches, the newest live.</em>
</p>

A browser keeps one history stack: go back a few pages and open something new, and everything ahead of you is gone. Here nothing is dropped. A question asked from an earlier answer starts a branch from it, and the trail draws every question on the branch it grew from. Hovering an entry previews its answer.

Back goes up the branch, not to the page before. Above, "Camera prices" was asked from "Needs attention today" (the fork mark), though "what apps do I have?" came in between, so Back from "Camera prices" goes to "Needs attention today".

#### Inside each app's answer

Each app's slot has its own Back and Forward, at the right of its name, apart from the trail and from the other apps: stepping CircleCI back to its runs list leaves GitHub and Linear where they are. Like the trail, it drops nothing: open a run and its failing job, go back to the list and open the run again, and Back still reaches the job. The merged view follows the step, restored with no model call from the wiring remembered for that combination of screens.

<table>
  <tr>
    <td align="center" valign="top"><img src="../../docs/images/way-back-branch-circleci.gif" width="280" alt="CircleCI's slot: a run, its failing job, Back twice to the runs list, the run opened again, then Back twice to the list and on to the job"></td>
    <td align="center" valign="top"><img src="../../docs/images/way-back-branch-merged.gif" width="500" alt="The merged table's CI column, empty while a run or a job is open and filled again on the runs list"></td>
  </tr>
  <tr>
    <td align="center"><em>CircleCI's slot: a run, its failing job, Back twice, the run opened again, then Back twice: the runs list, and the job left behind.</em></td>
    <td align="center"><em>The merged view at the same moments: its CI column is empty while a run or its job is open, and fills in again on the runs list.</em></td>
  </tr>
</table>

## Running it

```bash
pnpm dev:client     # from the repo root: Vite on port 5173
pnpm --filter @a2uiverse/client build | typecheck | test | lint
pnpm --filter @a2uiverse/client preview:snapshot   # built against the registry snapshot, served on 4173
pnpm --filter @a2uiverse/client test:e2e   # Playwright over preview:snapshot, compares screenshots
pnpm --filter @a2uiverse/client test:e2e:live   # one sign-in through the real window, on the real stack
```

It sends to `VITE_ORCHESTRATOR_URL`, `http://localhost:10001` by default (see `.env.example`). When the orchestrator is somewhere else, set it in an uncommitted `.env.local`. It needs the orchestrator and the apps running too; `pnpm dev:all` from the root starts everything in order.

Playwright's browser installs separately (`pnpm exec playwright install chromium`). Its screenshots are taken at 1024×768 in UTC and aren't committed: on a fresh clone, run `test:e2e --update-snapshots` once to take them.

`test:e2e:live` runs on its own stack on `localhost`: an orchestrator on port 10081 over a scratch state directory, the GitHub agent in `deterministic` mode started and installed by the launcher from the sibling `a2uiverse-apps` checkout, and the client on 5183. It asks a question about GitHub, presses Sign in on the tile, chooses the account in the agent's own sign-in window and checks the slot fills in place. The Planner runs live on the orchestrator's `.env` key, and port 11001 must be free. It isn't part of `pnpm verify`.

## Working without a model

`?beat=<name>` replays a recorded or hand-built session through the whole canvas, with no model call and no app, and `&instant` skips the recorded pacing. The catalogs it draws in still come from a registry: the live orchestrator's, with the apps' catalogs installed, or the registry snapshot, with `preview:snapshot` and no orchestrator at all. `?beat=27&instant` is the answer above, `?beat=9&instant` the entity join, `?beat=trail` the trail, and `?beat=26&instant` the way back.

A beat's presses fire through the same handler the buttons call, answered from the beat itself. The tests and the screenshots in this README come from beats.

<details>
<summary><b>Recorded beats</b></summary>

Real output, captured through the orchestrator and kept as the stream it arrived as, in `recordings/beats/`:

| `?beat=`     | What it shows                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `1` to `3`   | GitHub alone: a PR list, a PR, and a review composed and confirmed (replay `3` as `2,3`)                                                                                                                     |
| `4`          | Side by side: inbox and calendar in two slots, no merged view                                                                                                                                                |
| `5`          | The temporal merge: Google Calendar, Gmail, GitHub and Linear with the merged view                                                                                                                           |
| `6`          | A question about A2UIVerse itself, answered by the shell                                                                                                                                                     |
| `7`          | A capability gap: nothing installed can answer                                                                                                                                                               |
| `8`          | One app's slot and the shell's own words in one layout                                                                                                                                                       |
| `9`          | The entity join: Linear, GitHub and CircleCI merged, one row per issue                                                                                                                                       |
| `10` to `18` | Late answers and failures: Retry, Include, the home source straggling or failing, a broken stream, a paint the canvas can't draw, too few answers                                                            |
| `19` to `25` | Several answers: a tab finishing in the background, acting in a past answer, "Ask this again now", adding and dropping a source, stepping back with and without a remembered merge, closing a loading answer |
| `26`         | Back past a new run: the runs list visited again, then the failing job left behind, every arrow named                                                                                                        |
| `27`         | Gmail, GitHub and Linear on one timeline: the README's GIF                                                                                                                                                   |

Hand-built beats live in `src/beats/`: `syntheticBeats.ts`, `lateFailureBeats.ts` for late answers and failures, and `durableBeats.ts` for kept answers and the way back.

</details>

## Catalogs

The client compiles no app's catalog in. It holds two of its own, the shell catalog and the standard basic catalog; every other catalog is loaded at runtime from the orchestrator's registry, as the catalog artifact Stellify packed:

- At startup it registers the host-module interface, the one object an artifact reaches React, react-dom, `@a2ui/react`, `@a2ui/web_core` and zod through, and starts loading every catalog the registry lists, without waiting for it to render.
- A fragment in a catalog it doesn't hold yet waits, its slot loading, while that catalog loads. An app installed while the page is open is found without a reload.
- Every request of a load is bounded: no answer in 10 seconds, 30 for the artifact's entry, and it's asked once more, so a request lost in transit fails rather than leaving the slot loading for good.
- A catalog that won't load fails its slot: "Something went wrong loading this.", with Retry.
- Each catalog is loaded once per page: an app reinstalled with a new version of its catalog shows it after a reload, while a catalog under a new id loads as its first paint arrives.

An app's design system, such as Primer for GitHub, comes inside its artifact. The code is in `src/catalogs/`; [`docs/design/app-install.md`](../../docs/design/app-install.md) follows one artifact from Stellify's pack to its first paint.

The tests and e2e load the **registry snapshot**, generated by `packages/registry-snapshot` from the seven catalog packages at one pinned commit of the apps repo: the vitest suite through the real loader from disk, and Playwright from `preview:snapshot`, whose page is built against the preview's own origin and whose preview server serves the snapshot under `/registry`. Moving the snapshot to a newer apps commit is that package's job.

## Renderer patch

`@a2ui/react` is patched locally (`patches/@a2ui__react@0.10.2.patch`) with two fixes that only show when several apps share a page:

- **`ChoicePicker`'s radio group name** comes from `React.useId()` instead of the component id, so two fragments' pickers that share an id no longer join one group. Reported upstream as [#2447](https://github.com/a2ui-project/a2ui/issues/2447), fixed in [PR #2449](https://github.com/a2ui-project/a2ui/pull/2449).
- **The loading and unknown-component fallbacks** draw as quiet, themed placeholders instead of hard-coded gray and red.

`src/canvas/composition/rendererPatch.test.tsx` fails if a version bump drops either. Regenerate the patch with `pnpm patch @a2ui/react@<version>`.

<details>
<summary><b>On-demand scripts</b></summary>

None of these are part of `pnpm verify`; each needs live processes.

**Re-record the beats**, through the orchestrator:

```bash
pnpm --filter @a2uiverse/client record:beats --model <model> --beats 1-9
pnpm --filter @a2uiverse/client record:beats --model <model> --beats 10-26 [--fault-port 10091]
```

Every orchestrator a beat runs through is signed in first, through the real sign-in: a canvas opened with a question about the platform, then each app that asks sign-in signed in from it as the fake account the agent's sign-in page offers it, named on its address instead of chosen — so the apps must be in `deterministic` or `stub` mode. A beat may name its own accounts; an account the orchestrator already holds is left as it is.

Beats 1 to 9 run against the apps you have running. Beats 10 to 26 need the apps in `deterministic` mode (`pnpm dev:all`) and port 10091 free: the recorder starts its own orchestrator there for each, on a state directory of its own, with the case's faults and time limits and the Gemini key in the orchestrator's `.env`. It installs into it every app the orchestrator at `--url` has installed, reads the take's journal lines from its own journal, and retakes a take that doesn't show its case, up to three times. The orchestrator you run is left as it was.

> [!IMPORTANT]
> Start the Gmail agent with `A2UI_RECORD_DIR` set when recording. That's what makes it swap real mail for stand-ins, and the recorder can't tell whether that happened.

**Check a fixture carries no real data**, the backstop for the above:

```bash
A2UI_FIXTURE_FORBIDDEN="<real address>,<real name>" pnpm --filter @a2uiverse/client check:fixtures
```

**Check the relay changes nothing but what it should.** Against `deterministic` apps, it sends one question through the orchestrator and the same requests straight to each app, and checks the two streams match once the orchestrator's own changes are undone. It signs both sides in first: the orchestrator as the recorder does, and each app straight at its own sign-in page, as the same account. It reaches every app the orchestrator has installed at its card URL, advertising the catalogs the orchestrator advertises to it; `--agents id=url,…` points one elsewhere.

```bash
pnpm --filter @a2uiverse/client check:transparency
```

</details>

<details>
<summary><b>Source map</b></summary>

```
src/
  canvas.tsx         the entry: the host interface, the catalog loader, the canvas
  orchestratorApi.ts the client's non-A2A channel to the orchestrator
  catalogs/          the client's own catalogs, the host interface, the loader, the gate
  canvas/            the canvas, with a short code guide
  a2a/               the A2A side: the agent card, each answer's session, sending, paintMeta
  a2ui/              applying streamed A2UI batches to a processor
  beats/             the beat format, replay, the synthetic beats
  shared/            error describers and the surface error boundary
tests/               integration tests over the canvas and the transport; the registry snapshot's loader
e2e/                 Playwright screenshot tests
```

</details>

The design record is [`docs/design/client.md`](../../docs/design/client.md).
