# Phase 10 — Vendor catalogs + professional project

Custom catalogs for Gmail, Google Calendar, Linear and CircleCI, as GitHub's is Primer; the README's demos re-recorded over them; and the baseline of a professional project across both repos. The community proposal moves to the end of the ladder, with a v1.0 soft migration before it and the v1.0 migration gated on upstream. Amends SPEC §9.2 and §15.

## Scope

- A custom catalog each for Gmail, Google Calendar, Linear and CircleCI, and each agent repainted in it.
- The README's demos that show a vendor app, re-recorded.
- The professional-project baseline in `a2uiverse` and `a2uiverse-apps`.
- The ladder after Phase 10: the upstream sample agent in the ecosystem run, the v1.0 soft migration, the community proposal, and the gated v1.0 migration.
- SPEC amendments named below.

## Locked decisions

### 1. A professional project, open to feedback

A2UIVerse is a professional project, not done, and takes feedback from any developer interested in it. It carries no open-contribution machinery.

### 2. The community proposal is the last phase

A2UIVerse is not proposed to the A2UI community now. The proposal is Phase 18, the last phase, carrying the one short live demo of independent agents composed into one application, the guide to bringing your own agent, and the proposal itself from the upstream candidates in SPEC's protocol delta register.

### 3. The outside agent composes in the ecosystem run

An A2UI agent built outside A2UIVerse composing as it is belongs to Phase 16: the new app of the ecosystem run is an upstream A2UI sample agent, installed unchanged through the Store.

### 4. The v1.0 migration is gated on upstream's renderers

The migration fires when `@a2ui/react` and `@a2ui/web_core` ship v1.0 support, not when the v1.0 spec goes final. Until then A2UIVerse works on v0.9.1. If it fires before the ladder is done, the migration runs first and the ladder resumes after it.

### 5. v1.0 soft migration before the proposal

Phase 17, the v1.0 soft migration, runs only if the v1.0 migration has not landed by then. A2UIVerse supports both v1.0 and v0.9.1 at its agent-facing edge: a v1.0 agent is accepted beside v0.9.1 ones, v1.0 possibly not fully functioning, as the mark that A2UIVerse plans to migrate to v1.0 once upstream is ready. The delta register and the proposal are written in v1.0's vocabulary.

### 6. The gated migration sits outside the numbered ladder

In `_dev/TODO.md` the v1.0 migration is `## Gated — v1.0 migration`, at the bottom, stating its trigger. When it fires it takes the next free phase number and moves to right after the current phase. No existing phase is renumbered.

### 7. Catalogs for Gmail, Google Calendar, Linear and CircleCI

Those four apps get a new catalog. GitHub stays on Primer. The mock stores are unchanged.

### 8. Each is a custom catalog, as GitHub's is Primer

Each of the four catalogs is its own component vocabulary in its design language, as GitHub's catalog is Primer's, not the basic catalog themed by tokens. Each agent is repainted in its catalog. The mock stores and the scaffolder's `basic` template stay on the themed basic catalog. Whether Gmail and Calendar share one catalog is open (below).

### 9. Very similar to the product, not imitating it

Each catalog is very similar to its vendor's product without imitating it: no exact colours unless the vendor discloses them publicly, no product icons, no logos. Gmail and Calendar are in Material 3's design language. The README states that A2UIVerse is not affiliated with the vendors.

### 10. The README's demos are re-recorded from deterministic mode

Every README image or GIF that shows a vendor app is re-recorded from deterministic-mode runs, and the matching `?beat=` replay is re-recorded with it, so each replay still shows the session in its GIF.

### 11. The professional-project baseline

Both repos carry CONTRIBUTING, CODE_OF_CONDUCT, SECURITY and issue templates. `a2uiverse-apps` gets CI. The platform's `package.json` files carry `license` and `repository`. The tunnel ID, the UMich email and the `/Users/jiohin` path are scrubbed from the current files of both repos.

### 12. The working material stays public

`_dev/`, `.claude/` and the CLAUDE.md files stay tracked in both public repos.

### 13. No tunnel rotation, no history rewrite

The personal material is scrubbed from the current files only. The tunnel is not rotated and git history is not rewritten.

### 14. Feedback goes to the platform repo's Discussions

GitHub Discussions is turned on for `a2uiverse` only; `a2uiverse-apps` points there. Issues stay open on both repos.

### 15. SPEC amendments

§9.2's rule that vendor catalogs are the basic catalog themed by tokens is replaced by decision 8. §15's reused row for the basic catalog as every vendor catalog follows it.

## Invariants

- Composition keeps working over the new catalogs: merges still land, and a merged value still navigates to its element in the vendor's fragment.

## Open items

- Whether Gmail and Calendar share one catalog or get one each — the Gmail and Calendar sub-task's grill.
- What the community proposal phase does with its demo, guide and proposal, and whether the ecosystem run's recording is re-shot after a late migration — Phase 18's grill.
