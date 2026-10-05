# Task 12.2 — The contract and the shell catalog schema for authority

The schema part of Phase 12 (`_dev/docs/spec/phase-12-authority-surfaces.md`, decisions 4–6, 9, 13–21, 23): the wire shapes and the shell catalog's schema the shell catalog (12.3), the orchestrator (12.4–12.7), the client (12.8) and the agent kit (12.9) build against. SPEC §4.1, §4.3, §8, §9.5, §14. The surfaces' UX is drawn on the design canvas *Authority surfaces — UX candidates* (https://claude.ai/artifact/VsSwaLrgPWJyBiL4zjkJAX).

## Scope

- The sdk's contract: the source id, the presses, the `auth-required` request, relations across sources; the contract renamed and versioned; its projection and contract test.
- The shell catalog's schema: the `Slot`'s authority state and the refused-paint cause, `Attribution`'s source and escalation, the add-account shell function. No drawing — drawing is 12.3's.
- The rename's knock-on edits across the consumers, the recorded beats and the docs.

## Locked decisions

### 1. Two packages, schema only

12.2 writes the sdk's wire shapes and the shell catalog's schema — the `Slot`, `Attribution` and the shell functions, with their types. 12.3 draws them. The `Slot`'s states and causes stay on the `Slot`, beside the failure causes.

### 2. The contract is the platform's one extension, renamed at v0.9

The contract is renamed `a2uiverse`: `a2uiverse.v0.9.json`, `name: "a2uiverse"`, `extensionUri` `https://a2uiverse.dev/ext/a2uiverse/v0.9`. The projection's module, its imports in the orchestrator, the client and the shell catalog, the recorded beats and the docs naming the composition contract move with it.

### 3. The source id is `<appId>.<n>`

A source is one string, `<appId>.<n>`, `n` a short ordinal the vault assigns per app at that account's first sign-in and never reuses. A source with no account — an app whose card needs no sign-in, and `shell` — is the bare app id. The account's label and its `sub` stay in the vault; the id carries neither. Every place a source appears takes it: the stamp's `source`, `Slot.source`, the presses' `sources`, the merged view's source fields, and the surface namespace `<source>:<surfaceId>`.

### 4. A slot whose app has no account yet

A slot for an app that needs sign-in, while the vault holds no account for it, is named for the account its sign-in will create: `<appId>.<next n>`. It keeps that name through sign-in and the resume; every pending slot for that app, on any canvas, carries the same name.

### 5. The `Slot`'s authority state

`state: "authority"`, its own state beside `failed`, with a runtime-painted `authority: {cause, quiet?, scopes?}`. `cause` is `signIn` (no usable account), `again` (the silent refresh failed) or `unsupported` (a scheme the vault cannot do). `quiet` marks the one-line form after the first full tile for that app this session, and is allowed only with `signIn`. `scopes` is required with `signIn`, possibly empty for `http` bearer and `apiKey`, and absent with `again` and `unsupported`. The orchestrator resolves the card's keys into the words of its `scopes` map; the client never reads a card. No domain is carried.

### 6. The waiting state is the client's

The popup's waiting state, with Cancel, is local to the client and not in the schema.

### 7. The refused paint is a failure cause

`failure.cause: "credential"`, with `failure.continueUrl`, allowed only with that cause: the card's `provider.url`, otherwise its `documentationUrl`, https only, localhost exempt. It draws with no Retry. With no usable address, the tile has no button.

### 8. `Attribution` names its source and carries the escalation

`source` replaces `appId`: the slot's source id, which the fragment's history and every press key off. A runtime-painted `escalation: {scopes}`, at least one scope — only the missing ones, in the card's words — is present while a request waits on Allow or Not now. `account` is the label from the sign-in.

### 9. The resume press is `retry`

Sign-in completing sends the existing `retry` for the slot whose Sign in was pressed; escalation's Allow, once signed in, sends `retry` for the slot whose press needed the scope. The orchestrator re-checks the vault and sends again what the slot keeps.

### 10. Not now is `dismiss`

A new operation, `dismiss`, names one source. The orchestrator drops the kept press, repaints `Attribution` without `escalation`, and journals it.

### 11. The add-account shell function

`addAccount`, `args: {app}`, the bare app id. The orchestrator's plan check refuses it for an app that is not installed or whose sign-in A2UIVerse cannot do: a plan finding, sent back to the Planner once.

### 12. The `auth-required` request in A2A's own shape

An agent asking for authority mid-task moves the task to `auth-required` with a data part in its status message: `{security: [{"<scheme key>": ["<scope key>", …]}]}` — the card's own `security` requirement shape, checked by the same evaluator as the card before dispatch. An empty scope list means sign in with that scheme. It is recognized by the task state and the `security` key; no A2UIVerse-specific marker. It lives in the contract as a shape directed agent → orchestrator, described as `paintMeta` is: the contract describes it, the agent kit owns its emission.

### 13. Relations join two different sources

A match claim's relation runs over two refs in two different sources, so two accounts of one app can be joined; a source is never joined to itself.

### 14. The surfaces' UX

Drawn on the design canvas and taken by 12.3 and 12.8:

- The authority tile is T1: the scopes up front under "<App> will be able to", one Sign in, "Opens <App>'s sign-in in a new window".
- No address or host is shown anywhere; the window is named in plain words. The waiting line reads "Waiting for you to finish signing in", with Cancel.
- Escalation is E2: a fixed-width "Needs access" chip on the attribution row beside the arrows, the request on a card floating over the fragment's top — nothing moves.
- A home source that needs sign-in collapses the merge to a line in words with no press; the slot's own Sign in brings the merge back.
- "Not supported here" offers "Manage apps", opening the App Library; the app stays installed.
- The refused paint's tile offers "Continue on <App>", opening the app's website.

## Invariants

- Words on the screen are for customers: no protocol or developer term, no address or host.
- The escalation is deterministic: no model call on the platform's side.
