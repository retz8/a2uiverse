# Task 13.7 — The kit's preview credential, the card's version, Stellify's pin, and the launcher publishing in live mode

Sub-task 13.7 of Phase 13 (`_dev/docs/spec/phase-13-marketplace-publish.md`, decisions 13 and 17): the agent kit's way for a publisher to obtain the preview credential from their own running agent, the card's version on the kit's app config, Stellify's pin moved on every catalog package, `preview` run on each roster app, and the launcher's `--publish` beside `--mode live`. Decides the phase spec's open item on the kit minting a credential for its own publisher in live mode, and task 13.6's open item on `--publish` beside `--mode live`. Amends phase decisions 13 and 17 and task 13.6's decisions 1 and 8.

## Scope

- The agent kit's command that gives a publisher the preview credential from their running agent, and what it refuses.
- What the kit issues against a live agent, and where a live app's preview is captured from.
- The card's version on the kit's app config.
- Stellify's pin moved on every catalog package and the scaffolder's templates.
- `preview` run on each roster app from its checkout.
- The launcher's `--publish` beside `--mode live`.
- A changed card at a published version across launches.
- Tests, the runs by hand, and the documents of this session.
- Out: the acceptance by hand over every update state (13.8); `docs/design/app-install.md` and `docs/design/marketplace.md` (13.9); composing over real accounts in live mode (Phases 15 and 16).

## Locked decisions

### 1. The kit's preview credential command

One kit module, the same for every app, `a2ui_agent_kit.preview_credential`, run from any app's agent folder with the running agent's address and a fake account. It reads the agent's card, takes the scopes of the card's first `security` alternative, signs in through the kit's non-interactive entry, and prints the access token alone on stdout, every message on stderr, for the shell to capture into `STELLIFY_CREDENTIAL`. It reuses the beat driver's non-interactive sign-in.

### 2. The fake account is required

`--account` is required and the command has no browser path. Without it the command is a usage error pointing to the agent's README for its fake accounts.

### 3. What the command refuses

Three cases, each exiting non-zero with nothing on stdout and one line on stderr saying what to do instead. Read from the card before any sign-in: a card signing in with a pasted key — the key is the credential, `STELLIFY_CREDENTIAL` set to it; a card asking no sign-in — the app is previewed without a credential. From the agent: a live agent refusing the fake account — the agent's own words, and that the app is previewed from its deterministic or stub run.

### 4. Nothing issued against a live agent

The kit issues no credential against a live agent; the non-interactive entry stays refused in live mode. A live app's preview is captured from a deterministic or stub run of the same checkout and published with the live card's address: one card serves every mode, so the preview's version is the live card's. An agent not on the kit is previewed with a credential its publisher brings.

### 5. The card's version on the app config

The kit's app config gains a required `version`, which the card carries in place of the fixed `0.1.0`. Every roster app's config and the scaffolder's templates state `0.1.0`. An app's card version moves through it.

### 6. Stellify's pin

One pin across every catalog package and the scaffolder's two templates, moved to `18a1b9e`, Stellify 0.2.0. Every roster catalog packs to a new artifact id (task 13.4 decision 15).

### 7. Preview run on each app

By hand, from each roster app's checkout: the catalog packed, the agent in deterministic mode, the credential — the kit's command for an app on the kit's sign-in, Shop B's demo key, none for Shop A — and `stellify preview`; every app's paint passes. No package scripts and no committed preview per app.

### 8. The launcher's `--publish` beside `--mode live`

Allowed. Under live mode each app whose card requires sign-in, Shop B included, is previewed from a second instance of the same checkout in deterministic mode, on a free port, with a temporary state directory and no public address, stopped and its state directory removed after the preview; the app is then published against the live agent's card and installed by id. The live agent and its sign-in store are untouched. Outside live mode a launch under `--publish` is unchanged.

### 9. The launcher's own sign-in

The launcher keeps its own non-interactive sign-in and does not call the kit's command; only the address it signs in at changes.

### 10. A changed card at a published version

The marketplace's refusal stands. A kit app's card carries its addresses, so a publish from another public address at the same version is a changed card. The launcher's README section and the tunnel document say to publish with the same `A2UIVERSE_PUBLIC_URL` every time against one marketplace state, and that switching means wiping the marketplace's state or moving each app's `version`.

### 11. Worked on main

No worktree: the kit, the app configs, the scaffolder and the pin on `a2uiverse-apps`'s `main`; the launcher on this repo's `main`; each behind its gates.

### 12. Proof

Automated. The apps repo: the kit's pytest over the command — a token through the non-interactive entry against the kit's test agent, the token alone on stdout, the three refusals — and the card carrying the config's version; the scaffolder's snapshot tests; every app's own tests; each Python suite run apart from `pnpm verify` and reported. This repo: the launcher's `node --test` — `--publish` beside `--mode live` accepted, the deterministic instance's command line, an instance for every sign-in app under live mode and none otherwise, the listing under `--mode live --publish` saying each sign-in app's preview comes from a deterministic instance. By hand: decision 7's run, and one `pnpm dev:all --mode live --publish` against a fresh marketplace — every app published and installed by id, each sign-in app's preview from its deterministic instance, the live agents' sign-in stores untouched.

### 13. Documents

This repo: the Phase 13 spec's decision 13 amended — for an agent on the kit the preview credential comes from the kit's command against a deterministic or stub run, nothing is issued against a live agent, and a live app's preview is captured from a deterministic or stub run of the same checkout; decision 17's amendment updated, the flag allowed beside `--mode live`; its open item on the kit minting a credential in live mode marked decided. Task 13.6's open item marked decided and its decisions 1 and 8 amended. The launcher's header comment and its preview module's comment. The root README's launcher section and the tunnel document. `_dev/TODO.md`: the 13.7 line restated to this spec's scope; the 13.8 line gaining that an app's card version moves through its config's `version`. SPEC.md unchanged; `docs/design/app-install.md` stays 13.9's. The apps repo: the README's section on publishing an app — the steps once and a table of each roster app's id, port, catalog folder and preview credential; the kit's README — the command, its refusals, the config's `version`; the scaffolder's README where it describes the generated config.

## Invariants

- No credential reaches the marketplace.
- A launch's preview leaves the live agent's sign-in store untouched.
