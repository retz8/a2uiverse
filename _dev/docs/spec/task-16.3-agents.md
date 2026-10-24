# 16.3 — The agents

The seven agents in `../a2uiverse-apps/` — GitHub, Gmail, Calendar, CircleCI, Linear, Shop A and Shop B — following the agent kit onto the upstream releases Phase 16 pins. Sub-task 16.3 of Phase 16 (`_dev/docs/spec/phase-16-upstream-upgrade.md`); an `[apps]` sub-task, worked on the apps repo's `main`.

## Scope

- The seven agents' tests on the new kit.
- The kit's comment on `examples_dir`.
- The apps' recorded beats.
- Out: the platform client's recorded beats — sub-task 16.10.

## Locked decisions

### 1. The apps' recorded beats are kept as recorded

No app's recorded beat is re-recorded. Their streams, recorded on the old kit, repeat unchanged components the new kit no longer sends. The recordings, the corpora derived from them and the `deterministic` answers stay as they are. Phase decision 9 is amended to the same.

### 2. Calendar's agenda answer stays kept by hand

Calendar's `deterministic` agenda answer, kept by hand since task 15.11, stays as it is, with its README note.

### 3. The tests on the new kit

Each app's `test_llm_agent.py` and `test_llm_prompt.py` import the schema-block markers from `a2ui.constants`, as the scaffolder's agent template does. The schema manager's test leaves GitHub's, Gmail's and Calendar's `test_catalog_common.py`; each file keeps its other two tests.

### 4. The kit's comment on `examples_dir`

The kit's comment on `examples_dir` names upstream's `load_examples`, which feeds the examples into the prompt, in place of the schema manager.

### 5. What proves it

Every app's agent suite green, the kit's suite green, and the apps repo's `pnpm verify` green.

## Invariants

- No change in behaviour: what the person sees and what the agents do is what it was.
