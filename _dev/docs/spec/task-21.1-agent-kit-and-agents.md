# 21.1 — The agent kit and the agents

The agent kit and the seven agents in `../a2uiverse-apps/` brought onto `a2ui-agent-sdk` 0.12.1 and `a2ui-core` 0.7.1, the pin the scaffolder writes into a new app moving with them, on the wire as it is. Sub-task 21.1 of Phase 21 (`_dev/docs/spec/phase-21-v1-0-migration.md`); an `[apps]` sub-task, worked on the apps repo's `main`.

## Scope

- The agent kit's pins on `a2ui-agent-sdk` and `a2ui-core`, the seven agents' pin on `a2ui-agent-sdk`, the pin the scaffolder writes into a new app, and every lockfile.
- The documents that name the pins, in both repos.
- A note on sub-task 21.2's line in `_dev/TODO.md`.
- Out: anything the new releases provide that the kit does not use today, the kit's reading of the renderer's capabilities among it — sub-task 21.16; the platform's side of the stricter check — sub-task 21.2.

## Locked decisions

### 1. Pins only

The agent kit pins `a2ui-agent-sdk` 0.12.1 and `a2ui-core` 0.7.1, and the seven agents and the scaffolder's generated project pin `a2ui-agent-sdk` 0.12.1, each exactly. The kit adopts nothing the releases newly provide: its own reading of the catalogs a renderer advertises stays, and `read_renderer_capabilities`, which `a2ui-agent-sdk` 0.12.0 adds, is left to sub-task 21.16.

### 2. The stricter verdict on a link is upstream's

`a2ui-core` 0.7.0 judges `"format": "uri"`, so an `openUrl` whose URL carries no scheme is refused by the kit's end-of-attempt check, where `a2ui-core` 0.6.0 accepted it, and goes to the model as its correction. It is accepted as upstream's verdict, as task 16.2's decision 4 has schema conformance: the kit carries no relaxation and the prompt gains no sentence. The commit message names the difference. No entry is added to `_dev/a2ui-findings.md`.

### 3. What proves it

1. The apps repo's `pnpm verify`, green.
2. Each of the seven agents' full system prompt, byte for byte the same under the old pins and the new.
3. One turn in `stub` mode on GitHub and one on Shop A, each asked of the agent directly, with no canvas, ending in a valid paint.
4. A freshly scaffolded app installing and passing its own tests, against the pushed commit.

### 4. The documents that name the pins move here

The apps repo's README and the agent kit's README move in the commit that moves the pins. The platform's README, in its table of upstream packages, and the agent kit's design record, `docs/design/agent-kit.md`, move in a commit of documents alone on the platform's `main`.

### 5. One commit, pushed before the scaffold's proof

The pins, the lockfiles, the scaffolder and the apps repo's two READMEs land as one commit on the apps repo's `main`. The gates and the two `stub` turns run before the push, the push waits for the owner's word, and the scaffold's proof follows it, a failure there fixed forward on `main`.

### 6. A note for sub-task 21.2

Sub-task 21.2's line in `_dev/TODO.md` takes a note, "From 21.1": `@a2ui/web_core` 0.16.0 carries the same checks, from the same upstream pull request, 4187, and the sdk's validator does not judge formats today. The note states the two facts and nothing of what sub-task 21.2 does with them.

### 7. The agent kit stays 0.2.0

`a2ui-agent-kit` keeps its version, 0.2.0.

## Invariants

- No change in behaviour beyond decision 2: what the person sees and what the agents do is what it was.
- Each lockfile moves the two packages and nothing else.
- The recorded beats, the corpora, the examples and the prompt goldens stay as they are; the scaffolder's test snapshot, which holds the pin, is the one that moves.
