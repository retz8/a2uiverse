# Handoff — 21.14 the client on v1.0

## Where it stands

Part one is done on `phase-21/14-client-on-v1-0`, branched off `phase-21/flip` at `33d35677`, in three commits: `022cad3c` (the client's code on v1.0), `2f6344d7` (the proofs), `fcd290ee` (README and design records). The worktree is `.claude/worktrees/21-14-client`.

Part one landed on `phase-21/flip` at `a2b0e59e` and the flip branch is pushed (spec decision 20).

Part one's proofs, decision 22 items 1 to 11:

1. Typecheck, build, ESLint (three Fast Refresh warnings, no errors) and Prettier clean. The client's unit suite: 1,167 passed, 86 skipped, the skips the tests of decision 14.
2. `src/a2a/messageForms.test.ts`: every kind of message the client sends stamped `1.0`, the capabilities under `1.0` alone, held to the schema-form check.
3. `src/canvas/messageStamp.test.ts` (the one test in place of `messageVersion.test.ts`) and the Store's sample cases in `StorePage.test.tsx`.
4. `src/catalogs/catalogFrame.test.tsx` and `host.test.ts`.
5. and 7. `src/catalogs/catalogGate.test.ts` and `src/canvas/rendererFunctions.test.ts`.
6. `src/catalogs/paintBuilds.test.ts`.
8. `src/beats/codeBeats.test.ts`: 223 code-written paints in the shell and basic catalogs, Fieldstone's invalid tree the one listed on purpose.
9. Beats 6, 7, 8, 28, 29, 30, 32 and 33 converted by the converter's write and replayed in `tests/canvas-beats.test.tsx`.
10. The search returns only listed exceptions: the 28 unconverted recordings, the Store captures, `convertedFrom` and stamp build keys, the old app catalog ids (on 21.18's line), and the tests that send other versions on purpose.
11. Through the tunnel, the flip orchestrator on a copy of `main`'s state: "what apps do I have?" answered and drawn; GitHub, on v0.9, failing its slot with "This app is built in an older format A2UIVerse no longer supports.", no Retry.

## What's next

Part two, once the catalogs sub-task 21.18 lands:

1. Rebase the branch onto the flip branch.
2. Convert the other 28 beats with 21.18's maps. Beat 31's shell surface is the one named exception to verdict parity.
3. Migrate the code-written beats and tests that paint in the GitHub, Shop A and Shop B catalogs.
4. Move the registry snapshot's pin, then remove the stand-in and the skips in `apps/client/tests/snapshot.ts` and their callers, so that no test is skipped.
5. Run decision 22's items 12 to 15. Item 14 is the mixed-catalog beat in a browser, with computed styles compared; item 15 is `recorded-beats.spec.ts` against the 36 pictures.

Tick 21.14 only after that.

## Open threads

- The registry snapshot can't be built on the flip branch until Stellify moves in 21.15 (noted on its line).
- The dev server through the tunnel never rendered; `vite build` and `vite preview` on 5173 did.
