# Handoff — task 5.4, orchestrator: the Synthesizer authors the synthesize data model

## Where it stands

- 5.4 is `[WIP]`; its spec is written and committed (`_dev/docs/spec/task-5.4-orchestrator-synthesizer.md`). No code started.
- Route chosen: direct execution, test-first, on `main` (no worktree), as 5.2 and 5.3 were done.
- 5.2 (sdk contract v0.3, validator, resolution kit) and 5.3 (SortControl on Radix, scoped Radix sheet, portal root) are done and pushed. The sdk reserves the root key `sorts`.

## What to build, in a workable order

1. **sdk prompt builder** (`packages/sdk/js/src/prompt*.ts`): `buildSynthesisSystemPrompt({role?, catalogSchema, uiGuidance})` and `buildSynthesisTurn({utterance, request, sources, previous?, failure?, changes?})`; the composition doc as checked-in markdown bundled as a string; worked examples (a comparison over the mocks' shapes, the S1 timeline) validated by the sdk validator in tests. Contract test pattern continues.
2. **shell-catalog**: `guidance.md` beside `catalog.json` as a package export; a React-free subpath exporting the component APIs (upstream's from `@a2ui/web_core/v0_9`, the primitives' `*.schema.ts`) as a `Catalog` of APIs for headless validation.
3. **orchestrator**: `synthesizer/` rewrite — text call, one tagged block (own tag, not `<a2ui-json>`), extractor as its own function, `validateSynthesizeDataModel`, one retry carrying errors + failed document, then the tree through `web_core`'s `MessageProcessor` against the React-free catalog, then the derived-value rule (formula leaves only, resolved through templates), declared-operator check reading names from `catalog.json`; `operators.ts` goes. `synthesisPainter` paints the model's components verbatim, payload under `a2uiverseSynthesis`. `integrity.ts` over the sdk's `refValidity` per ref. Executor: re-synthesis input = previous document + change account (stale refs by surface, absent refs); journal = accepted document, note, outcome, every attempt's raw text and errors, the change account, `deadAirMs`. `planner/prompt.ts`: medium described, brief asked, vendor merge asks. Model/effort settings unchanged.
4. **Tests**: `FakeSynthesizer` emits a synthesize data model; integration covers retry, malformed after retry, re-synthesis with the change account, predicate ref surviving a bump; live smoke stays behind `A2UIVERSE_SYNTHESIZER_LIVE=1` + `GOOGLE_API_KEY`.

## Open threads

- **The client cannot evaluate 5.4's output until 5.5.** The client still reads `a2uiverseWiring` and the Phase 4 shape, so between 5.4 and 5.5 the live canvas's merged view paints a tree with no values. Prove 5.4 with the orchestrator's tests and the live smoke test; the live tunnel check of a merged view is 5.7's.
- Legacy `wiring.ts` + `composition.v0.2.json` in the sdk, and the client's `SortObject` alias in shell-catalog, go with whichever of 5.4/5.5 lands second.
- Whether the AI SDK/provider accepts the recursive schema for structured output is moot: decision 16 is text + validate. Keep the Planner on structured output.
- Phase 6 revisits the Planner's framing (archetypes); do not widen 5.4 into that.

## Facts worth not rediscovering

- `@a2ui/web_core` is React-free (deps: zod, preact signals) and exports the basic catalog's component APIs and `MessageProcessor`; the shell primitives' schema files are React-free. Headless tree validation needs no new dependency.
- The kit's vendor prompt is the upstream `generate_system_prompt`: role · workflow (domain doc) · UI description (brand doc) · raw schemas verbatim · examples, ~74 KB for Gmail (`../a2uiverse-apps/gmail/agent/system_prompt.dump.txt`). `catalog.json` is ~60 KB.
- Port 5173 stuck ⇒ `lsof -nP -iTCP:5173 -sTCP:LISTEN`; a stale `vite --host` from an earlier day was the cause once. Live roster: `pnpm dev:all --agents-dir ../a2uiverse-apps --mode live`; browser via `https://vnw20xbg-5173.asse.devtunnels.ms`.
- Gate: `pnpm verify` (turbo build/typecheck/test, eslint, prettier). shell-catalog's `test`/`build`/`dev` run `scripts/scope-radix.mjs` first; the client's collision detector scans catalog packages' `.css` and `.js` files for `.css` literals — never write the stock Radix sheet's specifier as a literal in shell-catalog JS.
