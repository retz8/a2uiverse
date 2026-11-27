# Task 21.4 — handoff

Spec: `_dev/docs/spec/task-21.4-shell-catalog.md`. Worked on `main`, with 21.5 in the same checkout.

## Where it stands

- **Implementation committed on `main`.** The shell catalog's pins on `@a2ui/react` and `@a2ui/web_core` 0.16.1, peers included; `Button`'s label on `accessibilityRef`; `Slot` and `Attribution` each with a `view` of its own over the binder's props, their surface from `useA2uiSurface()`; `V09_SPEC_FUNCTIONS`; the render test's named-child check; the root README's table, the design record and finding 34.
- **Proofs 1–5 green.** Typecheck, 538 tests, build and lint on the commit's own content, the parity and schema tests unchanged; the named-child check over the whole sweep; the `Button` label test, failing without `accessibilityRef`; the repaint tests of `Slot` and `Attribution` on the binder's props; the design-check page through the tunnel beside `main`'s at `55900a26`, identical across the three columns once animations are held at their first frame.
- **Proof 6 green on the combined tree,** run by the 21.5 session on a throwaway commit of `main`'s working tree with 21.5's changes: `pnpm verify` 28 of 28 tasks, the root script tests, ESLint and Prettier. Two root script tests pass only on a commit: `scripts/no-app-named.test.mjs` reads `git ls-files`, `scripts/stellify-dist.test.mjs` compares Stellify's `dist/` with a commit.
- **On this commit alone the client does not build:** it is on 0.14.0 and takes the shell catalog's 0.16.1 `Catalog`. 21.5's commits clear it.

## Next

Tick 21.4 with 21.5, as both TODO lines say, once 21.5's commits are on `main` and `pnpm verify` is green there.
