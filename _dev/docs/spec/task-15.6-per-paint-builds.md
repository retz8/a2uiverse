# Task 15.6 — Client and orchestrator, per-paint builds

Sub-task 15.6 of Phase 15 (`_dev/docs/spec/phase-15-store-loop.md`, decision 13): a paint arriving on an open canvas drawn in the build of its catalog the registry holds when it arrives, a surface already on screen keeping the build it was drawn in, and so a paint the way back returns to. Replaces the first build loaded winning per canvas (task 14.7 decision 1). This spec fixes how.

## Scope

- How the client knows the build the registry holds when a paint arrives: the orchestrator naming it on the composition stamp.
- The build a new surface is drawn in, the build a surface on screen keeps, and the build a paint the way back returns to is restored in.
- A surface on screen whose catalog moved, when its agent changes it in place.
- An event that names no build.
- A later turn's paint held in staging.
- Loading a new build ahead of the paint that names it.
- The journal, the tests, the SPEC edits and the notes for later sub-tasks.

## Locked decisions

### 1. The orchestrator names the build on each paint it relays

The registry is the orchestrator's, so the orchestrator says which build it holds. The client draws each paint in the build the stamp names, loading it first when it does not hold it.

### 2. Every event that carries A2UI names the app's builds

Every event the hub relays from an app that carries A2UI names, on its composition stamp, the build the registry holds right then — its artifact id — for each catalog the app's entitlement holds that has one. The basic and shell catalogs, the client's own, have no build and are not named. The client compares each surface's build against the stamp, on a create and on a change in place alike.

### 3. A surface moves to the named build when its agent changes its components

A surface on screen keeps the build it was drawn in until its agent changes its components: a change to its components arriving with a newer build named for its catalog re-creates the surface in that build, its tree and data carried over, and applies the change. A change to its data alone leaves it in its build. The move is not a paint: no new paint id, no new visit on the way back. Local state the data model does not hold — a scroll position, focus — is not carried over.

### 4. A move whose build fails to load stays in its own build

When the build the stamp names cannot be loaded for a change in place, the surface stays in its own build and the change is applied there; the failed load is logged, not reported. A change that uses what its own build lacks fails the fragment as any paint the canvas cannot draw does. A create whose named build fails to load fails its slot under `load`, Retry kept, as today.

### 5. An event that names no build

A surface created in a catalog the stamp names no build for is drawn in the build the client's own catalog table names as last read, loaded first when not held. A surface on screen moves only when a build is named. Recorded beats replay as they are, with nothing re-recorded.

### 6. A paint held in staging keeps its build

A later turn's paint, held in staging until the turn ends, is replayed into the live canvas in the build its surface holds in staging when the turn ends: the build named on its arrival, or a later one a change in place during the turn moved it to.

### 7. New builds are loaded ahead of the paint

After an install, update or uninstall from the Store or the App Library, and after an App Library check lands, the client reads its table again and loads the builds it now names, so the next paint that names one does not wait on its load. The slot's Install and Update (15.9) do the same. A stamp naming a build the client does not hold yet holds that canvas's paints while it loads, as a catalog not yet held does today.

### 8. The journal

No change. The registry line already journals every build move, the update check's own install of a newer build among them.

### 9. Tests

Unit tests on the client, the orchestrator and the sdk's stamp contract; the loader's tests of the first build winning per canvas are rewritten. The end-to-end coverage of per-paint builds is 15.10's.

### 10. SPEC edits

Made in this task's implementation session: SPEC §10's per-paint build — the hub naming the build on each event, the move on a change to a surface's components, an event that names no build, staging keeping each surface's build; §14 gains a row for the stamp's builds, a local convention, beside its `settled` and `refused` rows. The Phase 15 spec stays as written.

### 11. Notes for later sub-tasks

`_dev/TODO.md`: 15.6's line names the orchestrator's stamp; 15.9, the slot's Install and Update reading the catalog table again (found in 15.6); 15.10, an end-to-end test over per-paint builds — a second build of one catalog in the snapshot world, a canvas open across the move, the surface on screen keeping its build's mark and look, the new paint taking the new one (found in 15.6); 15.12, the client's design record on per-paint builds and the move on a change in place, and the orchestrator's on the stamp naming builds (found in 15.6).

## Invariants

- Nothing on screen changes its look under an update; a surface moves build only when its agent sends a change to its components.
- Nothing A2UIVerse-specific rides the vendor wire: the builds ride the hub's stamp to the client alone.
- The Store sample is drawn apart from every canvas, in the builds its listing names.
