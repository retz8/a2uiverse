# 16.7 — Client

The client brought onto the upstream releases Phase 16 pins, landing on `main` with the shell catalog. Sub-task 16.7 of Phase 16 (`_dev/docs/spec/phase-16-upstream-upgrade.md`), built on 16.6's branch (`_dev/docs/spec/task-16.6-shell-catalog.md`, decision 2).

## Scope

- The client's dependencies on `@a2ui/react` and `@a2ui/web_core` `0.14.0` exactly, and what the move changes in it; the host-module interface lending the new runtime; its basic catalog taken from web_core, which now ships it.
- The local patch on `@a2ui/react`, and `addCatalog` carried as a local patch on `@a2ui/web_core`.
- The loader, the per-paint builds, the scoped stylesheets and the collision detector, navigation and the Store sample, over components the renderer now hosts each in an element of its own.
- The registry snapshot the client's tests render, re-pointed at 16.9's catalogs.
- The findings and the delta register rows the move produces.
- Out: the e2e suites, the Store captures and the recorded beats, 16.10's; the live acceptance, 16.11's; the README and the design records, 16.12's; the apps' catalogs, 16.9's.

## Locked decisions

### 1. The stand-ins stay quiet through a new patch on `@a2ui/react`

`@a2ui/react` 0.14.0 draws developer text where a component cannot be drawn — "[Loading …]" for a pending child, "Unknown component type" for an unknown type, "Unresolved child reference" for a child reference it cannot resolve — and gives a host no way to supply its own. A new local patch on `@a2ui/react` 0.14.0 draws the quiet stand-ins the client draws today in all three places, with the same look and the same `data-a2ui-placeholder` attribute, the unresolved reference's like the unknown type's. The `ChoicePicker` group name leaves the patch: upstream fixed it.

### 2. A second build of a held catalog is swapped in by the client

The patch on `@a2ui/web_core` is upstream's PR #3304 exactly, `addCatalog`, which refuses an id the processor already holds. A catalog a canvas meets for the first time comes in through `addCatalog`. A create in another build of a catalog the processor holds is drawn in that build by the canvas's processor replacing the build in the processor's own catalog list, linked to the held catalogs with web_core's `linkCatalogs` as `addCatalog` links them.

### 3. Navigation reads the page at the tap

The decoration of each vendor catalog and its markers go. At a tap the binding index reads the component elements inside the surface's frame, each one's context taken from the element through web_core's `A2uiWebComponentElement` contract, and the element is where the component is. Components of React and custom-element implementations alike are reached, the basic catalog's among them.

### 4. The merge waits for 16.9; 16.7 re-points the snapshot

16.7's code is written on its branch first. Once 16.9's catalogs are on `main` of the apps repo, 16.7 moves the registry snapshot's seven catalog packages, and Shop A's second build beside them, to that commit; 16.6 and 16.7 then merge to `main` with the client's tests rendering the rebuilt catalogs.

### 5. The records go in the done commit

16.7's done commit on `main`, at the merge beside 16.6's, records: a finding on `@a2ui/react` 0.14.0's stand-ins; a row in SPEC §14's delta register for the patch of decision 1; the `addCatalog` row and its findings entry amended with decision 2's swap. Nothing is filed upstream.

### 6. What proves it

- The client's typecheck and tests green on the rebuilt snapshot, with: each of the three stand-ins drawn quiet, its attribute on it, no developer text on the page and the rest of the fragment standing; the `ChoicePicker` group test over upstream's basic catalog; a create in a second build of a held catalog drawn in it, a surface on screen keeping its own, a surface moving when its components change, a catalog met for the first time coming in through `addCatalog`; a tap landing on a React component of a vendor catalog and on a basic component of a themed catalog; the loader, the collision detector's mounted half and the Store sample over the rebuilt catalogs.
- The platform's `pnpm verify` green over 16.6 and 16.7 together before either lands on `main`.
- Through the tunnel, before the merge, the dev client against the running orchestrator with 16.9's builds in its registry: a paint from a catalog of React components and one from a themed basic catalog drawn as before; a fragment streaming in with its pending children quiet; a tap in the merged view landing on a vendor's React component and on a basic one; an app's Store sample; no console error.
