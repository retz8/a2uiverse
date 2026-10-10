# Task 11.4 — Orchestrator, the registry

Sub-task 11.4 of Phase 11 (`_dev/docs/spec/phase-11-app-bundle-registry.md`, decisions 3, 4, 11, 12, 13 and 15): the orchestrator as the registry's one writer — the installed apps' cards and the catalog table, persisted in its state directory — with install, uninstall and install-over over `orchestratorApi` on HTTP, the static gate at install, and the orchestrator's side of catalog entitlement (task 11.2, decisions 7 to 9). Amends phase decisions 11 and 12 and SPEC §10.

## Scope

- The registry persisted in the state directory; boot from it alone; the hardcoded roster, the manifest reader and the per-app agent URL override removed.
- Install, uninstall and install-over; the gate and coverage; the catalog table.
- `orchestratorApi` over HTTP: the read routes and the write routes.
- The orchestrator's side of catalog entitlement: what each agent is advertised, and the refusal at the hub.
- Two new failure causes on the shell catalog's `Slot`, with interim words.
- The thin command.
- The journal's registry entries.
- The tests, the proof, and the documents this task changes.
- Out: the client's loader and the real tiles (11.5); the launcher's dev roster and the registry snapshot (11.6); the GitHub catalog against the credential lint and the manifests' removal (11.7); `docs/design/app-install.md` (11.9).

## Locked decisions

### 1. The registry is files in the state directory

The registry — each installed app's card, the card URL it was fetched from, its entitlement and its catalogs' hashes, beside the artifacts' files filed by hash — is files in the orchestrator's state directory, the preliminary store. Writes go through a temporary file and a rename. A fresh state directory is an empty registry.

### 2. Install takes the files in the request body

Install's core takes the app id, the card URL and one in-memory files map per catalog. Over `orchestratorApi` the request body carries each catalog's files as JSON. At M9 the artifact's files fetched from the marketplace — only those the registry lacks — are a second way into the same core (Phase 13, decision 9). The orchestrator never reads a path it is handed.

### 3. The card URL is the card's full URL

Install takes the full URL of the card, not the agent's base URL; it is stored and refetched at startup. Install refuses when the card cannot be fetched, and returns once the app is routable: its card stored, indexed by the Router, visible to the Planner's installed-apps reader.

### 4. The gate at install

Install refuses the whole app on any failure of: the app id's grammar, `shell` reserved; the card's A2UI catalog declaration against A2UI's server capabilities schema; coverage in both directions; the descriptor's conformance, every listed file present with its hash and nothing unlisted; the schema compiling as an A2UI catalog, its id the descriptor's; the host-interface version being one the platform supplies, through an sdk function the marketplace shares; the credential lint over the schema. A card declaring no catalogs installs on the basic catalog, and the command prints that note.

### 5. A held catalog id at a new hash

The catalog table holds one artifact per catalog id. An install handing an artifact for a held id at a different hash is accepted only when no other installed app names that id: the row is replaced and the old files dropped. Otherwise install refuses the whole app, naming the installed apps that name the id. Amended by Phase 13, decision 6: the row moves on every install path, every installed app naming the id follows it, and the summary names them.

### 6. Install-over and uninstall

Installing a held app id replaces its card, artifacts and entitlement in place. Uninstall removes the app's record; an artifact's files go when no installed card names its id; the basic and shell catalogs never go. Registry operations run one at a time. A dispatch already running when its app is uninstalled or installed over finishes, checked against the entitlement it was sent under; the next dispatch reads the registry as it stands. A new dispatch to an app no longer installed — a Retry, an action inside its fragment on any canvas — fails with a cause of its own, not installed, and keeps Retry.

### 7. The basic and shell catalogs are rows with no artifact

The table's rows for the standard basic catalog and the shell catalog name no artifact: marked as provided by the client, built from code at every boot, never persisted.

### 8. Startup uses the fetched card

The orchestrator boots from its persisted registry alone. At startup it fetches each installed app's card from its stored card URL, and that run uses the fetched card: the dispatch URL, the skills the Router indexes, what the Planner's reader shows. An app whose card fetch fails stays installed and is unroutable for that run, the reader showing its stored card marked unreachable. The registry on disk is written only by install, uninstall and install-over; the persisted card changes only through install-over.

### 9. A damaged registry refuses the boot

A record file that does not parse, or an artifact whose files are missing or do not match their hashes, stops startup with the path and what is wrong. Startup re-checks every artifact's hashes.

### 10. The read routes are shaped like static files

`orchestratorApi`'s read routes sit on the orchestrator's port under one prefix: the installed list and the catalog table each one JSON file at a fixed path, each artifact's files under a path carrying the artifact's id. An artifact's id is its descriptor file's hash in a URL-safe spelling; its files are served as immutable content. The registry snapshot of 11.6 is a directory of the same layout, served by any static server. The installed list carries the persisted records only; whether an agent is up this run is not in it.

### 11. The write routes take a local token

Install, uninstall and install-over require a token the orchestrator writes into its state directory at startup; the command and the launcher read it and send it as a header; a write without it is refused. The read routes and the A2A endpoint stay as they are. The browser's writes at M10 revisit this.

### 12. The orchestrator's side of catalog entitlement

The hub advertises to each agent its own entitlement as `a2uiClientCapabilities.supportedCatalogIds`, in place of the client's list it forwards today. As it relays, the hub checks the catalog id of each surface a vendor creates against that app's entitlement; validating the tree against the catalog's schema stays the client's. A miss fails the dispatch on the failed-source path with one cause of its own carrying the catalog id, for a catalog the table lacks and one outside the entitlement alike. The Planner's installed-apps reader names each app's catalogs, "basic catalog" for an app whose card declares none.

### 13. The two new causes: 11.4 paints, 11.5 draws

The catalog cause of decision 12 and the not-installed cause of decision 6 join the `Slot`'s closed cause vocabulary in the shell catalog's schema, the catalog cause carrying the id. 11.4 adds them and paints them, with plain interim words; 11.5 draws the real tiles.

### 14. The thin command

A command in the orchestrator package with three verbs: install, which covers install-over; uninstall; list. Install takes an app id, the full card URL and zero or more packed artifact directories, as Stellify's `pack` writes them; the command reads the token, sends the request, prints the outcome or each finding on its own line, and exits 1 on a refusal. Packing stays with Stellify: by hand before the command, and through Stellify's API in 11.6's launcher, which calls the same HTTP operation.

### 15. The journal records registry changes

Install, install-over, uninstall and each refusal write one entry of a registry kind to the intent journal: the app id, the card URL, the catalog ids and their hashes, the outcome, and a refusal's findings. No embedding.

### 16. The gap until 11.6

11.4 lands with the hardcoded roster, the manifest reader and the agent URL override gone. Until 11.6, dev installs by hand through the command, and the beat recording scripts stay broken.

### 17. Proof

The orchestrator's tests move from the roster and the URL override to installs through the operation over fake vendors. Gmail is installed by hand through the command from its packed catalog and driven in the browser through the tunnel.

### 18. Documents

`docs/design/orchestrator.md` where the registry replaces the roster; the orchestrator README's run steps and the command; the phase spec's decisions 11 and 12 as this task amends them; SPEC §10 where it now says something new. `docs/design/app-install.md` and the cross-links to it stay 11.9's.

## Open items

- Phase 13's ownership rule for catalog ids: there should be a way of checking that a publisher is who it claims to be — that "GitHub" is actually from GitHub. Once a catalog id exists, no app from a different publisher may publish with that catalog id; multiple apps over a single catalog are the catalog owner's responsibility. Decided in Phase 13 (decisions 2 and 5): a publisher is a name plus a secret, not verified; a catalog id is owner-only.
