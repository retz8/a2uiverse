# Task 2.5 — Client composition

> Implementation runs in worktree `phase-2/5-client-composition`; `_dev/` edits stay on `main`.

## Context

Phase 2 turns the canvas from a one-surface stage into a compositor. Task 2.4 landed the orchestrator half:
every utterance turn paints a shell surface (`shell:main`, in `@a2uiverse/shell-catalog`) whose `Slot`
components stand in for each dispatched agent, fans out to those agents, namespaces every fragment's
`surfaceId` to `<appId>:<surfaceId>`, and stamps each A2A event with
`metadata.a2uiverse = {source, slot?, role}`.

The client has none of it. It registers one catalog, renders one surface at a time, never reads event
metadata, and its turn runner is built on "the most recently created surface wins the stage"
(`canvasTurn.ts:232-235`, `:315-328`) — under composition the last fragment to arrive would steal the stage
from the shell and retire it into the timeline. `apps/client` has zero references to `readStamp`,
`@a2uiverse/sdk`, `@a2uiverse/shell-catalog`, `SlotContentContext` or `VALIDATION_FAILED`, though both
workspace packages are already declared dependencies.

Design is locked in `_dev/docs/spec/task-2.5-client-composition.md` (15 decisions). This plan sequences them;
it does not re-open them.

## Outcome

`pnpm dev` against a composing orchestrator renders one composed screen: the shell layout paints first with
pending slots, each fragment fills its own slot as it arrives in its own design system, each inside an
isolated boundary with attribution, and a failing fragment flips its slot without touching the others.
Phase 1 behaviour — hold-and-swap, timeline, time travel, question overlay, fork, repaint — survives intact
for stamp-less streams, so every existing beat and test stays valid.

## Stages

Each stage is its own commit and ends green on `pnpm verify`, mirroring how 2.4 was staged.

### 1 — Register the shell catalog

- `orchestratorApi.STATIC_CATALOGS` gains `{appId: 'shell', catalogId, package: '@a2uiverse/shell-catalog'}`,
  and `catalogs/resolver.ts`'s private `TABLE` gains the matching `ResolvedCatalog`. The id comes from the
  React-free `@a2uiverse/shell-catalog/id` subpath — the exact import
  `apps/orchestrator/src/composition/shellPainter.ts:4` uses, so client and hub cannot drift.
- `supportedCatalogIds` (`createCanvasWiring.ts:67`) picks it up for free.
- **`scripts/lib/drive.ts:41-49` must change too** — `supportedCatalogIds()` there reads
  `github-catalog/catalogs/v0.9.1/catalog.json` and returns a single-element array. The beat recorder would
  otherwise tell the hub the client cannot render the shell catalog.
- Memo at the registration site: Gmail and Calendar are added here when 2.6/2.7 publish.

Boot resolution stays strict — `STATIC_CATALOGS` is client-owned, so a missing package is a real bug.
Unknown catalogIds arriving at runtime are stage 5's problem.

### 2 — Stamp threading, placement map, role-based stage candidacy

The structural core; these must land together or the canvas breaks.

- **Stamp extraction** — `extractStampFromEvent` in `a2a/messages.ts`, a sibling to
  `extractPaintMetasFromEvent`, reading `event.metadata` through `readStamp` from `@a2uiverse/sdk`.
- **Transport** — `sendAndApply` (`a2a/client.ts:66-74`) already takes **seven positional parameters**, with
  `onPaintMeta` seventh. Do not add an eighth. Collapse the trailing callbacks into a single options object;
  there are only two call sites (`createCanvasWiring.ts:146`, `streamUserMessage.ts:57`) and `client.test.ts`
  only covers `agentCardUrl`, so the churn is small. Stamp reaches the turn handle through an acceptor
  mirroring `acceptPaintMeta` — one stamp per batch, since one stream event is one source.
- **Placement map** — `canvasStore` gains slot → surfaceId state plus mutators, alongside `stageId`.
- **Role-based candidacy** — `canvasTurn.ts`: `applyProgressive`'s single-occupancy rule and `endStaged`'s
  survivor classification consider only shell-role surfaces. Fragments register in the placement map and are
  excluded from stage and timeline candidacy; single occupancy applies per slot for them. Teardown of the
  previous composition rides the new shell's `createSurface` — `applyMessages.ts:54-61` already expands a
  repeat create into delete+create for the shell surface itself, but fragments need an explicit cascade, and
  it must snapshot before deleting.

**A stamp-less surface is a shell-role stage paint.** This is what keeps the three recorded beats and the
`plain` / `plain-2` / `validation` / `question` synthetic beats valid — composition is opt-in via the stamp.

Beat plumbing lands here: `BeatBatch` grows an optional stamp, `scripts/record-beats.ts:71-74` captures it,
`replayBeat.ts` passes it through, and a composed synthetic beat joins the four in `beats/syntheticBeats.ts`
(note it currently imports only `github-catalog`'s `CATALOG_ID`; the composed beat needs both ids).

### 3 — Slot mounting and the fragment boundary

- The client supplies `SlotContentContext`'s resolver — the seam
  `packages/shell-catalog/src/slot-content.ts` declares and defaults to `() => null`.
- The resolver returns a slot's complete content: **fragment boundary → catalog Provider → surface**.
  `CatalogContext.tsx:29-33`'s `SurfaceFrame` is already the catalogId → Provider → `A2uiSurface` piece;
  reuse it inside the boundary rather than duplicating it. (While there: `CatalogProvider` rebuilds its Map
  on every render at `:22` — memoize it now that it is on the composed render path.)
- The boundary is a new client-owned component: a **real element**, not a fragment and not
  `display:contents`, carrying a stable data attribute, the source, and an accessible name. 2.8 anchors
  `@scope` and Primer's portal root to it; stage 7's detector asserts on it.
- Parameterize the resolver over (processor, placement map) rather than binding it to the live processor —
  stage 4 needs the same resolver over a parked sandbox.

### 4 — Composition-aware timeline

- `PaintEntry` (`timeline/paint.ts:55-68`) widens from one surface to the composition's surface set plus its
  placement map. `snapshotSurface.ts` is unchanged and simply runs per member.
- `retireStage` cascades over the composition; `parkedSession.ts:53-62` loops its existing three-message
  rebuild per surface and exposes the placement map so `ParkedStage` can mount the stage-3 resolver.
- `causeContext.ts:56-64`'s `parkedClientDataModel` reports every parked surface keyed by namespaced id —
  which is what the hub's partition filter expects.
- All-collapsed composition renders nothing → existing net-effect path (report the withdrawal, no entry).
- `entryTitle`'s last-resort `humanizeSurfaceId` fallback would render "Shell:main"; composed entries fall
  back to the cause phrase instead.

Known test churn: the `PaintEntry` factories in `canvasStore.test.ts:16`, `timeline/paint.test.ts:26` and
`timeline/parkedSession.test.ts:18`, plus consumers in `ParkedStage.tsx`, `HistoryChrome.tsx`,
`createCanvasWiring.ts`.

### 5 — Validation and `VALIDATION_FAILED`

- Fragment-scoped classification in the turn runner: validation errors keep riding the existing
  `deferredValidation` / `settleDeferred` path (`canvasTurn.ts:167-184`) and are judged at turn end against
  settled surfaces; failures that cannot self-heal — unknown catalogId on `createSurface`, which throws
  `A2uiStateError` from the processor — report immediately. One report per failed fragment. Shell-surface
  failures stay on the existing local error channel.
- New `buildErrorMessageParams` in `a2a/messages.ts` beside the action and text builders, so the private
  `messageMetadata` helper (`:51-67`) stays private.
- Dispatch is a **side channel** in `createCanvasWiring.ts`: no `startTurn`, therefore no cause, no timeline
  entry, no `beginPaint`, and critically no cancellation of the user's in-flight turn (`runner.begin` cancels
  the current turn at `canvasTurn.ts:154`). Send through `sendAndApply`, apply the hub's shell repaint
  directly via `applyA2uiMessages` plus `bumpApplied`. Drop reports for superseded compositions; log and
  swallow a failure of the report itself.

### 6 — Shell-granted promotion

- `isQuestion` (`canvasTurn.ts:194-198`) narrows to shell surfaces. A fragment declaring
  `paintMeta.kind: 'question'` — or the structural `ConfirmationDialog` root — becomes a **promotion**
  instead of an overlay paint.
- `canvasStore` records the promoted slot set; `CanvasApp` renders a scrim dimming the complement; the
  stage-3 boundary gains the raised treatment.
- Promotion is **plural**, so it is not a modal: no focus trap, no `aria-modal`. Each promoted boundary is
  named accessibly and the shell announces the count through a live region. Emphasis must read without the
  scrim, since all-promoted means the scrim covers nothing.
- Cleared when a slot fails and when the composition tears down.

Highest-exposure existing tests: `canvasTurn.test.ts`'s `describe('question paints and the overlay slot')`
(:280) and `describe('paint meta')` (:397), plus `tests/canvas-transitions.test.tsx:65`. These stay green —
their surfaces are stamp-less, hence shell-role.

### 7 — Collision detector

Three layers, split by what each medium can actually see. The two in-gate layers are **vitest tests in
`apps/client`**, so they ride `turbo run test` — no change to the single `verify` string in
`package.json:16`, and no new turbo task.

- **Static scan** of every installed catalog's shipped CSS: custom properties, classes and keyframes defined;
  writes at `:root` / `html` / `body`; and reads not satisfied inside the boundary or by an explicit
  fallback. Prefix-agnostic — it discovers names rather than assuming `--a2ui-*`, because two design systems
  can independently ship `--text-primary` meaning different colours.
- **jsdom mount test** mounting all installed catalogs together: per-subtree token values via
  `getPropertyValue` (verified working — jsdom inherits custom properties even though it will not resolve
  `var()`), nothing on `documentElement`, no DOM outside a boundary.
- **Playwright spec** for what jsdom cannot do: stylesheet-based scoping — `github-catalog`'s Provider lazily
  `import()`s three `@primer/primitives` stylesheets that never load under jsdom — and the anchored portal
  root.

It enumerates installed catalogs, so 2.6/2.7 widen it for free and acceptance 6 is verified in 2.9. A real
GitHub Actions workflow is a separate chore.

### 8 — ChoicePicker patch

`pnpm patch` on `@a2ui/react`, editing only the `v0_9/index.js` bundle the client imports, applying the
instance-unique `useId()` group name from upstream PR #2449's React half. No Angular, no changelog. This is
the repo's first patch: no `patches/`, no `.npmrc`, no `patchedDependencies` today — with pnpm 11 the
declaration goes in `pnpm-workspace.yaml`. Regression test: two surfaces whose pickers share a component id,
asserting independent selection (jsdom implements radio grouping by name, so the collision reproduces).
Both findings are already filed upstream (#2447, #2445), so no report work remains.

### 9 — Re-skin: composition chrome, adaptive weight, dark mode

New chrome — boundary, promotion, pending-slot treatment — built from the shell catalog's token vocabulary
rather than hand-rolled colours. Adaptive weight is Q3's resolution: structure constant, visual weight
scaling with composition size, so a lone fragment reads as owning the canvas and several read as distinct
sources; it lives on the client-owned boundary, driven by a data attribute, not in the shell tree.

**This stage touches `packages/shell-catalog`** — the pending placeholder currently renders a text panel
reading `"{label}…"` (`slot.tsx:15-38`), and `slot.test.tsx` asserts that text. Changing it to a
materializing treatment updates that package and its test. `CanvasApp.css` keeps reading Radix variables
directly. Dark mode gets wired and verified: this is the first time orchestrator-painted A2UI and client
chrome must agree on a palette, and `SHELL_TOKENS`' fallbacks are only exercised when Radix is absent.

### 10 — Docs

- `_dev/docs/design/client.md` — the client's system-design record, which does not exist yet even though
  `orchestrator.md` does.
- `apps/client/README.md` source map, and `apps/client/src/canvas/README.md` (the canvas shell's own design
  doc) for composition: the stage holds a composition, fragments mount through slots, and the
  "Wire additions for the canvas" section gains the composition stamp beside `paintMeta` and
  `a2uiForkContext`.

## Open decision for you

**Styling the unknown-component fallback.** `@a2ui/react`'s `DeferredChild` hardcodes
`<div style={{color:"red"}}>Unknown component: X</div>` with no host hook. Decision 13's *behaviour* is
already satisfied — the node degrades, the fragment stays up — but the styling is not "a quiet placeholder".

1. **Extend the stage-8 patch by one hunk** to restyle both hardcoded fallbacks. Two lines against a bundle
   already being patched — but it widens the patch scope you bounded to the upstream React fix, and adds a
   local deviation to register in SPEC §14.
2. **Wrap the catalog client-side** so unknown types resolve to a placeholder we own. No patch, fully themed,
   but ~15 lines of proxying in a load-bearing path.
3. **Accept upstream's rendering** and file a third finding (the renderer should expose a fallback seam).
   Zero code; the boundary already contains it.

Recommendation: **1**.

## Discovered, out of scope

`a2uiClientCapabilities.supportedCatalogIds` is passed through to every vendor verbatim by the hub's
`vendorMetadata`. Once the client registers three vendor catalogs plus the shell catalog, each vendor learns
the full installed roster and the platform's internal catalog id. Filtering that per dispatch is hub-side
work, not 2.5's. Worth recording as a Phase 2 finding.

## Verification

- `pnpm verify` green at every stage (`turbo run build typecheck test` then `eslint .` and
  `prettier --check .`).
- Existing suites stay green where behaviour is unchanged — the stamp-less default preserves routing for all
  seven existing beats. Timeline tests change only where `PaintEntry` widened.
- The composed synthetic beat replays through `?beat=` with no orchestrator and no LLM: shell paint →
  pending slots → fragments filling → one slot failing.
- Playwright: existing chrome and surface baselines re-verified; new baselines for the composed screen, a
  promoted slot, and dark mode. Baselines are `-chromium-darwin` only, captured at 1024×768 UTC.
- Live through the tunnel (never `localhost` — the controlled browser is unit-side): `pnpm dev` plus the
  GitHub agent, checking first paint precedes any fragment, attribution renders per boundary, an action
  inside a fragment repaints only that fragment, and killing the agent mid-turn flips only its slot.
- Full three-agent acceptance belongs to 2.9, not here.
