# Task 13.9 — Design records + READMEs

Spec for sub-task 13.9 of Phase 13 (`_dev/docs/spec/phase-13-marketplace-publish.md`, decision 19): the phase's doc sweep — the marketplace's design record, `app-install.md`'s additions, every README in both repos, and the amendments task 13.8's decisions call for.

## Scope

- `docs/design/marketplace.md`, new: the marketplace over one running example, publish to install.
- `docs/design/app-install.md`: the install from the marketplace by id and the update check, pointing to `marketplace.md` for the rest.
- Every README in both repos, swept for Phase 13; the readability rewrite on the long ones.
- A README convention, written down.
- The amendments 13.8's findings list: decision 12 (an automatic update never carries an app installed from a local pack) on phase decision 16, task 13.5's decision 9 and SPEC §10; decision 17 (an unpublished app id keeps its versions and its last card) on phase decisions 7 and 15, SPEC §9.3 and the marketplace README's `publishers.json`; decision 23 (a publish's previews sign in where each agent says) on task 13.6; decision 26 (a published additive change stays at its catalog id) on 13.8's decision 11; decision 27 (ahead of the Store with a scope added, the slot asks for it) on 13.8's decision 13 and the phase spec's ahead-of-the-Store window; decision 28 (the `difference` operator) on SPEC §5.2's operators; decision 29 (the update check fetches each app's live card) on the phase spec's "the card it fetched at boot" and task 13.5's live-card fetch; decision 30 (a Store flag the live card no longer bears out is reported again) on the phase spec's report; decision 31 (the marketplace logs a flag it clears) on the marketplace README.
- Out: anything a later phase builds; no code.

## Locked decisions

### 1. Every README swept, the seven long ones rewritten

Every README in both repos is swept for Phase 13's content. The seven long ones — the platform's root, `apps/orchestrator`, `apps/client`, `packages/stellify`, `packages/sdk`, and `a2uiverse-apps`' root and `agent-kit` — are rewritten for readability as well.

### 2. A README is a DX product

A README is a doc for a human: concise but understandable and easy to read, a DX product, not a complex dev doc. Its shape: what the package is in one line; a quick start that works in a minute; the commands or the API one line each; the details below in short sections or collapsed; the *why* pointed at the design record, not restated. The convention is one paragraph in CLAUDE.md §3 beside the design-record one, mirrored in `a2uiverse-apps`' CLAUDE.md.

### 3. Shop A is the marketplace record's running example

`docs/design/marketplace.md` carries Shop A through publish to install: the marketplace's own smoke test against the live agent, the major update, the required update, the breaking schema refused. Linear's cases — the publisher-captured preview, the newer build by hand and automatic, the card update, ahead of the Store — appear where the record covers that state.

### 4. Worked directly on `main`

Both repos, no worktree, no plan; `_dev/` and the docs alike.
