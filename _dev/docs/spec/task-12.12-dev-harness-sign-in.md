# Task 12.12 — The dev harness for sign-in

The part of Phase 12 (`_dev/docs/spec/phase-12-authority-surfaces.md`, decisions 28 and 29) that puts sign-in on the tunnel and signs the tooling in through the real flow: the agents' sign-in pages and the vendors' return addresses on tunnel URLs, the platform's beat recorder and transparency check signed in, and one e2e sign-in through the real popup. It carries part of task-12.5 decision 13's run through the tunnel. Worked in this repo and directly on `../a2uiverse-apps/`.

## Scope

- The kit's public address for the pages the browser opens.
- The launcher giving each agent its public address.
- The vendors' return addresses registered for the tunnel; each vendor README's setup.
- The platform's beat recorder signing in through the real flow, and one beat re-recorded on each of its paths.
- The transparency check's direct side signed in.
- One e2e sign-in through the real popup and tile.
- `_dev/docs/tunnel-environment.md`: the vendor agents' ports, the variable, CircleCI.
- One pass through the tunnel in the browser.
- Out: CircleCI's live sign-in and live vendor recordings through the kit's beat driver (12.13, decision 10); the full acceptance through the tunnel (12.13); the kit's beat driver itself (12.11).

## Locked decisions

### 1. Only the pages the browser opens go on the tunnel

The kit takes a second, public address, used for the sign-in page, the account chooser's form and the finish address the vendor returns to. The card's A2A address, the authorization server metadata, the token endpoint and revocation stay on the agent's local address; RFC 8414 requires only the issuer to match the address its metadata is fetched from (§3.3). The five vendor agents' ports are forwarded and set Public; the mock stores need none, shop-b's key being entered on the orchestrator's page.

### 2. One variable gives the launcher every public address

One environment variable, `A2UIVERSE_PUBLIC_URL`, holds the public address pattern with a slot for the port; the launcher gives each agent it starts its public address from it. Unset, every agent stays on `localhost`. The orchestrator's base URL and the client's orchestrator URL stay configured as they are.

### 3. The vendors' return addresses

GitHub's OAuth App and the Google client each register both the local and the tunnel finish address; both accept several. Each vendor README's setup says so.

### 4. CircleCI on the tunnel

No special handling. CircleCI's self-registration admits only a loopback return address, so its live sign-in runs at the Mac with the variable unset. CircleCI's README and `_dev/docs/tunnel-environment.md` say so in one line each.

### 5. The platform recorder signs in through the real flow

The recorder walks the sign-in as a plain HTTP client: the orchestrator's start route, the non-interactive entry naming a fake account added to the agent's sign-in redirect, back to the vault's callback with the start route's cookie, the attempt polled to its outcome. The start route signs in from a canvas the orchestrator holds, so the recorder first opens one with a question about the platform. Each beat names the fake accounts it signs in as — Gmail's `you` and `personal` where a beat needs two, one account for every other app. An account the orchestrator already holds is left as it is.

### 6. One beat re-recorded on each path

One beat through the running orchestrator, one failure beat and one multi-canvas session beat on orchestrators the recorder starts. The beat specs name sources by account, `<app>.1`. The other beats stay as migrated until a later change needs them.

### 7. The transparency check signs in on its direct side

The check takes its own token straight from each agent through the non-interactive entry, as the same account the hub's slot is signed in as, for the scopes the vault asks at the first sign-in; shop-b is sent its demo key. The vault's file stays the orchestrator's alone. The direct side is sent the request as the hub sent it, the credential guidance included, read from the vendor task's history.

### 8. One sign-in through the real popup in e2e

A second Playwright project runs on the real stack on `localhost`: an orchestrator on a scratch state folder, one deterministic kit agent from `../a2uiverse-apps/` through the launcher, and the client. The test presses Sign in on the tile, takes the popup, presses the kit's account chooser and sees the slot paint in place. The Planner runs live, on a question naming its app. The project runs on demand, outside `pnpm verify`.

### 9. The pass through the tunnel

In the browser through the tunnel: one deterministic sign-in — the tile, the popup reaching the kit's chooser on its tunnel address, the slot painted — and one live GitHub sign-in with its tunnel return registered. The rest of task-12.5 decision 13's run through the tunnel, and the full acceptance, are 12.13's.

### 10. The work at the Mac moves to 12.13

CircleCI's live sign-in with its token on the REST project list (task-12.10 decision 9), and live vendor recordings through the kit's beat driver, whose return is caught on a loopback address (task-12.11 decision 7), go to 12.13 as its part at the Mac.

### 11. Late and repeated requests through the tunnel

A sign-in window that reaches the start route after the client's first poll is still watched: an attempt the orchestrator does not know yet is polled again, and once the orchestrator has answered for it, an unknown attempt ends. A callback arriving again for an attempt that ended — a stalled request the tunnel delivers late, a window reloaded — answers as the attempt ended, exchanging nothing; one without the window's binding is still refused.

### 12. One sub-task in both repos

The kit's public address and the vendor README lines land directly on `../a2uiverse-apps/` `main`; the launcher, the recorder, the transparency check, the e2e and the tunnel environment doc land in this repo.
