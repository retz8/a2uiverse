# @a2uiverse/client

The canvas shell (SPEC §4, §10–11): language in, full-screen generative UI out. Ported from `../a2ui-github/client` in Phase 1 — the canvas page only. Talks only to the orchestrator.

The shell's own UI (palette, status strip, history chrome) is Radix Themes. Vendor surfaces render inside their catalog's own provider — the GitHub catalog (`primer-a2ui-adapter`) brings Primer; no shell style reaches a fragment and no vendor stylesheet loads until one of its surfaces mounts.

## Prerequisites

`primer-a2ui-adapter` is consumed as a `link:` dependency on `../../../a2ui-github/primer-a2ui-adapter` until the 1.5 copy publishes `github-catalog`. Its `dist/` must be built under that repo's toolchain before this package builds or tests:

```bash
cd ../../../a2ui-github && yarn workspace primer-a2ui-adapter build
```

## Running

```bash
pnpm --filter @a2uiverse/client dev        # vite dev server (5173)
```

The canvas sends to `VITE_ORCHESTRATOR_URL` (default `http://localhost:10001`; see `.env.example`). Through the dev tunnel, put the orchestrator's tunnel URL in an uncommitted `.env.local` — rules and ports in `_dev/docs/tunnel-environment.md`.

## Working without the LLM

`index.html?beat=<name>[,<name>…]` (`&instant` to skip pacing) replays beats through the full canvas turn lifecycle, zero tokens. Synthetic beats ship with the client: `plain`, `plain-2`, `validation`, `question`. Recorded beats (`recordings/beats/*.json`, addressed by number) are re-recorded through the orchestrator in 1.4.

## Source map

```
src/
  canvas.tsx         the entry: resolves the installed catalogs, mounts the canvas
  orchestratorApi.ts the client's non-A2A channel to the orchestrator (catalog records, URL)
  catalogs/          catalogId → {catalog, Provider} resolver; SurfaceFrame; the GitHub provider
  canvas/            the canvas shell — has its own README
  a2a/               the A2A transport: agent-card resolution, session, streaming send,
                     action handler, paintMeta + fork context, a2uiClientCapabilities
  a2ui/              applying streamed A2UI message batches to a processor
  beats/             beat fixture types, replay loop, the synthetic beats
  shared/            action/error describers, the surface error boundary
tests/               integration suites over the canvas and transport
e2e/                 Playwright chrome baselines
```

## Commands

```bash
pnpm --filter @a2uiverse/client build      # tsc --noEmit && vite build
pnpm --filter @a2uiverse/client typecheck
pnpm --filter @a2uiverse/client test       # vitest (jsdom + RTL)
pnpm --filter @a2uiverse/client test:e2e   # playwright: builds, previews on 4173, compares chrome baselines
pnpm --filter @a2uiverse/client lint
```

Playwright browsers install separately (`pnpm exec playwright install chromium`). Baselines are captured at 1024×768, UTC; `--update-snapshots` recaptures them.
