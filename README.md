# A2UIVerse

> **The application ecosystem for A2UI agents.**

A2UIVerse is an open application ecosystem built on **[A2UI](https://github.com/google/A2UI)** and **[A2A](https://github.com/a2aproject/A2A)**.

A2UI defines how agents describe user interfaces.
**A2UIVerse defines how those interfaces become composable applications.**

## Why A2UIVerse?

**A2UIVerse = A2UI + Universe**

Rather than treating agents as features inside applications, A2UIVerse treats agents as **first-class, composable application primitives**.

It explores what an application ecosystem looks like when AI agents can be packaged, discovered, installed, orchestrated, and composed into interactive experiences.

## The idea, concretely

Ask one question. Several agents answer at once, each painting its own interface, and you get **one screen** — not three chat replies.

Today that means asking _"what needs my attention this morning?"_ and watching GitHub, Gmail and Google Calendar each fill a slot on the same canvas, each in its own design system, each labelled with who painted it. No agent knows the others exist.

```text
                         A2UIVerse
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
       Canvas                Store           Orchestrator
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                             Apps
                              │
                         A2UI + A2A
```

- **Canvas** — the interactive application surface
- **Store** — discover and install applications
- **Orchestrator** — route the question, plan the layout, compose the answers
- **App** — a portable bundle built around an agent: its A2A server and its UI catalog
- **Runtime** — execute and compose applications

## Getting it running

You need **Node ≥ 22** (Corepack resolves the pinned pnpm) and the sibling [`a2uiverse-apps`](https://github.com/retz8/a2uiverse-apps) repo checked out beside this one.

```bash
pnpm install     # fresh clone
pnpm dev:all     # the three vendor agents, then the platform
```

Open **http://localhost:5173** and press `⌘K`.

`dev:all` starts the agents in **deterministic** mode — canned responses, no API key, no model calls, no vendor quota — so a fresh clone reaches a working composed screen with nothing to configure. It waits for each agent's card before starting the platform, because the orchestrator reads those cards once at boot and an agent that answers late is unroutable for the whole session.

To see real data, run the agents against live models and MCP instead:

```bash
pnpm dev:agents --mode live              # every agent, live
pnpm dev:agents --only gmail --mode live # just one
```

Live mode needs per-agent credentials — each agent's `README` in `a2uiverse-apps` says which, and what it can and cannot do with them.

### Every command

```bash
pnpm dev:all          # agents + platform
pnpm dev              # platform only (client · orchestrator · marketplace)
pnpm dev:agents       # agents only — `--only <ids>` and `--mode deterministic|stub|live`
pnpm dev:client       # one platform process in its own terminal
pnpm dev:orch
pnpm dev:marketplace
pnpm verify           # build · typecheck · test · lint · format:check
```

Ports: client `5173` · orchestrator `10001` · marketplace `10002`. Vendor agents take `11001+` and are reached by the orchestrator only — the canvas talks to nothing else.

## Repository layout

```
apps/
  client/          canvas shell (Vite + React)
  orchestrator/    A2A agent server — routing, planning, composition
  marketplace/     local index, package hosting, publish
packages/
  sdk/             @a2uiverse/sdk — the app contract vendors depend on
  shell-catalog/   the shell's own catalog: schema + React implementation
scripts/           repo tooling (the dev:agents launcher)
```

pnpm workspace with Turborepo over it. Each package's README has its own commands and configuration.

Vendor apps live in the sibling **`a2uiverse-apps`** repo and never depend on this one. Their catalogs are installed here as git dependencies on that repo.

## Status

In development. The design lives in [SPEC.md](SPEC.md).
