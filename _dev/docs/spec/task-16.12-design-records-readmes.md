# Task 16.12 — Design records + READMEs

Spec for sub-task 16.12 of Phase 16 (`_dev/docs/spec/phase-16-upstream-upgrade.md`, decision 9): the design records the phase changes, every README in both repos with the root README stating the upstream versions A2UIVerse uses, the `a2ui-sdk-design` skill, the findings file and the protocol delta register finished against what the upgrade found, and every amendment task 16.11's decisions call for.

## Scope

- The design records the phase changes, checked against the code; the captures the upgrade made stale taken again.
- Every README in `a2uiverse` and `a2uiverse-apps`; the root README stating the upstream versions.
- The `a2ui-sdk-design` skill.
- `_dev/a2ui-findings.md` and SPEC §14's protocol delta register.
- The amendments task 16.11's decisions call for in SPEC.md, the phase spec and the earlier sub-task specs.
- `_dev/TODO.md`'s 16.12 line restated to this scope.

## Locked decisions

### 1. Every record and every README, checked against the code

Every design record the phase changes and every README in `a2uiverse` and `a2uiverse-apps` is checked against the code as it stands and every stale line fixed. `_dev/TODO.md`'s named items for 16.12 are the floor.

### 2. The captures that show a shop list are taken again

The records' captures that show a shop's list — `store-loop.md`'s and `trusted-page.md`'s — are taken again, each row drawn as upstream's button in the shop's accent. The store loop's camera example is run afresh through the tunnel on a scratch marketplace and orchestrator state, by the same steps and ids, fake accounts only; Shop A's 0.2.0 and 0.3.0 cards are a temporary edit in `a2uiverse-apps`, reverted and never committed. The other captures stand.

### 3. The root README states the upstream versions

A short "Built on" block after "How it works": protocol v0.9.1; `@a2ui/react` 0.14.0 and `@a2ui/web_core` 0.14.0; `a2ui-agent-sdk` 0.9.0, `a2ui-core` 0.4.0 and `a2ui-a2a` 0.1.0 under the agent kit in `a2uiverse-apps`; each with the part that uses it. One line says the two npm packages carry local patches, linked to where each is described. "Today's A2UI packages" leaves "Where it's headed".

### 4. Every one of task 16.11's decisions is carried

Task 16.11's decisions 25 to 31 are each checked against SPEC.md, the phase spec, every earlier sub-task spec, every design record and every README, and amended wherever a statement it replaces stands. An amended decision in a spec keeps its text, with an `*Amended by task 16.11 decision N.*` paragraph under it stating the decision as it now stands. Decision 27 amends the phase spec's decision 8.

### 5. The `a2ui-sdk-design` skill follows `upstream/main`

Its sources of truth are those `upstream/main` holds: `sdks_spec.md` in place of the renderer guide upstream removed, the basic catalog by its name, and the basic catalog implementation guide, the custom-functions doc and the v0.9.1 conformance suite added. Two catalog-authoring conventions join its conventions, naming no version: a themed basic catalog carries its look through upstream's tokens, a scoped sheet holding only what no token reaches; no style rule crosses a component's custom-element wrapper. The Authority Rule stays at v0.9.1.

### 6. What the upgrade found, in the findings file and the delta register

Each item 16.12's line names is first reproduced against upstream's 0.14.0 artifacts alone:
- A defect becomes a finding in the file's shape, with a register row tagged *upstream bug report*.
- What no token reaches in upstream's basic catalog — a default button's text in `--a2ui-color-on-secondary`, a caption inside `<em>` with no token for its style or its size, Text zeroing a heading's margin through a private variable, the button setting no font of its own — is one finding, with one register row tagged *upstream candidate*.
- A cost upstream intends, or one that arises from A2UIVerse's own use alone, is a register row naming the local handling, with no finding.
- One that does not reproduce outside A2UIVerse leaves.

The existing findings say what is true against the pinned releases.

### 7. The design canvas is left as drawn

No decision of task 16.11 changes a board of *Store loop — UI reference*.

### 8. A fault found is fixed on the spot

A fault the fresh run or the check against the code finds is fixed on `main` with its test, and added to this spec as a numbered decision with what it replaced. A point asking for something a later phase builds is recorded in that phase's notes in `_dev/TODO.md`.

### 9. Worked on `main`

The work is done directly on `main` in both repos, with no worktree.

### 10. The client's own catalogs say what they are

The comment on the client's own catalogs says they are the shell catalog and upstream's basic catalog, with no Provider. Replaced: "wrapped for navigation like every vendor catalog", standing since task 16.7 removed `decorateCatalog`.
