# A2UIVerse

> **The application ecosystem for A2UI agents.**

A2UIVerse is an open application ecosystem built on **A2UI** and **A2A**.

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

Similar to how AWS provides a family of independent services such as EC2, S3, and Lambda, A2UIVerse provides a family of composable primitives for agent-native applications.

- **Canvas** — the interactive application surface
- **Store** — discover and install applications
- **Orchestrator** — coordinate and compose multiple agents
- **App** — a portable application bundle built around an agent
- **Runtime** — execute and compose applications

A2UI is the protocol. A2UIVerse is the ecosystem built around it.

## Status

In development. The design lives in [SPEC.md](SPEC.md).
