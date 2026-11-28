# 21.15 — The marketplace and Stellify on v1.0

The marketplace and Stellify moved to A2UI v1.0 alone: a card or a paint in another A2UI version turned away at publish and at Stellify's preview in the publisher's words, the catalog rows and listings the marketplace holds from before the flip, the smoke check on v1.0, and Stellify packing a v1.0 catalog. Sub-task 21.15 of Phase 21 (`_dev/docs/spec/phase-21-v1-0-migration.md`), on the flip branch.

The upstream check (phase decision 17) read `upstream/main` at `36725eee0` of 2026-11-25, the commit the orchestrator sub-task 21.13 and the client sub-task 21.14 read, and found no event: `@a2ui/web_core` and `@a2ui/react` are at 0.16.1 on npm, `a2ui-core` at 0.7.1 and `a2ui-agent-sdk` at 0.12.1 on PyPI, upstream pull requests 4171, 4170, 3930 and 4347 are open, and pull request 4418 is merged and in no release.

## Scope

- The platform repo's flip branch.
- The marketplace's publish gate: the card's A2UI declaration, the entitlement the smoke request advertises, the paint's stamp, coverage by a held catalog row, a new build for a held catalog id.
- The marketplace on state from before the flip: its boot, its listings, its drift check.
- Stellify's preview, on the same card and paint rules, and its reading of a catalog the marketplace holds.
- Stellify's pack: the default place of the catalog schema, the catalog gate, its version and its committed build.
- In the sdk: the sentence of the card read's finding, the sentences of the paint check's finding by stamp, and one finding in the additive-evolution check.
- In `smoke-transport`: one test constant that still names the v0.9 basic catalog id.
- The marketplace's and Stellify's tests, their fake agents and fixtures, and Stellify's `star-catalog` fixture.
- Stellify's README and the passages of the marketplace design record (`docs/design/marketplace.md`) and the app-install design record (`docs/design/app-install.md`) on behaviour this sub-task changes.
- Notes on other sub-tasks' lines in `_dev/TODO.md`.
- Out: the registry snapshot and its pin — part two of the client sub-task 21.14; the refusals at install, their causes and the Store's words for them — the orchestrator sub-task 21.13; the Store's sample of a listing from before the flip — the client sub-task 21.14; the nine app catalogs on v1.0 — the catalogs sub-task 21.18; publishing the fleet again and the live runs — the integration and acceptance sub-task 21.21; SPEC — the records sub-task 21.22; the `card` package.

## Locked decisions

### 1. A card on another A2UI version answers alone

A card that declares A2UI and not v1.0 is refused at publish and at Stellify's preview with its one finding, judged right after the card reads and before the ownership check on its catalog ids. Nothing else is judged and nothing is sent to the agent. A malformed v1.0 declaration, params keyed under a version or params failing the schema, stays a finding collected beside the others, as today.

### 2. The card's finding is one publisher's line, written in the sdk

The sentence is written once, in the sdk's card read, in the pattern of the finding for a card listing no interface the platform speaks: what the card declares, then what A2UIVerse speaks. Publish and preview print it as written, with no prefix, and the registry prints the same line beside its install refusal.

1. Every declared version older than v1.0: `the card declares A2UI v0.8 and v0.9, which A2UIVerse no longer supports: A2UIVerse speaks A2UI v1.0`.
2. Only versions newer than v1.0: `the card declares A2UI v1.1, which is newer than this A2UIVerse supports: A2UIVerse speaks A2UI v1.0`.
3. An older and a newer version, and not v1.0: `the card declares A2UI v0.9 and v1.1, not v1.0: v1.1 is newer than this A2UIVerse supports, and A2UIVerse speaks A2UI v1.0`.

The Publish page keeps its default lead over the finding. No refusal kind is added to the marketplace's answer.

### 3. A paint in another version has a finding by what its stamp reads as

The sdk's paint check judges the stamp first, as task 21.10's decision 8 has it, and writes one finding per stamp that is not `1.0`, the stamp quoted as the agent wrote it. The marketplace and Stellify's preview both print it.

1. A stamp that reads below 1.0: `the answer is stamped A2UI "v0.9", an older version A2UIVerse no longer supports: A2UIVerse reads only what is stamped "1.0"`.
2. A stamp that reads above 1.0: `the answer is stamped A2UI "1.1", a newer version than this A2UIVerse supports: A2UIVerse reads only what is stamped "1.0"`.
3. A stamp that is no version: `the answer is stamped "abc", which is no A2UI version: A2UIVerse reads only what is stamped "1.0"`.

An answer in v0.8, whose messages carry no `version`, stays on the existing finding that the answer paints nothing. A preview file captured before the flip gets no finding of its own: the existing rule on the version a preview was captured at refuses it.

### 4. A held catalog row covers a card only when the platform supplies its host-module interface

At publish, a catalog id the marketplace holds for the publisher counts as covered only when the held build is packed for a host-module interface the platform supplies. A held build packed for another interface is a coverage finding of its own, naming the catalog id, the interface the build is packed for and the one the platform supplies, and saying that no artifact for it was handed. Stellify's preview follows the rule when it resolves a held catalog's schema from the marketplace: such a row is not resolved, and a note says why. Nothing is rewritten or removed at the marketplace's boot.

### 5. A v1.0 artifact for an id held as an older-version catalog has one finding

When the held document of a catalog id is not a v1.0 catalog document and the handed one is, the sdk's additive-evolution check answers with one finding, judged before its walk, and does not walk: the Store holds the catalog id as a catalog for an older A2UI version, and a catalog on v1.0 takes a new catalog id. The marketplace says it at publish and the registry at install.

### 6. Nothing is done to the listings from before the flip

The marketplace boots on its state from before the flip as it is. No file is rewritten, no listing is hidden and no field is added to an index entry; the listings cross by being published again (phase decision 12). The drift check at boot, on a live card that declares A2UI and not v1.0, leaves the listing's flag as it was and says so in the marketplace's log, naming the app and the versions the card declares.

### 7. An agent's paint is held to the validator alone

The smoke check at publish and at preview judges an agent's paint by the sdk's validator and not by the schema-form check (task-21.10 decision 10), so the Store accepts what the canvas draws. Every paint the marketplace's and Stellify's tests author goes through the schema-form check, by the test helper that builds it.

### 8. Stellify's default schema path is `catalogs/v1.0/catalog.json`

The zero-configuration place of the catalog schema is `catalogs/v1.0/catalog.json`, the only default, written from the sdk's A2UI version. A package still on v0.9 reads the refusals that exist: the schema missing at that path, the catalog gate's verdict on a v0.9 document, and the finding for an import the host does not lend. No hint names the old layout.

### 9. Stellify is 0.14.0, consumed from the flip branch

`@a2uiverse/stellify` becomes 0.14.0, and its committed build is rebuilt in the commit that lands the sub-task. The ref the nine catalog packages pin in the catalogs sub-task 21.18 is the commit of `phase-21/flip` where 21.15 lands, after the push. The sdk stays 0.12.0 through decisions 2, 3 and 5. The flip reaches `main` by a true merge, so the pinned commit stays reachable from `main`.

### 10. The `star-catalog` fixture proves the pack

Stellify's `star-catalog` test fixture is migrated by hand to v1.0: the v1.0 entry points, a catalog at `1.0`, its document at `catalogs/v1.0/catalog.json`. It is the proof of a v1.0 pack in this sub-task. The first real catalog is packed in 21.18; a pack that fails there for a reason on Stellify's side comes back to Stellify and moves the ref.

### 11. The registry snapshot is not touched

`packages/registry-snapshot` is left as it is. Once Stellify packs v1.0 only, the snapshot's build refuses the seven catalogs its pin names, and the client's skips stay until 21.18 lands and part two of 21.14 moves the pin.

### 12. Nothing is said about the A2UI version on an account's card

At Stellify's preview, the card an agent serves the publisher's account is not judged by its A2UI declaration, and no note is written about it. The preview goes ahead on the public card's declaration.

### 13. What told versions apart is deleted

In the marketplace and Stellify: the card's declaration per A2UI version, the entitlement per version, the finding for a catalog a card declares for another version only, and the tests of them.

### 14. Behaviour passages change now, the running example when it is real

On the flip branch, with the code, 21.15 rewrites Stellify's README and every passage of the marketplace design record and the app-install design record on behaviour it changes: the smoke request's entitlement as one list, the stamp judged first, the findings of decisions 2, 3 and 5, decision 4's coverage rule, decision 6's log line and decision 8's default path. The values the marketplace design record quotes from Shop A, its catalog id, its artifact hashes, its card, its captured paint and its journal lines, stay as recorded and are captured again after the fleet is published again. SPEC waits for the records sub-task 21.22.

### 15. Notes from 21.15 go on other sub-tasks' lines

1. The client sub-task 21.14: the registry snapshot waits on 21.18's catalogs and on the pin's move, not on Stellify alone.
2. The agent kit sub-task 21.16: Stellify 0.14.0, its ref and its default schema path, for the scaffolder's templates.
3. The catalogs sub-task 21.18: the ref, the default schema path, decision 5's finding for a v1.0 artifact under an old catalog id, and decision 10's rule for a pack that fails.
4. The integration and acceptance sub-task 21.21: the held rows from before the flip cover nothing until the fleet is published again; the sign-in apps' preview files are captured again; Shop A's values in the marketplace design record are captured again; its acceptance list takes a live publish of upstream's Node restaurant finder and a refused publish of upstream's ADK restaurant finder.
5. The records sub-task 21.22: what SPEC §9.1, §9.3 and §10 owe to decisions 1, 4, 5 and 6.
6. The flip-landing sub-task 21.23: decision 9's true merge.

### 16. The work lands on the flip branch

21.15 is worked in a worktree on `phase-21/15-marketplace-and-stellify-on-v1-0` off `phase-21/flip`, merged back into it, and the flip branch is pushed, as task 21.10's decision 22 has step 2.

### 17. What proves it

1. Build, typecheck, tests and lint green for the marketplace, Stellify and the sdk on the flip branch, with ESLint and Prettier on what changed, and Stellify's committed build rebuilt from its source.
2. At publish and at preview: upstream's ADK restaurant finder card, declaring v0.8 and v0.9, refused alone with decision 2's first finding, nothing sent to the agent; a card written by hand declaring only a newer version refused with the second; one declaring an older and a newer version with the third; a malformed v1.0 declaration collected beside other findings; upstream's Node restaurant finder card, with no A2UI entry, published on the basic catalog against a scripted agent.
3. At publish and at preview, against a scripted agent whose card declares v1.0: an answer stamped `v0.9`, one stamped above `1.0` and one whose stamp is no version each refused with its finding of decision 3; an answer in v0.8 refused as painting nothing.
4. A v1.0 card naming a catalog id held at a build packed for `0.16.1`, no artifact handed, refused with decision 4's finding; the same id held at a build packed for `0.16.1-v1.0` covered; Stellify's preview not resolving the first, its note saying why.
5. A v1.0 artifact handed for an id held as an older-version catalog refused with decision 5's one finding and no walk, by the sdk's check, at publish and at the registry's install.
6. An artifact packed for `0.16.1` refused by name at publish and at preview.
7. The marketplace booting on a copy of the dev marketplace's state directory as `main` wrote it, its listings, artifacts and previews unchanged; the drift check logging decision 6's line for a live card declaring only v0.9, its flag left as it was; a live card moved to v1.0 under new catalog ids flagged ahead of the Store.
8. The `star-catalog` fixture packed from `catalogs/v1.0/catalog.json` with no configuration, its descriptor naming `0.16.1-v1.0` and Stellify 0.14.0; a v0.9 catalog document and an import of a v0.9 entry point each refused.
9. Every paint the marketplace's and Stellify's tests author passing the schema-form check.
10. A search of the marketplace, Stellify and `smoke-transport` for `v0.9`, `v0_9`, `v0.9.1` and `a2uiClientCapabilities` returning only listed exceptions: the ADK card fixture and the tests that send another version on purpose.

The proofs use scripted agents and captured cards. No live publish is run in 21.15.

## Invariants

- No code of the marketplace or of Stellify serves both wires.
- No listing, artifact or preview the marketplace holds from before the flip is rewritten at boot.
