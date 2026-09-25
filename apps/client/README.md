# @a2uiverse/client

The canvas shell (SPEC §4, §10–11): language in, full-screen generative UI out. It talks only to the orchestrator, and never to a vendor agent.

The shell owns the container — the question heading the canvas with the turn's progress under it, palette, status strip, history chrome, slot layout, attribution — all in Radix Themes, the head, strip and Ask pill drawn to the task 7.14 design canvas. Each vendor owns the inside of its own fragment completely: font, spacing, colour, components, design system. No shell style reaches a fragment, and no vendor stylesheet loads until one of its surfaces mounts.

## Running it

```bash
pnpm dev:client     # from the repo root — vite on 5173
```

The canvas sends to `VITE_ORCHESTRATOR_URL` (default `http://localhost:10001`; see `.env.example`). Through the dev tunnel, put the orchestrator's tunnel URL in an uncommitted `.env.local` — rules and ports in `_dev/docs/tunnel-environment.md`.

You need the orchestrator and the agents up too; `pnpm dev:all` from the root starts everything in the right order.

## Working without the LLM

`index.html?beat=<name>[,<name>…]` replays a recorded or synthetic turn through the full canvas lifecycle — same turn runner, same store, same rendering — with zero tokens and no network. Add `&instant` to skip the recorded pacing.

**Recorded beats** are real agent output, captured through the hub over live MCP and kept as the stream they arrived as:

| `?beat=` | What it is                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `1`      | PR list — one slot, GitHub                                                                                                                                   |
| `2`      | PR detail — one slot                                                                                                                                         |
| `3`      | Compose-and-confirm review — chained after 2, so replay it as `2,3`                                                                                          |
| `4`      | **Side by side** — "put my inbox and my calendar side by side": two vendor slots on one row, no merged view; the layout-only fan-out                         |
| `5`      | **The temporal merge** — the three-vendor fan-out with the Synthesizer's merged view painted into its reserved slot, synthesis payload included              |
| `6`      | **A platform answer** — the shell answering "what apps do I have?" itself, from a data model of literals; no vendor dispatched                               |
| `7`      | **A capability gap** — nothing installed serves the ask; the Planner places a gap slot and the catalog draws the tile                                        |
| `8`      | **A mixed utterance** — "what can I do with my calendar?": one vendor slot and the shell's own words in the same layout                                      |
| `9`      | **The entity join** — "what's the status of what I'm working on?": Linear, GitHub and CircleCI, and the merged view with its match claims, one row per issue |

Beats 10–18 are Phase 8's late-arrival and failure cases, recorded over the deterministic roster through the AgentsPool's fault map — beat 5's utterance where every source is a peer, beat 9's where Linear is the join's home source. Each carries the fault map and the deadlines it was recorded under, and the reader's presses as streams of their own beside the turn:

| `?beat=` | What it is                                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `10`     | **A fast failure, then Retry** — Calendar fails at once; Retry's answer is folded into the merged view                     |
| `11`     | **A late arrival, then Include** — Gmail lands while the merge is made; Include folds it in                                |
| `12`     | **The home source straggling** — the merge waits for Linear, then runs                                                     |
| `13`     | **An answer held past the cap, drawn by Retry** — Gmail fails at a 15 s cap; its later answer waits for Retry              |
| `14`     | **Retry racing a capped dispatch** — Retry's re-dispatch answers before the capped one, which is cancelled                 |
| `15`     | **A broken stream** — GitHub paints, its stream breaks; its fragment comes off for the failure tile                        |
| `16`     | **A paint the client cannot draw** — GitHub’s paint fails its catalog; the canvas reports it and the answer fails the slot |
| `17`     | **The home source failing, then Retry** — the merge collapses on Linear; Retry brings it back                              |
| `18`     | **Fewer than two sources** — only GitHub answers; the merge collapses to its line                                          |

Beats 19–25 are Phase 9's durable-composition cases, recorded over the deterministic roster as sessions of several canvases: each question opens a canvas of its own, and the actions, presses, steps, views and closes act on the canvas they name. Each carries the deadlines it was recorded under, and the fault map where it needs one:

| `?beat=` | What it is                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `19`     | **A tab finishing in the background** — the entity join with CircleCI held back, "what needs my attention today?" asked while it loads, the entity join viewed again with its merge landed |
| `20`     | **An action and a press in a past canvas** — the temporal merge with Gmail failing, then the entity join; back on the first canvas, an event opened in Calendar and Retry pressed on Gmail |
| `21`     | **"Ask this again now", and a question asked from a view** — both children of the first canvas, which stands                                                                               |
| `22`     | **Add a source, drop one, and compare these** — "Add GitHub to this", "without Gmail" and "compare these", each asked from side by side                                                    |
| `23`     | **A step back with the wiring restored** — a CircleCI run opened, then Back: the merged view remembered over the list, no call                                                             |
| `24`     | **An unseen combination falling to the walk** — a CircleCI run and a Linear issue opened, then Back on CircleCI: the merge line working until the walk's view lands                        |
| `25`     | **Closing a loading canvas** — the temporal merge with GitHub held back, closed from the trail while it loads                                                                              |

**Synthetic beats** are hand-built to construct states that are unreliable to catch live: `plain`, `plain-2`, `validation` (a fragment that fails to mount), `question` (the overlay), `composed` (two slots, one filling and one whose source speaks but never paints), `composed-solo` (the degenerate one-slot case), `composed-question` (a fragment the shell promotes in place), `synthesis` (two storefronts of unrelated shapes merged into the synthesis slot by the Synthesizer's camera comparison example (the client's own copy), then an in-place reorder its keyed refs survive), `navigation` (the two storefronts in their own catalogs under a merged view whose cells name a rendered field, a field neither renders, and a join held by judgment alone), `join` (a list of offers inside every row under one sort declaration, one row's held by a fact and the other's by judgment, then a storefront repaint that changes a matched title, so the values it cut off are drawn broken), `platform-answer` (the shell's own answer bound to its data model, with a button into the App Library), `gap` (the capability tile), `long-question` (beat 9 under a paragraph past the header's four lines, so it clips behind "Show all"), `merging` and `long-merging` (beat 9 and `long-question` with the merged view held back, resting on the reserved slot), and `trail` (four questions, each a canvas of its own — a root, a child, a branch asked from the first, and the newest still loading with its merge held back — so the rail shows every mark at once and the band stands on any past one; task 9.6 — the root's GitHub fragment repainted by an action inside it, so its marker shows Back to the list; task 9.7).

Phase 8's cases are synthetic beats too, over three storefronts joined on the camera — Aperture & Co the home source, Northlight and Fieldstone attached: `fast-failure`, `late-include`, `home-straggling`, `held-retry`, `retry-race`, `half-drawn`, `invalid-paint` (a paint the canvas reports, answered from the beat), `failed-fold-in`, `include-after-decline`, `try-again` (the merged view couldn't be made) and `home-retry` (the home source failing, then Retry bringing the merge back), and `too-few`. Each case with a press also replays up to it — `fast-failure-offered` rests on the failure tile with Retry — and `home-straggling-waiting` rests while the merge waits for its home source.

Phase 9's cases are synthetic beats too, over the same three storefronts, a camera opened inside a store being a new paint of it with a way back: `background-tab`, `past-action`, `ask-again`, `add-drop`, `step-seen`, `step-unseen` and `close-loading`. Paced, `background-tab-running` rests with the first canvas still loading behind the live one, and `step-unseen-working` with the merge line working after the step.

**Presses in a beat.** A beat's Retry, Include and Try again fire at their recorded time through the same handler the buttons call — the pressed state, the focus, the announcements — and are answered from the beat itself, as is the orchestrator's answer to a failure report the canvas sends; nothing reaches the orchestrator.

**Shell actions.** A shell surface's two actions — open the Store with an optional query, open the App Library — are handled here, never as a turn: the page opens as an overlay over the canvas (a placeholder naming the page and the query until Phase 13 builds them; the canvas stays mounted beneath), and the action is reported to the orchestrator on the side, as a standard A2UI action on the shell surface, so the journal records the intent.

The two families have different jobs and neither replaces the other: a recording is evidence of what real agents produce, a synthetic beat is a state built on purpose.

## Installed catalogs

Six catalogs are registered at once — `@a2uiverse/shell-catalog` plus `github-catalog`, `gmail-catalog`, `calendar-catalog`, and the two mock-tier catalogs `shop-a-catalog` and `shop-b-catalog`, which are always bundled so the client renders whichever roster the orchestrator serves (task 4.7). Per-surface catalog resolution is stock A2UI behaviour; the client's own part is `catalogs/resolver.ts`, which maps each `catalogId` to its runtime catalog and the Provider that wraps its fragments.

Vendor catalogs are installed as git dependencies on the public `a2uiverse-apps` repo (`github:retz8/a2uiverse-apps#path:<vendor>/<vendor>-catalog`) — no registry. pnpm builds each on install (`prepare`), pins the resolved commit in `pnpm-lock.yaml`, and keys its build allowance in `pnpm-workspace.yaml` by that commit. Bumping one is `pnpm update <vendor>-catalog --filter @a2uiverse/client` plus re-pointing that `allowBuilds` line; for local iteration, `pnpm link ../../../a2uiverse-apps/<vendor>/<vendor>-catalog` overrides it temporarily.

The client supplies only the shared runtime (React, `@a2ui/react` / `@a2ui/web_core`, `zod`). A vendor's design system — Primer, for GitHub — arrives inside its bundle.

## Renderer patches

`@a2ui/react` is patched locally (`pnpm patch`; declared in `pnpm-workspace.yaml`, applied from
`patches/@a2ui__react@0.10.2.patch`). Only the `v0_9/index.js` bundle the client imports is
touched. Both hunks fix defects that only surface under composition, and both are pinned by
`src/canvas/composition/rendererPatch.test.tsx` — if a version bump drops a hunk, those tests fail.

| Hunk                                                                                                                                                                       | Why                                                                                                                                                                              | Upstream                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ChoicePicker` radio group name derived from `React.useId()` instead of the component id                                                                                   | Radio `name`s are document-scoped but A2UI component ids are only surface-scoped, so two fragments whose pickers share an id joined one group and fought over a single selection | reported as [#2447](https://github.com/a2ui-project/a2ui/issues/2447), fixed in [PR #2449](https://github.com/a2ui-project/a2ui/pull/2449) (the React half of it is what is patched here) |
| `DeferredChild`'s loading and unknown-component fallbacks render as quiet, token-themed placeholders (`data-a2ui-placeholder`) instead of hardcoded gray/red inline styles | An unknown component inside an otherwise valid fragment must degrade at that node without shouting — the renderer exposes no hook to theme or replace these                      | local; the underlying gap (no host-supplied fallback seam) is a candidate report                                                                                                          |

Drop a hunk by editing the patch file and re-running `pnpm install`; regenerate one with
`pnpm patch @a2ui/react@<version>`.

## On-demand scripts

Not part of `pnpm verify` — each needs live processes.

**Re-record the beats.** Runs against live agents through the hub, so the fixtures carry what real agents actually paint.

```bash
pnpm --filter @a2uiverse/client record:beats --model <model> [--beats 1,2,3,4,5,6,7,8,9]
```

Beats 10–18 need the agents up in their deterministic mode (`pnpm dev:agents`) and nothing on port 10091: for each, the recorder starts an orchestrator of its own there with the case's fault map and deadlines — the Gemini key from the orchestrator's `.env` — sends the utterance, then the client's failure report and the reader's presses on streams of their own, and stops it. A take that does not show its case is taken again, up to three times; the orchestrator's log is written to the system's temporary directory.

```bash
pnpm --filter @a2uiverse/client record:beats --model <model> --beats 10-18 [--fault-port 10091]
```

Beats 19–25 run the same way, each through an orchestrator of the recorder's own on `--fault-port`: the session is driven as the canvas drives it, and a take is checked against the journal lines it wrote as well as its streams — beat 23's step answered with no synthesis call, beat 24's with one, beat 25's close cancelling its turn.

```bash
pnpm --filter @a2uiverse/client record:beats --model <model> --beats 19-25 [--fault-port 10091]
```

> **Start the Gmail agent with `A2UI_RECORD_DIR` set.** That flag is what arms its pseudonymizer, and this recorder captures whatever the hub relays — it cannot tell whether anything was scrubbed. GitHub reads public repos and Calendar reads a seeded demo calendar, so neither needs it for privacy.

**Check a fixture carries no real data.** The backstop for the above; fails closed if the needles are unset, because a check that silently does nothing is worse than none.

```bash
A2UI_FIXTURE_FORBIDDEN="<real address>,<real name>" pnpm --filter @a2uiverse/client check:fixtures
```

**Check the relay is transparent.** Run against **deterministic** agents so the vendor side is stable between the two sends. It drives one turn through the hub, reads each slot's Planner-authored request out of the journal line, sends exactly that request direct to the vendor, and asserts the two event streams match once the hub's named rewrites are inverted — plus that the journal grew by one embedded line recording every dispatch, and that no relayed surface crosses a namespace.

```bash
pnpm --filter @a2uiverse/client check:transparency
```

## Source map

```
src/
  canvas.tsx         the entry: resolves the installed catalogs, mounts the canvas
  orchestratorApi.ts the client's non-A2A channel to the orchestrator (catalog records, URL)
  catalogs/          catalogId → {catalog, Provider} resolver; SurfaceFrame
  canvas/            the canvas shell — has its own README
                     (canvas/composition/ holds the client's half of composition)
  a2a/               the A2A transport: agent-card resolution, the canvas's session, streaming
                     send, action handler, paintMeta, the parent canvas, a2uiClientCapabilities
  a2ui/              applying streamed A2UI message batches to a processor
  beats/             beat fixture types, replay loop, the synthetic beats
  shared/            action/error describers, the surface error boundary
tests/               integration suites over the canvas and transport
e2e/                 Playwright baselines
```

## Commands

```bash
pnpm --filter @a2uiverse/client build      # tsc --noEmit && vite build
pnpm --filter @a2uiverse/client typecheck
pnpm --filter @a2uiverse/client test       # vitest (jsdom + RTL)
pnpm --filter @a2uiverse/client test:e2e   # playwright: builds, previews on 4173, compares baselines
pnpm --filter @a2uiverse/client lint
```

Playwright browsers install separately (`pnpm exec playwright install chromium`). Baselines are captured at 1024×768, UTC; `--update-snapshots` recaptures them. They are local, not tracked: on a fresh clone, run `--update-snapshots` once to take them.
