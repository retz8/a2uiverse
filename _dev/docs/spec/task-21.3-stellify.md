# 21.3 — Stellify

Stellify brought the rest of the way onto `@a2ui/web_core` and `@a2ui/react` 0.16.1 and the host-module interface `0.16.1`, on the wire as it is: its version, its fixture catalog, its dev dependencies, and a test of its own refusal of another interface. Sub-task 21.3 of Phase 21 (`_dev/docs/spec/phase-21-v1-0-migration.md`).

The upstream check (phase decision 17) read `upstream/main` at `36725eee0` of 2026-11-25 and found no event: `@a2ui/web_core` and `@a2ui/react` are at 0.16.1 on npm, `a2ui-core` at 0.7.1 and `a2ui-agent-sdk` at 0.12.1 on PyPI, and upstream pull requests 4171, 4170 and 3930 are open.

## Scope

- Stellify's version.
- The fixture catalog's peer pins, Stellify's dev dependencies, and the lockfile.
- A test of the pack refusing a host interface the platform does not supply.
- The sentence in the marketplace design record that states Stellify's version.
- Three lines of `_dev/TODO.md`: sub-task 21.3's own, sub-task 21.5's and sub-task 21.7's.
- Out: the sdk's list of the export names the host lends (`hostExports.generated.ts`), written again by sub-task 21.5; the ref the apps' catalogs consume, the nine pins on it and the catalogs re-packed — sub-task 21.7; Stellify packing a v1.0 catalog — sub-task 21.15.

## Locked decisions

### 1. This sub-task names no ref

The ref the apps' catalogs consume is the commit of `main` where sub-task 21.5, the client, lands: the commit that writes the sdk's list of lent export names again from the 0.16.1 modules and rebuilds Stellify's committed build over it. Sub-task 21.3 lands before it and names no ref. The nine pins in the apps repo, the seven catalogs' and the scaffolder's two catalog templates', move once, in sub-task 21.7, which comes after both 21.3 and 21.5.

### 2. Stellify 0.12.0

Stellify's version moves to 0.12.0, the version each artifact it packs names in `packedBy`. Whether it moves again when sub-task 21.5 rebuilds Stellify's committed build is that sub-task's own decision.

### 3. The fixture's peers on 0.16.1, the unused dev dependency removed

The fixture catalog's peer pins on `@a2ui/react` and `@a2ui/web_core` move to 0.16.1 exactly. Stellify's dev dependency on `@a2ui/react`, which nothing in Stellify imports, is removed.

### 4. What proves it

1. Stellify's tests green.
2. The test holding Stellify's runtime dependencies to those of the packages its build inlines, green with the dev dependency gone.
3. Stellify 0.12.0 packed to a tarball, installed outside the workspace with `@a2ui/web_core` 0.16.1 resolved from npm, and `stellify check` run there over the fixture catalog.
4. The platform's `pnpm verify` green.

### 5. Three lines of `_dev/TODO.md`

Sub-task 21.3's line loses the clause on the ref the apps' catalogs consume.

Sub-task 21.5's line takes a note, "From 21.3", stating facts and nothing of what sub-task 21.5 does with them: Stellify is 0.12.0; its check of imported names reads the sdk's list as generated from the 0.14.0 modules; on 0.16.1, `@a2ui/web_core/v0_9` no longer exports `inlinePeerAndLocalRefs` and `linkCatalogs`, and `@a2ui/react/v0_9`, `@a2ui/web_core/v0_9` and `@a2ui/web_core/v0_9/basic_catalog` export 68 names the list does not hold; the commit that writes the list again rebuilds Stellify's committed build; that commit is the ref the apps' catalogs consume.

Sub-task 21.7's line reads "after 21.3 and 21.5; parallel with 21.4, 21.6" and takes a note, "From 21.3": the ref is the commit of `main` where sub-task 21.5 lands.

### 6. One sentence in the marketplace design record

In `docs/design/marketplace.md`, the row for a build packed for another host interface reads "Stellify 0.12.0 packs for `0.16.1`". No other document changes: Stellify's README, the root README's table of upstream packages and SPEC stay as they are.

### 7. A test of the pack refusing another interface

Stellify takes one test: a pack asked for host interface `0.14.0` is refused, with the finding that names the interface the platform supplies.

## Invariants

- No change in Stellify's behaviour beyond `packedBy` naming 0.12.0.
