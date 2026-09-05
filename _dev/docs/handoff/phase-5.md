# Handoff — Phase 5, after 5.4 and 5.5

## Where it stands

- 5.1–5.5 done and committed on `main`; `pnpm verify` green. 5.4 and 5.5 were worked directly on `main`, test-first, no worktree.
- Next in order: **5.6** `[apps]` S1 beats (worked on `../a2uiverse-apps/` `main`, no worktree), then **5.7** integration + acceptance (after 5.4–5.6), **5.8** design records (after 5.7). **5.9** (shell catalog on Radix Themes) is parallel and must land before 5.7.
- Specs: `_dev/docs/spec/task-5.4-orchestrator-synthesizer.md`, `task-5.5-client-synthesis.md`; phase spec `phase-5-heterogeneous-shapes.md`.

## What 5.4 built (orchestrator authors the synthesize data model)

- **sdk prompt builder** (`packages/sdk/js/src/prompt/`): `buildSynthesisSystemPrompt({role?, catalogSchema, uiGuidance, examples?})` and `buildSynthesisTurn({utterance, request, sources, previous?, errors?, changes?})`. The composition doc is `packages/sdk/docs/composition.md`, embedded into `src/prompt/composition.doc.generated.ts` by `js/scripts/embed-docs.mjs` (runs before build/typecheck/test; generated file gitignored). Worked examples `CAMERA_COMPARISON` (keyed refs over two storefront shapes) and `TODAY_TIMELINE` (S1 over calendar/gmail/github shapes) in `prompt/examples.ts`. The model answers inside `<synthesize-data-model>`; `extractSynthesisBlock` reads it. `ChangeAccount {stale: surface → refs, absent: refs}` is the re-synthesis input.
- **shell-catalog**: `docs/guidance.md` exported as `@a2uiverse/shell-catalog/guidance.md`; React-free `@a2uiverse/shell-catalog/schema` exports `SCHEMA_CATALOG` (a `Catalog` of component APIs), `OPERATORS`, `CATALOG_ID`.
- **orchestrator** `synthesizer/`: `Synthesizer` (the loop: extract → sdk `validateSynthesizeDataModel` → `checkSynthesis` → one retry with the error lines and failed document → `malformed`) over a `SynthesisModel` text seam (`AiSdkSynthesisModel`; tests inject `FakeSynthesizer`). `checkSynthesis`: headless `MessageProcessor` against `SCHEMA_CATALOG`, declared children, no `Slot`/`Attribution`/`Frame`, derived-value rule resolved through templates (`/rows/*`), operators from the catalog's `OPERATORS` export (not `catalog.json` — task 4.3 recorded that the schema cannot mark operators), refs resolving now through `Partitions.resolve`, which goes through the sdk kit so predicates resolve. `prompt.ts` reads `catalog.json` + `guidance.md` and the role. `composition/integrity.ts`: `checkSynthesisPayload` + `changeAccount` over `refValidity`. `synthesisPainter` paints the model's components verbatim, payload under `a2uiverseSynthesis`. Journal `synthesis` record: `{outcome, reason?, synthesizeDataModel?, note?, attempts: [{text, errors}], changes?, deadAirMs}`. Planner prompt describes the merged view as the shell's own view, asks for the brief, and asks vendor requests for the merge fields in plain words.
- Live smoke (`A2UIVERSE_SYNTHESIZER_LIVE=1`): Gemini answered the storefront comparison in one attempt, keyed refs, ~7 s.

## What 5.5 built (client evaluates it; the synthesis slot is shell content)

- **Slot** has `content: "fragment" | "shell"`. The orchestrator paints the synthesis slot as a bare shell-content `Slot` (no `Attribution`, no wrapper). Shell content: pending "Painting…" + Radix spinner, failed "Couldn't paint this.", no box, no floor. The client roster reads an unpaired shell-content slot as source `shell`, named by its `label`. `renderSlotContent` renders a `shell` source through `SurfaceFrame` + `SurfaceErrorBoundary` with no `FragmentBoundary` (`[data-shell-content][data-surface]`).
- **client** `canvas/synthesis/`: `intake.ts` (sdk `validateSynthesisPayload` + operator check → `VALIDATION_FAILED`), `bindingEvaluator.ts` (`evaluate({payload, models, generations, choices, functions})` → the derived model with a `CellObject` at every formula path, declared arrays sorted in place, `/sorts/N` declarations with the current choice; stale per ref via `refValidity`, any stale ref marks the cell), `synthesisSession.ts` (subscribes on `/sorts`; user choices kept by array path; `capture()` → `{surfaceId, payload, generations}`). Parked entries re-sort over `/sorts`.
- Fixture `src/beats/synthesisFixture.ts` is built from the sdk's `CAMERA_COMPARISON` (`DOCUMENT`, `PAYLOAD`, plus `INDEXED_*`/`REPOINTED_*` by-hand index-ref variants for the stale path). Synthetic beat `?beat=synthesis`: keyed refs survive the reorder, no re-synthesis.
- Removed: sdk `wiring.ts` + `composition.v0.2.json`, client `wiringSchema.ts`, shell-catalog `SortObject`.
- SPEC §4.3 (attribution is for vendor fragments) and §4.5 (quiet pending marker) amended.

## What 5.6 needs to know

- Scope (phase decisions 10, 11): send the "today" utterance to each of gmail, calendar, github **unmodified, in live mode**, and record the turn as an ordinary beat. No vendor prompt, domain doc or code changes for the merge.
- Recording is the kit's: `A2UI_RECORD_DIR` (see `../a2uiverse-apps/gmail/agent/README.md` "Recording live runs", pseudonymization armed by the same variable). Existing beats live per agent under `<vendor>/agent/recordings/beats`.
- The Synthesizer's S1 example (`TODAY_TIMELINE`) assumes fields like `start`/`receivedAt`/`updatedAt` and ids; what the real agents actually paint on a "today" turn is what 5.7 merges over. A vendor painting no usable time/id field is the §4.4 fallback, recorded as a finding — not fixed in the vendor.
- Roster live: `pnpm dev:all --agents-dir ../a2uiverse-apps --mode live`; browser via `https://vnw20xbg-5173.asse.devtunnels.ms`. Port 5173 stuck ⇒ `lsof -nP -iTCP:5173 -sTCP:LISTEN`.

## Open threads for 5.7

- The client has not yet rendered a live model-authored view end to end (5.4's live smoke stops at the validated document; 5.5's proof is the synthetic beat). First live tunnel run of a merged view is 5.7's.
- Dead air (`journal synthesis.deadAirMs`) is unmeasured under the text loop; a retry doubles it.
- `Synthesizer` retries once on any checklist failure; the journal's `attempts` shows how often the real model needs it.
- The Playwright e2e specs carry no synthesis case.
