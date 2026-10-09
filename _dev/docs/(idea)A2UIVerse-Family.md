# (idea) The A2UIVerse family — the products, read as a startup

Recorded 2026-10-09. A2UIVerse as the name of a family rather than of one app: the canvas shell is its first member. Two customers, five products, one marketplace between them.

User flows, imagined with the whole roadmap built: the design canvas *A2UIVerse User Flows* (https://claude.ai/artifact/3Z5mhd5Xq5bHmYKwZdixkn) — four groups, the person, the vendor's engineer, the vendor's designer and the team in production, each a numbered flow of sketch screens across the canvas shell, Stellify, Spectra and Observatory, with the handoffs between groups.

---

## The family

```
                         ┌─────────────────────────────────────────────────────┐
                         │             A2UI + A2A  (upstream protocols)         │
                         │  catalogs · agent SDKs · renderers · macros (v1.0)   │
                         └───────────▲───────────────▲──────────────▲──────────┘
                                     │               │              │
            VENDOR SIDE  (a2uiverse-apps, one folder per app)       │
            ─────────────────────────┼───────────────┼──────────────┼───────────────
                                     │               │              │
   ┌──────────────────┐   ┌──────────┴──────────┐  ┌─┴────────────────────────────┐
   │  Widget library  │──▶│  Vendor agent       │  │  Vendor catalog (code)        │
   │  (macros, authored│   │  on the Agent Kit   │  │  its design system · Provider │
   │   by designers)   │   │  3 modes · sign-in  │  │  optional: @a2uiverse/sdk     │
   └──────────────────┘   └──────────┬──────────┘  └───────────────┬──────────────┘
                                     │  A2A + A2UI on the wire      │ packed by
                                     │                              ▼
                                     │                     ┌──────────────────┐
                                     │                     │     Stellify     │ build-time only
                                     │                     │  agent → app      │
                                     │                     │  card + artifact  │
                                     │                     └────────┬─────────┘
   ═══════════════════ trust boundary (SPEC §13) ════════════════════╪══════════════
                                     │                              │ install / publish
            PLATFORM  (a2uiverse)    ▼                              ▼
   ┌──────────────────────────────────────────┐      ┌──────────────────────────┐
   │  Orchestrator                            │◀────▶│  Marketplace             │
   │  Router ▪ · Planner ◆ · Synthesizer ◆    │      │  index · publish checks  │
   │  Registry · AuthVault · AgentsPool       │      └──────────────────────────┘
   │  journal (planMs, deadAirMs)             │
   └───────────────────▲──────────────────────┘
                       │ orchestratorApi + A2A relay
   ┌───────────────────┴──────────────────────┐      ┌──────────────────────────┐
   │  Client — the canvas shell               │◀─────│  packages/shell-catalog  │
   │  composition · BindingEvaluator          │      │  Slot · Attribution ·    │
   │  trail · trusted pages (Store, Library)  │      │  DerivedValue · actions  │
   │  renders vendor catalogs in their slots  │      └──────────────────────────┘
   └──────────────────────────────────────────┘      ┌──────────────────────────┐
              both built on ─────────────────────────│  packages/sdk            │
                                                     │  contracts · validator   │
                                                     └──────────────────────────┘

            TOOLS  (depend on A2UI alone; the family name is branding)
            ───────────────────────────────────────────────────────────────────
   ┌──────────────────────────┐   turn record   ┌──────────────────────────┐
   │  Spectra  (DevTool)      │───────────────▶│  Observatory (Monitor)   │
   │  agent-side tap ─────────┼─▶ vendor agent  │  intent×shape · heat ·   │
   │  renderer-side tap ──────┼─▶ any renderer  │  goldens · drift · review│
   │  film strip · 4 panes ·  │  (client, or    │  coverage report ────────┼─▶ Widget library
   │  fixture · replay        │   any A2UI host)│  2nd tenant: orchestrator│   (designers)
   └──────────────────────────┘                 └──────────────────────────┘
```

The vendor side builds an agent on the kit and a catalog in its own design system; Stellify packs the two into an app the platform can install. The platform composes installed apps: the orchestrator plans and synthesizes, the canvas shell renders each vendor's fragment in its own catalog with the shell catalog around them. Spectra taps one agent and one renderer to show a turn; Observatory ingests those records across agents and feeds its coverage report back to the designers who author the widget library. The loop closes on the vendor side, not in the platform.

## Two customers

**The person**, who gets a free app. The Electron app is the browser: orchestrator, canvas shell and marketplace bundled as one install, one marketplace index behind it. Its job is distribution: it is the reason an agent is worth building, because it is where agents are seen and composed. The trail, the authority tile and the store loop make it a daily app.

**The vendor**, who builds an A2UI + A2A agent and might pay. Three products, in the order a vendor meets them:

| Product | Price | Job | Why that price |
| --- | --- | --- | --- |
| **A2UIVerse Stellify** | free | Packs an agent into an app: card plus catalog artifact; runs the checks install and publish run | Every friction here costs the marketplace an app |
| **A2UIVerse Spectra** | free | The DevTool: why did it draw this; fixture and replay; works on any A2UI agent, registered or not | The wedge: a Spectra user already emits the turn record Observatory ingests |
| **A2UIVerse Observatory** | paid, per agent or per turn | The Monitor: validity, latency, coverage, goldens, drift, the designer's review queue | A team running generative UI in production spends on this today in nothing, badly |

**The marketplace** sits between the two customers and is the platform position: free for the person, free to list; a cut, a featured placement or a verified-publisher tier possible later. It works only at scale, so it monetizes last.

## What the dependency rule means commercially

SPEC §13: a vendor's agent depends on the protocols and the agent kit alone; its catalog may take the sdk. Nothing a vendor builds is locked to A2UIVerse. Their agent runs in any A2UI host, their catalog is theirs, Spectra and Observatory work without the marketplace. That is the version of the pitch a vendor can trust, and the risk is its mirror: the hold is the distribution and the data, never the code. The moat is the person's install base and Observatory's record of every turn.

## The cold start

The family is worth nothing until agents exist. Today's five agents are built on other companies' MCP servers: reference apps, not products. The first real vendor is the early game. The Phase 18 proposal is for that, and Spectra exists before it: a vendor who can see their agent will build one, and the platform where it composes with others is then the obvious place to list it.

## Order of appearance

Stellify exists. Spectra starts when the Phase 19 model-trial harness is written as a module rather than a script. Observatory starts at Phase 17, in parallel with the ladder. The Electron shell is Phase 18's milestone; the marketplace index and publish step are Phases 13 to 15.

## Comparable

A browser company that also sells the devtools, which nobody has done, because browsers never had a generation step to watch.

## Related

- `_dev/docs/(idea)Generative-UI-Monitor.md` — A2UIVerse Spectra and Observatory.
- `_dev/docs/(idea)A2UI-Agent-Widget-Layer.md` — the authored widget library and the agent's choose-and-fill inference.
- `_dev/docs/phase-19-model-trial-notes.md` — the model trial, the upstream threads, the A2UI-unique prompts.
- `SPEC.md` §1 and §13 — the differentiator and the repositories' dependency rule.
