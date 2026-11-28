# 21.10 — The sdk on v1.0: plan

The plan for the [21.10 task spec](../spec/task-21.10-sdk-on-v1-0.md). The code lands on `phase-21/10-sdk-on-v1-0`, a worktree branched off `phase-21/flip`, and merges back into `phase-21/flip`. The documents under `_dev/` land on `main`.

## Found before the steps

Read and run against `@a2ui/web_core` 0.16.1, with the v1.0 files at `7a776e7a4`.

1. `MessageProcessor`, given the catalogs a case declares and `{...STRICT_VALIDATION, targetVersion: '1.0'}`, passes all 50 cases of `validator_v1_0.yaml` on its own when the cases are read as upstream's Dart runner reads them. That runner keeps one processor for a case's steps. It registers one declared document under every catalog id the payload's `createSurface` messages name, except an id containing `unknown`, `unregistered` or `nonexistent`, and also under its own id, or under `standard` when nothing names one. A case declaring no document gets the basic catalog. Several documents are each registered under their own id.
2. The processor stops at the first failing component of a batch. The Planner and the Synthesizer feed every component's findings back to the model on their retry, so the validator keeps one finding per component. Each component is judged on its own by a processor that holds the surface, under strict rules with the three graph checks relaxed. Each component is then judged against the catalog the release resolves it to, its nested calls included. The whole payload then goes through one strict processor, which reports its first failure. The graph check and the depth and path check run as they do today.
3. On a v1.0 surface the release accepts `{"path": ...}` as a literal, passes `{"call": ...}` unchecked, takes an `updateDataModel` with no `value`, and takes a `v0.9` `updateComponents` when no `targetVersion` is set. These are findings 2 and 3 of decision 20, and the three forms the schema-form check refuses.
4. The release requires `callFunction.catalogId` on a `callRendererFunction`.
5. The release accepts an `@accessibility` object holding an unknown key. This is the first of decision 20's seven leads, and it is now seen run as well as read.
6. Upstream's Node restaurant finder serves a card with no A2UI entry. The end-to-end TypeScript agent serves a `v0.9` entry and a `v1.0` entry, each with flat params. Both cards are fetched from the agents running in `../a2ui-upstream/`. The card of the ADK restaurant finder is the fixture the sdk already holds.

## Steps

Each step compiles and its tests pass before the next. The commits are made in this order.

1. **The spec copy.** `sync-a2ui-spec.mjs` copies the v1.0 files at `7a776e7a4`: from `specification/v1_0/json/`, `common_types.json`, `agent_to_renderer.json`, `renderer_to_agent.json`, `agent_capabilities.json`, `renderer_capabilities.json`, `renderer_data_model.json` and `catalog_definition.json`; the v1 basic catalog and its examples; and `validator_v1_0.yaml` with the catalogs it reads. `embed-spec.mjs` embeds the v1.0 files. The v0.9 and v0.9.1 copies go.
2. **The stamp.** One reading of a message's `version`: `1.0`, or another stamp and whether it reads below 1.0. A message with no `version` is not read as A2UI, as today.
3. **The validator.** It takes several catalogs, applies the `targetVersion` gate and judges each component as step 2 of the findings above has it. The conformance test runs `validator_v1_0.yaml` with the Dart runner's catalog reading. `validator.test.ts` and `prune.test.ts` move to v1.0 payloads.
4. **The schema-form check.** The vendored `agent_to_renderer.json`, `renderer_to_agent.json` and `common_types.json`, compiled with Ajv beside the surface's catalog document. The examples of `catalogs/basic/v1/examples/` pass the check and the validator.
5. **The card read and the capabilities.** The card is read from its v1.0 entry against the `1.0` part of `agent_capabilities.json`. Keyed params are a finding naming the key, and a card declaring A2UI without v1.0 is a finding carrying its versions. The capabilities and data model keys and shapes follow decision 3. `A2UI_VERSIONS`, the maps by version and the per-version card read go. So do the three agent kit card fixtures. The four cards of decision 23.3 come in as fixtures.
6. **The entitlement rule and the smoke check.** One walk over the four places a paint names a catalog. The smoke check judges the stamp first, then the rule, then the validator over the app's entitled catalogs.
7. **The catalog gate and the additive-evolution check.** The gate's four checks of decision 14, and the keywords of decision 15.
8. **The host-module interface.** `0.16.1-v1.0`, the descriptor's pattern widened in the schema and in `catalog-artifact.schema.json`, the eight specifiers. The three import lines of `apps/client/src/catalogs/host.ts` and their three entries in the module map move. `hostExports.generated.ts` is written by `pnpm --filter @a2uiverse/client write:host-exports`. Decision 23.8's check of the names the catalogs import runs once.
9. **The extension, the exports, the version.** `a2uiverse.v1.0.json` at `1.0.0` with v1.0's keys, the URI, the export names in renderer and agent words, and the sdk at 0.12.0.
10. **The documents.** The sdk's two READMEs, the contract files, and the sentences decision 19 names.
11. **On `main`.** The three findings in `_dev/a2ui-findings.md`, each with its reproduction. The notes of decision 21 on the lines of other sub-tasks.
12. **The proof.** Decision 23.9's search, then the sdk package's build, typecheck and tests, with ESLint and Prettier on what changed.

## Found while building

1. The v1.0 protocol requires every component instance id to be a UAX #31 identifier, and 0.16.1 refuses `go-label`. The evolution guide's migration steps don't name the rule, so the converter sub-task 21.11's line carries it, as do the lines of the sub-tasks whose paints write ids.
2. Under `STRICT_VALIDATION` the release judges the graph after every batch, so it refuses two of upstream's own v1 basic catalog examples that stream a tree in batches. The validator judges each surface's tree once, where the payload leaves it. A component its parent stopped referencing in a later copy is left out of that tree, as the renderer holds it and draws nothing, so it is not an orphan. A component nothing ever referenced stays an orphan, as upstream's case has it. The records sub-task 21.22's line carries the row.
3. Each component is judged by a fresh processor under the real surface id, so the release's words name the surface as the payload does. A finding the payload's pass repeats word for word is said once.
4. Upstream's v1 basic catalog passes `catalog_definition.json`, so the gate keeps all four checks.
5. Of the 67 names the shell catalog and the nine catalog packages import from the three v0.9 entry points, 51 are lent at runtime and seven are types. The other nine were renamed: the GitHub catalog's five validation implementations, now `RequiredV1Point0Implementation` and its siblings, and the shell catalog's `V09_SPEC_FUNCTIONS`, now `BASIC_FUNCTIONS` of the v1 basic catalog. The lines of 21.12 and 21.18 carry them.
6. In a fresh worktree, `write:host-exports` needs `@a2uiverse/card` built, since the client's Vite config loads the registry snapshot. From a worktree, the sync script needs `A2UI_REPO`, since its default path to the fork assumes the main checkout.
