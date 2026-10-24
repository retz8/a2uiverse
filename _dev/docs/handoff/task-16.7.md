# Handoff — 16.7, the client on the pinned runtime

## Where it stands

Built short of 16.9 on `phase-16/7-client` (`a0b1831`), cut from `phase-16/6-shell-catalog`, pushed, not merged. 16.7 stays `[WIP]`: 16.6 and 16.7 merge to `main` together once 16.9 has landed (spec decision 4). Worktree kept at `.claude/worktrees/phase-16-7-client`.

Done, per the spec's decisions 1 to 3: the new patch on `@a2ui/react` 0.14.0 (the three quiet stand-ins), upstream's PR #3304 carried as a patch on web_core 0.14.0 with the canvas's processor swapping a second build into its own list, navigation reading each fragment's boundary at the tap, the rest of the move (web_core's basic catalog, `defaultCatalog`, the data model in v0.9's form).

Green on the branch: the client's typecheck; the stand-in tests (red on the unpatched bundle), the two-build tests (red with the swap disabled), the navigation tests (a basic and a React component landed on), all on local catalogs; build, typecheck and tests of every other package (19 tasks); ESLint, Prettier. Through the tunnel, a production build (the dev server stalled at a 504) drew the shell's answer to "What apps do I have?" with no console error.

Red on the branch, as expected: 25 of the client's 73 test files — every one rendering the registry snapshot's vendor catalogs, whose entries, built against 0.10, throw on 0.14.0 (`basicCatalog` no longer in `@a2ui/react`, `Catalog` taking a protocol version).

## What's next

- 16.9 in the apps repo, its own grill and spec.
- Back on `phase-16/7-client`: the snapshot's seven catalog packages and Shop A's second build moved to 16.9's commit (`packages/registry-snapshot/package.json` and the `allowBuilds` lines in `pnpm-workspace.yaml`, per that package's README); the 25 files green; the browser check of spec decision 6 with 16.9's builds in the registry.
- The merge: `pnpm verify` over 16.6 and 16.7, both to `main`, both ticked. 16.7's done commit records spec decision 5's three records beside 16.6's three findings.

## Notes

- Upstream's basic catalog is Lit custom elements, which draw after they connect: a test over them waits (`findBy…`, `waitFor`). Lit's dev build logs "Lit is in dev mode" in Vitest's stderr.
- A build is a catalog object of its own: `resolveCatalog` no longer copies (the decoration did), so two builds made from one catalog object share one entry in `resolvedOf`.
- web_core links copies of a catalog only when its document refers into another catalog's; none of ours do, so a surface's `defaultCatalog` is the build's own object.
