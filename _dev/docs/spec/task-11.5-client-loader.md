# Task 11.5 — Client, the loader

Sub-task 11.5 of Phase 11 (`_dev/docs/spec/phase-11-app-bundle-registry.md`, decisions 1, 4, 8, 13, 14 and 16): the client loading catalog implementations at runtime from the registry, the registry snapshot the client's tests and e2e load through it, the client's side of catalog entitlement, and the GitHub catalog made packable. Amends phase decision 16, SPEC §10 and the TODO lines of 11.6 and 11.7.

## Scope

- The host-module interface registered before any artifact loads; `orchestratorApi` over HTTP; the table preloaded at boot, a catalog not yet held loaded on arrival, cached by hash for the session; the load-time checks.
- A failed load failing its slot; the tiles for the catalog cause, the not-installed cause and the load cause; the existing failure statements reworded.
- The basic catalog as a client default.
- The registry snapshot, and the client's tests and e2e on it.
- The seven catalog dependencies, the static catalog list and the resolver's table gone from the client.
- The GitHub catalog made packable: its schema in the apps repo, the credential lint in the sdk.
- The proof and the documents this task changes.
- Out: the launcher's dev roster and the beat recording scripts (11.6); `manifest.json` removed, Stellify as a dev dependency and `check` green on the other six catalogs (11.7); `docs/design/app-install.md` (11.9).

## Locked decisions

### 1. The first render waits for nothing

The catalog table fetch and the preload of every artifact run in the background from boot; the shell renders without them. A surface arriving in a catalog not yet loaded shows its slot pending until the catalog loads. The preload and the load on arrival share one in-flight load per artifact.

### 2. A fragment fills when its catalog has loaded

The pending slot uses the slot's existing loading look. A fragment whose catalog is still loading is not yet filled: its tick on the progress line and its validation when it settles wait for the load.

### 3. A loaded catalog joins the processors' shared array

The loader adds each loaded catalog to the one catalog array every canvas runtime's `MessageProcessor` is built over, relying on `@a2ui/web_core` holding that array by reference and looking a catalog up when a surface is created. A client test pins that behaviour. `_dev/a2ui-findings.md` records the gap: web_core has no way to register a catalog after its processor is built.

### 4. A failed load fails its slot through the hub

A load that fails — the table or an artifact unreachable, a host-interface version the client does not provide, the exports check, a `CATALOG.id` other than the registry's, the entry throwing — is reported by the client to the hub as an error code of its own in the composition contract. The hub fails the slot with a new cause, `load`, carrying the catalog id; the `Slot`'s rule that a catalog id rides only the catalog cause covers both causes. A failed load is not cached for the session: Retry re-dispatches, and the surface's arrival loads again. A surface in a catalog the client's table does not hold makes the client fetch the table again once, then fail under `load`.

### 5. The basic catalog is a client default

The client registers upstream's `basicCatalog` from `@a2ui/react` as a default catalog beside the shell catalog, wrapped for navigation like every other catalog, with no Provider.

### 6. The first load of a catalog wins for the session

The client keeps the artifact it first loaded for a catalog id. An install-over of that catalog shows after the next reload.

*Amended by task 14.7 decision 1 and task 14.11 decision 39.* A build is loaded once for the page, by its artifact id, and each canvas keeps the first build of each catalog id it loaded, its components and its look: a canvas started after an install or update moved a catalog to a new build loads the new one, and canvases already on screen keep what they show. Each surface of a loaded build is marked with its artifact id, and a stylesheet inside an artifact is held to that build's surfaces — read as text, its relative addresses made whole against its own, its rules wrapped as written in an `@scope` rooted at the build's mark and adopted onto the page in the order the artifact asked for them; fonts, keyframes, a layer order and rules aimed at `:root`, `html` or `body` stay page-wide. A browser without `@scope` takes a link per sheet.

*Amended by Phase 15 decision 13.* A paint is drawn in the build of its catalog the registry holds when the paint arrives; a surface already on screen keeps the build it was drawn in, and so does a paint the way back returns to. A canvas no longer holds the first build of each catalog id it loaded: one open across an install that moved a catalog to a new build keeps what it shows and draws every later paint in the new build.

### 7. The cache is the session's

Loaded artifacts are held in memory by artifact id, beside the browser's own module map, for the session. Nothing persists across reloads beyond what the HTTP cache keeps; through the tunnel, whose `Cache-Control: no-cache,no-store` rides beside the orchestrator's immutable header, a reload fetches every artifact again, as the tunnel document records.

### 8. The client advertises basic and shell

The client's `a2uiClientCapabilities.supportedCatalogIds` to the orchestrator is the basic catalog and the shell catalog, constant. What a vendor agent may paint in stays the hub's to advertise, through each app's entitlement.

### 9. The failure tiles

Each tile is one statement, then Retry where the cause keeps it:

| Cause | Statement | Retry |
| --- | --- | --- |
| catalog | This app sent something that can't be shown here. | no |
| uninstalled | This app isn't installed anymore. | yes |
| load | Something went wrong loading this. | yes |
| unreachable | This app couldn't be reached. | yes |
| timeout | This app took too long to answer. | yes |
| invalid | This app sent a screen that couldn't be shown. | yes |
| vendor, no words | This app couldn't answer. | yes |

A vendor that spoke keeps its own words. The shell's own content, failed, reads "Something went wrong here." The tile shows no catalog id.

### 10. The registry snapshot is built here

The registry snapshot — the catalog table plus the packed artifacts, in the layout of the orchestrator's `/registry` routes, git-ignored and never committed — is generated in this task. A workspace package whose only job is the snapshot holds the seven catalog packages as `github:` dependencies, all pinned to one commit of the apps repo, and its build packs them with Stellify. The snapshot's table carries the basic and shell rows as provided by the client. The client depends on none of the seven.

### 11. Tests and e2e load the snapshot through the loader

Every client test that rendered with the compiled-in catalogs loads the snapshot through the real loader, its catalogs and ids taken from the loaded table; the resolver's test gives way to the loader's. E2e's preview and its `?beat=` replays read the snapshot over `orchestratorApi`.

### 12. The collision detector stays in tests, over the snapshot

The static scan reads each artifact's stylesheets from the snapshot; the mount test and the Playwright cascade test run over catalogs loaded through the loader.

### 13. The GitHub catalog made packable

In the apps repo, worked on its `main`: the GitHub catalog's `TextInput` drops the `password` type. In the sdk: the credential lint's bare `pin` gives way to `pin code`, `pin input`, `pin field` and `pin number`, and Stellify's committed build is rebuilt with it. The snapshot pins the apps repo at the commit carrying the fix.

### 14. Proof

`pnpm verify` green. Playwright green, its screenshot baselines unchanged apart from the failure statements. Through the tunnel: GitHub packed and installed by hand through the registry command, its fragment painted from the runtime-loaded artifact; then a second app installed while the client is open, its fragment landing with no reload.

### 15. Documents

`docs/design/client.md` and the client's README; the tunnel document; SPEC §10 with the load cause; the phase spec's decision 16 — the snapshot generated from the apps repo at a pinned ref through pnpm, in this task; the TODO lines of 11.6 (the snapshot leaves it) and 11.7 (the GitHub catalog's lint fix leaves it); the sdk contracts task's spec where it lists the lint's terms. `docs/design/app-install.md` stays 11.9's.

## Open items

- A cache of artifacts that survives a reload.
