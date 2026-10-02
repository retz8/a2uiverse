# Tunnel environment

Instead of `localhost:<port>`, use the tunnel URL:
`https://<tunnel-id>-<port>.asse.devtunnels.ms`. This applies to every URL the
browser touches — the page address and any server URL the app calls
(orchestrator, marketplace, agents). `<tunnel-id>` is kept in the git-ignored
`CLAUDE.local.md`.

This setup is only for Jioh In (@retz8); it does not apply to anyone else
working with this repo.

## Rules

- **Client:** every server URL the client is configured with must be that
  server's **tunnel URL** — a `localhost` default cannot be reached by the
  remote browser.
- **Any A2A server (orchestrator, vendor agents):** run with its public
  **base URL set to its tunnel URL** so the agent card advertises an endpoint
  the caller can reach. With a `localhost` default the card fetch succeeds but
  the `message/send` POST targets an unreachable host.
- Jioh forwards the ports in play and sets them **Public** manually at the
  start of a session. If you see `Failed to fetch` in the browser (or
  `401`/`404`/`502` at the tunnel), suspect a non-public or unforwarded port
  before debugging the app — ask Jioh to check the port.
- First visit to a tunnel host shows a one-time "you are connecting to a dev
  tunnel" interstitial — click **Continue**.
- Servers must allow `localhost` and `*.devtunnels.ms` in CORS.
- Claude-in-Chrome always drives tunnel URLs, never `localhost` — the
  controlled browser is on the remote side.

## Ports

Platform processes are `1000x`; vendor agents are `11001+` and mock agents `12001+`, one port per app regardless of run mode. Only the platform processes need tunnel rows — the browser talks only to the orchestrator, and the orchestrator reaches vendor agents on `localhost`. A vendor agent is tunnelled only for a direct-vs-hub comparison.

| Process | Port | Tunnel | Repo |
|---|---|---|---|
| client (canvas shell) | 5173 | yes | `a2uiverse` |
| orchestrator | 10001 | yes | `a2uiverse` |
| marketplace | 10002 (reserved) | yes | `a2uiverse` |
| shell-catalog fixture (dev-only) | 5174 | when in use | `a2uiverse` |
| vendor agents | 11001+ | no | `a2uiverse-apps` (table there) |
| mock agents | 12001+ | no | `a2uiverse-apps` (`mocks/`, the launcher's mock tier) |

## Run commands

Three terminals. Vendor agents stay on `localhost`; only the orchestrator
advertises a tunnel URL, and the client reads the orchestrator's tunnel URL
from an uncommitted `apps/client/.env.local`.

```bash
# the apps, installed into the orchestrator once it answers — pick one mode; --only github for one app
pnpm dev:agents --mode deterministic
pnpm dev:agents --mode stub
pnpm dev:agents --mode live

# orchestrator — the card must advertise the tunnel URL
BASE_URL=https://<tunnel-id>-10001.asse.devtunnels.ms pnpm --filter @a2uiverse/orchestrator dev

# client — .env.local: VITE_ORCHESTRATOR_URL=https://<tunnel-id>-10001.asse.devtunnels.ms
pnpm --filter @a2uiverse/client dev
```

The client loads every app's catalog from the orchestrator's registry at runtime, through the tunnel (task 11.5). The tunnel adds its own `Cache-Control: no-cache,no-store` to every response, beside the orchestrator's immutable header on artifact files, so the browser keeps no artifact across reloads there: each reload loads every catalog again. Within a page each loads once.

The orchestrator boots from its registry in `STATE_DIR` alone, empty at first (task 11.4). The launcher installs what it launches (task 11.6): it builds each app's catalog package, packs it with Stellify and installs it through the orchestrator's operation once both answer, then uninstalls the roster apps it did not launch. With the orchestrator in its own terminal as above, `pnpm dev:agents` starts the apps and installs them into it. An app already installed stays installed across restarts; `registry list` shows them:

```bash
pnpm --filter @a2uiverse/orchestrator registry list
```

`--no-install` starts the agents and leaves the registry alone, for installing by hand from each app's card URL and an artifact `stellify pack` wrote:

```bash
pnpm dev:agents --mode deterministic --no-install
pnpm --filter @a2uiverse/orchestrator registry install <app-id> http://localhost:<port>/.well-known/agent-card.json <artifact-dir>
pnpm --filter @a2uiverse/orchestrator registry uninstall <app-id>
```

Most sessions run everything through the launcher instead — `BASE_URL` still comes from the orchestrator's `.env`. The real roster in both modes is an acceptance bed (task 5.7):

```bash
pnpm dev:all --mode deterministic   # github · gmail · calendar · circleci · linear from their fixtures
A2UI_RECORD_DIR=<scratch dir> pnpm dev:all --mode live   # live MCP; the variable arms Gmail's pseudonymizer, needed before any beat is recorded
```

The mock tier (synthesis acceptance) runs in place of the real roster:

```bash
pnpm dev:all --tier mocks              # shop-a 12001 · shop-b 12002, deterministic
pnpm dev:all --tier mocks --mode live  # the same, live
```

The launcher inherits the shell's environment for the agents; `turbo.json` passes `A2UIVERSE_*` and `STATE_DIR` through to the `dev` task, so a `STATE_DIR` set in the shell is the one the orchestrator and the launcher both use.

Browser: `https://<tunnel-id>-5173.asse.devtunnels.ms`. Card check:
`https://<tunnel-id>-10001.asse.devtunnels.ms/.well-known/agent-card.json`.
