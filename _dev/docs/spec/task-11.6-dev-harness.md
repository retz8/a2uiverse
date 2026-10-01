# Task 11.6 — Dev harness

Sub-task 11.6 of Phase 11 (`_dev/docs/spec/phase-11-app-bundle-registry.md`, decision 16): the launcher's dev roster, each launched app's catalog built, packed and installed through the orchestrator's operation, the registry reconciled to the launch, and the beat recording scripts working again over an installed registry. Amends task 4.7 decision 6.

## Scope

- The launcher's dev roster, its tiers and its ports; manifest discovery gone, and `dev:all` no longer spawning from the manifests.
- The launcher's catalogs built, packed and installed through the operation, under both launch commands; the registry reconciled to the launch.
- The launcher no longer handing `A2UIVERSE_AGENTS_DIR` to the orchestrator; the agents dir the launcher's input alone. The run modes unchanged.
- The listing, and what stops a launch before anything starts.
- The beat recorder and the transparency check over an installed registry.
- The tests, the proof, and the documents this task makes wrong in this repo.
- Out: the registry snapshot (11.5); `manifest.json` removed from every app, Stellify as each catalog package's dev dependency, the scaffolder's port suggestion and the apps repo's README (11.7); the acceptance run (11.8); `docs/design/app-install.md` (11.9).

## Locked decisions

### 1. The dev roster

The launcher holds a dev roster naming each app it starts from the apps checkout: its id, its folder in the checkout, its tier and its port. The default tier is the five vendor apps — GitHub, Gmail, Google Calendar, CircleCI and Linear. The mock tier is the two mock storefronts, Shop A and Shop B.

### 2. One tier per launch

Tiers replace each other. A launch runs the default tier, or the mock tier alone.

### 3. Ports are fixed in the roster

Each roster entry carries its port, the numbers in use today — vendor apps from 11001, mock apps from 12001 — and the launcher hands each agent its port. A new app's port is chosen by its author at scaffold time and written into its roster entry. The platform assigns no port: an app installed from outside the checkout is reached at its card URL.

### 4. The tier is a flag

A tier flag selects the tier; no flag is the default tier. The agents dir is always the apps checkout's root, and each roster entry's folder is inside it. The only-these-apps selection narrows inside the chosen tier. Task 4.7 decision 6 — the mock profile is pointing the agents dir at the tier's folder, with no profile flag — is amended accordingly.

### 5. Both launch commands install

`dev:all` and `dev:agents` both install. The launcher starts the agents — and, under `dev:all`, the platform — at once, and builds and packs every launched catalog straight away. Once the orchestrator answers, each app is installed as soon as its own card answers, then the reconcile of decision 8 runs. `dev:agents` installs into the orchestrator already running at its URL; when none answers within the timeout it says so and leaves the agents running, not installed.

### 6. Each catalog is built before it is packed

The launcher builds the launched catalog packages through the apps repo's own build, filtered to them, before packing; an unchanged package is a cache hit.

### 7. The launcher packs with the workspace's Stellify

The launcher packs through the programmatic API of this repo's own Stellify, as the registry snapshot does, not the copy a catalog package pins.

### 8. The registry is reconciled to the launch

After a launch the launcher has installed every app it launched and uninstalled every roster app it did not. An installed app the roster does not name is left alone.

### 9. A failed app is reported and dropped

An app whose build fails, whose pack has findings, whose agent never answers its card, or whose install the gate refuses is reported by name with its reason; the other apps keep launching, and an install of that app left by an earlier launch is uninstalled.

### 10. Stopping leaves the apps installed

Stopping the launcher stops its processes and uninstalls nothing. The next launch's reconcile holds the registry to what runs.

### 11. The listing is a dry run of the launch

The listing prints the selected tier's roster — each app's id, folder and port, and ok or the reason it would be skipped — and exits non-zero when it reports something that would stop a launch. A roster entry whose folder, agent or catalog package is missing from the checkout is skipped and named; the rest launch. An unknown tier, an unknown id in the only-these-apps selection, that selection naming a skipped entry, or a port shared within the tier stops the launch. What is installed stays the registry command's listing.

### 12. The beat recorder's own orchestrator has a state directory of its own

The orchestrator the beat recorder starts for its fault cases and sessions runs on a fresh state directory of its own, never the one in daily use. The recorder installs into it, through the install operation, every app the running orchestrator has installed — each app's card URL and its artifacts' files, read over `orchestratorApi`. The running orchestrator's write token and journal are untouched; a take's journal lines are read from the recorder's own orchestrator's journal.

### 13. The transparency check reads its agents from the hub

The transparency check's agents default to every app the hub has installed, at its card URL, and each direct send advertises that app's entitlement, as the hub does. An explicit agent list still overrides.

### 14. Proof

Offline tests on the launcher's pure parts — the roster and its static rules, the tier and only-these-apps selection, the reconcile set, a failed app reported and uninstalled — run by the platform's gates. One live check through the tunnel: the default tier on an empty state directory installs the five and a question paints; the mock tier leaves exactly the two shops installed; one beat recorded through the running orchestrator and one through the recorder's own, into a scratch directory, no committed fixture changed; the transparency check passes.

### 15. Docs

11.6 corrects what it makes wrong in this repo: the root README's launcher section, the tunnel doc's run steps, the client README's recording and transparency scripts, and the launcher's mentions in `docs/design/orchestrator.md` and `docs/design/agent-kit.md`.
