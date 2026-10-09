# Task 12.10 — The five vendor agents on the kit's sign-in

The `[apps]` part of Phase 12 (`_dev/docs/spec/phase-12-authority-surfaces.md`, decisions 7, 9, 11, 26 and 27) that puts GitHub, Gmail, Google Calendar, Linear and CircleCI on the kit's sign-in from task 12.9 (`_dev/docs/spec/task-12.9-agent-kit-sign-in.md`): real OAuth with each vendor in live mode, the `.env` tokens gone, the deterministic scope boundary, and a mock store on an `apiKey` scheme. SPEC §8, §9.4, §9.5, §16.

## Scope

- A generic vendor OAuth upstream in the kit, and a small API-key sign-in beside the kit's OAuth sign-in.
- The five vendor agents on the kit's sign-in in every mode: their scopes in customer words, their vendor scopes, their identity, their vendor registration.
- Per-account replacements for what was process-wide: the Calendar pin, CircleCI's project list, Linear's email lookup, Google's application-default login.
- `shop-b` on an `apiKey` scheme.
- Each vendor README's live setup; `shop-b`'s demo key.
- Out: Gmail's second deterministic account (12.11); tunnel URLs, the recording scripts and e2e signed in (12.12); the full live escalation and the regression pass (12.13).

## Locked decisions

### 1. One generic vendor OAuth upstream in the kit

The kit ships a vendor OAuth upstream on the 12.9 upstream seam, built on Authlib's client and configured per vendor: the authorization-code flow with PKCE against the vendor, the vendor client registered by hand or by dynamic registration, the vendor token stored, refreshed before the live toolset uses it, and revoked; a per-vendor "who is this" hook supplies the account's stable id and display claims. A vendor that does not fit implements the seam directly.

### 2. An API-key sign-in in the kit

A second, smaller kind of sign-in: the app declares the header name, the scheme's `description` in its customer's words, and its valid keys, each mapped to an account. The kit writes the card's `apiKey` scheme, answers a request without a valid key with 401, and makes the account available through `current_account()`. No OAuth routes, no ID token, no escalation.

### 3. `shop-b` on the API key

`shop-b` signs in with an API key; its README carries one demo key. `shop-a` stays open, with no sign-in.

### 4. The deterministic scope boundary

Gmail's open-thread action carries it: "Read your email" beyond the first sign-in's "See your inbox", after Google's split between `gmail.metadata` and `gmail.readonly`. In live mode the same scope guards `get_thread` and `get_message`.

### 5. Agent scopes: reads first, writes by escalation

Every vendor's first sign-in grants its reads; its writes are a scope reached by escalation. Gmail also splits its reads (decision 4). Each vendor's words are settled in plain customer language.

### 6. Vendor scopes follow the granted scopes

An agent asks its vendor for what the granted agent scopes need, and for more on escalation where the vendor can split:

| Vendor | First sign-in | On escalation |
| --- | --- | --- |
| GitHub | `repo` `read:org` | — (`repo` already writes) |
| Gmail | `gmail.readonly` | `gmail.modify` |
| Calendar | `calendar.events.readonly` | `calendar.events` |
| Linear | `read` | `write` |
| CircleCI | — | — |

Each also asks for the scopes of its identity lookup (decision 10). GitHub stays an OAuth App.

*Amended by task 12.13 decision 33.* GitHub asks for `notifications` beside `repo` and `read:org`, for both its read and its write scope.

### 7. A dead vendor token ends the account's sign-ins

When the vendor's token cannot be refreshed, or the vendor answers 401, the run fails and the agent ends that account's sign-ins, so the vault's next request is refused, its refresh fails, and the slot asks to sign in again. GitHub's OAuth App tokens are non-expiring.

### 8. Calendar: each account's primary calendar

Each account reads and writes its own primary calendar. `CALENDAR_ID` and the pin go. Development uses a dedicated test Google account whose primary calendar is the demo calendar.

### 9. CircleCI: each account's projects

The agent finds each account's projects through CircleCI's API with that account's token, verified with a real token first. If that fails, the person picks their projects once on the agent's sign-in page after CircleCI's sign-in, kept per account. `CIRCLECI_PROJECTS` goes. Development uses a test CircleCI account that follows the demo project.

### 10. Identity from each vendor's own source

Taken once at sign-in, preferring an ID token where the vendor issues one: GitHub's `/user` and `/user/emails`; Google's ID token (`openid email profile`); Linear's ID token, otherwise its `get_user` for `me`; CircleCI's `/api/v2/me`. Linear's recorder scrubs the email from `current_account()`; its separate lookup and the process-wide value go.

### 11. Google's application-default login goes

Calendar's seed script uses the test account's Google token from the Calendar agent's store. The kit's `google_adc` helper goes. `X-Goog-User-Project` is dropped, verified on the first live call.

### 12. Built after the vault

This spec is written now; 12.5, the AuthVault, is done next; 12.10 is built against it, so `main` never carries agents the orchestrator cannot sign in to. 12.11 can run before 12.5.

### 13. Vendor registration

GitHub's and Google's client ID and secret are the publisher's registration, in each agent's `.env`; Gmail and Calendar share one Google client. Linear and CircleCI register themselves by dynamic registration on first sign-in, kept in the agent's store. The return address registered at the vendor is the agent's own sign-in finish address.

### 14. Google's client stays in Testing

The Google OAuth client stays in Testing status: test users only, and refresh tokens expiring after 7 days, which decision 7 turns into a sign-in again. The Gmail and Calendar READMEs say so; SPEC §16 records it, with publishing needing Google's verification and a security assessment for the restricted Gmail scopes — that claim checked against Google's verification page before it is written.

### 15. The proof

Each vendor's agent tests: the card's scheme and scope words; a fake account signed in through the non-interactive entry, a read answered; a write ending in `auth-required` until escalation; Gmail's open-thread asking "Read your email"; the live toolset built from the account's vendor token; a vendor 401 ending the account's sign-ins. The kit's tests: the vendor OAuth upstream against a fake vendor — authorization, exchange, refresh, revoke, the identity hook, dynamic registration — and the API-key sign-in. `shop-b`'s tests: the demo key in, no key or a wrong key 401, `shop-a` unchanged. One live sign-in and one read per vendor through the vault, by hand, verifying CircleCI's project list and Google's calls without `X-Goog-User-Project` on the way. Each vendor README's live setup rewritten; `shop-b`'s demo key.

## Invariants

- No operator-set value stands in for an account's own data: whatever a signed-in person sees is that account's.
- The vendor's token never leaves the agent.
