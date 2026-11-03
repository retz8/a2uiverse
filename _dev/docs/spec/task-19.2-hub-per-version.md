# 19.2 — The hub advertising per version and checking a paint against the set of its stamp

The orchestrator advertising each A2UI version's catalog set under its own key and checking a paint against the set of the paint's stamp, the orchestrator's own card declaring both versions, the marketplace's smoke test and Stellify's preview asking an app as the hub will, and the apps' Stellify pin moved. Sub-task 19.2 of Phase 19 (`_dev/docs/spec/phase-19-v09-beside-v091.md`, decisions 3, 4 and 9). After 19.1; parallel with 19.3 and 19.4.

## Scope

- The per-version catalog sets the hub holds for each installed app, where they come from and where they live.
- The hub's advertising per version and its paint check per stamp, with the words of a refusal the version axis made.
- The orchestrator's own AgentCard and the request header.
- The marketplace's smoke test and Stellify's preview capture, advertising and checking as the hub does.
- The sdk's one function for the per-stamp rule.
- The tests, the package versions, the design records and READMEs this sub-task changes.
- The apps' Stellify pin, moved as this sub-task's tail on the apps repo's `main`.
- Out: the client's inbound filter (19.3); the agent kit (19.4); SPEC §14's rows, finding 27, the root README's sentence and the Backlog line from 18.3 (19.7).

## Locked decisions

### 1. The per-version sets live on the run-time app record, from the card as installed

The registry derives, beside the flat entitlement, a map from version to the catalog ids that version may paint in, on the app record it builds for the run. Each version's set is the public catalogs plus the ids the card as installed declares for that version, through the sdk's per-version reader. The persisted installed record stays flat. When the stored card does not read, the map carries the flat entitlement under both keys. The shell's own record carries the shell catalog under both.

### 2. A paint stamped neither version is checked against the union

The paint check reads the stamp of each created surface and tests its catalog against that version's set. A surface whose stamp is missing or names a version the platform does not speak is tested against the union of the two sets. The hub refuses only what no version admits; the stamp itself is the client's to judge.

### 3. A refusal the axis made names the stamp

When a refused catalog is in the app's union but not in the set of the paint's stamp, the dispatch's error names the stamp and the version the card declares the catalog for. A paint outside the union keeps today's line. The record carries nothing new; the journal keeps the fuller line.

### 4. The refetch, the update check and drift stay on the union

The live card fetched again after a refused paint is judged changed on the union, as today; the update check before dispatch, the update state and the drift test read the union. A live card that keeps the same union and moves a catalog from one version's entry to the other's is an accepted edge: a paint stamped the old way is refused and the refetch says unchanged.

### 5. The orchestrator's card declares one entry per version from the sdk's map

The orchestrator's AgentCard carries one bare extension entry per version the platform speaks, each described by its version, none required, written from the sdk's version map. The orchestrator's two constants naming the extension URIs are removed; the card and the request header are written from the sdk's map.

### 6. The smoke test and Stellify's preview mirror the hub

The marketplace's publish step and Stellify's preview hand the smoke runner the per-version map read from the card, each version's set the public catalogs plus that version's declared ids; the runner advertises it through the sdk's capabilities helper. The sdk's paint check takes the map beside the flat list and judges each surface against the set of its create's stamp, a stamp that is neither version against the union as decision 2 has it.

### 7. One sdk function answers the per-stamp rule

The sdk exports one function that, given a created surface's stamp, its catalog id and the per-version map, says whether the surface is outside and, when it is, which version's set it fell out of. The pool's paint check and the sdk's smoke check both call it; the refusal's words and the smoke finding are written from its answer. The catalog contract file's rule string from 19.1 is unchanged.

### 8. What proves the sub-task

Registry: the run-time record's map from a one-entry card, both keys one set; from a two-entry card naming different sets, each key its own; from a stored card that does not read, the flat entitlement under both; the shell's record. Pool: the advertising over a different-sets card, each key its own set, the client's list dropped; a `v0.9` paint in a catalog the card declares for v0.9.1 only refused, never relayed, the error naming the stamp and the version, the refetch and the tiles as today; a `v0.9.1` paint in the same catalog relayed; a paint with no stamp or an unspoken stamp in a catalog in either set relayed, in one outside both refused with today's line. Card: one bare entry per version, none required. sdk: the rule function over every branch; the paint check over a map, a surface refused by its stamp with a finding naming it, and over a flat list as before. Marketplace and Stellify: the publish step's and the preview's runner handed the map read from the card, asserted on the request sent; Stellify's dist rebuilt and committed.

### 9. Versions

The sdk goes to 0.7.0. Stellify goes to 0.4.0.

### 10. The docs this sub-task updates

`docs/design/orchestrator.md`: the catalog-entitlement paragraph of the AgentsPool section, the failure row for a paint outside the entitlement, the invariants row on the hub checking each paint's catalog. `docs/design/app-install.md`: the entitlement-at-the-hub section, step 5's capabilities example, the refusal row, the dispatch-snapshot bullet. `docs/design/marketplace.md`: the lines on what the smoke test advertises and how the transport sends it. Stellify's README: the clause in the `preview` paragraph on what it advertises and checks. The sdk README: its exports listing. 19.7 checks them against the code with the rest of the phase's records.

### 11. The apps' Stellify pin moves as this sub-task's tail

Once 19.2's merge commit is on `main` and pushed, the seven catalog packages and the scaffolder's templates in `../a2uiverse-apps/` are re-pinned to it, each checked, committed on that repo's `main`.
