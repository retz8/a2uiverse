# Phase 11 — App bundle + registry

M7 of SPEC §12: how an app gets into A2UIVerse — the units, the artifact, the install operation, the registry as the orchestrator's persisted state, and the client loading catalog implementations at runtime. The decisions here frame Phases 11 to 15: install, the marketplace and the Store. Amends SPEC §9.1, §10, §12, §13, §15 and the §14 delta register.

## Scope

- The catalog export contract and the catalog artifact contract in the sdk.
- The pack tool, Stellify.
- The registry as persisted orchestrator state: install, uninstall, install-over; the catalog table; the static gate at install; `orchestratorApi` over HTTP serving the installed list, the catalog table and the artifacts; the hardcoded roster and the manifest reader removed; boot from an empty registry.
- The client's runtime loader: the host-module interface, preload at boot, lazy load on arrival, load-time checks; the seven catalog dependencies and the static catalog list gone.
- The dev harness: the launcher's dev roster with auto-install on launch; the registry snapshot for e2e and replays.
- `[apps]`: `manifest.json` removed; Stellify as each catalog package's dev dependency.
- SPEC amendments, the delta register entry, `docs/design/app-install.md`, the READMEs.
- Out: everything the card's `securitySchemes` leads to (M8), the marketplace process and publish (M9), the Store page and App Library (M10), the capability-gap loop (M11), the upstream sample agent (Phase 16).

## Locked decisions

### 1. Catalog implementations load at runtime

The client compiles no vendor catalog in. Catalog implementations arrive through the registry at runtime, fetched from the orchestrator. `a2uiverse` depends on `a2uiverse-apps` for nothing but the generated test fixture of decision 16. Any A2A agent that paints A2UI is installed by describing it, never by building against it.

### 2. Two units: app and catalog implementation

An **app** is an A2A agent, described by its AgentCard and nothing else. A **catalog implementation** is its own installable unit, keyed by its `catalogId`, which A2UI already versions. One app may name several catalogs; several apps may share one.

### 3. The card is the app

The registry stores the card it fetched at install, verbatim, and refreshes cards at boot as today. No platform-written description of an agent exists: `manifest.json` goes, and the card is never extended. Dispatch goes to the card's `url`; the per-app agent URL override loses its reason to exist. An agent unreachable at boot is unroutable that session and stays installed.

### 4. The join is `catalogId`

The card's A2UI extension names the catalogs the agent paints in (`supportedCatalogIds`). A **catalog table** maps each catalog id to one artifact: the marketplace's index at M9, the local registry's at M7, seeded with the standard basic catalog (the client's own `@a2ui/react` export) and the shell catalog. Each app has a **catalog entitlement**: the ids handed at its install plus the public basic catalog, the shell catalog in no app's set; the hub advertises to each agent its own entitlement as `a2uiClientCapabilities.supportedCatalogIds`, never the table, and refuses a paint outside it (task 11.2, decisions 7 to 9).

### 5. The publisher packs

A platform-published pack tool — **Stellify**, "to turn into a star" (task 11.3) — separate from the Python agent kit, turns a catalog package into the catalog artifact in the package's own checkout. It is a command-line tool, one dev dependency, zero configuration when the package follows the convention the seven catalog packages follow, with a small config for a package that departs from it. Verbs: `pack` and `check` in Phase 11; `publish` and `preview` (the hello-fragment smoke test, run locally) at M9. It has a programmatic API for the launcher and the snapshot script. The apps repo consumes it as a `github:` dependency at a pinned ref, the workspace's convention for cross-repo packages. An agent whose card names only catalogs the platform already holds never installs it.

### 6. The sdk holds the contracts, not the tool

Two contracts, normative JSON with the JS projection, beside the composition contract: the **catalog export contract** — a catalog package's entry exposes `CATALOG` and, optionally, one `Provider` (task 11.2), the minimum on any catalog used on A2UIVerse — and the **catalog artifact contract** — what Stellify writes and the marketplace, the registry and the client verify. The app-id uniqueness and catalog-coverage checks are written once in the sdk's projection, so the local registry and the marketplace run the same functions. §13's vendor dependency rule gains Stellify as a build-time dev dependency of the catalog half; nothing of it reaches runtime.

### 7. The artifact is a directory of files served under one base URL

The descriptor with every file and its hash, the catalog schema, one ESM, the CSS files as files, fonts and icons as files. The registry serves it statically under the catalog's base URL; the marketplace hosts it in the same layout, and an install from it fetches only the files the registry lacks (Phase 13, decision 9). The client caches by hash.

### 8. Host singletons through a host-module interface

The artifact leaves React, `react-dom`, `@a2ui/react`, `@a2ui/web_core` and zod external and reaches them through one versioned interface the client registers before any artifact loads; Stellify rewrites each external import to a read from it. It rewrites each stylesheet import in the vendor's source into a stylesheet load through the same interface, resolved against the artifact's base URL, so the vendor's source — the Provider included — is untouched. The descriptor names the interface's version; the client refuses at load an artifact built against one it does not provide.

### 9. Publish and install

Publish (M9) takes an agent URL and zero or more catalog artifacts; the marketplace fetches the card and checks coverage in both directions: every catalog id on the card is handed now or public, and every artifact handed is an id on the card — no orphan artifacts (task 11.2, decision 6). Install takes an app: the card plus the artifacts for the ids it names — from the marketplace, or from disk at M7 — under the same check. A card declaring no catalogs falls back to the basic catalog, said to the publisher in those words.

### 10. The app id is the publisher's, unique in the marketplace

The platform app id — the provenance tag, the surface namespace, the vault key — is chosen by the publisher at publish and unique in the marketplace's index, checked for duplicates like a username and refused when taken; the same check covers catalog ids. Both belong to the publisher who first published them (Phase 13, decisions 2 and 5). The registry adopts it and keeps `shell` reserved. At M7 the install operation takes the id as its argument.

### 11. One writer: the orchestrator owns the registry

Install, uninstall and install-over are orchestrator operations exposed over `orchestratorApi`, which becomes HTTP and also serves the installed list, the catalog table and the artifacts. A thin command wraps the operations for M7; the Store page at M10 and the store loop at M11 call the same ones. A change is live at once: the Planner's installed-apps reader and the Router see it on the next turn. The write operations take a local token the orchestrator writes into its state directory at startup; the command and the launcher read it from there (task 11.4). Install answers with what it changed — installed, updated or reinstalled; the card's version and each catalog's artifact, old → new where they moved; "nothing changed" when the card and the catalogs are as they were — and the command and the launcher print it (task 11.8, decision 22).

### 12. Install, uninstall and install-over semantics

Install refuses the whole app on any uncovered catalog id or any failed static check. Installing an id already held replaces its card and artifacts in place. A new hash for a held catalog id moves the row, every installed app naming the id following it, the summary naming them, on every install path (Phase 13, decision 6 — replacing task 11.4's decision 5, which refused it while another installed app named the id). Uninstall removes the app's card and record; a catalog artifact stays in the table while another installed card names it and goes when none does — the basic catalog and the shell catalog never go. Canvases already composed over the app keep what they hold; a dispatch already running when its app is uninstalled finishes, checked against the entitlement it was sent under, and a new dispatch to an uninstalled app fails into the failure tile with a not-installed cause of its own, Retry kept (task 11.4). Retry sends again what failed: the action inside the fragment that failed, kept on its slot until an action or a Retry there completes, otherwise the slot's request from the plan (task 11.8, decision 23).

### 13. Three gates

Install verifies everything the files alone can prove: the descriptor conforms; the catalog schema inside is a valid A2UI catalog whose id equals the descriptor's; the host-interface version is one the platform supplies; the credential-component bar of SPEC §8 holds over the schema. The client verifies the running code at load: the module exports `CATALOG` and, when present, one `Provider`, its `CATALOG.id` agrees with the registry's, the collision detector runs as now; a failed load fails that catalog's slots with the client's reason, never a bare render. The marketplace verifies behaviour at M9.

### 14. The client preloads at boot and loads lazily after

The client reads the catalog table at boot and loads every artifact; a surface arriving in a catalog not yet loaded triggers the fetch, its slot pending meanwhile, the implementation cached for the session. An install while the client is open needs no reload. The orchestrator serves each artifact as immutable content. The client imports each artifact's entry from its served URL, never from a blob: the entry's own URL is the artifact's base URL, which its stylesheet loads resolve against (task 11.3). A surface in a catalog the registry does not hold fails that slot. Every request of a load is bounded: the table, the descriptor and each stylesheet are asked once more after 10 s with no answer, the entry after 30 s, then the load fails its slots with Retry; the table and the descriptor are read past the browser's cache, and a stylesheet asked again or an entry loaded after a failed load goes under a URL of its own (task 11.8, decision 20).

### 15. The orchestrator boots from its persisted registry alone

A fresh state directory is an empty registry, and empty is a valid platform: the shell's card is the only routable one. No seed roster. Installs persist across restarts.

### 16. The dev harness installs, the orchestrator does not know the checkout

The launcher holds a dev roster naming each app to auto-install from the apps checkout — its id, its folder, its tier, the mocks only when their tier is on. On launch it starts each on the port its roster entry fixes (task 11.6), packs its catalog and installs it through the orchestrator's operation. `A2UIVERSE_AGENTS_DIR` is the launcher's input, not the orchestrator's. E2e and replays read the registry table and artifacts over `orchestratorApi` from a **registry snapshot** — the table plus the artifacts — generated from the apps repo at a pinned ref through pnpm into a git-ignored directory, never committed, and the client's tests load it too (task 11.5); dev replays use the live orchestrator. Stellify files a package's own files by their path below the package root wherever the package sits, so a catalog packed installed in a `node_modules` files them as in its checkout (task 11.8, decision 18); the snapshot's artifact of a catalog equals its publisher's where both installs resolve every bundled dependency at the same path and version. The launcher's `--no-install` starts the agents and builds, packs, installs and uninstalls nothing, for installs by hand through the command (task 11.8, decision 5).

### 17. Proof

Every app, GitHub first, installed from its card URL and its packed catalog, with no line of client or orchestrator code naming it. A test in `pnpm verify` searches the runtime source of the client, the orchestrator and the shell catalog for every roster app id, catalog id and catalog package name, against a short allow-list (task 11.8, decision 4).

### 18. Docs

SPEC §9.1 (the bundle becomes the catalog artifact; the card is the app), §10 (the registry and `orchestratorApi`), §12 and §15 wording, §13 (Stellify in the vendor dependency rule). The delta register records a pre-existing gap as an upstream candidate: A2UI negotiates catalogs by id and has no way to deliver a catalog implementation or to say where one is; A2UIVerse resolves it by a store-side table keyed by `catalogId`, the card not extended. `docs/design/app-install.md` is the area's record — the catalog artifact, Stellify, the registry and install, the client's loading — over one running example, extended as Phases 13 to 15 arrive; `orchestrator.md` and `client.md` point to it where they touch it.

## Invariants

- Nothing a2uiverse-specific rides the vendor wire: the card is read as written, the artifact is outside the protocol.
- Composition keeps working over runtime-loaded catalogs: merges land, a merged value navigates to its element, the collision detector holds.

## Open items

- Ownership of an app id and of a catalog id in the marketplace's index — who may publish or replace the artifact for an id, and so how one publisher updates a catalog several of its apps name — decided in Phase 13 (decisions 2, 5 and 6).
- How an app update is discovered and accepted, and the window between an agent's new card and its install-over: discovery decided in Phase 13 (decisions 7, 8, 10, 14 and 16); the consent and the window belong to Phases 14 and 15.
