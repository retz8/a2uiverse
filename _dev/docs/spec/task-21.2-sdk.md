# 21.2 — The sdk

The sdk brought onto `@a2ui/web_core` 0.16.1, on the wire as it is: its A2UI validator and its smoke check on the new release, its spec copy at the commit the release was cut from, and the host-module interface at a new version. Sub-task 21.2 of Phase 21 (`_dev/docs/spec/phase-21-v1-0-migration.md`).

## Scope

- The sdk's pin on `@a2ui/web_core`, and the lockfile.
- The sdk's A2UI validator, its findings, its conformance test and its smoke check.
- The spec copy under the sdk and `UPSTREAM.json`.
- The host-module interface: its version, the contract that names it, and the gate at publish, install and load.
- The tests, fixtures and generated files across the platform that pin the old interface or a verdict the new checks changed.
- The documents that state the interface's version or the sdk's pin.
- A finding in `_dev/a2ui-findings.md`, and a note on sub-task 21.10's line in `_dev/TODO.md`.
- Out: the client lending the 0.16.1 runtime and the list of what the host lends written again — sub-task 21.5; Stellify — sub-task 21.3; the catalogs re-packed — sub-task 21.7; the spec copy at v1.0 — sub-task 21.10.

## Locked decisions

### 1. The spec copy is pinned at the commit 0.16.1 was released from

The spec copy moves from `409ded29c` to `7a776e7a4` of 2026-11-23, the commit of `a2ui-project/a2ui` that `@a2ui/web_core` 0.16.1 was released from (upstream pull request 4373), and `UPSTREAM.json` names upstream's v0.9 and v0.9.1 basic catalogs under `catalogs/basic/<version>/`. What upstream changed after the release is not taken, the v0.9.1 capability schemas keyed `v0.9.1` (upstream pull request 3135) among it.

### 2. The stricter verdicts are upstream's

On surfaces before v1.0, `@a2ui/web_core` 0.16.1 refuses what 0.14.0 accepted: a `length` or a `numeric` with no bound, a number outside its `minimum` or `maximum`, a `returnType` that does not match on a nested call, an undeclared function argument (upstream pull request 4187); a `required` property left out where it has a `default` (3862); a component's `metadata` key its schema does not declare (4140); an unrecognized key on a function call object (2927); a root component whose `allowedParents` does not include `"Surface"` (3360). The sdk's validator takes each as upstream's verdict, as task 21.1's decision 2 has the agent kit take `a2ui-core`'s: the sdk carries no relaxation.

### 3. The interface moves in this sub-task

The host-module interface is `0.16.1`, named by the A2UI runtime release it lends (phase decision 8). From this sub-task the platform supplies `0.16.1` alone: an artifact packed for `0.14.0` is refused at publish, at install and at load, and the tests that pin `0.14.0` move to `0.16.1`. Until sub-tasks 21.5 and 21.7 land, a live run on `main` draws no vendor catalog, and until 21.5 the client registers `0.16.1` while it lends 0.14.0's modules. The phase's invariant that `main` is runnable is read, for that window, as the gates green and the platform booting and drawing its own surfaces.

### 4. The interface lends what it lent

Under `0.16.1` the host lends the eight specifiers it lent under `0.14.0` — `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@a2ui/react/v0_9`, `@a2ui/web_core/v0_9`, `@a2ui/web_core/v0_9/basic_catalog` and `zod` — beside `loadStylesheet`. Sub-task 21.10's line in `_dev/TODO.md` takes a note, "From 21.2": the interface of step 1 is named `0.16.1`, and it lends the v0.9 entry points. The note states the two facts and nothing of what sub-task 21.10 does with them.

### 5. The sdk stays 0.11.0

`@a2uiverse/sdk` keeps its version, 0.11.0.

### 6. The documents that state the interface's version or the sdk's pin move here

Every sentence that states the host-module interface's version or the sdk's pin on `@a2ui/web_core` moves in this sub-task, in whichever document it sits: the sdk's README, the root README's table of upstream packages, the app-install design record (`docs/design/app-install.md`), the marketplace design record (`docs/design/marketplace.md`) and Stellify's README. In the root README's table the sdk reads 0.16.1 on a row of its own, the other packages keeping 0.14.0 until their own sub-tasks. A sentence about another package's pin, or about the two local patches, stays with the sub-task that moves it.

### 7. What proves it

1. The sdk's conformance test running `validator_v0_9.yaml`, as synced at decision 1's commit, through the sdk's validator, every case green.
2. The sdk's tests covering the gate refusing an artifact packed for `0.14.0`.
3. The platform's `pnpm verify` green, with the sdk on 0.16.1 and every other package on 0.14.0.
4. Every recorded paint in both repos judged by the sdk's validator on 0.14.0 and on 0.16.1: a paint clean on one is clean on the other, and the same places are flagged, the wording aside. A difference is listed and traced to the entry of `@a2ui/web_core`'s changelog behind it. Run once, and not kept as a test.

### 8. Outside the sdk, tests, fixtures and generated files only

Outside the sdk this sub-task moves what pins the interface's version or a verdict the new checks changed, in tests, fixtures and generated files. A change to another package's source, or to its pin, that the gates turn out to need comes back to the owner before it is made. The list of what the host lends (`hostExports.generated.ts`) stays as generated, from the modules the client lends on 0.14.0, until sub-task 21.5 writes it again.

### 9. A finding is one per prop, in upstream's words

From 0.15.0 the error `@a2ui/web_core` throws for a component carries each failure as a JSON Pointer path, a code and a message, where 0.14.0 carried Zod's own issues. The sdk's validator reads them, so a component's failures are one finding for each prop, at that prop's path, as before. The words are upstream's as they now are, and an unrecognized key's finding points at the key.

### 10. The two SDKs' reading of a link's URL is a finding

`@a2ui/web_core` 0.16.1 passes a string under `format: 'uri'` that is not empty and holds no whitespace, so an `openUrl` whose URL has no scheme is accepted by the sdk's validator, while `a2ui-core` refuses it from 0.7.0 (task 21.1's decision 2). The difference is recorded as a finding in `_dev/a2ui-findings.md`, written once the Python half is read in `a2ui-core` 0.7.1's own source. The sdk changes nothing for it, and SPEC §14's protocol delta register takes no row.

## Invariants

- Beyond decision 2's verdicts, decision 9's words and decision 3's window, no change in behaviour.
- The host lends one runtime at a time.
