# 21.5 — The client

The client brought onto `@a2ui/web_core` and `@a2ui/react` 0.16.1, on the wire as it is: the two local patches gone, another build of a held catalog put in place in the processor's own list, the binding index off the deprecated `context`, the list of the export names the host lends written again and Stellify rebuilt over it. Sub-task 21.5 of Phase 21 (`_dev/docs/spec/phase-21-v1-0-migration.md`).

The upstream check (phase decision 17) read `upstream/main` at `36725eee0` of 2026-11-25 and found no event: `@a2ui/web_core` and `@a2ui/react` are at 0.16.1 on npm, and upstream pull requests 4171, 4170, 4347 and 3930 are open.

## Scope

- The client's pins on `@a2ui/web_core` and `@a2ui/react`, and the lockfile.
- The two local patches: the files under `patches/` and their entries in `pnpm-workspace.yaml`.
- How the client puts another build of a held catalog in place.
- What the client draws, and what it reports, where the renderer cannot draw a component.
- The binding index's read of a component (`apps/client/src/canvas/navigation/bindingIndex.ts`).
- The sdk's list of the export names the host lends (`hostExports.generated.ts`), Stellify's committed build and Stellify's version.
- The client's own tests where 0.16.1 changes what they find, its label queries that now match twice among them.
- The client design record, the client README, the root README's table of upstream packages and the marketplace design record's sentence on Stellify's version.
- A finding in `_dev/a2ui-findings.md`.
- `_dev/TODO.md`: two lines of the Backlog, and notes on the lines of sub-tasks 21.7 and 21.10.
- Out: the orchestrator's and the marketplace's pins — sub-task 21.6; the catalogs re-packed — sub-task 21.7; the replay suite beyond decision 11's two specs, and the registry snapshot — sub-task 21.8; SPEC §14's two rows on the patches and the findings the findings file already holds — sub-task 21.9; what the host-module interface lends, the eight specifiers of task-21.2 decision 4 — sub-task 21.10; the client on v1.0 — sub-task 21.14.

## Locked decisions

### 1. The pins

`@a2ui/react` and `@a2ui/web_core` are at 0.16.1 exactly in the client.

### 2. Another build of a held catalog goes into the processor's own list

A catalog the processor does not hold comes in through the `addCatalog` that 0.16.1 ships. Another build of a catalog the processor holds takes the held one's place in the processor's private list of catalogs, `registeredCatalogs`, which the client reaches as it reached the list on 0.14.0. A surface on screen keeps the build it was drawn in.

### 3. Both patches leave in this sub-task

The local patch on `@a2ui/web_core` and the local patch on `@a2ui/react` go, the two files under `patches/` and their two entries in `pnpm-workspace.yaml`. The orchestrator and the catalogs of the registry snapshot resolve 0.14.0 unpatched until sub-tasks 21.6 and 21.8 move them.

### 4. Where the renderer cannot draw a component, nothing is drawn

The local patch on `@a2ui/react` is not carried again. A child that has not arrived, an unknown component type and a child reference that cannot be resolved each draw nothing, as 0.16.1 has it (upstream pull request 3723), and the rest of the fragment stands. The quiet stand-ins and their `data-a2ui-placeholder` marker go. This is the one change of this sub-task the person sees.

### 5. A surface's errors are written to the browser console

The client listens to each surface's `onError` and writes what it reports to the browser console. An unknown component type and an unresolved child reference, which 0.16.1 reports there alone, are found in the console. The person sees nothing new.

### 6. The binding index reads nothing 0.16.0 deprecated

The binding index no longer reads `ComponentNode.context`, which 0.16.0 deprecates (upstream pull request 3841). It reads a component's bindings from the surface's component model, by the node's component id, and the component's base path from the node's data path. A piece the new read needs that 0.16.1 does not make public comes back to the owner before another way is chosen.

### 7. The list of lent names is written again, and Stellify is 0.13.0

The sdk's list of the export names the host lends is written again from the 0.16.1 modules, and Stellify's committed build is rebuilt over it. Stellify's version moves to 0.13.0 with the rebuild. `@a2uiverse/sdk` keeps its version, 0.11.0. The commit of `main` where this sub-task lands is the ref the apps' catalogs consume (task-21.3 decision 1).

### 8. The documents

The client design record (`docs/design/client.md`) and the client README move with decisions 2 to 6: their passages on `addCatalog` carried as a local patch, on the two renderer patches and on the stand-ins. The root README's table of upstream packages lists the client with the packages on 0.16.1. In the marketplace design record (`docs/design/marketplace.md`), the sentence that states Stellify's version reads 0.13.0. SPEC §14's two rows on the patches and the findings the findings file already holds stay as they are until sub-task 21.9.

### 9. Finding 35

`@a2ui/web_core` 0.16.0 deprecates `ComponentNode.context` and names the node's resolved props as its replacement, which hold values and no bindings: a host that reads which data paths a component binds has no route to them from the node. This is recorded as finding 35 in `_dev/a2ui-findings.md`, with the client's way around it (decision 6), written once what the node keeps and lacks is read in 0.16.1's own source and on `upstream/main`.

### 10. `_dev/TODO.md`

The Backlog line on dropping the local patch on `@a2ui/web_core` leaves. The Backlog takes one line: a stand-in of the client's own where the renderer draws nothing, once upstream's fallback API (upstream issue 2013) lands.

The lines of sub-tasks 21.7 and 21.10 each take a note, "From 21.5", stating facts and nothing of what those sub-tasks do with them: Stellify is 0.13.0; on 0.16.1, `useA2uiSurface` and `useNodeView` are exported from the `@a2ui/react` package root and not from `@a2ui/react/v0_9`, the entry point the host lends.

### 11. What proves it

1. The client's typecheck, tests, build and lint green on 0.16.1, on 21.5's branch over 21.4's.
2. With no patch installed, the client's test of the build swap green: another build of a held catalog takes the held one's place, and a surface on screen keeps the build it was drawn in.
3. A test: a child that has not arrived, an unknown component type and an unresolved child reference each draw nothing, the rest of the fragment standing, and the last two are written to the console.
4. The binding index's read through `context` and its new read held against each other over the same mounted surfaces, run once and not kept as a test; the index's own tests green on the new read.
5. The list of lent names written again from the 0.16.1 modules and the test that holds it to the modules green; Stellify 0.13.0's committed build rebuilt over it, Stellify's tests green.
6. A test: the data model the client sends holds surfaces created by `v0.9` and by `v0.9.1` messages alike (upstream pull request 4077).
7. The client opened through the tunnel on the branch beside `main`'s, the platform booting and drawing its own surfaces (task-21.2 decision 3).
8. `pnpm verify` green on the combined result at the merge, sub-task 21.4 ticked with it (task-21.4 decision 7).
9. Two specs of the client's replay suite green on the branch: `per-paint-builds.spec.ts` and `navigation.spec.ts`. Another spec's difference is left to sub-task 21.8, and no baseline is taken again. If the two cannot run before sub-task 21.7 re-packs the catalogs, none of the replay suite is in this sub-task's proof, and the owner is told.

## Invariants

- Beyond decision 4's change, decision 5's console lines and Stellify's `packedBy` naming 0.13.0 over the new list, no change in behaviour.

## Open items

- Whether any of the seven catalogs of the registry snapshot imports `inlinePeerAndLocalRefs` or `linkCatalogs`, which the rebuilt Stellify refuses. If one does, it comes back to the owner.
