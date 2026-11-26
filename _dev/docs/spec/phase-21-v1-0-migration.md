# Phase 21 — v1.0 migration

A2UIVerse moves to A2UI v1.0 and supports v1.0 only: the packages the A2UI project publishes brought to the releases that carry v1.0 in both repos, the wire flipped, v0.9 and v0.9.1 retired entirely. Amends SPEC wherever its decisions change it, CLAUDE.md §2, and the Phase 21 entry and the Backlog in `_dev/TODO.md`.

## Scope

- Step 1, the packages on the old wire: `@a2ui/web_core` and `@a2ui/react` 0.16.1 in both repos, `a2ui-agent-sdk` 0.12.1 and `a2ui-core` 0.7.1 in `a2uiverse-apps`, A2UIVerse still speaking v0.9 and v0.9.1. The platform runtime, the host-module interface at a new version, every first-party catalog re-packed and republished (`[apps]`), the agent kit and the agents (`[apps]`), the two local patches against the new releases.
- Step 2, the flip: the wire on v1.0 and everything v0.9 and v0.9.1 deleted, in the sdk, the client, the orchestrator, the shell catalog, the marketplace and Stellify, and in the agent kit, the seven agents, the nine catalog packages, the scaffolder and Shop C (`[apps]`). Every first-party catalog under a new catalog id.
- An agent on an older A2UI version turned away at the door. A surface that mixes catalogs drawn. An agent's `callRendererFunction` carried to the canvas and its answer carried back.
- The recordings in both repos converted to v1.0. The existing installs and listings crossing to v1.0.
- The proof: step 1's, and the phase's.
- The writing: SPEC, the protocol delta register, the two findings files, CLAUDE.md §2, the root README, the design records and the READMEs.
- Out: a surface or a canvas mixing A2UI versions; any v0.9 or v0.9.1 side; v1.0's additions in A2UIVerse's own parts, the `callAgentFunction` route among them; the Express inference format; `a2ui-a2a`; upstream's unreleased changes to the v1.0 wire; the routine that patches A2UIVerse when upstream changes; upstream's sample agents moving to v1.0.

## Locked decisions

### 1. A2UIVerse supports v1.0 only

A2UIVerse is for A2UI v1.0, a full platform that supports v1.0. It composes v1.0 agents only. v0.9 and v0.9.1 are retired entirely: there is no switch at launch and no second side, and an agent on v0.9 never shares a canvas with one on v1.0.

### 2. An agent on an older version is turned away at the door

A card whose A2UI entries are all for versions older than v1.0 is refused at publish, at install and at Stellify's preview, in plain words: the app is built for an older version, so nothing was installed. A card with no A2UI entry installs on the basic-catalog fallback. A paint in an older version from an installed agent fails its slot with a cause of its own.

### 3. The targets are today's releases, at exact versions

`@a2ui/web_core` and `@a2ui/react` 0.16.1 in both repos, from 0.14.0; `a2ui-agent-sdk` 0.12.1, from 0.11.0, and `a2ui-core` 0.7.1, from 0.6.0, in `a2uiverse-apps`. Pinned exactly. `a2ui-a2a` is not a dependency: its published 0.4.0 requires `a2a-sdk` below 0.4.0, and the agent kit keeps its own part-building.

### 4. The wire is what the pinned releases speak

The platform, the agent kit and every fixture write v1.0 as `@a2ui/web_core` 0.16.1 reads it, bare child ids and action objects included. Where the v1.0 schema is stricter than the release, A2UIVerse authors the schema's form: `updateDataModel` always carries `value`, `null` to delete, and bindings and calls are written `@path` and `@call` alone. Upstream's unreleased changes to the v1.0 wire, the `@child`, `@action` and `@functionCall` keys of pull request #4171 with its dual-read #4170 first among them, are the trigger for a later upgrade, one Backlog line.

### 5. Accept everything a v1.0 agent may send, use none of v1.0's additions

The hub, the client and the validator handle everything a v1.0 agent may legally send, so an unmodified v1.0 agent composes. The shell's paints, the Planner and the Synthesizer, the agent kit and the catalogs keep doing what they do today, rewritten in v1.0's shapes and nothing more. The agent kit stays on Direct JSON. An agent's `callRendererFunction` is carried to the canvas and its answer carried back to the agent that owns the surface, routed like a press; the platform's catalogs declare no agent function, and the `callAgentFunction` route is not built.

### 6. A surface that mixes catalogs is drawn

The hub checks every component's `@catalogId` against the app's catalog entitlement and refuses a paint naming a catalog outside it. A component from a second entitled catalog is drawn inside that catalog's own Provider and style scope, wherever it sits in the tree.

### 7. Two steps, each landing green on `main`

Step 1 moves every package to the new releases while A2UIVerse still speaks v0.9 and v0.9.1, the recordings, fixtures and end-to-end suites of today its regression net. Step 2 flips the wire to v1.0 and deletes everything v0.9 and v0.9.1 together. No code of A2UIVerse's own serves both wires.

### 8. Step 1: upstream's provision in place of a workaround, the host-module interface at a new version

The local patch on `@a2ui/web_core` gives way to the `addCatalog` 0.16.1 ships. The local patch on `@a2ui/react` is checked again against the release, which no longer draws debug placeholders. The host-module interface takes a new version, named by the runtime release it lends, and every first-party catalog is re-packed and republished against it.

### 9. Step 2: what told versions apart is deleted, and every catalog takes a new id

The card read per version, the rule giving a version with no entry the other's set, the hub advertising under two keys, the agent kit's per-app version setting and the tests asserting that v1.0 is refused go. Each first-party catalog takes a new catalog id for v1.0, the shell catalog among them, as SPEC §9.1 has a breaking change. The scaffolder produces a v1.0 app, and Shop C is migrated by hand.

### 10. Step 2 lands through one flip branch in each repo

Step 2's sub-tasks branch from, and merge into, one long-lived branch in each repo: an exception to the harness's branching for step 2 alone, sub-task worktrees coming off the flip branch and `[apps]` sub-tasks landing on the apps repo's flip branch. `main` stays on step 1's state, green and runnable, until the whole flip passes the gates and the acceptance; then each repo takes one merge. `_dev/` stays on `main`. The last v0.9 commit of each repo's `main` is tagged before the merge.

### 11. Protocol words move to v1.0's, A2UIVerse's own names stay

Every protocol identifier and every sentence about a protocol role takes v1.0's words, renderer and agent, in the code, SPEC, the delta register and the design records. "The client" stays the name of the canvas shell, and "the orchestrator" and "the hub" stay as they are.

### 12. Existing installs and listings cross through the update path

Each app is published again on a v1.0 card naming only its new catalog ids, which retires the old ones. A registry left from before the flip boots, shows each app as needing an update, and one Update press carries it to v1.0, its accounts kept.

### 13. Recordings are converted, and a few are recorded fresh

A converter rewrites each recorded payload into v1.0, changing only the positions the v1.0 evolution guide names, and every converted file validates against the v1.0 schemas and its v1.0 catalog. What a recording shows is unchanged: the suites' screen baselines, captured from `main` before the flip, hold across it, and a baseline that moves is a finding. Payloads written by code are migrated by hand. A small number of beats are recorded live on v1.0 beside the converted ones.

### 14. What proves step 1

`pnpm verify` and every end-to-end suite green in both repos, then one short live pass through the tunnel on the live fleet: each of the seven catalogs painting once, and one merged view.

### 15. What proves the phase

1. `pnpm verify` green in both repos, and every end-to-end suite green on the converted recordings with its baselines unmoved.
2. The crossing of decision 12, on a registry left from before the flip.
3. The fleet live through the tunnel on v1.0: each of the seven catalogs painting from a model, the temporal merge over Calendar, Gmail and GitHub, the entity join over Linear, GitHub and CircleCI, the two shops' merge, the store loop, one sign-in.
4. Upstream's Node restaurant finder, unmodified, installed from its URL alone and painting in v1.0.
5. Upstream's ADK restaurant finder, which speaks v0.8 and v0.9, refused at install in plain words.
6. Shop C installed and painting on v1.0.
7. A mixed-catalog surface, and a `callRendererFunction` carried in and answered, by tests against a scripted agent.

The exact list is the acceptance task's own spec.

### 16. The records say what is true on v1.0

SPEC is amended wherever a decision changes it. The delta register and the two findings files are checked again against v1.0 and the pinned releases: a row whose cause is gone leaves, and one that still holds is restated in v1.0's words. The specs and plans of earlier phases and `_dev/TODO-done.md` stay as written. CLAUDE.md §2's Authority Rule and its list of sources move to v1.0 at the flip, the root README's sentence on v0.9 and v0.9.1 agents is rewritten for v1.0, and each design record and README is updated with the change that alters it.

## Invariants

- Step 1 changes no behaviour of A2UIVerse.
- Step 2 changes nothing the person sees, apart from an agent on an older version being turned away.
- `main` is green and runnable throughout.
- An existing A2UI agent on v1.0 composes with zero changes.

## Open items

Task-level, left to the sub-task that owns each:

- How the client puts another build of a held catalog in place: the released `addCatalog` refuses a held id, and nothing replaces or removes one.
- How large the change to the client's wrapping and scoping is for a surface that mixes catalogs. If it is large, refusing a mixed paint in words, with a Backlog line, comes back to the phase's owner before it is chosen.
- The wire details settled under decision 4's rule: the v1.0 extension URI, `a2uiRendererCapabilities`, `a2uiRendererDataModel`, and whether a data part carries a list of messages, as the v1.0 extension specification requires, or one message, as SPEC §14 holds today.
- How the new catalog ids are spelled.
- Which beats are recorded fresh.
