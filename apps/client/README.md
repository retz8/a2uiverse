# @a2uiverse/client

The canvas shell (SPEC §4, §10–11): language in, full-screen generative UI out. Ported from `../a2ui-github/client` in Phase 1 — the canvas page only. Talks only to the orchestrator.

The shell's own UI (palette, status strip, history chrome) is Radix Themes. Vendor surfaces render inside their catalog's own provider — the GitHub catalog (`primer-a2ui-adapter`) brings Primer; no shell style reaches a fragment and no vendor stylesheet loads until one of its surfaces mounts.

## The GitHub catalog

`github-catalog` — the GitHub app's catalog schema, Primer React implementation, and Provider — is installed as a git dependency on the public `a2uiverse-apps` repo (`github:retz8/a2uiverse-apps#path:github/github-catalog`); no registry. pnpm builds it on install (`prepare`), pins the resolved commit in `pnpm-lock.yaml`, and keys its build allowance in `pnpm-workspace.yaml` by that commit — bumping the catalog is `pnpm update github-catalog --filter @a2uiverse/client` plus re-pointing that `allowBuilds` line. For local catalog iteration, `pnpm link ../../../a2uiverse-apps/github/github-catalog` overrides it temporarily.

## Running

```bash
pnpm --filter @a2uiverse/client dev        # vite dev server (5173)
```

The canvas sends to `VITE_ORCHESTRATOR_URL` (default `http://localhost:10001`; see `.env.example`). Through the dev tunnel, put the orchestrator's tunnel URL in an uncommitted `.env.local` — rules and ports in `_dev/docs/tunnel-environment.md`.

## Working without the LLM

`index.html?beat=<name>[,<name>…]` (`&instant` to skip pacing) replays beats through the full canvas turn lifecycle, zero tokens. Synthetic beats ship with the client: `plain`, `plain-2`, `validation`, `question`. Recorded beats (`recordings/beats/*.json`) are addressed by number — `1` PR list, `2` PR detail, `3` review compose (chained after 2, so replay it as `2,3`).

## Scripts (on demand, not part of `pnpm verify`)

Both need the orchestrator on `10001` and the GitHub agent on `11001` (see `apps/orchestrator/README.md`).

```bash
# Re-record the beats through the orchestrator. Run the LLM agent with TOOL_BACKEND=stub —
# real-shaped canned data, a Gemini key only, nothing account-specific in the fixtures.
pnpm --filter @a2uiverse/client record:beats -- --model gemini-3.7-flash [--beats 1,2,3] [--url http://localhost:10001]

# Transparency + journal check (phase-1 acceptance 2 and 4). Run the deterministic agent: the same
# utterance is sent direct and via the hub and the A2UI event sequences must be equal modulo an
# explicit strip list (envelope ids, timestamps, the hub's source stamp, surface-id ordinals, the
# orchestrator's leading envelope task), and the intent journal must grow by one line.
pnpm --filter @a2uiverse/client check:transparency [-- --agent http://localhost:11001 --hub http://localhost:10001 --journal ../orchestrator/.state/intent-journal.jsonl]
```

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
pnpm --filter @a2uiverse/client test:e2e   # playwright: builds, previews on 4173, compares chrome + surface baselines
pnpm --filter @a2uiverse/client lint
```

Playwright browsers install separately (`pnpm exec playwright install chromium`). Baselines are captured at 1024×768, UTC; `--update-snapshots` recaptures them.
