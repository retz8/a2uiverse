# 16.10 — Dev harness

The dev harness on the upstream releases Phase 16 pins: the two end-to-end suites, the snapshot world's Store captures, the launcher and the client's recorded beats. Sub-task 16.10 of Phase 16 (`_dev/docs/spec/phase-16-upstream-upgrade.md`), after 16.6–16.9.

## Scope

- The replay suite and the live suite on the new runtime.
- The client's recorded beats.
- The snapshot world's Store captures, recorded again over the snapshot 16.7 re-points.
- The launcher.
- The transparency check and the fixture privacy check.
- Out: the live run through the tunnel, 16.11's; the READMEs and the design records, 16.12's.

## Locked decisions

### 1. The client's recorded beats are kept as recorded

No recorded beat is re-recorded. Their vendor streams, recorded on the old kit, repeat unchanged components the new kit no longer sends; the repeats stay.

### 2. A recorded build is read against the registry the replay runs over

A build a recorded beat names that the registry it replays over does not hold is taken by the beat replay as the build that registry's table names for the catalog id. Beat 31 and beat 34, which name the shops' builds from before 16.9, draw both shops again, and with them the update tile's beats built on beat 31's canvas. The recordings stay as they are, and the client's runtime is unchanged.

### 3. A screenshot difference is traced before its baseline is taken again

Each difference the upgrade makes in the replay suite is traced to a decision on record before its baseline is taken again — the shops' rows drawn in their accent to task 16.9 decision 1, their ratings in an italic caption to the finding 16.12 carries, the Planner's numbered list drawn as a list to the client's markdown fix on `main` (`60b2cc4`) — and the differences are listed in 16.10's done commit. A difference no decision explains is a finding, fixed where it lives before 16.10 lands (decisions 11 and 12).

### 4. The launcher is checked by a launch

A fresh launch on the new runtime: both tiers in `deterministic` mode under `--publish`, with `--leave-uninstalled` as the live suite and 16.11 use it; every app through the marketplace's publish gate, its hello-fragment smoke test included; the apps not left uninstalled installed. The launcher changes only where the launch fails.

### 5. The Store captures are recorded against that launch

The Store captures are recorded again against decision 4's launch, as task 14.10 decision 15 has it when the snapshot's pin moves, and pass the fixture privacy check.

### 6. Publish's listing test reads its build from the snapshot

Publish's listing test reads Shop A's build from the snapshot's table, as the world does, in place of the artifact id it names.

### 7. The transparency check runs over the launch

The transparency check runs over decision 4's launch. The beat recorder is not run.

### 8. What proves it

- The replay suite green, under decisions 2, 3 and 6.
- Decision 4's launch, every app through the publish gate.
- The Store captures recorded and passing the fixture privacy check.
- The transparency check passing.
- The live suite green.
- The platform's `pnpm verify` green before 16.10 lands.

No pass through the tunnel: the phase's live run is 16.11's.

### 9. Worked on `main`

No worktree branch.

### 10. A note for 16.12

16.12's line names the beat replay reading a recorded build against the registry it replays over.

### 11. The shops' look kept by tokens where a token reaches

In Shop A, Shop B and the basic template, a list sits flush with what is above it, `--a2ui-list-padding` at 0, and an `h3` draws at the size it always has, `--a2ui-font-size-l` at 1.17rem. Shop A's and Shop B's catalogs take a patch version, are re-packed and republished, and the registry snapshot moves to their commit.

### 12. A scoped sheet for what no token reaches

Each themed catalog — Shop A, Shop B and the basic template — carries a scoped sheet again, holding only what no token reaches: a caption at its row's size and upright, and an `h3` with the browser's own space above and below it. Shop A's and Shop B's catalogs at 0.2.2. Amends task 16.9 decision 1. The missing tokens go into the findings file as an upstream request.
