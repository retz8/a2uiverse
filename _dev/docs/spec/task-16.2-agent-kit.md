# 16.2 — The agent kit

The agent kit in `../a2uiverse-apps/` brought onto the upstream releases Phase 16 pins, its workarounds over the old agent SDK replaced by what upstream now provides, with the scaffolder and the apps' pins moving with it. Sub-task 16.2 of Phase 16 (`_dev/docs/spec/phase-16-upstream-upgrade.md`); an `[apps]` sub-task, worked on the apps repo's `main`.

## Scope

- The kit on the pinned releases: its catalog access, its prompt, its streaming executor, its end-of-attempt check, its server and its test helpers.
- The scaffolder, `create-a2ui-agent`: the pins it writes into a new app and its agent template's tests.
- Every app's pins and lock, moved with the kit.
- The Backlog's item on the streaming parser's placeholder.
- Out: the apps' own tests, their prompt tests and the beats re-recorded where the wire changed — sub-task 16.3.

## Locked decisions

### 1. The pins

The kit pins `a2ui-agent-sdk` 0.9.0, `a2ui-a2a` 0.1.0 and `a2ui-core` 0.4.0, each exactly; `a2ui-core` is a direct dependency, since the kit imports from it. `a2ui-adk` is not a dependency: nothing in either repo uses it. Phase decision 1 is amended to the same.

### 2. The prompt

The kit assembles the prompt itself, in today's order: the role; the workflow slot — upstream's base rules, then the kit's and the app's prose; the UI description; the schema block; the examples header, the app's framing, then the examples. The base rules, the schema block and the examples are upstream's generated pieces. The examples reach the model without their `intent`.

### 3. A retry patches in place, owned by the kit

The kit filters the parser's output against what the turn has already streamed: a retry's `createSurface` for a surface the turn created is dropped, and so is any component unchanged since it was sent; inside one attempt, only the components new or changed since the last emission go out. Nothing on screen changes and no extra paint is counted.

### 4. The end-of-attempt check

Schema conformance and topology are upstream's `validate_payload`. The kit's own passes stay: no binding on a prop that can't take one, and every binding resolving against the final data model. A rule today's check holds that upstream's lacks stays in the kit, over upstream's.

### 5. The scaffolder moves with the kit

The pins the scaffolder writes into a new app, and its agent template's tests, are on the new kit in this sub-task.

### 6. The apps' pins move here

Every app's agent SDK pins and its lock move with the kit's change, so every app installs and starts on the new kit once this sub-task lands. The apps' own tests stay red until 16.3.

### 7. What proves it

- The kit's tests, rewritten where they pinned the old parser, covering decision 3: a retry patching in place with no second `createSurface` and no unchanged component sent again, and only new or changed components inside one attempt.
- The scaffolder's run of a freshly generated app, green.
- Every app starting in each of its three modes and answering a deterministic turn.
- One live turn: a custom-catalog app in `llm` mode streaming its first paint progressively, with no `Row` placeholder. The Backlog's item on the streaming parser's placeholder is answered by it and leaves the Backlog.

## Invariants

- No change in behaviour: what the person sees and what the agents do is what it was.
- Nothing A2UIVerse-specific rides the vendor wire.
