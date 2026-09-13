# Handoff — task 6.3, restructure

Spec'd, not started. Spec: `_dev/docs/spec/task-6.3-restructure.md` (commit `ce7bb44`); the 6.3–6.5 TODO lines follow it (`27496fc`). No code changed yet; the tree is clean on `main`.

Next: implementation directly on `main`, no worktree, no written plan.

Ground already checked during the grill, so the build need not re-derive it:

- `@a2ui/web_core`'s intake (`MessageProcessor`) accepts a dangling child, no `root`, a cycle and an undeclared `functionCall` name — reproduced; recorded as finding 8 in `_dev/a2ui-findings.md`. It exports only the v0.9 `server_to_client.json` (`Schemas.A2uiMessageSchemaRaw`); v0.9.1 schemas come from `upstream/main` `specification/v0_9_1/json/`.
- In v0.9.1 `common_types.json`, `FunctionCall` is `oneOf` a ref to `catalog.json#/$defs/anyFunction` — the JSON Schema pass is what rejects an undeclared function name.
- Upstream's validator: Python `a2ui/validation/validator.py` (`A2uiValidator`); its behaviour is pinned by `conformance/core/validator.yaml`, which also carries v0.8 cases.
- The sdk already depends on `ajv` (2020-12).
- Nothing in `../a2uiverse-apps` reads the sdk or the stamp's `slot`.
- `Slot`s appear in five recorded beats under `apps/client/recordings/beats/` and in the synthetic beat builder; the stamp's `slot` is read by the client in its placement map, failure routing and roster lookup.
- The shell-catalog fixture imports `TODAY_TIMELINE` from the sdk's examples.
