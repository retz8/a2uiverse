# @a2uiverse/client

The canvas: you ask in words, and the answer is a full screen of UI composed from several apps, each drawn in its own design system and labelled with who painted it. It talks only to the orchestrator, never to an app.

The shell draws everything around the apps in Radix Themes: the question, the progress line, the palette, Back and Trail, the layout and the attribution. Each app owns the inside of its fragment completely: no shell style reaches in, and an app's stylesheet loads only when one of its surfaces mounts.

How the canvas works, from turns and composition to canvases, the trail and the way back inside a fragment, is in [`src/canvas/README.md`](src/canvas/README.md).

## Running it

```bash
pnpm dev:client     # from the repo root: Vite on port 5173
```

It sends to `VITE_ORCHESTRATOR_URL`, `http://localhost:10001` by default (see `.env.example`). When the orchestrator is somewhere else, set it in an uncommitted `.env.local`.

It needs the orchestrator and the apps running too; `pnpm dev:all` from the root starts everything in order.

## Working without a model

`?beat=<name>[,<name>…]` replays a turn through the whole canvas, with the same turn runner, store and rendering, but no model call and no network. Add `&instant` to skip the recorded pacing.

**Recorded beats** are real output, captured through the orchestrator and kept as the stream it arrived as, in `recordings/beats/`:

| `?beat=`     | What it shows                                                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1` to `3`   | GitHub alone: a PR list, a PR, and a review composed and confirmed (replay `3` as `2,3`)                                                                                                                      |
| `4`          | Side by side: inbox and calendar in two slots, no merged view                                                                                                                                                 |
| `5`          | The temporal merge: GitHub, Gmail and Calendar with the merged view                                                                                                                                           |
| `6`          | A question about A2UIVerse itself, answered by the shell                                                                                                                                                      |
| `7`          | A capability gap: nothing installed can answer                                                                                                                                                                |
| `8`          | One app's slot and the shell's own words in one layout                                                                                                                                                        |
| `9`          | The entity join: Linear, GitHub and CircleCI merged, one row per issue                                                                                                                                        |
| `10` to `18` | Late answers and failures: Retry, Include, the home source straggling or failing, a broken stream, a paint the canvas can't draw, too few answers                                                             |
| `19` to `25` | Several canvases: a tab finishing in the background, acting in a past canvas, "Ask this again now", adding and dropping a source, stepping back with and without a remembered merge, closing a loading canvas |

**Synthetic beats** are built by hand, for states that are hard to catch live, like a failure mid-turn or a question inside a fragment. They live in `src/beats/`: `syntheticBeats.ts` (start with `composed`, `synthesis` and `trail`), `lateFailureBeats.ts` for late answers and failures, and `durableBeats.ts` for canvases and the way back.

A beat's presses fire at their recorded time through the same handler the buttons call, and are answered from the beat itself; nothing reaches the orchestrator.

## Shell actions

A shell surface's two actions, open the Store and open the App Library, open a page over the canvas, with the canvas still mounted beneath. The pages are placeholders until they're built. The action is also reported to the orchestrator, so the journal records it.

## Installed catalogs

Eight catalogs are registered: the shell catalog, the five vendor apps', and the two mock stores', which are always bundled so the client can render whichever apps the orchestrator serves. `src/catalogs/resolver.ts` maps each catalog id to its catalog and the Provider that wraps its fragments.

Vendor catalogs are git dependencies on the `a2uiverse-apps` repo, built on install.

- **Bump one:** `pnpm update <vendor>-catalog --filter @a2uiverse/client`, then re-point its `allowBuilds` line in `pnpm-workspace.yaml` to the new commit.
- **Work on one locally:** `pnpm link ../../../a2uiverse-apps/<vendor>/<vendor>-catalog`.
- **Add a new app's catalog:** add it as a dependency, to `src/catalogs/resolver.ts`, and to `STATIC_CATALOGS` in `src/orchestratorApi.ts`. Installing app bundles will replace these lists.

The client supplies only the shared runtime: React, `@a2ui/react` / `@a2ui/web_core` and zod. An app's design system, such as Primer for GitHub, comes inside its catalog.

## Renderer patch

`@a2ui/react` is patched locally (`patches/@a2ui__react@0.10.2.patch`) with two fixes that only show when several apps share a page:

- **`ChoicePicker`'s radio group name** comes from `React.useId()` instead of the component id, so two fragments' pickers that share an id no longer join one group. Reported upstream as [#2447](https://github.com/a2ui-project/a2ui/issues/2447), fixed in [PR #2449](https://github.com/a2ui-project/a2ui/pull/2449).
- **The loading and unknown-component fallbacks** draw as quiet, themed placeholders instead of hard-coded gray and red.

`src/canvas/composition/rendererPatch.test.tsx` fails if a version bump drops either. Regenerate the patch with `pnpm patch @a2ui/react@<version>`.

## On-demand scripts

None of these are part of `pnpm verify`; each needs live processes.

**Re-record the beats**, through the orchestrator:

```bash
pnpm --filter @a2uiverse/client record:beats --model <model> --beats 1-9
pnpm --filter @a2uiverse/client record:beats --model <model> --beats 10-25 [--fault-port 10091]
```

Beats 1 to 9 run against live apps. Beats 10 to 25 need the apps in `deterministic` mode (`pnpm dev:agents`) and port 10091 free: the recorder starts its own orchestrator there for each, with the case's faults and time limits and the Gemini key in the orchestrator's `.env`, and retakes a take that doesn't show its case, up to three times.

> [!IMPORTANT]
> Start the Gmail agent with `A2UI_RECORD_DIR` set when recording. That's what makes it swap real mail for stand-ins, and the recorder can't tell whether that happened.

**Check a fixture carries no real data**, the backstop for the above:

```bash
A2UI_FIXTURE_FORBIDDEN="<real address>,<real name>" pnpm --filter @a2uiverse/client check:fixtures
```

**Check the relay changes nothing but what it should.** Against `deterministic` apps, it sends one question through the orchestrator and the same requests straight to each app, and checks the two streams match once the orchestrator's own changes are undone.

```bash
pnpm --filter @a2uiverse/client check:transparency
```

## Commands

```bash
pnpm --filter @a2uiverse/client build      # typecheck, then vite build
pnpm --filter @a2uiverse/client typecheck
pnpm --filter @a2uiverse/client test       # vitest
pnpm --filter @a2uiverse/client test:e2e   # Playwright: builds, serves on 4173, compares screenshots
pnpm --filter @a2uiverse/client lint
```

Playwright's browser installs separately (`pnpm exec playwright install chromium`). Screenshots are taken at 1024×768 in UTC and aren't committed: on a fresh clone, run `test:e2e --update-snapshots` once to take them.

## Source map

```
src/
  canvas.tsx         the entry: resolves the catalogs, mounts the canvas
  orchestratorApi.ts the client's non-A2A channel to the orchestrator
  catalogs/          catalog id → catalog and Provider
  canvas/            the canvas, with its own README
  a2a/               the A2A side: the agent card, each canvas's session, sending, paintMeta
  a2ui/              applying streamed A2UI batches to a processor
  beats/             the beat format, replay, the synthetic beats
  shared/            error describers and the surface error boundary
tests/               integration tests over the canvas and the transport
e2e/                 Playwright screenshot tests
```
