# Task 12.9 — The agent kit's sign-in front door

The `[apps]` part of Phase 12 (`_dev/docs/spec/phase-12-authority-surfaces.md`, decisions 4–8, 11, 12, 21, 27 and 28) that makes an agent built on the agent kit its own sign-in front door: the authorization server the AuthVault signs in against, the card's `securitySchemes` and `security`, the agent's token mapped to the account on every request, and the in-task `auth-required`. SPEC §8, §9.5; the `auth-required` shape is task-12.2 decision 12.

## Scope

- The kit's authorization server: the sign-in page, the token endpoint with the code exchange and refresh, PKCE, the vault's client registration, the authorization server metadata, the ID token and its keys, revocation.
- The card's `securitySchemes` and `security`, written by the kit for an app that turns sign-in on.
- The agent's token checked on every A2A request and mapped to the account; 401 at dispatch.
- Scope enforcement per action and per tool, and the in-task `auth-required` naming keys.
- Deterministic fake accounts, the account chooser and the non-interactive entry.
- The kit's own tests, and the kit README's section on turning sign-in on.
- Out: live vendor sign-in, per-account MCP connections and the `.env` tokens gone (12.10); Gmail's second account and its data (12.11); tunnel URLs and the tooling's sign-in (12.12). No vendor app changes in 12.9; the `create-a2ui-agent` templates stay without sign-in.

## Locked decisions

### 1. The agent's token

The agent issues the vault an opaque random token. An owner-only store on the agent's disk maps it to the account, its granted scopes and expiry, and — in live mode — that account's vendor token. Deterministic and live mode use the same store.

### 2. The upstream sign-in seam and the per-request account

The kit's sign-in gets its account through an upstream sign-in seam on the app's config; the kit ships one implementation, the deterministic fake-account chooser. The kit resolves each request's token to its account and makes the account — and, in live mode, its vendor token — available to the executor for that request, and the live-toolset hook moves from built once to built per account. 12.10 plugs in the live vendor sign-in and moves each vendor's MCP connection onto the per-account credential.

### 3. Built on Authlib

The authorization server is Authlib's framework-neutral server core, with a Starlette adapter and storage hooks over the store written in the kit.

### 4. Both registration methods

The kit accepts a client ID metadata document — added in Authlib's client lookup — and dynamic client registration (RFC 7591), the registered clients kept in the store. A client ID URL is https only, localhost exempt.

### 5. Scopes per action, enforced by the kit

The app declares its scopes once, as the card's `scopes` map, in plain customer words. Its config maps action names and tool names to the scopes they need. The kit checks the token's granted scopes — in deterministic mode before the canned answer is served, in LLM mode in the tool wrapper before the tool runs — and on a missing scope ends the run with `auth-required` naming the missing keys.

### 6. `auth-required` ends the run

The run ends at `auth-required`; the agent keeps nothing pending. The hub's resend of the blocked press is a fresh request in the same context. In LLM mode the cut-off run is kept out of the conversation history.

### 7. 401 at dispatch

A request with no token, an unknown, expired or revoked one gets HTTP 401 with `WWW-Authenticate: Bearer error="invalid_token"` (RFC 6750 §3). The card stays publicly readable.

### 8. Lifetimes and refresh

Access tokens live 1 hour and carry `expires_in`. Refresh tokens rotate on every use with no fixed expiry while in use; reuse of an old refresh token ends that sign-in (RFC 9700 §4.14.2). A dev-only setting shortens the access token's lifetime.

### 9. The ID token

`sub` is an opaque id the agent mints per vendor account and keeps in the store, so one account signed in twice gets the same `sub`. The ID token carries `email`, `preferred_username` and `name` when known — from the upstream sign-in seam, or declared by a fake account. It is signed ES256 with a key the agent generates and keeps in the store, published at a JWKS URL the metadata names. `openid` is advertised in the metadata and kept off the card's `scopes` map; the vault (12.5) requests it itself.

### 10. Escalation binds the account and grants the union

`login_hint` carrying the account's `sub`, which the vault (12.5) sends on escalation, binds the sign-in to that account: deterministic mode goes straight to it; in live mode the vendor account that comes back is checked against it, and a different account fails the sign-in with an error back to the vault. The new token grants the union of the scopes the account already granted and the new ones, so the vault asks only for the missing scopes. A sign-in with no `login_hint` — add-account — lets the person choose freely.

### 11. Fake accounts and the deterministic sign-in page

The app's config declares its fake accounts, each an id and its display claims. The account reaches the deterministic answer code. The deterministic sign-in page is an account chooser with no consent of its own, shown even with one account, in plain customer words. In live mode the page sends the person straight to the vendor's sign-in.

### 12. The non-interactive entry

A sign-in parameter naming a fake account, honored in deterministic mode only, skips the chooser and redirects straight to the callback as that account. Live mode refuses it with an error.

### 13. Sign-in is opt-in

An app turns the kit's sign-in on by declaring its scopes, its first-sign-in scopes and its upstream sign-in. The kit then writes one `oauth2` scheme under a fixed key — the authorization-code flow with its sign-in, token and refresh URLs built from the agent's public URL, the `scopes` map, and `oauth2_metadata_url` — writes the card-level `security` as that scheme with the first-sign-in scopes, mounts the sign-in routes and turns the 401 check on. An app without it runs as today. The URLs are https, localhost exempt.

### 14. Revocation

The revocation endpoint (RFC 7009) ends the whole sign-in on any revoked token — access and refresh tokens and everything issued from them. When an account's last sign-in ends, the agent deletes its vendor token and calls the seam's optional revoke hook, which 12.10 fills per vendor. Deterministic mode has no vendor token; only the deletion happens.

### 15. Where the store lives

By default a gitignored state folder in the app's own directory, moved by a startup flag. The file is owner-only (`0600`) and written atomically.

### 16. The `auth-required` message

The status message carries the task-12.2 data part and one short text part the kit writes from the card's words for the missing scopes. Nothing follows it in the run — no A2UI, no answer text.

### 17. The proof

Kit tests over a real server against a test app that turns sign-in on with two fake accounts and a scope boundary on one action and one stub tool, with Authlib's client as the vault: discovery and both registrations, a non-https non-localhost client ID refused; sign-in through the chooser and through the non-interactive entry, PKCE required, exact redirect URI matching (RFC 9700 §4.1.3), the entry refused in live mode; the token in use and 401; the ID token against the JWKS; refresh rotation and reuse; escalation in deterministic and stub mode, the cut-off run absent from history, the `login_hint` binding and the union; revocation and the revoke hook; the store across a restart, its permissions and the state-folder flag; an app without sign-in unchanged. The kit's README gains its section on turning sign-in on.

## Invariants

- The vendor's token never leaves the agent; the vault holds only tokens the agent issued.
- An agent on the kit's sign-in is read as its card declares, in standard OAuth and A2A.

