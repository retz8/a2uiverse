# Task 11.2 — sdk: the catalog export and artifact contracts

Sub-task 11.2 of Phase 11 (`_dev/docs/spec/phase-11-app-bundle-registry.md`, decisions 6, 8, 13): the two contracts the pack tool (Stellify, task 11.3) writes to and the marketplace, the registry and the client verify, the checks written once for the registry and the marketplace, and what the sdk pins from the A2UI spec for them. Amends phase decisions 4 and 7 and SPEC §4.1, §9.1 and §10 with catalog entitlement and two-directional coverage.

## Scope

- The catalog export contract.
- The host-module interface: its version and what it lends.
- The catalog artifact contract: the descriptor and its form.
- The checks the registry and the marketplace share: coverage, uniqueness, the app id's grammar, the credential lint, the artifact's file checks.
- Catalog entitlement per app and what the hub advertises to each agent.
- The A2UI capabilities schemas pinned and validated against.
- The amendments to the phase spec and SPEC.md that follow.

## Locked decisions

### 1. Export contract: `CATALOG` required, `Provider` optional

A catalog package's entry exports `CATALOG`, a `Catalog` from `@a2ui/web_core` built for `@a2ui/react`'s React catalog model. `Provider` is optional: absent, a passthrough wraps the catalog's fragments; present, it is the one Provider of SPEC §9.2, written by a catalog whose CSS or design system needs a scope or a context. No `CATALOG_ID` export: the id is `CATALOG.id`. Where it is checked (amended by task 11.3): at pack, Stellify evaluates nothing and reads the id from the schema file's `catalogId`, the config's, when set, agreeing with it; at load, the client checks `CATALOG.id` against the registry's. Extra exports are ignored. A catalog that replaces the renderer is not a catalog and is out.

### 2. Host-module interface: versioned by the A2UI version it lends

The interface's version is the A2UI protocol version, `0.9.1`. Under it the host lends exactly seven specifiers — `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@a2ui/react/v0_9`, `@a2ui/web_core/v0_9`, `zod` — and `loadStylesheet`. `react-dom/client` was added by task 11.3: React 19 keeps `createRoot` there alone and `@primer/react` reaches it statically. Stellify externalizes exactly those; any other specifier under a host package is refused at pack with the list of what the host lends. Adding a specifier is a change to the interface.

### 3. Contract form: terms as descriptive JSON, the descriptor as a JSON Schema

The terms — the export names, the seven specifiers under `0.9.1`, the layout rules — are a descriptive JSON in the composition contract's style. The descriptor is a JSON Schema beside it, compiled with ajv as the synthesis payload's is, so every reader validates a descriptor with one compiled schema and one error format. The contract test asserts the projection against both.

### 4. Descriptor

`catalogId`, `entry`, `schema`, `hostInterface`, `files` — every file to its hash, entry and schema among them — `package {name, version}`, `packedBy {tool, version}`. `catalogId` is always written. No display title.

### 4a. The contracts carry no version of their own

The catalog contracts are versioned with the sdk, whose every consumer — the orchestrator, the client, the marketplace, the shell catalog, Stellify — ships from this monorepo; the files carry no version in their names or contents, and the descriptor has no contract field. The one version inside them is A2UI's: the host interfaces are keyed by the A2UI version each lends, one key today, a second at the v1.0 soft migration. The composition contract keeps its version, which is the A2A extension URI's.

### 5. Credential lint at install

One word list — password, passcode, otp, pin, cvv, cvc, card number and the like — matched case-insensitively as whole words against component names, prop names and enum values in the catalog schema; a match refuses the install naming the component and the term. Enforcement proper is the marketplace's review over the schema at publish; the design record says so in those words. The list lives in the sdk beside the check, so the marketplace's review and the pack tool's `check` refuse on the same words.

### 6. Two-directional coverage, no orphan artifacts

Every catalog id the card declares must be handed at install or public; every artifact handed must be an id the card declares. A card declaring an id it does not ship is refused whether or not the table holds it; an artifact no card names is refused naming it. Two apps share one catalog by each handing the same artifact — same id, same hash, one row. The same function serves the registry at install and the marketplace at publish; the marketplace's ownership rule at Phase 13 sits on top. Volume abuse — re-uploads, a card declaring many ids — is a marketplace operating policy for Phase 13, a known consequence in the design record.

### 7. Catalog entitlement per app

Each installed app has an entitlement set: the catalog ids handed at its install plus the public catalogs — the standard basic catalog and nothing else. The shell catalog is in no app's set. The hub advertises to each agent its own entitlement set as `a2uiClientCapabilities.supportedCatalogIds`, never the table; the Validator refuses a `createSurface` from an app in a catalog outside its set. The set is fixed at install and changes only by install-over; the boot-time card refresh never grows it. An agent shipping its own catalog that imitates another's look stays the marketplace's lookalike review, with attribution the reader's defence.

### 8. An undeclared card falls back to the basic catalog

A card with no `supportedCatalogIds` is accepted: it hands no artifacts, its entitlement is the public set, and it paints in the basic catalog only. Publish and install say so to the publisher in those words, as a note; the registry records the entitlement so the Planner's installed-apps reader, the App Library and the design record say "basic catalog" for such an app. The client's side of the handshake is the required one per A2UI; the card's declaration is optional per A2UI.

### 9. An unknown or unentitled catalog is caught at the hub

The orchestrator fails the dispatch of a paint in a catalog its table lacks or the app is not entitled to, with a cause of its own carrying the id, on the path a failed source takes. The client draws the failure tile from it: one statement in plain words naming the publisher's responsibility, the id on hover or focus, no Retry. The client's own load-time failure stays for a held catalog whose artifact fails to load. The marketplace's hello-fragment smoke test at Phase 13 keeps this tile off published apps; it is also where a Provider-less catalog's leaked styles are shown beside another catalog's fragment.

### 10. The capabilities schemas pinned

`server_capabilities.json` and `client_capabilities.json` join the pinned A2UI spec. The card's extension params are validated against the server schema when coverage reads them — a malformed declaration refused at install with the schema's error, never treated as none; the list the hub writes is validated against the client schema in a test. The extension URI is a constant beside the spec commit.

### 11. App id grammar

A slug: lowercase ASCII letters, digits and hyphens, starting with a letter, with a length cap; `shell` reserved. The check is the same sdk function the uniqueness check calls, so a publish and an install refuse the same ids for the same reasons.

### 12. Amendments

Phase 11 decision 4: the client's `supportedCatalogIds` is each app's entitlement set, not the table. Phase 11 decision 7: coverage is two-directional. SPEC §4.1: catalog resolution is per surface, within the painter's entitlement; §9.1 and §10 carry entitlement and two-directional coverage.

## Invariants

- The card is read as written and never extended; the artifact is outside the wire.
- A catalog id is an entitlement, not a lookup key.
