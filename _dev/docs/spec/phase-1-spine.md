# Phase 1 — Spine

Client ↔ orchestrator ↔ one vendor agent, end to end (SPEC §12, M0). Proves hub-and-spoke, canvas shell reuse, the orchestrator as an A2A agent server, the hardcoded registry, and the intent journal. Parent: `_dev/TODO.md` Phase 1.

## Scope

- The canvas shell ported from `a2ui-github` into `apps/client`.
- `apps/orchestrator` as an A2A agent server relaying to one vendor agent.
- The GitHub agent is the Phase 1 vendor, run from `a2ui-github` unchanged; copied into `a2uiverse-apps/github/` at the end of the phase.
- Doc amendments to SPEC.md, `_dev/TODO.md`, tunnel docs, and `a2uiverse-apps` docs that this grill produced.
- Not in scope: a mock vendor agent template, Router, Planner, UIComposer, `packages/shell-catalog`, `packages/sdk`, orchestrator model calls.

## Locked decisions

### 1. Vendor roster anchors on S1 with real MCP data

Vendor agents are mock *catalogs* with *real data*: every vendor agent is backed by that vendor's official, publicly available MCP server. Selection criterion #1 is "has an official public MCP server", not "has a public component library". The roster is anchored on S1 temporal merge: **GitHub · Gmail · Google Calendar** (Google Workspace Developer Preview is free at this volume). Developer-tool vendors (Linear, Jira, …) are the per-vendor fallback and the later S3 expansion.

### 2. Vendor catalogs are the basic catalog plus a product theme

Vendor catalogs use the A2UI team's basic catalog (`@a2ui/react` `basicCatalog`) themed through its `--a2ui-*` tokens to mimic each vendor's real product. No custom component mapping work for vendors. The exception is GitHub, whose catalog is Primer (`primer-a2ui-adapter`) — GitHub's real design system — permanently.

### 3. Phase 1 vendor is `a2ui-github`, unchanged, copied at the end

Phase 1 runs `a2ui-github`'s agent from its own repo, unchanged. `a2ui-github` is out of bounds for edits; anything the orchestrator needs is handled on the orchestrator side. As the phase's last sub-task (`[apps]`), the GitHub app is copied into `a2uiverse-apps/github/` (agent · `github-catalog` · manifest placeholder), both agent packages kept as-is, the catalog id fixed to a stable value, `github-catalog` published, and the client switched to the published package.

### 4. No internal agents; "first external app" wording removed

Every app in `a2uiverse-apps` is an external app. There are no internal agents; the ecosystem and its external agents are built as a whole. The "first external app" wording leaves SPEC and TODO.

### 5. Roadmap amendment

Phase 2 builds basic Router, Planner, and AgentsPool fan-out over three agents: GitHub (copied), Gmail, Google Calendar. A new phase between Phase 2 and Phase 3 builds the **agent building kit**: extraction of shared vendor-agent logic across the three into a published A2UI+A2A agent SDK/CLI in `a2uiverse-apps`. The mock vendor agent template is Phase 2's scope. Later phases renumber. Consequence recorded: the kit becomes a second dependency for vendors besides `@a2uiverse/sdk`; the dependency rule is amended at the kit phase.

### 6. Orchestrator in M0: Registry · AgentsPool · IntentJournal, no model call

The orchestrator makes no model call. Real code exists for the Registry (one hardcoded entry), the AgentsPool (single dispatch, streaming relay), and the IntentJournal. No Router, no Planner, not even stubs. The one ◆ of M0 is the vendor agent's.

### 7. Registry: one bundle record, two projections, orchestrator-owned

A registry entry is already the bundle (SPEC §9.1): app id, display name, agent URL, auth scheme, catalogId, catalog package reference. The record is defined once, in the orchestrator, and moves to `sdk` at M7. The Registry is **the orchestrator's local state, owned and written only by the orchestrator** — a hardcoded module in Phases 1–6, a directory on disk from M7, the Electron app's userData directory later. Install is an orchestrator operation; the Store page is only its UI. The client holds the second projection, a `catalogId → { catalog, provider }` map, reached through **`orchestratorApi`** — a static import in Phase 1, HTTP from M7, IPC in Electron — so the migration is transport-only. The term "hub" is not used as a component name. The GitHub entry's agent URL is configurable, so the spine can point at the deterministic or the LLM agent.

### 8. Orchestrator AgentCard is minimal and static

The orchestrator serves a minimal static card: name, description, url, streaming, the A2UI v0.9.1 extension. No union of installed apps' skills. SPEC §10's Registry duty is trimmed to "serves the orchestrator's AgentCard"; the union returns only if an external A2A consumer ever appears. Catalog ids in the extension params are included only if the ported client reads them.

### 9. AgentsPool is a transparent relay

The orchestrator forwards the client's message parts and metadata unchanged, re-emits every vendor event with parts byte-identical, and adds exactly one thing: a **source stamp** (app id) in metadata, the seed of provenance. It forwards the A2UI `X-A2A-Extensions` header. The pool keeps the mapping `clientContextId → {app → vendorContextId}`; the client never sees vendor ids. Vendor failure surfaces as the orchestrator's own failed task status. The dispatch record carries a per-source deadline field with no enforcement until M6. No validation or dedup in M0.

### 10. IntentJournal: record now, embed later

Append-only, one entry per turn, in the orchestrator's local state directory alongside the Registry. Entry: turn id, client contextId, timestamp, a free-form **descriptor** (the utterance verbatim for palette turns; a rendered sentence plus payload for surface actions), dispatch (apps, vendor contextIds, start/end, outcome), the surface ids the turn created/updated, raw client metadata, and an **embedding field left null** — Phase 2's Router brings the embedding model and backfills. The machine-facing projection stays unbuilt.

### 11. A2A line: 0.3, newest compatible with the A2UI ecosystem

`a2ui-agent-sdk` still pins A2A 0.3, so the whole spine stays on the 0.3 line at the newest compatible versions: `@a2a-js/sdk` 0.3.14, `@a2ui/react` 0.10.2, `@a2ui/web_core` 0.10.6, Python `a2a-sdk` 0.3.x, `a2ui-agent-sdk` 0.5.0. Migration to A2A 1.0 is a backlog item gated on `a2ui-agent-sdk`, to be done across client, orchestrator, and vendor kit in one move.

### 12. Client port: canvas only

Port the canvas entry, `canvas/`, `a2a/`, message application, and their unit tests. `chat`, `examples`, and `dev` entries stay behind. `replayBeat` comes over as a mechanism; the beat recordings do not — they are re-recorded through the orchestrator once the spine works. Playwright visual tests are re-established against the ported canvas.

### 13. Neutral shell; Primer scoped to the fragment

The shell's three Primer widgets become neutral equivalents; Primer's provider, base styles, and primitives CSS move from the app root to the wrapper around the GitHub surface mount. The client catalog map resolves `catalogId → { catalog, provider }`.

### 14. Shell design system: Radix Themes; shell catalog is basic catalog + tokens

The client's own UI (palette, history strip, status strip, surface container) uses **Radix Themes**. The shell catalog, when it lands in Phase 2, is `basicCatalog` + a neutral `--a2ui-*` token theme + composition primitives — no React implementation mapping; a Radix-mapped shell catalog is post-project. `packages/shell-catalog` stays the scaffold stub in Phase 1.

### 15. `primer-a2ui-adapter` consumed via `link:` until the copy

`primer-a2ui-adapter` is unpublished. Phase 1 uses a `link:` dependency on `../a2ui-github/primer-a2ui-adapter`; the end-of-phase copy sub-task publishes `github-catalog` from its new home and the client switches to the published package.

### 16. Ports

client 5173 · orchestrator **10001** · marketplace **10002** (reserved) · vendor agents **11001+** sequential, one port per app regardless of run mode (GitHub 11001 once copied; 10003 from `a2ui-github` until then; Gmail 11002; Calendar 11003). Only client, orchestrator, and marketplace get tunnel rows; vendor agents are localhost-only. The orchestrator takes a base-URL setting for the advertised card URL and allows `localhost` + `*.devtunnels.ms`.

### 17. Vendor agent run modes

Every vendor agent supports three modes on one port: `deterministic` (no model), `llm` (model + MCP), `llm` with no MCP (model + stub backend). `a2ui-github` already has all three; the kit phase makes the flag convention uniform. The Phase 1 copy keeps `a2ui-github`'s two agent packages as-is.

### 18. `packages/sdk` unchanged

No change to `sdk` in Phase 1; the bundle record stays in the orchestrator. Open to promotion during Phase 1 review.

### 19. Acceptance

1. `pnpm dev` brings up client + orchestrator; a palette utterance renders a GitHub-painted surface, streamed on the first turn, with no direct client → agent traffic.
2. Transparency: the same utterance recorded direct and via the hub yields the same A2UI message sequence modulo the source stamp; a surface action round-trips through the orchestrator and repaints.
3. Canvas parity: hold-and-swap, timeline, parked sessions, cancel-in-flight behave as in `a2ui-github`; ported unit tests pass; a beat recorded through the orchestrator replays.
4. One journal line per turn.
5. The orchestrator's card is served at its tunnel URL with the A2UI extension.
6. Gates green in both repos; the copied GitHub app runs from 11001 on the published `github-catalog`.

Final gate: **Claude-in-Chrome live verification through the tunnel** for items 1, 2, and 5.

## Invariants

- The client talks only to the orchestrator.
- `a2ui-github` is not edited; a needed agent-side change is a spec finding, not a licence to edit.
- The shell never reaches into a fragment; no shell style leaks into vendor fragments.
- `_dev/` edits land on `main` only.

## Open items

- Whether the `@a2ui/react` unknown-component patch is carried as a pnpm patch or dropped — decided in the client port.
- Promotion of the bundle record to `sdk` — revisit at Phase 1 review.
- Pointers for the kit phase: single launcher for all installed agents; uniform run-mode flag; folding `deterministic_agent` into one agent process.
- A different external, non-kit agent will be needed at M7 to prove zero-change composition.
