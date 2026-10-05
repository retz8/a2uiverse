# Task 12.5 — The orchestrator's AuthVault

The orchestrator's part of Phase 12 (`_dev/docs/spec/phase-12-authority-surfaces.md`, decisions 4–6, 8–18, 20 and 21): the AuthVault as a generic OAuth client and credential store, the sign-in routes on `orchestratorApi`, the card's `security` checked before dispatch, the credential on the wire, both triggers handled, and the slot's authority states. It fills the accounts seam of task 12.4 and signs in against the kit's sign-in of task 12.9 (`_dev/docs/spec/task-12.9-agent-kit-sign-in.md`: a public client, `openid` requested by the vault, the account's `sub` as `login_hint` on escalation, only the missing scopes asked). SPEC §4.5, §8, §9.5, §10, §14.

## Scope

- The OAuth client: discovery, registration, PKCE, the callback, the ID token.
- The vault file: accounts by (app, account), labels, silent refresh, revocation at uninstall.
- The sign-in routes on `orchestratorApi` and their protection; the token page for `http` bearer and `apiKey`.
- Before dispatch, on the wire, and in the task: the card check, the header, 401 and in-task `auth-required`.
- The slot's authority states, the full tile once per session, a needs-sign-in slot in the merge, resume, Not now, add-account's sign-in.
- The page-load session on every client message, in the sdk's contract.
- The journal's sign-in records.
- Out: the popup, its waiting state and its closing (12.8); the Planner's accounts and the add-account plan check (12.6); the credential bar at the paint (12.7); the vendors on the kit's sign-in (12.10).

## Locked decisions

### 1. An `auth-required` naming nothing is a 401

An in-task `auth-required` that names no scheme and no scopes — plain A2A from someone else — is handled exactly as a 401 at dispatch: one silent refresh and one resend, then the slot's authority tile under `again` over the card's own `security`. The agent's words never reach a consent surface. When the card declares no `security`, the slot fails with the failure tile in the agent's words, Retry kept.

### 2. The token page

For `http` bearer and `apiKey`, the page in the popup shows the scheme's `description` as plain text under "From <App>:" — no Markdown or HTML rendered, no address made live — clamped past a few lines with "Show all" opening the rest in place; one "Open <App>'s help page" button for the card's `documentationUrl`, opened in a new tab with no address shown; one "Paste your key" field and "Connect".

### 3. Which registration

A client ID metadata document when the authorization server advertises it and can reach the document — the orchestrator's public address is https, or the server is on localhost; otherwise dynamic registration where advertised, kept in the vault per authorization server and redone once when the server rejects it; with neither, the slot takes the tile under `unsupported`. The return address is the orchestrator's own callback on its public address.

### 4. The schemes the vault signs in with

`oauth2` with an `authorizationCode` flow (metadata from `oauth2MetadataUrl`, otherwise the RFC 8414 well-known address at the authorization address's origin); `openIdConnect` (discovery from `openIdConnectUrl`); `http` with scheme `bearer` and `apiKey` with `in: header`, both through the token page. Any other flow, `http` scheme, `apiKey` location, `mutualTLS`, or an OAuth server allowing neither registration is not supported here. A card is usable when one alternative of its `security` names only supported schemes; the first usable alternative in the card's order is followed, and `unsupported` is drawn only when none is.

### 5. The sign-in routes

- **Start**: the client makes an unguessable attempt id and opens the popup on the start route naming the attempt, the canvas and the source. The orchestrator checks the canvas and the source against the session and that the source's app needs sign-in, refuses a reused attempt, sets an `HttpOnly`, `SameSite=Lax` cookie binding the browser to the attempt, and redirects to the authorization server with `state`, PKCE and a `nonce`, or to the token page. No scope rides the address: the vault takes them from its own state — the first usable requirement, or the kept escalation's missing scopes for that canvas and source.
- **Callback**: `state` names the attempt, one-time, expiring after ten minutes; the cookie must match; the verifier and the `nonce` are the attempt's. The vault exchanges the code, checks the ID token's signature against the server's keys and its issuer, audience and nonce, checks the `login_hint` binding on escalation, stores the account, and shows "You're signed in. You can close this window."
- **Token page**: its form posts to the orchestrator's own origin, carrying the attempt, under the cookie and an `Origin` check.
- **Outcome**: the client polls the attempt, readable only from the client's origins — pending, signed in as a source, failed with a reason, or expired.

That the client cannot see a popup opened with `noopener` close goes to 12.8.

### 6. The session is the page load

The client mints a session id per page load and names it on every message; the orchestrator keeps per session whether the full tile was shown for an app (phase decision 17). The id is a field of the platform's contract in the sdk.

### 7. A request for more access before any paint

An in-task `auth-required` with scopes, on a slot that has painted nothing, turns the slot into the authority tile under `signIn` with only the missing scopes, bound to the account — the quiet line once the full tile was shown this session — and resolves like any needs-sign-in slot. On a slot with a fragment it is the escalation on `Attribution`, the press kept (phase decision 16).

### 8. Refresh

One refresh at a time per account: every dispatch needing it waits on the same refresh and uses its result, the new tokens written to the vault file before the new access token is used. A token with less than a minute left is refreshed. After an unexpected 401: one refresh, shared the same way, and one resend; a second 401 is `again`. A failed refresh keeps the account with its label and marks it to sign in again; every slot for it takes `again`, and signing in again replaces its tokens.

### 9. Accounts signed in with a key

A key already held for the app — matched by its hash — signs in as that account rather than adding one. A 401 marks a key account to sign in again, and its sign-in reopens the token page to replace that account's key, its label and number kept. A request for scopes from an agent whose card offers only keys is invalid.

### 10. Add-account

The start route also takes an app's next account source, `<appId>.<next n>`, with no `login_hint`; the sign-in creates the account, or signs in as one already held by its `sub` or its key. The outcome names the source the sign-in ended as; there is nothing to resume.

### 11. The journal

Sign-in records of facts only: a sign-in started (canvas, source, first / again / escalation / add-account, the scheme's kind, the scope keys asked); its outcome (the source signed in as, new or existing; failed and why; cancelled; expired); refreshes and their outcome; an escalation request (source, missing scope keys, valid or invalid) and Not now; uninstall's revocations per account (revoked, nowhere to revoke, failed). Never journaled or logged: tokens, codes, `state`, verifiers, nonces, pasted keys, the ID token. The callback's query is never logged; a dispatch error keeps the status and the vendor's message, never request headers. The label is the one identity value recorded.

### 12. The label

The ID token's `email`, otherwise `preferred_username`, otherwise `name`; otherwise "<App> account N".

### 13. The proof

Orchestrator tests over a fake authorization server written as a test fixture — metadata, dynamic registration and metadata documents, PKCE, rotating refresh, ID tokens, revocation — and `fakeVendor`: registration chosen per decision 3; the scheme table and the card's order; start, callback and outcome, login CSRF refused (wrong cookie, wrong `state`, a reused attempt), the token page's `Origin` check, no scope taken from the address; the card check painting the tile without a call; the header on the dispatch; 401, one shared refresh, one resend, `again`; concurrent dispatches refreshing once; an in-task request before a paint and after one, undeclared keys failing, one naming nothing as a 401; the full tile once per session, then the quiet line; the merge resolving at once, the column, the home-source collapse; `retry` as resume and `dismiss` as Not now; add-account; accounts by `sub` and by key; labels; uninstall revoking, install-over keeping; the journal and the logs searched for every secret the test issued. The session id in the sdk's contract with its projection and contract test, and a row in SPEC §14's delta register. One run by hand through the tunnel against a scratch agent on the kit's sign-in in deterministic mode: the start address opened in the browser, the chooser, a dispatch carrying the token, an escalation over the kit's action scope, uninstall revoking.

## Invariants

- A credential never reaches the client, the models, a partition, the journal or the logs.
- The scopes and the words of every consent come from the card as installed, never from the agent's message or the request's address.
