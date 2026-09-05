# Task 4.7 — Mock profile plumbing

Spec for sub-task 4.7 of Phase 4 (`_dev/docs/spec/phase-4-synthesis.md`): the opt-in that puts the two quarantined mocks (`task-4.6-mock-storefronts.md`) in play as the roster — launcher discovery, orchestrator registry, and the client's catalog install — so 4.8 can run under the profile phase decision 18 describes.

## Scope

- The named profile and the primitives it is a preset of.
- How the orchestrator's roster set becomes selectable without the mocks entering platform source.
- Whether the client bundles the mock catalogs, the 4.6 open item.
- What the launcher does and does not gain.
- The docs the above entail.

Not in scope: anything in the apps repo's code — the mocks are complete as built in 4.6; end-to-end acceptance (4.8).

## Locked decisions

### 1. One named profile over composable opt-ins

The profile is a named preset of independent opt-ins, not a switch of its own. The gated acceptance run uses the preset; the primitives underneath remain individually settable.

### 2. The profile is `mocks`

Named by what its roster contains, not by what it is used for. "Synthesis profile" stays as prose describing the profile's Phase 4 purpose; Phase 5 also synthesizes, over the default roster, so a purpose name would stop distinguishing anything.

### 3. The roster comes from a directory of manifests

When opted in, the orchestrator builds its registry from the manifests found one level below a directory, and that set replaces the hardcoded roster. Unset means today's hardcoded three. The mocks are dev-only and must never enter platform source: the manifests already mirror the registry record and already live in the apps repo, and a real registry (Phase 10) replaces the directory with its install root and deletes the hardcode rather than having to strip mock records out. An inline record list via env, and mock records baked into the compile-time entries under a tier tag or id filter, were both rejected for leaking mock knowledge into the platform.

### 4. One directory variable, shared by launcher and orchestrator

The orchestrator reads the same agents-dir variable the launcher already reads. "The agents dir" is one platform-wide concept: the set of apps in play. The defaults differ by design and are documented: the launcher unset means the sibling apps repo root, the orchestrator unset means the hardcoded roster; the two agree in practice since the repo root discovers exactly the three vendors, and the orchestrator must still boot standalone without an apps checkout.

### 5. The client bundles all five catalogs and knows nothing of the profile

Both mock catalogs join the client's dependencies and its static catalog table beside the three vendor ones. The client renders whatever roster the orchestrator serves and never reads the profile. The mock names in the client's dependency list are an accepted leak, of the same kind the three vendor deps already are: the static table is the placeholder that Phase 10's dynamic catalog loading replaces, and all five deps leave together then. A build-time switch was rejected as a third thing to keep in agreement for no gain; not bundling was rejected because a fragment cannot render without its catalog.

### 6. The profile is a documented invocation, not code

Running the mock roster is pointing the launcher's agents dir at the tier path and starting everything as usual. No profile flag, no profile variable, no script alias.

### 7. The launcher's directory flag reaches the orchestrator

The launcher hands the agents dir it resolved to the processes it starts, so `--agents-dir` and the environment variable agree: the orchestrator's roster follows whichever the launcher was given. The flag is the preferred spelling — explicit and per-invocation, nothing set on the shell.

### 8. Mixed roster is not built

A run over the three vendors plus the two mocks is not reachable in 4.7. A path-list form of the variable was considered and dropped; if a later phase wants the mixed run, it is built then.

### 9. The orchestrator carries its own manifest reader

A small reader in the orchestrator, mapping only the fields the registry record already has. The launcher's discovery module is not imported across the app boundary, and discovery is not moved into the sdk now — that means designing the manifest schema, which is Phase 10's job and where both consumers will import the reader from. The shared thing is the convention — one level down, one manifest per child — pinned by tests on both sides.

### 10. Missing is silent, malformed is fatal, empty is fatal

A child directory with no manifest is not an agent and is skipped silently, as the launcher does; the directories contain non-agent children by design. A manifest that exists but cannot be parsed or lacks a required field fails boot naming the file, the way every other malformed orchestrator config value already does. A directory yielding zero records fails boot. An agent whose card cannot be fetched is unchanged: warned, kept, not routable. The launcher's leniency exists to serve its listing; the orchestrator has no listing and refuses instead.

## Invariants

- **No platform source names a mock.** Mock knowledge lives in the apps repo. The one accepted exception is the client's dependency list, per decision 5, with a known expiry.
- **The mocks are dev-only and Phase 4 is not the finished synthesis.** Plumbing for them is kept to what 4.8 needs to run and nothing more.

## Carried consequences

- Orchestrator: registry from manifests when the variable is set, the URL override still applying per id on top; tests against a fixture directory.
- Client: two mock catalogs added to the dependencies, the build allow-list, the static id list and the import table; the resolver test pins five.
- Docs: platform README gains the profile invocation and the flag trap; the orchestrator README's env table gains the variable; the orchestrator design record updates the registry construction; the apps repo README gets the invocation beside its existing "point the agents dir at the tier" sentence.
