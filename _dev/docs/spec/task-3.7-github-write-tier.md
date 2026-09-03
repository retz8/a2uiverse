# Task 3.7 — GitHub agent write tier

Spec for sub-task **3.7** (`_dev/TODO.md`, Phase 3 — agent building kit), split off from task 3.3 (its spec, decision 3): the GitHub agent gains write capability.

## Scope

- The GitHub agent moves off the read-only MCP endpoint and exposes the full server surface — capability is whatever MCP + token allow.
- The proposal/toggling action convention carried as domain-doc guidance.
- The identity sweep: every place the agent describes itself as read-only.
- Verification is a live run; recorded beats and fixtures are untouched.

## Locked decisions

### 1. Capability expansion, no confinement

The agent is another GitHub client acting as the user — the same authority the user has on the GitHub website. Write capability is not limited in code, in the token, or by a demo repo: no arg-pinning guard, no repo allowlist, no seeded demo target. The kit wrapper's hooks stay no-op. The one requirement replacing confinement: **every write's target must be visible on the proposal the user confirms** (repo, issue/PR number — where it will land, not just what it says), because the confirm gate is the single point where user intent re-attaches to model-chosen arguments. This amends, for GitHub, the recorded convention that admitting destructive tools waits for a real authority surface (M8); the twins' stances stand unchanged.

### 2. Full endpoint, all toolsets, no tool curation

The `/readonly` endpoint variant is dropped and the toolset scope is **all** — explicitly requested, since omitting the toolset header yields only the server's default set (which loses tools the agent has today). No tool-level filter, no curation by UX-readiness or demo story: the agent generates its own UI for whatever it holds. Inventory grows 28 → 89 tools; noted consequence: every live turn carries ~3× the tool schemas in context — if tool-choice quality degrades, look there first.

### 3. Proposal/toggling convention as domain-doc guidance, by property

The two-tier convention is kept, but as prompt/domain-doc guidance stated by property rather than by tool list: a write that publishes content or affects others is proposed and confirmed; a private, reversible toggle may fire directly. The model decides which bucket a given action falls in.

### 4. Live verification only

Acceptance is a real propose → confirm → fire → painted-result run through the canvas via the tunnel, landing on a real repo. Existing recorded beats stay untouched; stub and deterministic modes keep their current read-only behavior; no corpus-capture pipeline is built for GitHub. A replayable write beat can ride a later recording session if a milestone needs it.

### 5. The identity sweep rides along

Everything that states the read-only identity flips to the write-capable one: prompt prose, domain doc (which also gains decision 3's guidance), the agent card — a Router retrieval document, so until it advertises write capability the Router never routes write intents to GitHub — the README's PAT guidance and run tables, the MCP wiring docstring, and the wiring tests (endpoint, toolset header, read-only claims).

## Invariants

- Nothing a2uiverse-specific reaches the vendor wire (SPEC §14).
- The token in use writes as the user's own account, including to shared org repos they collaborate on — accepted deliberately under decision 1.
