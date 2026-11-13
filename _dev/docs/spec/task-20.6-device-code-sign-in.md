# 20.6 — Device-code sign-in in the vault

Sub-task 20.6 of [Phase 20](phase-20-a2a-1-0.md) in [`_dev/TODO.md`](../../TODO.md). The AuthVault (the orchestrator's credential store) signs in by the OAuth 2.0 device-code flow when an app's card names it. It works under decision 7 of the phase spec (device-code sign-in, signed cards and the extended card) and settles, for device-code sign-in, open item 4 of that spec, the design of each of the three capabilities. After 20.3 (the card), whose decision 18 kept the tile "Signing in to Shop B isn't supported here." for the device-code flow until this sub-task.

These words are used throughout.

1. The device-code flow is the OAuth 2.0 device authorization grant of [RFC 8628](https://www.rfc-editor.org/rfc/rfc8628). The vault asks the app's authorization server for two codes. It keeps the device code. The person gives the user code, a short one, to the server on its verification page. The vault asks the server's token endpoint again and again until the person finishes.
2. A redirect sign-in is the sign-in the vault runs today: OAuth's authorization-code flow, or OpenID Connect, where the app's sign-in page sends the window back to the orchestrator.
3. An attempt is the vault's record of one sign-in in flight.
4. The code page is the orchestrator's page that shows the user code (decision 2).

The sources these decisions rest on:

1. RFC 8628.
2. The [A2A 1.0 specification](https://a2a-protocol.org/v1.0.0/specification/), which defines the flow on a card (`deviceCode`, with `deviceAuthorizationUrl`, `tokenUrl`, `refreshUrl` and `scopes`) and has no sentence on how a client performs it. Its section 7.3 says "The client obtains the necessary credentials through an out-of-band process specific to the required authentication scheme."
3. A2A 0.3, which defines four OAuth flows, the device-code flow not among them.
4. The [authority design record](../../../docs/design/authority.md), for how a sign-in runs today.

## Scope

1. Which alternative of a card's sign-in requirement the vault follows once it signs in by device code.
2. What the person sees: the code page, how it ends, and what stays the same on the canvas.
3. The vault's side of the flow: how long an attempt lives, how the vault asks the token endpoint, how it introduces itself, how it finds the server, and how it names an account.
4. A device-code flow on a card written for A2A 0.3.
5. The other readers of a card's sign-in scheme: Stellify (the platform's pack and publish tool) and the trusted page.
6. What proves the sub-task, the `[apps]` tail, and the documents it changes.
7. Out: whether the agent kit's front door (the OAuth server a kit agent runs for its own sign-in) offers device code, which is 20.9's (the agent kit on A2A 1.0); the hand-written A2A 1.0 agent that signs in by device code (20.10); the acceptance sitting (20.12); how a credential rides on each binding, which decision 9 of the [20.5 task spec](task-20.5-the-bindings.md) settles.

## Locked decisions

### 1. A redirect sign-in goes ahead of device code

A device-code OAuth scheme is a scheme the vault signs in with. Among the usable alternatives of a card's sign-in requirement, the vault follows the first that signs in through a redirect. It follows a device-code alternative only when the card offers no such one. Everything else keeps the card's order, a pasted key or token included.

An OpenID Connect scheme always signs in by redirect: the card names no flow for it.

### 2. The user code is shown on an orchestrator page that stays open

The tile's press opens a window on the orchestrator's own page, the code page, which shows the user code. The app's verification page opens from the code page in a second window. The code page stays open while the person is on the app's page.

The user code is shown on the code page alone. It is not on the canvas and does not reach the client.

### 3. What the code page says

The page shows no address.

1. The heading is "Sign in to Shop B", for a first sign-in, an added account, a request for more access and signing in again alike.
2. Under "Your code" it shows the user code, with a Copy button.
3. The button "Open Shop B's sign-in" opens the app's verification page in a second window, under the popup rule of section 8 of [`SPEC.md`](../../../SPEC.md): `noopener,noreferrer`, https only, localhost exempt.
4. When the server's answer carries `verification_uri_complete`, the address with the code already in it, the button opens that address and the line under it reads "Check that Shop B's page shows this same code." Otherwise the button opens `verification_uri`, the line reads "Shop B's page will ask for this code.", and the person types or pastes the code.
5. After the button is pressed the page shows the spinner line "Waiting for you to finish signing in", and under it "Open Shop B's sign-in again".
6. Reloading the code page shows the same code. The page is readable only by the window that started the attempt.

### 4. How the code page ends

The code page asks the orchestrator how the attempt stands, as the canvas does.

1. Signed in: it becomes today's "You're signed in to Shop B", counts down five seconds and closes.
2. Refused at the app: today's "Sign-in didn't finish".
3. The code expired: "This code has run out", over "Close this window and try signing in again."
4. The code cannot be fetched, the verification address fails the https rule, or the vault has no way to introduce itself to the server (decision 9): today's "This sign-in can't start".

The code page offers no new code. A new code comes from the canvas, through "Open the sign-in again" or the tile, as a new attempt. The app's own window is left to the app.

### 5. The canvas keeps its words

The tile says "Opens Shop B's sign-in in a new window", and the waiting form says "Finish signing in to Shop B in the window that opened.", as for a redirect sign-in.

### 6. The server's clock ends an attempt

A device-code attempt lives as long as the server's answer says its codes do (`expires_in`). The vault keeps asking the token endpoint until the person finishes, the server refuses, or that lifetime ends. The vault adds no limit of its own.

1. The client stops asking about an attempt when the orchestrator says the attempt has ended. Its own limit, the orchestrator's ten minutes and some, goes.
2. "Open the sign-in again" makes a new attempt with a new code. The earlier attempt runs to its own end. Whichever finishes first is the outcome, as today.

### 7. The vault asks the token endpoint as RFC 8628 has it

1. It waits the server's `interval` between asks, or 5 seconds when the server names none.
2. It adds 5 seconds on `slow_down`.
3. It backs off on a connection timeout.
4. Any error other than `authorization_pending` and `slow_down` ends the attempt.
5. It reads the RFC's field names and error codes only. A server's own spelling, such as `verification_url` or `authorization_declined`, gets no special reading.

### 8. One identity

The vault stays one client, public and with no secret. Its client ID metadata document declares the device-code grant beside the two grants it declares today. A dynamic registration names the grants the vault uses that the server's metadata lists. A registration made before this sub-task that lacks the grant is dropped and made again when the server refuses it, as a registration the server has forgotten is today.

### 9. Finding the server

The server's metadata is read from the card's `oauth2MetadataUrl`, otherwise from the well-known address at the origin of the card's device authorization address. The endpoints used are the metadata's. The card's device authorization address is used when the metadata names none.

A server that offers neither a client ID metadata document nor dynamic registration gives the vault no way to introduce itself, and the sign-in cannot start, as today.

### 10. Scopes and the account

1. The scopes asked follow the purpose, as today: a first sign-in or an added account asks the alternative's scopes; a request for more access asks only the missing ones; signing in again asks what the account held and what the card requires. `openid` is added when the server supports it.
2. The ID token's signature, issuer, audience and expiry are checked as today. No `nonce` is sent or checked: the device authorization request has no place for one, and the ID token arrives from the token endpoint, not through the browser.
3. Who signed in is judged as today: one account per identity, a different account refused for more access, and the account re-bound for signing in again.
4. Refresh, revocation, sign-out, uninstall and labels do not change.

### 11. `login_hint` names the account for a bound sign-in

For a request for more access and for signing in again, the vault sends the account's ID-token subject as `login_hint` on the device authorization request, as it does on a redirect sign-in. RFC 8628 defines `client_id` and `scope` for that request and says "The authorization server MUST ignore unrecognized request parameters."

### 12. A device-code flow on a card written for A2A 0.3 is read

The card's one reading takes `flows.deviceCode` from a card written for A2A 0.3, in A2A 1.0's field names, and the vault signs in by it. A 0.3 card that names the authorization-code flow and the device-code flow on one scheme reads with the authorization-code flow, as today.

The reading goes around `@a2a-js/sdk`, whose 0.3 reading fails the whole card when a scheme's only flow is device code. Under decision 9 of the phase spec (the decisions and the agents win over the SDK) it is recorded in [`_dev/a2a-findings.md`](../../a2a-findings.md) and given a Backlog line to drop it at the release that makes it unnecessary.

A second finding is recorded on its own: the SDK fails the whole card for any A2A 0.3 OAuth scheme that holds none of 0.3's four flows.

### 13. The other readers of a card's sign-in scheme follow the vault

1. Stellify's `preview` takes an app that signs in by device code. The publisher's own token rides as a bearer `Authorization` header, as for the other OAuth schemes. Stellify runs no sign-in flow.
2. The trusted page reads a device-code scheme as a sign-in, with its scopes in the card's words, wherever it reads an app's card.

### 14. Stellify's version and the `[apps]` tail

Stellify's version moves. The Stellify pin in `a2uiverse-apps` moves as 20.6's `[apps]` tail, as decision 14 of the [20.4 task spec](task-20.4-a2ui-on-a2a-1-0.md) moved it, and is proven the same way: the install there, `pnpm verify` there, and one `stellify preview` with the pinned build.

### 15. The journal

The `signIn` lines stay as they are. The `started` line also says the sign-in went by device code.

### 16. What proves 20.6

1. `pnpm verify` is green.
2. The fake authorization server of the vault's tests gains the device authorization endpoint and the device-code grant. The vault's tests cover a first sign-in, a refusal, an expired code, the server asking the vault to slow down, a request for more access, signing in again and an added account.
3. One live sitting through the tunnel in the browser, against a scratch agent that is never committed, whose authorization server is built on Authlib's device-grant classes. It is signed in to through the two real windows: a typed code, a code-filled address, a refusal and an expiry.
4. The same sitting includes one redirect sign-in to an existing kit agent, after the vault's client ID metadata document has changed.
5. The `[apps]` tail, as decision 14 has it.

### 17. The documents 20.6 changes

In the same session as the code:

1. The [authority design record](../../../docs/design/authority.md): the device-code flow.
2. The [card design record](../../../docs/design/card.md): its known limit on the device-code flow is removed, and the reading of decision 12 is added.
3. Section 8 (Authority) of SPEC: its Sign-in paragraph, which names the authorization-code flow and PKCE alone.
4. The protocol delta register in section 14 of SPEC: one new row, tagged local convention, for a device-code flow read from a card written for A2A 0.3.
5. `_dev/a2a-findings.md`: the two findings of decision 12.
6. `_dev/TODO.md`: the Backlog line of decision 12.

## Invariants

1. The device code is held by the vault alone, as a token is (section 8 of SPEC). The user code is shown on the code page alone.
2. Words on the screen are for customers: the code page shows no address and names no protocol term (invariant 3 of the phase spec).
3. Every redirect sign-in that works today works after this sub-task.

## Open items

Left to the plan:

1. Stellify's version number, which is the next one when 20.6 lands: 20.5 (the bindings) may move Stellify's build as well.
2. The findings' numbers in `_dev/a2a-findings.md`.
3. The READMEs that name the sign-in schemes the vault and Stellify take.
