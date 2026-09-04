# @a2uiverse/client

The canvas shell (SPEC §4, §10–11): language in, full-screen generative UI out. It talks only to the orchestrator, and never to a vendor agent.

The shell owns the container — palette, status strip, history chrome, slot layout, attribution — all in Radix Themes. Each vendor owns the inside of its own fragment completely: font, spacing, colour, components, design system. No shell style reaches a fragment, and no vendor stylesheet loads until one of its surfaces mounts.

## Running it

```bash
pnpm dev:client     # from the repo root — vite on 5173
```

The canvas sends to `VITE_ORCHESTRATOR_URL` (default `http://localhost:10001`; see `.env.example`). Through the dev tunnel, put the orchestrator's tunnel URL in an uncommitted `.env.local` — rules and ports in `_dev/docs/tunnel-environment.md`.

You need the orchestrator and the agents up too; `pnpm dev:all` from the root starts everything in the right order.

## Working without the LLM

`index.html?beat=<name>[,<name>…]` replays a recorded or synthetic turn through the full canvas lifecycle — same turn runner, same store, same rendering — with zero tokens and no network. Add `&instant` to skip the recorded pacing.

**Recorded beats** are real agent output, captured through the hub over live MCP and kept as the stream they arrived as:

| `?beat=` | What it is                                                               |
| -------- | ------------------------------------------------------------------------ |
| `1`      | PR list — one slot, GitHub                                               |
| `2`      | PR detail — one slot                                                     |
| `3`      | Compose-and-confirm review — chained after 2, so replay it as `2,3`      |
| `4`      | **The composed fan-out** — three slots, three design systems, one screen |

**Synthetic beats** are hand-built to construct states that are unreliable to catch live: `plain`, `plain-2`, `validation` (a fragment that fails to mount), `question` (the overlay), `composed` (two slots, one filling and one whose source speaks but never paints), `composed-solo` (the degenerate one-slot case), `composed-question` (a fragment the shell promotes in place) and `synthesis` (two storefronts merged into the synthesis slot, then a reorder that goes stale and re-synthesizes).

The two families have different jobs and neither replaces the other: a recording is evidence of what real agents produce, a synthetic beat is a state built on purpose.

## Installed catalogs

Four catalogs are registered at once — `@a2uiverse/shell-catalog` plus `github-catalog`, `gmail-catalog` and `calendar-catalog`. Per-surface catalog resolution is stock A2UI behaviour; the client's own part is `catalogs/resolver.ts`, which maps each `catalogId` to its runtime catalog and the Provider that wraps its fragments.

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
pnpm --filter @a2uiverse/client record:beats -- --model <model> [--beats 1,2,3,4]
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
  a2a/               the A2A transport: agent-card resolution, session, streaming send,
                     action handler, paintMeta + fork context, a2uiClientCapabilities
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

Playwright browsers install separately (`pnpm exec playwright install chromium`). Baselines are captured at 1024×768, UTC; `--update-snapshots` recaptures them.
