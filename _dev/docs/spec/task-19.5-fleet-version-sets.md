# 19.5 — The fleet's version sets

The seven apps set to the version sets phase decision 7 names, each card at a new version, each app's tests on its set, the fleet published to the marketplace with the Store previews re-captured by the publish, and the registry left as 19.6's before side. Sub-task 19.5 of Phase 19 (`_dev/docs/spec/phase-19-v09-beside-v091.md`, decisions 7 and 10). An `[apps]` sub-task: the code lands on `../a2uiverse-apps/` `main`; the two design-record sentences are this repo's. After 19.2 and 19.4; before 19.6.

## Scope

- Each app's version set in its config, and the card version it is published at.
- Each app's tests: the card's shape for its set, and the stamp on its in-process answers.
- The one vendor app whose answer code writes the protocol version itself.
- The test helper the kit ships to every app and the scaffolder's template of it.
- The publish of the seven apps to the marketplace, and what it must leave untouched.
- The docs the change makes false, and the one line of DX it creates.
- The proof: the suites, the gates, the Store's state read on disk.
- Out: the update path, the Store page and the merges on the mixed fleet (19.6); SPEC §14, the root README and the records' full check (19.7); any recording or fixture; the 19.4 spec's text.

## Locked decisions

### 1. The registry is 19.6's before side and the publish never touches it

The orchestrator's real registry holds Calendar, CircleCI, GitHub, Gmail and Linear at card `0.1.0`, installed from the local checkout, one v0.9.1 entry each; the marketplace holds all seven at `0.1.0`. 19.5's publish moves the Store to the new versions and leaves the registry exactly as it is, so 19.6 opens on the update path — `card-update` for each of the five — with nothing staged by hand.

### 2. The publish goes through the launcher, the orchestrator on a throwaway state directory

The fleet is published by the launcher's publish path in deterministic mode over both tiers, with the orchestrator pointed at a throwaway state directory so the install-overs the launcher performs land in a registry nobody keeps. The publish keeps `A2UIVERSE_PUBLIC_URL` on the tunnel pattern the Store's cards already carry, the sign-in agents' ports forwarded as the tunnel doc has it. The throwaway directory is removed after.

### 3. Every card moves to `0.2.0`; the package version stays

Each app's card `version` moves from `0.1.0` to `0.2.0`. Each app's `pyproject.toml` stays at `0.1.0`.

### 4. The field is explicit on all seven

`a2ui_versions` is written in every app's config, with the scaffolder's one-line comment naming the three choices beside it: `["v0.9"]` for Gmail, Linear and Shop A; `["v0.9.1"]` for GitHub and Shop B; `["v0.9", "v0.9.1"]` for Calendar and CircleCI.

### 5. Each card test asserts the exact list its set means

Each app's card tests assert the exact `[(uri, params)]` list of its card's extension entries — the URIs from the kit's `EXTENSION_URIS`, the ids from the app's catalog context: one flat v0.9 entry for Gmail, Linear and Shop A; one v0.9.1 entry with params keyed `v0.9.1` for GitHub and Shop B; two flat entries, v0.9 first, for Calendar and CircleCI. The comments naming a spec-fixed v0.9.1 URI or a single version go.

### 6. The test helper carries the app's set

Every app's `tests/helpers.py`, and the scaffolder's template of it, builds the deterministic executor with `versions=CONFIG.a2ui_versions`; no card is passed. Each app's conformance test gains the assertion that every in-process payload's `version` is the set's newest. The scaffolder's snapshots follow the template.

### 7. GitHub's answer code on the kit's fixture-version constant

`github/agent/app/responses.py` builds its messages on `FIXTURE_VERSION`, as the two shops' builders do. The hand-written payloads in every app's tests stay literal.

### 8. The docs 19.5 touches

The kit record's Linear config excerpt in `docs/design/agent-kit.md` shows `a2ui_versions=["v0.9"]`. The reading sentence in `docs/design/app-install.md` names Gmail's card as the flat params and GitHub's as the keyed. The apps README's roster table gains an "A2UI versions" column with each app's set.

### 9. The 19.4 spec stays as written

The fallback's stamp being proven in deterministic mode alone is recorded in the TODO's 19.4 done line; the 19.4 spec's test row is not amended.

### 10. The proof

Tests: each app's card test and conformance assertion; the seven suites green; the scaffolder's tests green with the template's change; `pnpm verify` in the apps repo. The publish, read on disk after the launch with no browser: the launcher's summary naming seven published; each marketplace entry's `versions` now `["0.1.0", "0.2.0"]` and its stored card in the shape its set means, so decision 7's flat, keyed and two-entry cards are checked on the Store's own copies; each `preview.json` newer than the launch's start; the real registry file byte-identical before and after; the throwaway state directory removed. The Store page, the update tiles and the merges are 19.6's.
