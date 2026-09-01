# Task 3.2 — agent-kit extraction: implementation plan

## Context

Phase 3 sub-task 3.2 (`[apps]`): extract the stratum-1 shared Python logic of the three vendor agents (github, gmail, calendar) in `/Users/jiohin/Desktop/future-of-sw/a2uiverse-apps` into a new `agent-kit/` package, and refactor all three agents onto it with observable behavior unchanged. Every design decision is locked in `_dev/docs/spec/task-3.2-agent-kit-extraction.md` (platform repo); this plan only sequences the work. Work lands directly on the apps repo's `main` — no worktree, no branch. Conventional commits.

**Out of scope, enforced:** README edits, `dev:agents`/launcher work (3.6); `tool_shaping`/`mcp` skeletons (3.3 — their files move directories only); schema-manager version flip (follow-up task); kit never reads `manifest.json`, never contains vendor content.

## Deviations surfaced by planning (each called out in the final commit/PR body)

1. **`record_shape` args degradation** — gmail/calendar's `_after_tool` today calls `record_shape(tool_name, args, tool_response)`; the locked hook is `(tool_name, tool_response)`. Vendor wrappers pass `{}` for args. Only effect: the env-gated shape-dump debug aid loses arg names; no test covers it.
2. **`app_dir: Path` config field added** — moved machinery anchors `.env` loading and the three gitignored debug dumps (`surface.dump.json`, failed-stream dump, `system_prompt.dump.txt`) to the agent dir instead of `__file__` (which would point into the kit). Also `adk_agent_name` (the ADK `LlmAgent` name, e.g. `a2ui_gmail_live_agent`) — vendor data not in the spec's field list.
3. **`seed_calendar.py` one-line import fix** — it imports `llm_agent.mcp`, which dies; becomes `app.mcp`.
4. **Platform `pnpm dev:agents` breaks between 3.2 and 3.6** — `scripts/dev-agents.mjs` spawns `-m deterministic_agent` / `-m llm_agent` + `TOOL_BACKEND`. The dirs die per spec; the platform has no 3.2 diff. No compat shims; the gap is documented and closed by 3.6's delegation rewire.
5. **"Zero git diff" on fixtures = zero content diff** — `fixtures/` and `knowledge/` move into `app/` as pure `git mv` (R100 renames); `recordings/`, `.recordings/`, derived corpora have literally zero diff.
6. Spec-directed behavior deltas to note, not avoid: deterministic card advertises v0.9.1 (was v0.9); deterministic mode gains dotenv/keep-alive/logging config; backend log lines become generic.

## Kit scaffold

`agent-kit/` at repo top level; dist `a2uiverse-agent-kit`, import `a2uiverse_kit`; uv src-layout with `uv_build` backend and `[tool.uv.build-backend] module-name = "a2uiverse_kit"`; `package = true`; `requires-python >= 3.14`; deps: `a2ui-agent-sdk`, `a2a-sdk[http-server]`, `google-adk` (lazily imported only), `python-dotenv`, `uvicorn`, `click`, `httpx` (beats). No `mcp` dep. Dev group: pytest + pytest-asyncio, `asyncio_mode = "auto"`.

## Kit module map (source → kit)

| Kit module | Source | Parameterization |
|---|---|---|
| `versions.py` | scattered `"v0.9"` literals | one `WIRE_VERSION`; card uses `VERSION_0_9_1`; schema-manager pin stays `VERSION_0_9` as-is |
| `config.py` | new | frozen `AgentAppConfig`: name/description/skills, `default_port`, `responder_app_name`, `adk_agent_name`, `app_dir`, `catalog_path`, `catalog_kind: "custom"|"basic"`, examples/brand/domain paths, prose fields, `build_response`/`build_text_response`, `question_policy`, `stub_tools`, `live_toolset_factory`, `after_tool=None`, `model=None` + kit `DEFAULT_MODEL = "gemini-3.7-flash"` |
| `catalog.py` | `catalog_common/` + both `catalog.py` variants | `CatalogContext(config)`; pass-1 id-strip iff `custom`, `_flatten_props` iff `basic`; explicit `catalog_path` (walk-up dies) |
| `knowledge.py`, `prompt.py` | `llm_agent/knowledge.py`, `prompt.py` | config paths; `build_system_prompt(config, …)` with examples-framing splice; prose stays vendor |
| `paint_meta.py` | `llm_agent/paint_meta.py` | machinery whole + named policies: `require_carries_action` (one-directional), `require_root_component(name)` (bidirectional, github passes `"ConfirmationDialog"`) |
| `recorder.py` | byte-identical ×3 | verbatim; exports `RECORD_DIR_ENV` (vendor `tool_shaping.py` re-imports it) |
| `responder.py` | `llm_agent/responder.py` | `app_name` injected; lazy ADK imports kept |
| `executor_llm.py` | byte-identical 643 L | config-bound `CatalogContext` + `question_policy`; dumps anchor to `app_dir`; public names preserved (moved tests import them) |
| `executor_deterministic.py` | byte-identical 65 L | takes the config callable pair |
| `responses.py` | triplicated `responses.py` machinery | `fixture_responder(fixtures_dir, event_fixtures, text_fixture=…, surface_prefix=…) → (build_response, build_text_response)`; low-level `load_fixture`/`stamp_surface`/`fallback` also exported for github's hand-rolled pair |
| `server.py` | both `server.py` | one card (v0.9.1 in every mode), `build_app(config, mode, …)`, CORS verbatim |
| `modes.py` | `llm_agent/agent.py` | `resolve_executor(config, mode)` behind lazy imports — deterministic never imports ADK; ADK after-tool adapter invokes `config.after_tool(tool_name, tool_response)`; `MODEL_NAME` env override kept |
| `cli.py` | both `__main__.py` merged | click `--mode deterministic|stub|live` (+ `--host/--port/--base-url`); dotenv + logging + `timeout_keep_alive=300` in all modes |
| `beats.py` | `scripts/record_beats.py` minus data | `main(beats, agent_url, record_dir=…, fixture_dir=…)` |

Kit tests (`agent-kit/tests/`): conftest fake configs over tmp `app_dir` + two authored fixture catalogs (`catalog-basic.json` allOf-composed, `catalog-custom.json` top-level props incl. `ConfirmationDialog`), stub knowledge docs, tiny example/deterministic fixtures. Moved suites: `test_recorder`, `test_llm_responder`, `helpers.py`, single vendor-neutral copies of `test_llm_executor` / `test_llm_catalog` / `test_paint_meta` parametrized over both kinds and both policies. New small tests: config, prompt splice, responses helper, server card/modes, CLI. Kit tests import no vendor app.

## Step 0 — Baseline capture (before any change, nothing committed)

`SCRATCH` = session scratchpad. Per agent (github:11001/`panel-open`, gmail:11002/`label-toggle`, calendar:11003/`rsvp-toggle`):

1. `uv run pytest -q` green; record counts.
2. `shasum -a 256 tests/golden/llm_system_prompt.skeleton.txt >> $SCRATCH/baseline-goldens.txt`.
3. Boot `python -m deterministic_agent --port <p>`; capture card JSON + two turns over HTTP (a text turn "What needs my attention today?" and the action turn), `jq -S` extracting only the data parts (strips volatile ids) → `$SCRATCH/baseline-<app>-{text,action}.json`. Kill server.

Record baseline SHA; confirm `git status` clean in both repos.

## Steps (commit-sized; each commits only when its verification is green)

1. **`feat(agent-kit): scaffold`** — pyproject + `versions.py` + smoke test. Verify: `uv sync && uv run pytest -q && uv build`.
2. **`feat(agent-kit): config dataclass + recorder`** — verify: kit pytest.
3. **`feat(agent-kit): catalog behind catalog_kind`** — author the two fixture catalogs + conftest; merged `test_llm_catalog`. Verify: kit pytest.
4. **`feat(agent-kit): prompt + knowledge`** — verify: kit pytest.
5. **`feat(agent-kit): paint_meta + named question policies`** — merged `test_paint_meta`. Verify: kit pytest.
6. **`feat(agent-kit): deterministic executor + fixture_responder`** — kit `helpers.py`. Verify: kit pytest.
7. **`feat(agent-kit): llm executor + responder`** — merged `test_llm_executor`. Verify: kit pytest fully green (kit-first gate).
8. **`feat(agent-kit): server, modes, cli, beats`** — incl. subprocess test asserting `"google.adk" not in sys.modules` after deterministic `build_app`. Verify: kit pytest.
9. **`refactor(gmail): move onto a2uiverse-agent-kit`** — the template:
   - Create `app/`: `git mv` card/mcp/tools/tool_shaping/recording_toolset; `app/prose.py` (five prose constants verbatim); `git mv llm_agent/fixtures app/fixtures/stub`, `deterministic_agent/fixtures app/fixtures/deterministic`, `knowledge app/knowledge`; intra-imports → `app.*`; `RECORD_DIR_ENV` from kit.
   - `app/responses.py` via `fixture_responder` (4-entry map, `inbox-digest.json`, prefix `gmail`).
   - `app/config.py` `CONFIG = AgentAppConfig(...)` (port 11002, basic kind, `require_carries_action`, after_tool wrapper per deviation 1, `build_gmail_toolset`).
   - `app/__main__.py` 3-line shim.
   - pyproject: kit dep + editable path source; `uv sync` (lock diff committed).
   - Delete `deterministic_agent/`, `llm_agent/`, `catalog_common/`; prune the six moved test files; rewire kept tests to kit/`app.*` (card v0.9→v0.9.1 assertion update and walk-up→explicit-path assertions called out).
   - `scripts/record_beats.py` → shim (docstring + `AGENT_URL` + `BEATS`, delegates to `a2uiverse_kit.beats`). `derive_corpus.py` untouched.
   - **Verify:** agent pytest green; golden checksum matches baseline; boot `--mode deterministic` → both turn captures `diff` empty vs baseline; boot `--mode stub` → card serves with v0.9.1 URI; staged fixture/knowledge moves all R100; `recordings/`+`.recordings/` untouched.
10. **`refactor(calendar): move onto a2uiverse-agent-kit`** — template with calendar values (port 11003, `guarded_toolset`, `agenda-digest.json`, `rsvp-toggle`) + the `seed_calendar.py` import fix. Same verification.
11. **`refactor(github): move onto a2uiverse-agent-kit`** — template with: `catalog_kind="custom"`, `require_root_component("ConfirmationDialog")`, 1-arg `shape_tool_response` wrapper, hand-rolled `app/responses.py` (three context-shape handlers + authored `chat-N` text response, composing kit low-level helpers), 25-entry fixture map, 8-beat shim, no derive script. Same verification (action `panel-open`).
12. **`chore(agents): task 3.2 acceptance sweep`** (only if fixes fall out) — full sweep below.

## Final acceptance sweep (spec §12)

- Four suites green: kit + three agents (`uv run pytest -q` each).
- `shasum -a 256 -c $SCRATCH/baseline-goldens.txt` — goldens byte-identical.
- `git diff --stat -- '*/agent/recordings' '*/agent/.recordings'` empty; fixture/knowledge history shows renames only (no content hunks vs baseline SHA).
- `pnpm verify` green in apps repo (kit is outside the pnpm workspace — no config change needed). Platform repo: `git status` clean, no 3.2 diff.
- Boot smokes ×3 agents × {deterministic, stub}: card on port, deterministic turn diffs empty vs baseline.
- Commit/PR body carries the deviation callouts (§Deviations above) plus: merged/parametrized kit test assertions, and the schema-manager pin deliberately lifted as-is.

## Wrap-up (platform repo, on main)

- Save this plan as `_dev/docs/plan/task-3.2-agent-kit-extraction.md` (per project convention).
- Add design record `_dev/docs/design/agent-kit.md` (new area: kit components, config surface, mode flow).
- TODO tick and handoff via `daily-work-harness:wrap-up` when done.

## Critical reference files

- `gmail/agent/llm_agent/executor.py` — the 643-line core; its module-top vendor imports and `__file__` dumps are the main DI work
- `gmail/agent/llm_agent/catalog.py` — 4-pass `validate_surface`, the two `catalog_kind` branch points
- `gmail/agent/llm_agent/agent.py` — mode/ADK-callback machinery → `modes.py`
- `github/agent/llm_agent/paint_meta.py` — the bidirectional policy that must survive as `require_root_component`
- `gmail/agent/pyproject.toml` — template for the dep rewire and kit pyproject
