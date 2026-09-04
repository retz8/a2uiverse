# Tunnel environment

Instead of `localhost:<port>`, use the tunnel URL:
`https://vnw20xbg-<port>.asse.devtunnels.ms`. This applies to every URL the
browser touches — the page address and any server URL the app calls
(orchestrator, marketplace, agents).

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

Platform processes are `1000x`; vendor agents are `11001+`, one port per app regardless of run mode. Only the platform processes need tunnel rows — the browser talks only to the orchestrator, and the orchestrator reaches vendor agents on `localhost`. A vendor agent is tunnelled only for a direct-vs-hub comparison.

| Process | Port | Tunnel | Repo |
|---|---|---|---|
| client (canvas shell) | 5173 | yes | `a2uiverse` |
| orchestrator | 10001 | yes | `a2uiverse` |
| marketplace | 10002 (reserved) | yes | `a2uiverse` |
| shell-catalog fixture (dev-only) | 5174 | when in use | `a2uiverse` |
| vendor agents | 11001+ | no | `a2uiverse-apps` (table there) |

## Run commands

Three terminals. Vendor agents stay on `localhost`; only the orchestrator
advertises a tunnel URL, and the client reads the orchestrator's tunnel URL
from an uncommitted `apps/client/.env.local`.

```bash
# GitHub agent (port 11001 by default) — pick one mode
cd ../a2uiverse-apps/github/agent && uv run python -m app --mode deterministic
cd ../a2uiverse-apps/github/agent && uv run python -m app --mode stub
cd ../a2uiverse-apps/github/agent && uv run python -m app --mode live

# orchestrator — the card must advertise the tunnel URL
BASE_URL=https://vnw20xbg-10001.asse.devtunnels.ms pnpm --filter @a2uiverse/orchestrator dev

# client — .env.local: VITE_ORCHESTRATOR_URL=https://vnw20xbg-10001.asse.devtunnels.ms
pnpm --filter @a2uiverse/client dev
```

Browser: `https://vnw20xbg-5173.asse.devtunnels.ms`. Card check:
`https://vnw20xbg-10001.asse.devtunnels.ms/.well-known/agent-card.json`.
