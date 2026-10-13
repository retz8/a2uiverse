# Task 14.10 — Dev harness

Sub-task 14.10 of Phase 14 (`_dev/docs/spec/phase-14-shell-trusted-pages.md`, decision 23): the end-to-end coverage of the trusted page — the Store, the App Library and Publish — with the marketplace under the launcher's publish flag, the visual specs, and the registry snapshot answering the page's reads.

## Scope

- The live suite on the marketplace under `--publish`, driving each of the page's flows once end to end.
- The replay suite's visual specs of the page, over a fixed world served with the registry snapshot.
- The Planner's part through recorded beats.
- Out: what decision 23 leaves to the acceptance pass by hand (task 14.11); the READMEs and design records (task 14.12).

## Locked decisions

### 1. Two suites, each with its job

The live suite — a real orchestrator, the live Planner — gains the marketplace and the launcher under `--publish`, and drives the real flows. The replay suite — the built client on the preview server, no orchestrator — carries the visual specs, the registry snapshot growing a stand-in for the page's reads so the Store, the App Library and Publish draw with content.

### 2. One real path per flow live, the variety on the replay suite

The live suite proves each flow once end to end. Every update state's wording, the Update press, the consent card that asks for more, the key account's line, the ahead-of-the-Store notice, and every outcome and refusal are drawn on the replay suite over fixed data. The page opened three ways stays on the replay suite.

### 3. The live roster

GitHub, Gmail and Shop A, published by the dev publisher `a2uiverse-apps` and installed from the marketplace. Shop B's agent runs, neither published nor installed: it is the app the publisher claimed on the page publishes. Shop A carries the Store and the update, Gmail the accounts, Shop B Publish; GitHub keeps the sign-in through the real window.

### 4. The live suite's marketplace and dev publisher are its own

The live suite runs its own marketplace on a scratch state directory and a port of its own, and the launcher keeps that run's dev publisher file in a scratch place, as the agents' sign-in stores already are. The developer's own publisher file and marketplace are never touched; every run starts clean.

### 5. The Store, live

Shop A uninstalled from the App Library; found by search, its publisher's name on the listing and its sample drawn live; the publisher's name followed to that publisher's listings; installed through the consent card; composed in the same session without a reload.

### 6. The update, live, is the quiet one

A newer build of Shop A — the card unchanged — is published behind the page, through Stellify's API with the run's dev publisher token. Opening the App Library runs the check, which installs it itself; the page shows Shop A up to date, and the next canvas loads the new build.

### 7. The accounts, live

On Gmail, the one app whose sign-in window offers two accounts: signed in, renamed, its permissions read, the second account added through the real sign-in window, each signed out.

### 8. Publish, live

Under a name claimed on the page: the claim with its token shown once; sign-out, and sign-in with that token; Shop B's sample captured with Stellify on its demo key, then Shop B published from its packed folders with that preview file and listed; a pack of Shop B's catalog with a component removed refused with the gate's findings; unpublish; sign-out.

### 9. The ahead-of-the-Store notice is not live

Its wording is drawn on the replay suite's Publish listings over fixed data.

### 10. The variant packs are made at run time

Shop A's newer build and Shop B's breaking pack are each copied from the checkout's built catalog package into a scratch folder, changed once — a harmless byte in Shop A's built entry, one component dropped from Shop B's schema — and packed with this repo's Stellify. Nothing is committed; the checkout is never touched.

### 11. One live stack, each story leaving it as found

The existing sign-in spec moves onto the new stack. Each story undoes what it changed — GitHub's and Gmail's accounts signed out, Shop A installed again, the claimed publisher signed out — so no story depends on the order they run in. The stack starts once.

### 12. The live suite asserts no journal lines

The journal is covered by the orchestrator's own tests.

### 13. The Planner through recorded beats

New beats recorded over the deterministic roster with the marketplace up: "is anything out of date?" answered from the installed-apps reader; "how do I publish my app?" with its button; one that opens the App Library on an app. The replay suite plays them back, presses each answer's button and checks it lands on Publish, or on the App Library at that app. The live suite's one Planner run is the compose after Shop A's install.

### 14. One fixed world in the snapshot, writes answered per test

The preview server answers every read the page makes from a stand-in shipped with the registry snapshot, as it answers `/registry`: the snapshot's apps listed in the Store under their publisher with their samples; each installed app in a different update state; GitHub with two accounts and their permissions; Shop B on a key; a publisher signed in, with listings and the ahead-of-the-Store notice. Each write's answer — installed, refused by cause, published, the gate's findings, the token shown once, sign-out's outcome — is served per test.

### 15. Where the world's content comes from

The Store's entries and the installed list are derived by the snapshot's build from the artifacts it packs. The states are written by hand over them. Each app's sample is recorded once from a marketplace under `--publish` on the deterministic roster and committed beside the recorded beats, under the fixture privacy check, and recorded again when the snapshot's pin on the apps repo moves.

### 16. A visual baseline per board

One baseline per board of the UI reference canvas (https://claude.ai/artifact/QSAou36Pu9UztpmT1Cgzpw), light theme. The Store that can't be reached stays as a state of its own, its reads refused in that one test.

### 17. Left to the acceptance pass

The ahead-of-the-Store notice live and one pressable update live, each produced with a card edit as task 13.8 did — task 14.11's, by hand through the tunnel.

## Invariants

- The developer's own publisher file, marketplace and apps checkout are never touched by a run.
- No app is built in this repo; the variant packs are made from the checkout's built output.
