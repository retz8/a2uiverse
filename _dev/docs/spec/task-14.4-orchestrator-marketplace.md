# Task 14.4 — Orchestrator, the marketplace's side

Sub-task 14.4 of Phase 14 (`_dev/docs/spec/phase-14-shell-trusted-pages.md`, decisions 3, 5–7, 20 and 21, and its open item): the orchestrator's side of the Store and Publish — the Store's reads relayed and annotated with the local state, the preview's artifact files, the publisher held in the state directory, claim, sign-in and sign-out, publish and unpublish relayed, the marketplace's route that answers whose token it is, and the journal.

## Scope

- The Store's reads relayed from the marketplace — the search, the index, an app's entry, its captured preview — each listing annotated with whether the app is installed and its update state.
- The preview's artifact files relayed.
- The publisher held by the orchestrator: claim, sign-in, sign-out, and the read of who is signed in.
- Publish and unpublish relayed with the bearer.
- One marketplace route answering whose token it is; the launcher's token check moved onto it.
- The journal lines for the publisher's acts.
- Out: the update result as last computed and when the check ran (task 14.5); the client's pages (tasks 14.7 and 14.9).

## Locked decisions

### 1. A listing's annotation

Whether the app is installed is read from the registry at each read. Its update state is the one last computed; the Store's reads never run the update check.

### 2. An install, update or uninstall clears the app's held state

The app's entry is dropped from the update result as last computed, with no check run: its listing reads installed, or not installed, with no update state until the next check. The held result is task 14.5's (found in 14.4).

### 3. The Store's reads answer in three ways

The Store unreachable, not found, or malformed — each an answer of its own. Each relayed entry is checked against the sdk's entry schema: a malformed one is left out of the index and the search and logged, the rest kept; a malformed entry or preview read alone answers malformed.

### 4. One base for the preview's artifact files

An artifact the registry holds is served from the registry; any other is fetched from the marketplace and passed through, never written into the registry. Served as immutable content, as the registry's artifacts are.

### 5. The relayed files are checked as install checks them

The descriptor's bytes hash to the artifact id; each file matches the descriptor's hash for its path. A mismatch is refused, never served.

### 6. The publisher's file

Its own owner-only file in the state directory, written with the protections the vault's accounts have: the name, the token, and the marketplace that issued it. The token goes to that marketplace only.

### 7. The claimed token passes through the browser once

The claim answers with the token once; nothing reads it again. Amends the phase's invariant that the browser holds no secret.

### 8. A claim the orchestrator cannot keep still shows the token

When the publisher's file cannot be written after the marketplace has claimed the name, the claim answers with the token, saying it was not kept here, so the person can save it and sign in.

### 9. The marketplace answers whose token it is

One read route on the marketplace, taking the bearer, answers with its publisher's name. Resolves the phase's open item.

### 10. Sign-in takes the name and the secret, checked at once

The orchestrator asks the marketplace whose token it is before keeping anything: an unknown token, or one whose publisher is not the name given, is refused; with the Store unreachable nothing is kept.

### 11. One publisher at a time

A claim or a sign-in is refused while a publisher is held, a publisher held for another marketplace included. Sign-out is the only way the token is forgotten, and it forgets the file only.

### 12. A publisher held for another marketplace

When the marketplace the orchestrator is configured with is not the one in the file, the publisher reads as held for another Store, by its name alone, and the token is not sent.

### 13. Opening Publish checks the held token

The read of who is signed in asks the marketplace whose token it is: accepted, no longer accepted, or the Store unreachable with the held name shown. A refused token is never deleted.

### 14. Publish's listings are the index filtered on the held name

Filtered in the client, as the Store's listings of one publisher are. No listings route on the orchestrator.

### 15. Publish and unpublish relayed untouched

The page's body is forwarded as it is with the bearer attached, and the marketplace's answer — its findings, or its summary and notes — returned as it is; a refused token is answered as the Store no longer accepting the secret. With no publisher held, both are refused, saying to sign in.

### 16. The write guard as task 14.3 built it

The publisher's writes pass the same guard. The bearer sent to the marketplace is the held token; the incoming request's authorization is never forwarded.

### 17. The journal

One publisher line kind: claim, sign-in — a refused one included — sign-out, publish with the app id and version or the Store's findings, unpublish with the app id; each with its outcome and who made it; never the token.

### 18. The launcher checks the token through the new route

In place of the unpublish of the reserved id.

### 19. Docs

The phase spec: its open item (decision 9), its invariant on the browser's secrets (decision 7), decision 5 (decisions 6, 11 and 12). SPEC §9.3's marketplace bullet (decision 9); SPEC §10's sentences on the publisher and the preview (decisions 5, 6, 8 and 10). Phase 14's 14.5 line (decision 2) and 14.4 line (decision 18) in `_dev/TODO.md`.
