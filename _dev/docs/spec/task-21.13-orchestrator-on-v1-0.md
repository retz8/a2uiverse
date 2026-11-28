# 21.13 — The orchestrator on v1.0

The orchestrator moved to A2UI v1.0 alone: what the hub sends an agent and what it refuses from one, an agent's renderer function call carried to the canvas and its answer carried back, the shell's own paints and the Planner's and the Synthesizer's prompts, examples and checks in v1.0's forms, the registry at install and on a record from before the flip, and the orchestrator's own card. Sub-task 21.13 of Phase 21 (`_dev/docs/spec/phase-21-v1-0-migration.md`), on the flip branch.

The upstream check (phase decision 17) read `upstream/main` at `36725eee0` of 2026-11-25 and found no event: `@a2ui/web_core` and `@a2ui/react` are at 0.16.1 on npm, `a2ui-core` at 0.7.1 and `a2ui-agent-sdk` at 0.12.1 on PyPI, upstream pull requests 4171, 4170, 3930 and 4347 are open, and pull request 4418 is merged and in no release.

## Scope

- The platform repo's flip branch.
- The hub: the capabilities and the extension it sends an agent, the entitlement rule over what an agent paints, a paint in another A2UI version, the credential bar on a surface that mixes catalogs.
- An agent's `callRendererFunction` and the renderer's answer, between the agent, the hub and the client.
- The registry, whole: the card read at install and at update, the refusals and their words, an app whose card declares only another A2UI version, and a record from before the flip.
- The shell painter's ids, and the Planner's and the Synthesizer's prompts, examples and checks.
- The orchestrator's own card.
- In the sdk: two install refusal causes, the drift test, and an option on the entitlement rule if decision 4 needs one. In the shell catalog: two failure causes, their place in its v1.0 document, and the tiles' words.
- The orchestrator's README and the design records that describe what changes.
- Notes on other sub-tasks' lines in `_dev/TODO.md`.
- Out: the client's half of the renderer function call, its drawing of a surface that mixes catalogs and its loading of catalogs — the client sub-task 21.14; the refusals at publish and at Stellify's preview — the marketplace and Stellify sub-task 21.15; the crossing of the dev registry by an Update press — the integration and acceptance sub-task 21.21; SPEC — the records sub-task 21.22.

## Locked decisions

### 1. The sub-task takes the registry whole

21.13 decides and builds the registry's behaviour on v1.0: the refusal at install and at update with its words, the words for a card declaring only a newer version, and how a record from before the flip boots and reaches the update tile. The integration and acceptance sub-task 21.21 proves the crossing and builds none of it.

### 2. Every message to an agent carries the capabilities under `1.0`

Every message the hub sends an agent, the plan's request, a press, the credential bar's repair and a function's answer alike, carries `a2uiRendererCapabilities` as `{"1.0": {supportedCatalogIds}}` holding the app's entitlement (decision 13), and activates the one v1.0 extension URI. The data model rides `a2uiRendererDataModel`.

### 3. The orchestrator's card lists one A2UI entry

The orchestrator's own card lists one A2UI entry, for v1.0, with no params.

### 4. The entitlement rule runs over every relayed event

The sdk's one entitlement rule runs over every event an agent sends, on all four places a paint names a catalog. A catalog outside the entitlement ends the dispatch under the cause `catalog`, as today: no Retry, and the live card fetched again for the update tile. For a component's bare `catalogId` on a surface created in an earlier event, the hub hands the rule that surface's default catalog from its own record.

### 5. The credential bar matches a component by its own catalog

The credential bar matches each component against the options of its own catalog: the one its `@catalogId` names, otherwise the surface's.

### 6. A paint in another A2UI version fails its slot under a cause of its own

The hub judges each event as it arrives. The first message stamped other than `1.0` ends the dispatch: that event is not relayed, the agent is sent A2A's cancel, and the slot is painted failed, the client dropping what the answer had already shown. A surface created at `1.0` and updated at `v0.9` is refused at the update.

The shell catalog's closed list of failure causes gains two, neither drawing Retry. A stamp that reads below 1.0: "This app is built in an older format A2UIVerse no longer supports." A stamp that reads as a version above 1.0: "This app is built in a newer format than this A2UIVerse supports." A stamp that is no version falls under the existing cause `invalid`.

### 7. An app whose card declares only another A2UI version is not called

A live card that declares A2UI and not v1.0 is judged before the agent is called, ahead of the update check and ahead of any sign-in being asked. The agent is not called, and the slot fails under decision 6's older or newer cause. When the run holds no live card, the stored one is judged. When the held card reads that way, the dispatch first fetches the live card again, within five seconds, so an agent that has since moved to v1.0 is called. The app stays installed and routed. The App Library and the Planner's installed-apps reader gain no line for it.

### 8. The hub namespaces a renderer function call's ids

The relay rewrites a `callRendererFunction`'s `functionCallId` to `<source>:<functionCallId>`, and its `surfaceId` as every surface id is namespaced, when the call names one. The renderer copies the id into its answer as written. The hub splits it, gives the agent its own id back, and routes by the source. The call is held to the entitlement by its `callFunction.catalogId`.

### 9. A function's answer goes to its agent at once

The client sends a `rendererFunctionResponse` as one A2UI part on the canvas's context. The hub dispatches it to the owning source through the AgentsPool, a new message in that agent's own conversation naming no task, with the source's credential, capabilities and data model partition, and relays what the agent replies as that source's fragment. The answer is exempt from the rule of one press at a time inside a fragment: it goes whatever else is running on that source. It counts as a request in flight, so a merge that would read the source waits until the answer's dispatch settles. A renderer `error` that carries a `functionCallId` is delivered as the answer is.

### 10. A delivery that fails changes nothing on the slot

A function's answer that cannot be delivered is journaled with its cause and draws nothing: the fragment on screen stays, the answer is never kept for a Retry, and no sign-in is asked on its account. What the agent sends in reply is judged as any paint is.

### 11. A renderer error on a surface and the agent function messages stay as they are

A renderer `error` that carries a `surfaceId` is handled as today: the slot fails, the error is journaled, and nothing is forwarded to the agent. A `callAgentFunction` from the client is not routed (phase decision 5) and is journaled, so it gets no answer. An agent's `agentFunctionResponse` is relayed untouched.

### 12. An install or an update refused over the A2UI version has two causes

The sdk's closed list of install refusals gains two causes, with no press on either, shared with the marketplace and Stellify sub-task 21.15.

A card whose A2UI entries are all for versions older than v1.0: "Shop B can't be installed. It's built in an older format A2UIVerse no longer supports, so nothing was installed.", and at an update "Shop B can't be updated. It's built in an older format A2UIVerse no longer supports, so nothing changed."

A card declaring A2UI, not v1.0, with a newer version among its entries: "Shop B can't be installed. It's built in a newer format than this A2UIVerse supports, so nothing was installed.", and at an update the same sentence ending "so nothing changed."

A declaration that is malformed stays under the cause `checks`. The sdk's drift test passes the version finding through, so an install from the Store tells the case apart as an install from disk does.

### 13. An app's entitlement is derived for the run

An app's entitlement is computed each time it is read: the public catalog of the running platform, and those catalogs on its record whose artifact is packed for the host-module interface the platform supplies. On a record from before the flip that is the v1.0 basic catalog alone. `registry.json` is not rewritten at boot; an install over the app rewrites its record as it always has.

### 14. Nothing is done for the plan cache or the intent journal

A plan cached before the flip is served to no turn: each key holds the shell catalog's document, which changed. The intent journal is never read back.

### 15. The prompts, the examples and the painter's ids take v1.0's forms

In the Planner's and the Synthesizer's prompts and examples a binding is written `@path`, a call `@call`, a template's `path` plain, and a heading is a `Text` of its own starting with `#` marks, five for the merged view's label. Component ids in the examples are written with underscores. The id the shell painter mints is `attribution_<slot id>`, and the Planner's check that refuses a model's id starting with the painter's prefix moves with it. The two tree checks use the shell catalog's own id and the sdk's stamp.

### 16. The models' trees go through the schema-form check

The Planner's and the Synthesizer's trees go through the sdk's schema-form check beside the validator on every turn, each component as it is written and the whole tree at its end, and a finding feeds the one retry. The shell painter's output is held to the check by the helper every painter test paints through, and by no check in production.

### 17. A component id the release refuses is a finding

Each prompt gains one rule for component ids. An id that is no UAX #31 identifier is the release's refusal through the sdk's validator, and feeds the one retry as any finding does. No code rewrites a model's id.

### 18. What told versions apart is deleted

The card's entry per A2UI version, the entitlement per version on an app's record as read, the painter's own version constant, and the credential bar's two fallbacks to `v0.9`.

### 19. Two packages landed by earlier sub-tasks change here

21.13 changes the sdk and the shell catalog for decisions 4, 6 and 12. Their versions stay 0.12.0 and 0.2.0.

### 20. The work lands on the flip branch, its documents with it

21.13 is worked in a worktree off `phase-21/flip`, merged back into it, and the flip branch is pushed, as task 21.10's decision 22 has step 2. The orchestrator's README and the design records that describe what changes (`docs/design/orchestrator.md`, `docs/design/a2ui-on-a2a.md`, `docs/design/synthesis.md`, `docs/design/app-install.md`) change with the code. SPEC waits for the records sub-task 21.22.

### 21. Notes from 21.13 go on other sub-tasks' lines

1. The client sub-task 21.14: the renderer function call's wire of decisions 8 and 9, the new causes and their words, and decision 13's entitlement.
2. The marketplace and Stellify sub-task 21.15: decision 12's two causes.
3. The integration and acceptance sub-task 21.21: the crossing to prove, an app installed from the computer that paints in the basic catalog among it.
4. The records sub-task 21.22: what SPEC §4.1, §10 and the protocol delta register owe, the second A2UI rewrite of decision 8 among it.

### 22. What proves it

1. Build, typecheck, tests and lint green for the orchestrator, the sdk and the shell catalog on the flip branch, with ESLint and Prettier on what changed.
2. For each kind of message the hub sends an agent, the plan's request, a press, the credential repair and a function's answer, the capabilities read under `1.0` alone and the v1.0 extension URI; the orchestrator's card listing one A2UI entry, for v1.0.
3. Against a scripted agent, a paint naming a catalog outside the entitlement in each of the four places failing the dispatch under `catalog`, and a surface mixing two entitled catalogs relayed whole.
4. Against a scripted agent, a `v0.9` create, a `1.0` create followed by a `v0.9` update, a stamp above 1.0 and a stamp that is no version each failing the slot under its cause of decision 6, the refused event not relayed and A2A's cancel sent.
5. An app whose live card declares only v0.9 not called and asked for no sign-in, its slot failing as older; the live card fetched again first, and an agent that has moved to v1.0 by then called.
6. Against scripted agents, a `callRendererFunction` with a surface and one without relayed with their ids namespaced; two sources both sending `call_1` reaching the client as two ids; the answer, and an `error` carrying the call id, each reaching its agent under the agent's own id, in its own conversation, while that agent's stream is still open; a merge that would read the source waiting for the answer's dispatch; a delivery that fails journaled, the slot as it was.
7. On a surface mixing two catalogs, a credential input under a second catalog's `@catalogId` found by that catalog's options.
8. Upstream's ADK restaurant finder card, declaring v0.8 and v0.9, refused under the older cause from disk and from the marketplace; a card written by hand declaring only a newer version refused under the newer cause; upstream's Node restaurant finder card, with no A2UI entry, installing on the basic catalog.
9. On a `registry.json` in the shape `main` writes: the orchestrator booting with the file byte for byte unchanged; each app's entitlement reading as the v1.0 basic catalog alone; an app from the Store whose live card names new catalog ids taking the update tile; an app installed from the computer that paints in the v1.0 basic catalog relayed.
10. Every tree a painter test paints held to the schema-form check; the Planner's and the Synthesizer's checks each refusing a binding written `path`, a call written `call`, a heading `variant` and a hyphenated id, as a finding that feeds the retry; every example of the Planner and of the Synthesizer passing the validator and the schema-form check.
11. The Planner's and the Synthesizer's live suites run once on the configured models after the prompts are rewritten: every case admitted, with a record of each case that spent its retry and on what finding. A retry spent on a finding over v1.0's forms, a binding written `path`, a call written `call`, a heading `variant` or an id that is no identifier, sends the prompt or the examples back for another edit, and the suites are run again.
12. A plan cache file written before the flip serving no entry.
13. A search of the orchestrator for `v0.9`, `v0_9`, `v0.9.1`, `a2uiClientCapabilities` and `a2uiClientDataModel` returning only listed exceptions.
