# Task 3.2 — Agent-kit SDK package + stratum-1 extraction

Task-level spec for Phase 3 sub-task 3.2 (`_dev/TODO.md`; phase spec `_dev/docs/spec/phase-3-agent-kit.md`, decisions 1, 3, 5, 7): the Python kit in `a2uiverse-apps` and the refactor of the three agents onto it.

## Scope

- Create the kit package in `a2uiverse-apps` holding the stratum-1 shared logic: executor (deterministic and llm), A2A server wiring, single CLI entrypoint with `--mode deterministic|stub|live`, recorder, catalog loading/validation, prompt assembly, paint_meta, beat-record driver.
- Refactor all three agents (github, gmail, calendar) onto it as path dependencies, observable behavior unchanged.
- Move the shared machinery tests into the kit's own suite.
- `mcp.py`, `tool_shaping.py`, and the toolset wrappers stay vendor-side untouched — their skeletons are 3.3.

## Locked decisions

### 1. Kit identity and packaging

Top-level `agent-kit/` folder in `a2uiverse-apps`, sibling to the three app folders. Distribution name `a2uiverse-agent-kit`, import package `a2uiverse_kit`. The kit is a real uv package (`package = true`) with its own tests and pytest dev group, `requires-python >= 3.14`; the three agents remain applications (`package = false`) and take the kit as an editable path dependency. No registry publishing.

### 2. The two-package split retires on both sides

`deterministic_agent/`, `llm_agent/`, and `catalog_common/` die as directories in every agent, and the split does not reappear inside the kit. The kit is a flat, concern-oriented package with one server and one CLI; mode resolution maps `deterministic|stub|live` to executor and tool backend behind lazy imports, so deterministic mode never imports ADK. One AgentCard serves all three modes. The unified CLI applies dotenv loading and the long keep-alive in all modes.

What remains in each agent is one uniformly named `app/` package — config, agent card, prompt prose, `knowledge/`, `mcp.py`, `tools.py`, `tool_shaping.py`, fixtures — with a `__main__` shim of a few lines invoking the kit CLI with the app's config. Run shape: `python -m app --mode …`, uniform across all three agents.

### 3. Per-vendor config: a frozen dataclass, passed explicitly

The per-vendor surface is a frozen dataclass defined in the kit and instantiated once per app in Python — it carries data (name, description, skills, default port, responder app name, catalog path, prompt prose, knowledge paths, deterministic fixtures location) and vendor callables (stub tools, live toolset factory, deterministic response pair, question policy, after-tool hook). Delivery is explicit via the `__main__` shim: no dotted-path CLI argument, no manifest-driven config discovery. The catalog path is stated explicitly in the config, replacing the walk-up-to-sibling-catalog layout convention.

### 4. Port

Developer input, stated in two places by the same author: `manifest.json` (`agent.url`) for discovery and the config's default port for manual runs. In launched runs the manifest is authoritative — the launcher passes the port explicitly; the config default binds only bare `python -m app` runs, with the CLI `--port` flag overriding. The config does not parse the manifest.

### 5. Catalog policy: one `catalog_kind` enum

A single config field `catalog_kind: "custom" | "basic"` drives both catalog-validation deltas: `custom` strips the framework-owned `id` before validating; `basic` validates as-is and flattens `allOf` composition for ref-field and prop-schema extraction. No independent knobs. This is the same axis as the scaffold CLI's catalog-template option.

### 6. Question policies: kit-shipped, config-selected

The paint_meta streaming machinery moves to the kit whole. The question-marker validation is a config-selected policy; the kit ships both existing rules as named policies — "carries at least one action" (gmail/calendar) and "root component is X" with the component name as a parameter (github, with `ConfirmationDialog` as its data). The config field is a callable, so a vendor may supply its own.

### 7. Deterministic responses: infra in the kit, fixtures in the agent

The config carries the executor's existing two-callable contract: a response builder and a text-response builder. The kit ships one helper packaging the triplicated machinery — fixture loading, surfaceId stamping, the visible fallback, the text digest — returning that callable pair from a fixtures dir and an action→fixture map. Fixtures, their maps, and github's dynamic context-shape handlers stay vendor-side; the kit never models response dispatch.

### 8. Beat pipeline boundary

The beat-record driver moves into the kit. Each agent keeps a thin script shim carrying its vendor beats list (script data, not a config field) and its agent URL. `derive_corpus.py` stays vendor-side untouched — a known non-extraction — and github deliberately gets no derive script. `seed_calendar.py` stays where it is.

### 9. Versions

- The unified AgentCard advertises the v0.9.1 extension in every mode; the deterministic card's v0.9 advertisement was stale and is corrected.
- The wire envelope tag stays exactly `"v0.9"` — upstream's own tag for the message-format family — centralized as one kit constant replacing the scattered per-agent literals. The stream-parser pin lifts byte-identical.
- The schema-manager pin (v0.9 schema files) lifts as-is; flipping it to v0.9.1 is a separate follow-up task after 3.2, not part of this refactor.

No protocol-delta register entry: nothing about the protocol posture changes.

### 10. Test migration: machinery to the kit, content stays

The kit's own suite takes the byte-identical machinery tests plus single copies of the executor, catalog, and paint_meta suites, run vendor-neutral against a minimal in-suite config and two small fixture catalogs covering both `catalog_kind` branches and both named question policies — the kit's tests import no vendor app. Each agent keeps the tests exercising its own content through the kit: card, server/port, catalog id and validation, golden prompt skeleton, conformance, deterministic responses over its fixtures, and the genuinely-vendor suites. `test_knowledge_examples` stays per-agent.

### 11. After-tool hook

The config carries an optional after-tool callable, uniformly `(tool_name, tool_response) → shaped response`, `None` meaning no shaping. The kit's ADK callback adapter invokes it; github adapts its one-argument shaping function with a vendor-side wrapper. 3.3 rehomes the shaping bodies behind this same hook.

Housekeeping riding along: the default model (identical in all three agents today) becomes the kit default with a config override; the duplicated record-dir env constant in gmail/calendar `tool_shaping.py` imports from the kit's recorder.

### 12. Acceptance

1. All four suites green — the kit's pytest and all three agents' — with moved tests keeping their assertions; any assertion change is called out in the PR as its own finding.
2. Golden prompt skeletons byte-identical in all three agents.
3. Nothing re-recorded or regenerated: `recordings/`, both fixture families, and the derived corpora show zero git diff.
4. `pnpm verify` green in the apps repo. The platform repo has no 3.2 diff.
5. Boot smoke: each agent starts in `deterministic` and `stub` modes via the kit entrypoint, serves its card on its port, and answers one deterministic turn identically to before. Live mode and the tunnel fan-out are 3.6's sanity pass.

## Invariants

- The kit is vendor-agnostic: shared logic only. Fixtures and vendor policy never enter it.
- The kit depends on the protocols alone (SPEC §13); it never reads platform documents such as `manifest.json`.
- Observable behavior of the three agents is unchanged by the extraction.

## Open items

- Schema-manager version flip v0.9 → v0.9.1: a deliberate standalone follow-up task after 3.2, with gates and a beat replay around it.
