# agent-kit

The shared A2UI+A2A runtime for a2uiverse vendor agents: `a2uiverse-apps/agent-kit/`, distribution `a2uiverse-agent-kit`, import `a2uiverse_kit`. A uv package (`package = true`, src layout, `uv_build`); the three agents take it as an editable path dependency. Vendor-agnostic by contract: shared logic only — fixtures, prose, tool policy, and cards live in each app's `app/` package and reach the kit through its config.

## Components

- **`config.AgentAppConfig`** — the whole per-vendor surface, one frozen dataclass (identity + skills, `default_port`, `responder_app_name`, `adk_agent_name`, `app_dir` anchoring `.env` and debug dumps, `catalog_path` + `catalog_kind: "custom"|"basic"`, examples/knowledge paths, prompt prose fields, the deterministic response pair, `question_policy`, `stub_tools`, `live_toolset_factory`, `after_tool`, `model`). `eq=False`: a config instance IS the app; identity hashing backs per-config caching. Kit-level `DEFAULT_MODEL`.
- **`catalog.CatalogContext`** (via cached `catalog_context(config)`) — locate/load/validate against the app's catalog: schema managers (default + examples-wired live), `supported_catalog_ids`, `validate_payload` (deterministic partial-update probe), 4-pass `validate_surface` (binding-on-literal pre-pass, conformance, completeness/topology, binding resolvability). `catalog_kind` drives the two branches: `custom` → id-stripped conformance + top-level prop schemas; `basic` → id-retained + `allOf`-flattened props. Schema manager pins `VERSION_0_9` (flip to 0.9.1 is a tracked follow-up).
- **`versions`** — the single `WIRE_VERSION = "v0.9"` constant (the message-family wire tag; distinct from the card's v0.9.1 extension URI and the SDK's schema-version constants).
- **`prompt` / `knowledge`** — system-prompt assembly (slot mapping, workflow join with the domain doc last, examples-framing splice) over config prose and knowledge paths.
- **`paint_meta`** — the `<paint-title>`/`<no-surface/>` streaming tag filter and paintMeta DataPart builder, plus the two named question policies the config selects: `require_carries_action` (basic-catalog agents) and `require_root_component(name)` (bidirectional marker↔dialog consistency; github passes `"ConfirmationDialog"`).
- **`executor_llm.LlmAgentExecutor`** — stream-first / validate-at-end / retry; collaborates with `CatalogContext` (validation, parser ref-fields), `config.question_policy`, the recorder, and an `LlmResponder`; debug dumps anchored to `config.app_dir`.
- **`executor_deterministic.DeterministicAgentExecutor`** — canned A2UI per action/text, over the config's `(build_response, build_text_response)` pair.
- **`responses.fixture_responder`** — the standard fixture-playing pair (load, surfaceId stamping, visible fallback, fresh `<prefix>-N` text surfaces) from an app's fixtures dir + action map; low-level helpers exported for hand-rolled pairs (github).
- **`responder.AdkLlmResponder`** — ADK Runner wrapper (SSE token stream, per-`contextId` sessions); agent and `app_name` injected.
- **`recorder`** — `NullRecorder`/`SessionRecorder`, armed by `A2UI_RECORD_DIR`; owns `RECORD_DIR_ENV`.
- **`modes`** — `deterministic|stub|live` → executor, behind lazy imports (deterministic never imports ADK). `build_llm_agent(config, mode)` assembles prompt + tools (`stub_tools` / `live_toolset_factory()`) and adapts ADK's after-tool callback to `config.after_tool(tool_name, tool_response)`. `MODEL_NAME` env > `config.model` > `DEFAULT_MODEL`. The old `TOOL_BACKEND` env switch is retired.
- **`server`** — one A2A Starlette app and **one AgentCard for every mode**, advertising the v0.9.1 extension with the context's catalog ids; CORS for localhost + devtunnels.
- **`cli`** — the single entrypoint behind each app's 3-line `__main__` shim: `python -m app --mode deterministic|stub|live [--host --port --base-url]`; dotenv, timestamped logging, and the 300s keep-alive in all modes; `--port` defaults to `config.default_port` (launched runs pass it explicitly).
- **`beats`** — the headless beat-record driver; each app's `scripts/record_beats.py` shim supplies its beats list, agent URL, and directories.

## Flows

- **Serve**: `app/__main__` → `cli.run(CONFIG)` → `server.build_app(config, mode, …)` → `modes.resolve_executor` → executor over the shared card.
- **LLM turn**: executor → responder stream → lenient parser (+ tag filter → paintMeta parts) → at end `CatalogContext.validate_surface` + `config.question_policy` → retry with correction or complete; recorder captures batches.
- **Deterministic turn**: executor → config pair (usually `fixture_responder`) → stamped canned messages.

## App residue

Each agent keeps one uniform `app/` package — `config.py` (the `AgentAppConfig`), `card.py`, `prose.py`, `responses.py`, `mcp.py`, `tools.py`, `tool_shaping.py`, toolset wrapper (gmail/calendar), `fixtures/{stub,deterministic}`, `knowledge/` — plus `scripts/` and its own tests. `tool_shaping`/`mcp` skeletons are 3.3's; scaffold/launcher are 3.4/3.5; platform `dev:agents` delegation is 3.6 (it is broken against the kit-shaped agents until then).
