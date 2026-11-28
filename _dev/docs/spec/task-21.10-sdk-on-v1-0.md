# 21.10 — The sdk on v1.0

The sdk moved to A2UI v1.0 alone: its spec copy, its validator and a schema-form check beside it, the card's A2UI declaration read for v1.0, the renderer's capabilities and data model under v1.0's keys, the A2UI part as the platform writes it, the host-module interface lending v1.0's entry points, the A2UIVerse extension at v1.0, and everything that told versions apart deleted. Sub-task 21.10 of Phase 21 (`_dev/docs/spec/phase-21-v1-0-migration.md`), the first on the flip branch.

The upstream check (phase decision 17) read `upstream/main` at `36725eee0` of 2026-11-25 and found no event: `@a2ui/web_core` and `@a2ui/react` are at 0.16.1 on npm, `a2ui-core` at 0.7.1 and `a2ui-agent-sdk` at 0.12.1 on PyPI, and upstream pull requests 4171, 4170 and 3930 are open.

## Scope

- The platform repo's flip branch.
- The spec copy under the sdk and `UPSTREAM.json`.
- The sdk's A2UI validator, its conformance test, the schema-form check and the smoke check.
- The card's A2UI declaration read.
- The renderer's capabilities and data model, and the A2UI part the platform writes and reads.
- The entitlement rule the hub's paint check and the smoke check share.
- The catalog gate and the additive-evolution check.
- The host-module interface: its name, the specifiers it lends, the descriptor's pattern, the sdk's list of the export names the host lends, and three import lines of the client's module map (`apps/client/src/catalogs/host.ts`).
- The A2UIVerse extension's URI, its contract file and its version.
- The sdk's version and the names of its exports.
- The sdk's two READMEs, the contract files under `packages/sdk/contracts/`, and the sentences of other documents that decision 19 names.
- Three findings in `_dev/a2ui-findings.md`, and notes on other sub-tasks' lines in `_dev/TODO.md`.
- Out: every package that depends on the sdk, each moved by its own sub-task; how a `callRendererFunction` and its answer are namespaced and routed between the orchestrator and the client — the orchestrator sub-task 21.13 and the client sub-task 21.14; how the new catalog ids are spelled — the shell catalog sub-task 21.12; the words a refused card or a paint in another version is told in — the orchestrator sub-task 21.13 and the marketplace and Stellify sub-task 21.15; the GitHub catalog's names — the catalogs sub-task 21.18; SPEC and the design records' passages on behaviour across packages — the records sub-task 21.22 and the sub-tasks that finish their subject.

## Locked decisions

### 1. The sdk alone is green on the flip branch

21.10 is proven by the sdk package's own gates. The seven packages that depend on the sdk (the orchestrator, the client, the marketplace, Stellify, `smoke-transport`, `shell-catalog` and `registry-snapshot`) do not compile on the flip branch until their own sub-tasks, and `pnpm verify` over the whole repo returns at the dev-harness sub-task 21.20. Each later sub-task is proven by its own package's gates.

### 2. The spec copy stays at the commit 0.16.1 was released from

The v1.0 schemas, the v1.0 basic catalog and upstream's v1.0 validator conformance file are read at `7a776e7a4` of 2026-11-23, as task 21.2's decision 1 pinned the copy. What upstream changed after the release is not taken, pull requests 4296 and 4336 on `conformance/core/validator_v1_0.yaml` among it.

### 3. The wire carries v1.0's names

A message is stamped `"1.0"`. The A2UI extension's URI is `https://a2ui.org/a2a-extension/a2ui/v1.0`. The hub's capabilities ride `a2uiRendererCapabilities` as `{"1.0": {supportedCatalogIds: [...]}}`, and the older key is not written beside it. The data model rides `a2uiRendererDataModel` as `{version: "1.0", surfaces}`. The public basic catalog is `https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json`.

### 4. The platform writes one message per part

Where the platform authors an A2UI part it writes one message per part, as today. The v1.0 extension specification requires a list, and this is the one place phase decision 4's rule of authoring the schema's stricter form gives way: at the pinned commit no released agent reads a list. Python `a2ui_a2a` reads a part's `data` as one message, both agent SDK processors throw on an array, and upstream's Node restaurant finder ignores one. The reading of a part is unchanged: one message, a bare list, or a list an A2A 0.3 layer wrapped as `{value: [...]}`, and an object holding a `messages` list is not read.

### 5. A v1.0 entry's params are read flat only

The params of a card's v1.0 A2UI entry are validated against the `1.0` part of `agent_capabilities.json` and read flat. Params holding a version key fail the read with a finding that names the key.

### 6. A card that declares A2UI but not v1.0 has a finding of its own

Any entry of a card's `capabilities.extensions` whose URI is under the base `https://a2ui.org/a2a-extension/a2ui/` is an A2UI entry. A card with A2UI entries and none for v1.0 gets a finding that carries the versions it declares and whether all of them read below 1.0. All older is phase decision 2's refusal; a newer version among them is a refusal too, in words of its own. A card with a v1.0 entry is read from that entry alone, and a card with no A2UI entry declares nothing, the basic-catalog fallback.

### 7. The entitlement rule checks every place a paint names a catalog

The one rule the hub's paint check and the smoke check share walks four places: `createSurface.catalogId`; a component's `@catalogId`; a component's bare `catalogId`, which `@a2ui/web_core` 0.16.1 reads when the component's schema declares no property of that name; and a function call's `catalogId`, in a component's property, in an action's `functionCall` or in a `callRendererFunction` message. A paint naming a catalog outside the entitlement in any of them is outside, and the finding names the place and the catalog id. A component naming no catalog on a surface with no default is the release's own verdict, reported as upstream's.

### 8. The stamp is judged first, on every message

The sdk exports one reading of a message's stamp: whether it is `"1.0"`, and if not, what it is and whether it reads below 1.0. The validator sets the release's `targetVersion` gate, so every message stamped otherwise is a finding, a `v0.9` update on a surface created at `1.0` among them. The smoke check reports a paint in another version as a finding of its own that names the stamp. A message with no `version`, as v0.8 writes them, is not read as A2UI.

### 9. The validator's verdicts are upstream's, over several catalogs

Beyond decision 8's gate the validator reports the verdicts of `@a2ui/web_core` 0.16.1 and carries one relaxation. A surface's tree is judged once, where the payload leaves it, and a component a later copy of its parent stopped referencing is left out of it, with what only it reaches; a component nothing the payload sent ever referenced is an orphan. It takes several catalogs, each component judged against its own. It accepts v1.0's two agent-to-renderer function messages, `callRendererFunction` and `agentFunctionResponse`, as the release judges them.

### 10. A schema-form check stands beside the validator

The sdk carries a second check for what the platform itself authors: the vendored v1.0 `agent_to_renderer.json`, `renderer_to_agent.json` and `common_types.json`, compiled with the surface's catalog document. It refuses what the release accepts and the v1.0 schema does not: a binding written `path`, a call written `call`, an `updateDataModel` with no `value`. It judges a surface in one catalog. Which paints go through it is each later sub-task's own decision.

### 11. The host-module interface is named by the release and the A2UI version it lends

The interface of step 2 is `0.16.1-v1.0`, and the rule stands for later releases. The descriptor's `hostInterface` pattern widens to take the name. An artifact packed for `0.16.1` is refused by name at publish, at install and at load.

### 12. The interface lends eight specifiers

`react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `zod`, and `@a2ui/react`, `@a2ui/web_core/v1_0` and `@a2ui/web_core/catalogs/basic/v1` in the place of the three v0.9 entry points, beside `loadStylesheet`. A catalog importing from the `@a2ui/web_core` root or from `@a2ui/web_core/universal` is refused at pack.

### 13. The client's generator writes the list of what the host lends

21.10 moves three import lines of the client's module map (`apps/client/src/catalogs/host.ts`) to the v1.0 entry points and writes `hostExports.generated.ts` with the client's own script. Nothing else in the client is touched. If the generator cannot run while the rest of the client does not compile, a script of the sdk's own is the fallback, and it comes back to the owner before it is taken.

### 14. The catalog gate asks four things of a catalog document

The document declares `protocolVersion: "1.0"`; it loads through the release at `1.0`; each component compiles against the pinned v1.0 common types; it validates against the vendored `catalog_definition.json`. If upstream's own v1 basic catalog fails `catalog_definition.json`, that is a finding and the gate leaves that one check out.

### 15. The additive-evolution check learns v1.0's keywords

The acceptance of a component gaining `ComponentCommon` is deleted. A changed `returnType` is a type change. A narrowed `allowedCallers`, an `allowedParents` or `allowedChildren` added or narrowed, and `requiresUserActivation` turned on are each a tightened constraint.

### 16. The A2UIVerse extension moves with the wire

Its URI is `https://a2uiverse.dev/ext/a2uiverse/v1.0`, its contract file `a2uiverse.v1.0.json` and its version `1.0.0`. The contract's content takes v1.0's keys and words in the same change, and the prose that cites the file follows.

### 17. The sdk's exports take v1.0's words, and the sdk is 0.12.0

The names of the sdk's exports say renderer and agent where the protocol does (phase decision 11); "the client" stays the name of the canvas shell. `@a2uiverse/sdk` becomes 0.12.0.

### 18. What told versions apart is deleted

`A2UI_VERSIONS` and the maps by version; the rule giving a version with no entry the other's set; the entitlement check per stamp; the v0.9 and v0.9.1 schemas and the v0.9 conformance file; the three agent kit card fixtures; the contract's `a2uiVersions` and its card read per version.

### 19. The documents that state a fact of the sdk's own move here

On the flip branch 21.10 changes the sdk's two READMEs and the contract files, and the sentences elsewhere that state a fact wholly the sdk's: the host-module interface's name and specifiers in the app-install design record (`docs/design/app-install.md`), the marketplace design record (`docs/design/marketplace.md`) and Stellify's README, and the extension contract's file name in `docs/design/synthesis.md` and `docs/design/a2ui-on-a2a.md`. The design records' passages on behaviour across packages wait for the sub-tasks that finish their subject. SPEC waits for the records sub-task 21.22, whose line takes a note naming the rows that leave and the rows restated.

### 20. Three findings, each once reproduced on the pinned release

1. The v1.0 extension specification requires a part's `data` to be an array of messages, while the released agent SDKs and upstream's reference renderer write and read one message per part: finding 29, restated at v1.0 and the pinned release.
2. `@a2ui/web_core` 0.16.1 accepts a v0.9-style binding and passes a v0.9-style call unchecked on a v1.0 surface, where the v1.0 schema rejects both.
3. Its `MessageProcessor` accepts a `v0.9` `updateComponents` on a surface created at `1.0`.

Seven more, read in upstream's source and not reproduced, go on the line of the records sub-task 21.22 as leads: an `@accessibility` object with an unknown key passing; ten surfaces of `validator_v1_0.yaml` naming a catalog id that is not the catalog file's; no agent SDK reading `a2uiRendererDataModel`; the Node restaurant finder painting v0.9 on a message that carries no capabilities, and the Kanban sample painting on activation alone; the Node restaurant finder's card declaring no A2UI extension; `Catalog.fromJson` at `1.0` loading a catalog written with v0.9's absolute references; `catalog_definition.json` defaulting `protocolVersion` to `"0.9"`.

### 21. Notes from 21.10 go on other sub-tasks' lines

1. The converter sub-task 21.11, the agents sub-task 21.17 and the catalogs sub-task 21.18: the GitHub catalog's 58 component names with a dot and three property names with a hyphen fail v1.0's identifier rule, which 0.16.1 enforces when it loads a catalog at `1.0`.
2. The orchestrator sub-task 21.13 and the marketplace and Stellify sub-task 21.15: the card read's outcomes, the words for a card declaring only a newer version theirs; the stamp reading, the entitlement rule's four places and the schema-form check; capabilities on every message, upstream's Node restaurant finder painting v0.9 on a message that carries none.
3. The client sub-task 21.14: the three import lines of its module map moved, the list of what the host lends written.
4. The marketplace and Stellify sub-task 21.15: the interface named `0.16.1-v1.0`, the descriptor's pattern widened.
5. The agent kit sub-task 21.16: one message per part and flat card params are what the released agent SDKs speak; upstream pull request 4418, which lets `a2ui-a2a` take `a2a-sdk` 1.x, is merged and in no release.
6. The records sub-task 21.22: decision 19's rows and decision 20's seven leads.

### 22. The flip branch is `phase-21/flip`, pushed

21.10 creates the platform repo's flip branch, `phase-21/flip`, and works in a worktree on `phase-21/10-sdk-on-v1-0` off it, merged back into it. The flip branch is pushed to `origin` after each sub-task lands on it; its failed pipelines are expected. The apps repo's flip branch, under the same name, is created by the first `[apps]` sub-task of step 2 that needs it.

### 23. What proves it

1. Upstream's `validator_v1_0.yaml`, as synced at decision 2's commit, through the sdk's validator, all 50 cases green: several catalogs to a case, a case naming no catalog, and a surface naming a catalog id the case does not define read as upstream's own runner reads them. A case the validator cannot pass comes back to the owner and is not skipped.
2. Every example under `catalogs/basic/v1/examples/` at decision 2's commit passing the validator and the schema-form check, and the schema-form check refusing decision 10's three forms.
3. The card read on cards as their agents serve them: upstream's Node restaurant finder, with no A2UI entry; upstream's ADK restaurant finder, declaring v0.8 and v0.9; upstream's end-to-end TypeScript agent, declaring v1.0 with flat params; and, written by hand, a card with the keyed wrapper and a card declaring only a newer version.
4. The entitlement rule finding a paint outside for each of decision 7's four places, the place named.
5. A `v0.9` `createSurface` and a `v0.9` `updateComponents` on a surface created at `1.0` each a finding, and the smoke check naming the stamp.
6. The catalog gate refusing an artifact packed for `0.16.1` by name and a v0.9 catalog document, and passing upstream's v1 basic catalog on decision 14's four checks.
7. The additive-evolution check refusing each of decision 15's four keywords tightened and accepting each loosened.
8. Every name the shell catalog and the nine catalog packages import today from the three v0.9 entry points exported by one of decision 12's three, or listed with where it went. Run once, and not kept as a test.
9. A search of the sdk's sources, contracts, fixtures and spec copy for `v0.9`, `v0_9`, `v0.9.1` and `v0.8` returning only listed exceptions, the ADK card fixture among them.
10. The sdk package's build, typecheck and tests green, its contract tests among them, with ESLint and Prettier on what changed.

## Invariants

- No code of the sdk serves both wires.
- Beyond decision 8's gate and decision 9's one relaxation, the validator's verdicts are upstream's.
