# Task 14.12 — Design records + READMEs

Spec for sub-task 14.12 of Phase 14 (`_dev/docs/spec/phase-14-shell-trusted-pages.md`, decision 24 as amended by task 14.1): `docs/design/trusted-page.md`, the trusted page's record over one running example; the five records that keep a part; every README in both repos; every amendment task 14.11's decisions call for; and the three README items found in task 14.10.

## Scope

- `docs/design/trusted-page.md` over one running example, with captures.
- The other design records: each one's part of the trusted page in brief, linking to `trusted-page.md`; task 14.11's decisions 26–42 carried into every record they change.
- Every README in `a2uiverse` and `a2uiverse-apps`.
- The amendments task 14.11's decisions call for in SPEC.md, the phase spec and the earlier sub-task specs.
- `_dev/TODO.md`'s 14.12 line restated to this scope.

## Locked decisions

### 1. Every one of task 14.11's decisions is carried

Each of task 14.11's decisions 26–42 is checked against SPEC.md, the phase spec, the earlier sub-task specs, every design record and every README, and amended wherever a statement it replaces stands. The write-up's list for 14.12 is the floor. Among what stands beyond it:
- The Store's search: SPEC's marketplace paragraph, `marketplace.md` and the marketplace README on the search answering every app in rank order (decisions 27 and 30).
- Back from an app's view returning to its list: phase-14 decision 11 and SPEC §11 (decision 28). Task 14.6 has no spec; its history rule is amended where it stands, in those two.
- A key account named when it is connected: SPEC's trusted-page paragraph on an account coming back under its number, task 12.5's key-account decision on a key account keeping its label and number, and `authority.md`'s "Shop B account 1" (decision 36).

An amended decision in a spec keeps its text, with an `*Amended by task 14.11 decision N.*` paragraph under it stating the decision as it now stands.

### 2. The running example

Shop B's life on the page, on the deterministic roster:

1. A publisher who is also a user claims a name on Publish.
2. Shop B is published from the page, from its packed folders with its preview file.
3. It is found in the Store under that name, its sample drawn live.
4. It is installed through the consent card saying it connects with a key, and connected through its key page.
5. Its card moves to 0.2.0: Publish shows the ahead-of-the-Store notice, and the App Library says a newer version is on its way from the publisher.
6. 0.2.0 is published from the page, and the card update is taken in the App Library as a new version.
7. It is unpublished, and the App Library says it is no longer in the Store.

### 3. The side cases

Each takes a short section of its own outside the example:
- Gmail's accounts: permissions, rename, sign-out, add account.
- The update states Shop B does not show: the quiet newer build, the major update, the update required, the card update that asks for more.
- The ways in, and Back.
- The page's reads and writes bounded, a write read back.
- The browser writes' origin check.

### 4. A fresh run, with captures

The example is run afresh on the deterministic roster through the tunnel, on a scratch marketplace and orchestrator state; the developer's own state is left as it is. Shop B's card at 0.2.0 is a temporary edit in `a2uiverse-apps`, reverted and never committed. Every id, hash and line in the example is the run's.

Captures are taken through the tunnel with Claude in Chrome: one per step of the example, one of them a GIF, into `docs/images/`. Fake accounts only. The side cases have no captures.

### 5. What `trusted-page.md` carries and what the other records keep

`trusted-page.md` tells the page's whole story. `marketplace.md`, `app-install.md`, `authority.md`, `client.md` and `orchestrator.md` each keep their own part in brief with a link to it. `shell-catalog.md` keeps open Publish at the level of its props.

### 6. The design canvas is left as drawn

*Shell trusted pages — UI reference* is not redrawn for task 14.11's changes.

### 7. Every README, in both repos

Every README in `a2uiverse` and `a2uiverse-apps` is checked against the code as it stands and every stale line fixed. The client README gains the live suite on its own marketplace, `record:store`, and the fixture privacy check over the Store's recordings (found in 14.10).

### 8. A fault found is fixed on the spot

A fault the fresh run or the check against the code finds is fixed on `main` with its test, and added to this spec as a numbered decision with what it replaced. A point asking for something a later phase builds is recorded in that phase's notes in `_dev/TODO.md`.

### 9. Worked on `main`

The work is done directly on `main`, with no worktree; the `a2uiverse-apps` READMEs on that repo's `main`.
