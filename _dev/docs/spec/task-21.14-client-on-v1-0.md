# 21.14 — The client on v1.0

The client moved to A2UI v1.0 alone: its processors on v1.0 catalogs, what it sends and what it reads stamped `1.0`, a surface that mixes catalogs drawn with each component in its own catalog's Provider and style scope, an agent's renderer function call answered, its recorded beats converted and its beats written by code migrated by hand. Sub-task 21.14 of Phase 21 (`_dev/docs/spec/phase-21-v1-0-migration.md`), on the flip branch, in two parts.

The upstream check (phase decision 17) read `upstream/main` at `36725eee0`, the commit the orchestrator sub-task 21.13 read, and found no event: `@a2ui/web_core` and `@a2ui/react` are at 0.16.1 on npm, `a2ui-core` at 0.7.1 and `a2ui-agent-sdk` at 0.12.1 on PyPI, upstream pull requests 4171, 4170, 3930 and 4347 are open, and pull request 4418 is merged and in no release.

## Scope

- The platform repo's flip branch.
- The client's processors, the catalogs it holds, and its reading of a paint: the catalog gate, the frame a surface is drawn in, the per-paint builds, the paint's copy for the way back.
- A surface that mixes catalogs: where a frame opens, where a stylesheet stops, when a second catalog is loaded and what happens when it does not load.
- An agent's `callRendererFunction` and the renderer's answer, on the client; a component's `callAgentFunction`.
- What the client sends and what it reads: the stamp, the capabilities, the data model.
- The Store's sample frame.
- The client's 36 recorded beats, its beats written by code, and the paints its tests write by hand.
- The registry snapshot's pin, in part two.
- The client README, the client design record and the client's passages in the other design records.
- Notes on other sub-tasks' lines in `_dev/TODO.md`.
- Out: the hub's half of the renderer function call, the entitlement rule and the failure causes `older` and `newer` — the orchestrator sub-task 21.13; the refusals at publish and at Stellify's preview — the marketplace and Stellify sub-task 21.15; each app catalog's v1.0 document, id and map — the catalogs sub-task 21.18; the Store captures, the end-to-end suites beyond decision 22's two runs, and the launcher — the dev harness sub-task 21.20; SPEC — the records sub-task 21.22.

## Locked decisions

### 1. A surface that mixes catalogs is drawn

The client draws a surface whose components name more than one catalog, as phase decision 6 has it. The phase spec's open item on the size of the change closes here: a mixed paint is not refused.

### 2. A frame opens at every change of catalog

A component whose catalog differs from the one enclosing it is drawn inside its own catalog's Provider and build mark, the basic catalog included, which takes a mark and no Provider. The enclosing catalog's stylesheet stops at that mark. A run of components from one catalog shares one frame. Inherited values come from what surrounds the component, as a fragment inherits from the shell's page.

### 3. A second catalog is loaded when a paint names it

The catalog gate reads every place a batch names a catalog, the create, a component's `@catalogId` and a function call's `catalogId`, and holds the batch until each is held. A create whose own batch names the second catalog is drawn once, with both. A later batch that first names a catalog on a surface already on screen re-creates that surface in place, its tree and data carried over, and counts as no new paint.

### 4. A second catalog that does not load fails the fragment

When a catalog a component or a function call names does not load, the batch that names it and everything after it for that surface are dropped, and a surface already on screen is taken down. The failure is reported with the catalog that failed, and the slot takes the failure tile under `load`, with Retry, as for the catalog a create names.

### 5. Every catalog on a surface follows the per-paint build rules

Each catalog a surface uses is taken at the build the stamp names for it when the surface first uses it, otherwise the one the catalog table names. A newer build named for any of them moves the surface. The way back restores a paint with each component in its own catalog and each catalog at the build the paint was drawn in.

### 6. A renderer function call is answered at once, by the processor that holds what it names

A `callRendererFunction` runs in its place in the stream, after the paints that arrived before it: against the staging processor when the surface it names was created in this answer and is not swapped in yet, otherwise against the canvas's live processor. A call naming no surface runs against the live one. The catalog gate treats the call as it treats a batch: it waits behind what is held, and its catalog is loaded first. A call whose catalog cannot be loaded leaves the slot untouched, and the agent gets the release's own error answer.

### 7. An agent's call is never the person's gesture

The client hands every agent call to the release as not user-activated. A call for the basic catalog's `openUrl`, or for any function a catalog marks `requiresUserActivation`, gets the release's refusal as its answer, and nothing opens.

### 8. A function's answer goes out beside the turn

The answer is sent as soon as the function returns, on a stream beside the turn as a press is, as one A2UI part carrying the call id as received (task-21.13 decisions 8 and 9). It is never held back by the rule of one press at a time, draws nothing and changes no progress line. What the agent replies arrives on that stream and is drawn as any paint is. Each canvas answers on its own processors, a canvas running in the background among them.

### 9. A component's `callAgentFunction` is sent on

A `callAgentFunction` the release emits for a component is sent to the hub as emitted. The hub journals it and does not route it (task-21.13 decision 11), and the call fails in the component at the release's own timeout.

### 10. The client reads only what is stamped `1.0`

The client keeps the messages stamped `1.0`, by the sdk's one reading of a stamp (task-21.10 decision 8), and drops every other without a report. The Store's sample frame reads its sample the same way: a sample in another version shows the page's existing state for a sample that cannot be shown, and a function call inside a sample is not run.

### 11. Everything the client sends is stamped `1.0`

Every message the client sends is stamped `1.0`, one message per part, with the capabilities on `a2uiRendererCapabilities` under `1.0` and the data model on `a2uiRendererDataModel` (task-21.10 decisions 3 and 4). The operation part of the A2UIVerse extension is stamped `1.0` as well.

### 12. The client holds v1.0 catalogs and accepts every create v1.0 allows

The client holds upstream's v1 basic catalog and the shell catalog at its v1.0 id, and its processors are built at `1.0`. A surface naming no default catalog is drawn, and so is a create carrying its components and data inline: the catalog gate, decision 2's frames and the paint's copy read them. Every check the client made against the surface's catalog is made against the component's own.

### 13. The schema-form check runs in the client's tests, and nowhere in production

The sdk's schema-form check (task-21.10 decision 10) holds three things in the client's tests. Each builder of a message the client sends is held to it. The paints the client rebuilds for its own processor, a paint restored by the way back, a surface re-created in another build and the `deleteSurface` put before a repeated create, are held to it by the tests of those paths. One test walks every beat written by code through the sdk's validator and the schema-form check, the pieces that are invalid on purpose a named list.

### 14. 21.14 lands in two parts

Part one lands now: the client's code on v1.0, everything that paints in the shell catalog or the basic catalog migrated, and the eight recorded beats that paint in the shell catalog alone converted. The tests that draw an app catalog, those that read one from the registry snapshot and those that replay a beat painting in one, skip themselves while the registry snapshot holds no catalog packed for host-module interface `0.16.1-v1.0`.

Part two lands once the catalogs sub-task 21.18 has: the other 28 recorded beats converted, the code-written beats and tests that paint in an app catalog migrated by 21.18's maps, and the registry snapshot's pin moved to the commit of the apps repo's flip branch where 21.18 lands, so that no test is skipped. 21.14 is ticked after part two.

### 15. Beats 35 and 36 stay

Beat 35 and beat 36 are converted with the other beats and keep their numbers and their pictures. Beat 35 is a live recording of its own, with three pull requests and both paints accepted, and no copy of beat 1. Their file names, their titles, the recorder's entries and the README's beat table lose the version words. `messageVersion.test.ts` and the code-written v0.9.1 paint beat are deleted, and one test takes their place: a message stamped anything but `1.0` is not drawn.

### 16. The Store captures are recorded again, by the dev harness sub-task

The seven files of `apps/client/recordings/store/` are left as recorded in 21.14. The dev harness sub-task 21.20 records them again with `record:store` from the v1.0 fleet.

### 17. Hand migration follows the converter's rules

A paint written by code is migrated as the converter rewrites a recording: a binding is `@path`, a call is `@call`, a template's `path` stays plain, a heading is a `Text` of its own starting with `#` marks, a hyphen in a component id becomes an underscore, and the painter's id is `attribution_<slot id>`. Surface ids, source ids and app ids are left as written. The `beginRendering` messages left in the code-written beats are removed.

### 18. A converted beat keeps its stamps as recorded

The builds a recorded stamp names stay keyed by the old catalog ids, as the converter touches no stamp (task-21.11 decision 6). They are listed exceptions of decision 22's search.

### 19. Two pieces of dead code are deleted

The `useSurfaces` hook, which nothing uses, and `createA2AActionHandler`, which only its own test uses, are deleted and not migrated.

### 20. The work lands on the flip branch, its documents with it

Both parts are worked in a worktree off `phase-21/flip`, merged back into it, and the flip branch is pushed, as task 21.10's decision 22 has step 2. The client README, the client design record (`docs/design/client.md`) and the client's passages in the other design records change with the code. SPEC waits for the records sub-task 21.22.

### 21. Notes from 21.14 go on other sub-tasks' lines

1. The catalogs sub-task 21.18: what waits on it in part two, and decision 2's frames.
2. The dev harness sub-task 21.20: the Store captures to record again, the registry snapshot's pin moved in part two, decision 22's two runs made ahead of it, and beats 35 and 36 renamed.
3. The records sub-task 21.22: what SPEC §4.1, §6.5, §9.2 and the protocol delta register owe to decisions 2 to 9.

### 22. What proves it

Part one:

1. The client's typecheck, build, lint and tests green on the flip branch, with ESLint and Prettier on what changed, the tests of decision 14 skipping themselves.
2. Every kind of message the client sends, the question, a press, an action, a step, the two failure reports, a shell action, close and a function's answer, stamped `1.0`, carrying the capabilities under `1.0` alone, and held to the schema-form check.
3. A message stamped `v0.9`, one stamped above 1.0 and one with no version each not drawn, on the canvas and in the Store's sample frame.
4. Over test catalogs, a mixed surface with each component inside its own catalog's Provider and build mark, a frame at every change of catalog, the basic catalog included; a build's sheet written with its scope ending at another catalog's mark; a surface with no default catalog drawn; a create carrying its components and data inline drawn.
5. A second catalog named in the create's own batch drawn once; first named in a later batch, the surface re-created in place and no paint counted; failing to load, the fragment dropped and reported with that catalog's id, a fresh create loading again.
6. A mixed surface keeping each catalog's build beside a newer one; a newer build named for the second catalog moving it; the way back restoring a mixed paint with each component in its catalog and build.
7. Against a scripted stream, a call on a live surface, on a surface still staged and with no surface each answered at once, with the id as received, while the stream is open; a call behind a held batch waiting its turn; a call whose catalog cannot load answered with the release's error, the slot untouched; an agent's `openUrl` refused, nothing opened; an answer sent while a press runs on that source; a component's `callAgentFunction` sent on.
8. Decision 13's walking test green, its exceptions listed.
9. The eight beats that paint in the shell catalog alone converted by the converter's write, each paint keeping its verdict, and replayed by the client's tests.
10. A search of the client for `v0.9`, `v0_9`, `v0.9.1`, `a2uiClientCapabilities` and `a2uiClientDataModel` returning only listed exceptions.
11. The client opened through the tunnel on the branch against the flip branch's orchestrator: a question about the platform answered and drawn, and an installed app still on v0.9 failing its slot in the words of the older cause.

Part two:

12. The other 28 beats converted the same way, beat 31's shell surface the one named exception to verdict parity (task-21.12 decision 3).
13. The code-written beats and tests that paint in an app catalog migrated, the registry snapshot's pin moved, no test skipped, and the client's whole unit suite green.
14. One code-written beat of a surface mixing two app catalogs and the basic catalog, opened in a browser: each component's computed style equal to what it has on a surface of its own. It is kept as a spec for the dev harness sub-task 21.20.
15. `recorded-beats.spec.ts` run once against the 36 pictures taken on `main`, a picture that moves traced here.

## Invariants

- Nothing the person sees on a surface painted in one catalog changes.
- No word on the screen is new.
- No code of the client serves both wires.
