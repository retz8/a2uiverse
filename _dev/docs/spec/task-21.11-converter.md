# 21.11 — The converter

The tool the recordings of both repos cross to A2UI v1.0 by, proven before any catalog of A2UIVerse's exists at v1.0, with the screen baselines and the validator's verdicts taken from `main` before the flip. Sub-task 21.11 of Phase 21 (`_dev/docs/spec/phase-21-v1-0-migration.md`), under its decision 13.

The upstream check (phase decision 17) read `upstream/main` at `36725eee0` of 2026-11-25 and found no event: `@a2ui/web_core` and `@a2ui/react` are at 0.16.1 on npm, `a2ui-core` at 0.7.1 and `a2ui-agent-sdk` at 0.12.1 on PyPI, and upstream pull requests 4171, 4170 and 3930 are open.

## Scope

- The converter, its tests and the basic catalog's map, on the platform repo's flip branch.
- A dry run of the converter over every recording of both repos.
- One screenshot per recorded client beat, the verdict list and the script that writes it, on `main`.
- The first merge of `main` into `phase-21/flip`.
- One finding in `_dev/a2ui-findings.md`, notes on other sub-tasks' lines in `_dev/TODO.md`, and one Backlog line.
- Out: converting any recording of either repo — the client sub-task 21.14 and the agents sub-task 21.17; the shell catalog's map — the shell catalog sub-task 21.12; each app catalog's map — the catalogs sub-task 21.18; the Store captures; the gitignored `.recordings/` folders; payloads written by code, migrated by hand (phase decision 13); the agents' beats drawn on a screen; whether beat 35 stays — 21.14; taking the finding upstream; the apps repo's flip branch.

## Locked decisions

### 1. 21.11 delivers the tool, and converts nothing

21.11 lands the converter, its tests, the baselines and a dry run. No recording of either repo changes in it. The converting is 21.14's for the client's recordings and 21.17's for the agents' fixtures and recorded beats.

### 2. The dry run reads every recording of both repos and writes nothing

The converter is run over every file of decision 5 in both repos without writing. It reports what it would change and what it could not place: each position a catalog document leaves unsettled, each id renamed, each component and property name the identifier rule refuses, each value that does not fit its position, and each data-model string equal to a renamed id on its surface, which is reported and never rewritten.

### 3. Positions are read from the catalog document

For each surface the converter loads the v0.9.1 catalog document the surface's `createSurface.catalogId` names and reads each component against its declared schema: a property declared `ComponentId` or `ChildList` is a reference to a component, a property declared as a dynamic type takes `@path` and `@call`, and every other property is left as written. The positions of the protocol's own come from the protocol's schemas. Nothing is matched by shape. Where a schema does not settle a position the run stops and names it.

### 4. A refused id's hyphens become underscores

Every hyphen in a component id the identifier rule (UAX #31) refuses becomes an underscore, as upstream's v1 copies of its basic catalog examples have them. An id that conforms is untouched. If the renaming gives two components of one surface the same id, or an id is still refused after it, the run stops and names the id.

### 5. The converter reads a beat file and a bare list of messages

The two shapes cover the recorded beats of the client and of the agents, the agents' deterministic fixtures, the agent kit's test fixtures, the scaffolder's templates, the examples shown to the model and the smoke fixtures. Which of these each later sub-task feeds it is that sub-task's. The Store captures (`apps/client/recordings/store/`) and each agent's gitignored `.recordings/` folder are not read.

### 6. A file converts whole or not at all

A file is written only when every catalog it paints in has a map and a v1.0 catalog document. The stamps `v0.9` and `v0.9.1` both become `1.0`. Outside the paint messages one thing changes: a recorded press's `sourceComponentId`, renamed with its component. App ids, surface ids, action names, data model contents and the merged view's formulas are left as written.

### 7. Per-catalog changes come as a map with a closed vocabulary

Each catalog has one declarative map, written by the sub-task that moves the catalog: the old catalog id and the new one, the component names renamed, the property names renamed, and the component whose `variant` follows the evolution guide's heading rule. The converter applies nothing outside that vocabulary; a change a map cannot say comes back to the owner. 21.11 writes the basic catalog's map. The shell catalog's is 21.12's and each app catalog's is 21.18's.

### 8. A file that paints in an app catalog is converted after 21.18

21.14 and 21.17 each convert the files that paint in an app catalog once 21.18 has landed. 21.14 converts the client's eight beats that paint in the shell catalog alone once 21.12 has landed. The order is a note on the lines of 21.14, 21.17 and 21.18.

### 9. Validity is verdict parity with `main`

Before the flip, today's validator is run from `main` over every recorded surface of both repos, and its verdicts are committed as one list in the platform repo, which names the apps repo commit it read. After conversion a surface accepted before is accepted on v1.0, and a surface refused before is refused on v1.0 for the same component. A value that does not fit its position, as beat 16's `"children": 0`, is left as written. A surface the list shows refused that nobody meant to be invalid is a finding, and the converter does not repair it.

### 10. One screenshot per recorded client beat

21.11 adds a suite that opens each of the client's 36 recorded beats, a chained beat in its chain, waits for it to settle and takes one picture, on the screenshot suite's existing settings. A beat that does not settle to a stable picture comes back to the owner and is not skipped. The pictures stay in the suite after the flip. The agents' recorded beats have no pictures and are held by decision 9 and by each agent's own tests.

### 11. What is taken from `main` lands on `main`

The suite of decision 10 with its 36 pictures, and the verdict script with its list, are committed on `main` with `pnpm verify` and the screenshot suite green. `main` is then merged into `phase-21/flip`. The verdict script reads today's validator and does not cross the flip; its list does.

### 12. The converter is a script of the platform repo

It is TypeScript, on the flip branch, and calls the sdk's v1.0 validator and schema-form check. It is pointed at files by path, in either checkout, and the apps repo gains no dependency. 21.17 commits the apps repo's converted files as that repo's own change. Each old catalog document is read from git, `main` and then the tag of the last v0.9 commit, at the path the catalog's map names.

### 13. The converter is deleted before the flip lands

It lives on the flip branch while the conversions run and is removed before 21.23 merges the flip branch, so `main` never carries it. The removal is a note on 21.23's line. A Backlog line records offering a v0.9 to v1.0 payload converter upstream, where the migration skill's row for this step links the evolution guide and no tool.

### 14. Upstream's example pairs are the converter's answer key

Upstream's basic catalog examples that exist as a v0.9 copy, a v0.9.1 copy and a v1 copy, 43 of each, are converted with the basic catalog's map. All 86 inputs pass the sdk's validator and schema-form check against upstream's v1 basic catalog. The output equals upstream's v1 copy, compared as JSON values, wherever that copy is the mechanical rewrite. Each pair that cannot be made equal is listed with its reason, a change upstream made by hand that the guide does not name; a pair that differs for another reason comes back to the owner and is not listed. Upstream's v0.9 and v0.9.1 examples and basic catalogs are on the flip branch as the converter's test fixtures, copied at `7a776e7a4`, and leave with the converter.

### 15. A converted beat says that it was converted

A converted beat file carries one field on its own envelope naming the version it was converted from. The client's and the agent kit's beat types each gain the optional field. A bare list of messages carries nothing.

### 16. One finding

The v1.0 evolution guide names the identifier rule for catalog entity names only, while the pinned protocol document requires it of a component's `id` and `@a2ui/web_core` 0.16.1 refuses a hyphenated id on a v1.0 surface; upstream's own v0.9 example copies hold 400 ids the rule refuses and its v1 copies none. It is a new finding in `_dev/a2ui-findings.md` with its reproduction on the pinned release.

### 17. Notes from 21.11 go on other sub-tasks' lines

The dry run's results and the decisions that touch another sub-task are notes on its line in `_dev/TODO.md`, with no report document of their own.

1. The shell catalog sub-task 21.12 and the catalogs sub-task 21.18: the map each writes, and what the dry run found each map must rename.
2. The orchestrator sub-task 21.13: converted recordings carry the painter's `attribution-` prefix as `attribution_`.
3. The client sub-task 21.14: decision 8's order; beat 35 a copy of beat 1 once both are stamped `1.0`, whether it stays its own decision.
4. The agents sub-task 21.17: decision 8's order; the converter run from the platform checkout, the converted files its own commit.
5. The dev harness sub-task 21.20: the 36 pictures among the baselines that hold across the flip.
6. The sub-task that lands the flip, 21.23: the converter's removal.

### 18. The work starts on `main` and moves to the flip branch

Decision 11's commits come first, then the merge of `main` into `phase-21/flip`, then the converter in a worktree off the flip branch, merged back into it and pushed. 21.11 writes nothing in the apps repo and does not create its flip branch.

### 19. What proves it

1. `pnpm verify` and the screenshot suite green on `main`, the 93 pictures held and the 36 added.
2. The verdict list committed, each refusal in it either meant or a finding.
3. Decision 14's validity and equality on upstream's pairs, the exceptions listed.
4. A test for each rule: the guide's three exclusions (a `ChildList` template's `path`, `updateDataModel.path`, a `call` that is data), an id renamed with every reference to it, the stop on a collision, the stop on an unsettled position, a value that does not fit left as written.
5. The dry run over both repos, nothing written, its results on the lines of decision 17.
6. The converter's own build, typecheck and tests green on the flip branch, with ESLint and Prettier on what changed.
7. The finding of decision 16 with its reproduction.

## Invariants

- The converter changes only the positions the v1.0 evolution guide names and the component ids the identifier rule refuses, each id with every reference to it (phase decision 13).
- The converter never guesses: what it cannot place stops the run and is named.
- 21.11 changes no recording of either repo.
- `main` is green and runnable throughout.
