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

Assigned per package as each lands; keep this table current.

| Process | Port | Repo |
|---|---|---|
| client (canvas shell) | — | `a2uiverse` |
| orchestrator | — | `a2uiverse` |
| marketplace | — | `a2uiverse` |
| mock vendor agents | — | `a2uiverse-apps` |
| GitHub agent (first external app) | — | `a2ui-github` |

## Run commands

Added per package as each lands; consult the package `README.md` for the
flags that set its base URL and the client's server URLs.
