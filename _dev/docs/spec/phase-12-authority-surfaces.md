# Phase 12 — Authority surfaces

M8 of SPEC §12, authority surfaces: how an app that needs sign-in gets its credential — the authority tile, the AuthVault, the credential on the wire — the credential components kept off the canvas, and multi-account handling. Amends SPEC axiom 1, §3, §4.2, §4.3, §5.6, §8, §9.5, §10, §16, §17 and the §14 delta register.

## Scope

- The logic behind authority and the minimum UI that proves it — the authority tile — and multi-account handling, exercised.
- The credential on the wire: the header, the two triggers, the hub's check of the card before dispatch, the in-task request naming keys only.
- The AuthVault: a generic OAuth client; storage, refresh, revocation; the third-party schemes supported; the token page the orchestrator serves.
- The surfaces: the authority tile as the consent, sign-in in a browser popup, resume after sign-in, escalation on the attribution row, the quiet line after the first tile, a needs-sign-in slot inside the merge.
- Multi-account: slot naming and the dispatch unit by (app, account), the Planner choosing accounts, the add-account shell action, account labels in attribution.
- The credential bar at the paint, replacing the bar at install.
- `[apps]`: the agent kit's sign-in front door; real OAuth in live mode for all five vendor agents; deterministic sign-in; Gmail's second account; a deterministic scope boundary; a mock store on an `apiKey` scheme.
- Tooling: recordings and e2e signed in through the real flow; tunnel URLs for sign-in.
- SPEC amendments, the delta register, `docs/design/authority.md`.
- Out: signing out of one account, renaming an account, the permissions view and the App Library's "Add account" (Phase 14); the publish smoke test against agents that need sign-in (Phase 13); pre-registered OAuth clients, discovery from a bare 401, mutual TLS (Backlog).

## Locked decisions

### 1. The phase's reach

Phase 12 takes any logic behind authority and the minimum UI that proves it works — the authority tile — and takes multi-account handling. Multi-account is exercised: SPEC §17 no longer lists "multi-account exercised" as out of scope, and §3 no longer says the multi-account scenario is not exercised by the milestone ladder.

### 2. Deterministic first

An LLM understands semantics; it is not an expert system. It is used where meaning is needed, and whatever can be done deterministically is done deterministically first.

### 3. The shell never sees the credential

In SPEC §8's "the shell never sees the credential", the shell means the models — the Planner and the Synthesizer.

### 4. The credential rides the header; two triggers

A credential travels only as an HTTP header on the A2A request, as the card's scheme names it, never inside a message. An agent signals that it needs one in either of two ways, treated alike: HTTP 401 at dispatch, which any standard A2A agent sends, and an in-task `auth-required` carrying the scheme and the missing scopes, for a need that arises after the agent has begun — scope escalation. After consent, the hub sends again only what was blocked, to that slot alone, with the new header.

### 5. The hub checks the card before dispatch

Before every dispatch the hub evaluates the card-level `security` — an OR of ANDs, an empty requirement meaning none is needed — against the AuthVault for that app and account. When every alternative needs a scheme the vault holds nothing for, the slot takes the authority tile at first paint and the agent is not called. Per-skill `security` is not consulted. The agent is called only for what the card cannot predict: an expired or revoked token, scope escalation mid-task.

### 6. An in-task request names keys only

An `auth-required` request names the scheme by its key on the card and the missing scopes by their keys in that scheme's `scopes` map, in the card's own `security` requirement shape as a data part of the status message (task-12.2 decision 12). The words on the consent surface come from the card as installed. A key the installed card does not declare makes the request invalid: it fails like a malformed paint and no consent is shown. A scope the card did not declare needs an install-over.

### 7. Our agents are their own sign-in front door

Each of our agents' cards points its `oauth2` scheme at the agent's own sign-in endpoints, provided by the agent kit: the sign-in page, the token endpoint, refresh, the vault's client registration, authorization server metadata, an ID token, revocation. The agent holds its vendor's token and refreshes it; the publisher's vendor client registration lives with the agent. The vault holds only tokens issued for agents. An agent from someone else is read as its card declares; nothing a2uiverse-specific is asked of it.

### 8. The AuthVault is a generic OAuth client

The vault follows the authorization server the card's scheme names, with the authorization-code flow and PKCE, and registers itself where the server allows it — a client ID metadata document, otherwise dynamic client registration. It carries no per-vendor code. Its entries are keyed (app, account).

### 9. Third-party sign-in supported

OAuth and OpenID Connect against a server that lets the client register itself; and `http` bearer and `apiKey`, entered on a page the orchestrator serves and the browser opens in a popup, showing the scheme's `description` as the vendor's words and the card's `documentationUrl`. A mock store declares an `apiKey` scheme in deterministic mode. Any other declared scheme fills the slot with the authority tile under a "not supported here" cause, offering Manage apps, which opens the App Library; the app stays installed. The how-to for a token lives in the scheme's `description` on the card.

### 10. Where the vault keeps credentials

An owner-only plain-JSON file in the orchestrator's state directory, one entry per (app, account). In the future the AuthVault turns into a local store when A2UIVerse itself becomes an Electron app.

### 11. Expiry

The vault refreshes silently: before a dispatch when the token's known expiry has passed, and once after a 401 it did not predict. Only when the refresh fails does the slot take the authority tile, worded "sign in again". Refreshing the vendor's own token is the agent's.

### 12. Uninstall and install-over

Uninstall deletes the app's accounts from the vault and revokes their tokens at the revocation route the authorization server's metadata advertises, best-effort, not attempted where none is advertised. Install-over keeps the accounts.

### 13. The authority tile is the consent

The tile is deterministic shell UI, visually constant: what is needed, the scopes in the words of the card's `scopes` map — only the missing ones on escalation — one press, and that it opens the app's sign-in in a new window, in plain words with no address shown. There is no consent dialog and no decline button on the tile; the composite does not block, and the rest of the canvas never waits on it.

### 14. Sign-in runs in a browser popup

Sign-in runs in a real browser popup, never in a frame inside the canvas. The popup is opened with `noopener,noreferrer`; its completion reaches the canvas from the orchestrator, never between windows; only https URLs are opened, localhost exempt. While the popup is open the tile says to finish signing in in the window that opened, naming no address, with Cancel; closing the popup puts the tile back as it was.

### 15. Resume after sign-in

When sign-in completes, the client learns the outcome over `orchestratorApi` and sends a Retry-shaped press for the slot whose Sign in was pressed, and only that slot; it re-dispatches and paints in place. Every other slot waiting on that app, on this canvas or another, keeps its tile or line; its press, finding an account in the vault, loads at once with no popup.

### 16. Escalation on the attribution row

Scope escalation inside a fragment appears on the fragment's attribution row as a fixed-width "Needs access" chip beside the arrows, its request on a card floating over the fragment's top — the missing scopes, [Allow] and [Not now] — nothing moving, and the fragment stays on screen. Allow opens the popup, and the press that needed the scope is sent again. Not now dismisses the request and drops that press; the fragment stays as it was.

### 17. The full tile once per app per session

A slot for an app with no account takes the full tile once per app per session. After that, a slot for that app is one quiet line where its fragment would have sat — "<App> · not signed in · Sign in" — with no decline button. The orchestrator remembers it for the session; a reload starts fresh.

### 18. A needs-sign-in slot in the merge

A slot needing sign-in behaves like a failed source, with sign-in as its Retry. It resolves at once — a slot the hub's check filled was never dispatched. Signed in, its source is included in the merge on arrival. An anchored join hypothesis whose home source needs sign-in collapses the merge slot to a line in words with no press; the slot's own Sign in brings it back. A reserved column for that source reads "not signed in". An escalation waiting on Allow counts as quiescent.

### 19. Multi-account: slot naming and the dispatch unit

Slot naming and the dispatch unit are by (app, account). The Planner chooses accounts: the installed-apps platform reader lists each app's accounts by label, never a credential, and §7's fan-out rule applies one level down — a question about state gathers from every account; a command, or an utterance naming an account, goes to that account alone. An action inside a fragment goes to the account that painted it. A match claim's relation joins two different sources, so two accounts of one app can be joined.

### 20. The add-account shell action

The shell's closed action set gains "add an account to <app>", which the Planner may paint as an affordance; it opens the same popup sign-in the authority tile opens.

### 21. Account labels

An account's label comes from the sign-in: the ID token's display claims. Its stable `sub` keeps one account signed in twice as one entry. Where no identity comes back, the label is "<App> account N". Renaming waits for Phase 14's App Library.

### 22. Attribution shows the account

Attribution shows the account's label on every fragment of an app that has more than one account in the vault.

### 23. The credential bar is at the paint

No credential input is painted on the canvas. The hub refuses any painted tree containing a credential input, whatever it is for, by a deterministic check over names and painted values; a paint with one credential field is refused whole. Three layers:

- **Prevent**: vendor requests carry a credential guidance sentence — the canvas shows no password, code or card fields; for anything secret, offer a link to the agent's own page.
- **Repair**: a refused paint is sent back to that agent once, its reason in prose.
- **Fallback**: a slot whose agent does not repair takes a tile in the client's words, with "Continue on <app>" from the card's `provider.url` or `documentationUrl`, and no Retry.

The ways out are the agent's own: a scheme declared on its card for sign-in, a link to its own page through `openUrl` for a secret that is content or a payment. Displaying a secret is not covered by the bar.

### 24. The install-time credential check goes

The credential check leaves the install gate and Stellify; the paint-time check reuses its term list. The shell catalog drops `TextField`'s `obscured` variant. The basic catalog stays as upstream ships it.

### 25. Credentials typed into the utterance

A credential typed into the utterance is the user's own act, recorded as a known consequence in SPEC §16, with no detection.

### 26. Live mode: real OAuth for all five vendors

In live mode each vendor agent's sign-in page runs real OAuth with its vendor — GitHub, Gmail, Google Calendar, Linear, CircleCI. The one-time setup — a GitHub OAuth App, an OAuth client in the Google Cloud project; none for Linear and CircleCI, whose servers let the client register itself — is recorded in each agent's README.

### 27. Deterministic mode

The agent's sign-in page offers fake accounts. Gmail has a second account with its own data; the other agents offer one account. One existing read action carries a scope boundary, so escalation is proven replayably. A live GitHub write run proves escalation against the real vendor.

### 28. Tooling signs in through the real flow

Recordings and e2e sign in through the real flow, driven by a non-interactive entry on the deterministic sign-in page. The e2e suite also drives one sign-in through the real popup and tile.

### 29. The tunnel

In the tunnel environment the sign-in pages, the callbacks and the callbacks registered at the vendors use tunnel URLs.

### 30. Docs

SPEC amendments: axiom 1 (catalog subtraction), §3 (the multi-account scenario exercised), §4.2 (the add-account action), §4.3 (the label from the sign-in), §5.6 (the installed-apps reader lists accounts), §8 (the consent surface, the credential bar at the paint, the schemes supported), §9.5 and §17 (multi-account exercised), §10 (the AuthVault), §16 (credentials in the utterance); the §14 delta register's rows for the auth-required state and the credential bar. `docs/design/authority.md` is the area's record over one running example.

## Invariants

- A credential never reaches the client, the models, a partition, the journal or the logs.
- No credential input is painted on the canvas.
- An agent from someone else is read as its card declares, in standard A2A; nothing a2uiverse-specific is asked of it.

## Open items

- The credential guidance sentence: its wording, and whether it is concatenated onto every vendor request or added by the Planner from the utterance.
- How the token page presents a scheme `description` that is long or written for developers.
- Protection of the sign-in routes on `orchestratorApi`, reachable from the browser without the registry's write token, against forged requests, login CSRF included.
- How Gmail's second account's data is produced; which read action carries the deterministic scope boundary.
- Phase 13: the publish smoke test meets agents that need sign-in.
- Phase 14: the App Library's sign-out per account, renaming, the permissions view, and an "Add account" calling the same flow.
