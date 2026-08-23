# A2UIVerse

> **The application ecosystem for A2UI agents.**

A2UIVerse is an open application ecosystem built on **[A2UI](https://github.com/google/A2UI)** and **[A2A](https://github.com/a2aproject/A2A)**.

A2UI defines how agents describe user interfaces.
**A2UIVerse defines how those interfaces become composable applications.**

## Why A2UIVerse?

**A2UIVerse = A2UI + Universe**

Rather than treating agents as features inside applications, A2UIVerse treats agents as **first-class, composable application primitives**.

It explores what an application ecosystem looks like when AI agents can be packaged, discovered, installed, orchestrated, and composed into interactive experiences.

## Ecosystem

A2UIVerse is designed as an ecosystem of interoperable building blocks rather than a monolithic runtime.

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

A2UIVerse provides a family of composable primitives for agent-native applications.

- **Canvas** — the interactive application surface
- **Store** — discover and install applications
- **Orchestrator** — coordinate and compose multiple agents
- **App** — a portable application bundle built around an agent
- **Runtime** — execute and compose applications

## Repository layout

```
apps/
  client/          canvas shell (Vite + React)
  orchestrator/    A2A agent server
  marketplace/     local index, package hosting, publish
packages/
  sdk/             @a2uiverse/sdk — the app contract vendors depend on; the only published package
  shell-catalog/   the shell's own catalog: schema + React implementation
```

pnpm workspace, Turborepo over it. Each package's README has its commands.

Ports: client `5173` · orchestrator `10001` · marketplace `10002`. Vendor agents (`../a2uiverse-apps`) take `11001+` and are reached by the orchestrator only. Until the GitHub app is copied there (Phase 1), its agent runs by hand from `../a2ui-github` on `11001` — commands in `apps/orchestrator/README.md`.

```
pnpm install                              # fresh clone
pnpm dev                                  # all three processes
pnpm --filter @a2uiverse/<app> dev        # one process in its own terminal
pnpm verify                               # build · typecheck · test · lint · format:check
```

## Status

In development. The design lives in [SPEC.md](SPEC.md).
