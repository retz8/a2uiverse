# @a2uiverse/orchestrator

The hub: an A2A agent server, and the only thing the canvas talks to. It finds the apps that can answer a question, plans where their answers will sit, asks them in parallel, and relays what comes back as one composed screen. When the answers can be merged, a second model call writes the merged view.

## How a question is answered

```
question → Router       ranks the apps that could answer, A2UIVerse itself among them
         → Planner      one model call: which apps to ask and what, the layout, the canvas's title
         → first paint  the layout with every slot waiting, before any app is asked
         → apps         one request per app, in parallel; each answer relayed as it arrives
         → Synthesizer  a second model call, when the plan has a merged view and two apps answered
         → merged view  painted into its slot
         → done         once every app has answered, failed or timed out
```

- **The first paint doesn't wait on any app.** The layout reaches the canvas before any app is asked, so it appears as soon as the Planner answers.
- **One app failing never fails the rest.** Its slot says why — the app's own words, unreachable, timed out, or a paint the canvas couldn't draw — and its data leaves the merge.
- **The merge doesn't wait forever.** Once two apps have answered, 10 seconds with no further answer releases the merge over what arrived. A late app still mounts in its own slot, and Include folds it in. After 300 seconds an app's slot fails; an answer arriving later is kept until Retry. When the merge is joined on one app's items, that app is always waited for.
- **Only the first merge is automatic.** Every later model call has a press behind it: Retry, Include or Try again.

## Canvases

Every question opens a canvas: an A2A context with a composition of its own. A question asked from a past canvas names it as its parent, and the Planner reads that canvas and the ones it came from. A canvas keeps running after the user moves on — its apps still answer, its merge still lands — until the user closes it, which cancels whatever it still has in flight.

Each app's paints in a canvas form a back/forward history. When the reader steps a fragment back, the orchestrator puts that paint's data back and, if it has seen that combination of paints before, restores the merged view it had then with no model call.

## What it changes on the way through

In an app's A2UI it changes one thing: surface ids are namespaced by app (`gmail:inbox`), and changed back on the way in. Around the A2UI it stamps which app painted it, keeps the ending of the turn to itself, and sends each app only its own part of the data model.

## Modules

| Module        | Where              | What it does                                                                                                                                             |
| ------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry      | `src/registry/`    | The installed apps and their agent cards, fetched at startup, with A2UIVerse's own card beside them                                                      |
| Embedder      | `src/embedder/`    | One small embedding model, in-process, no API key                                                                                                        |
| Router        | `src/router/`      | Ranks the apps against the question and returns a shortlist                                                                                              |
| Planner       | `src/planner/`     | The first model call: the layout, which apps to ask, the canvas's title. It reads installed apps, this canvas and recent turns on demand, never app data |
| Synthesizer   | `src/synthesizer/` | The second model call: the merged view's wiring, validated, with one retry                                                                               |
| Composition   | `src/composition/` | The canvases, the shell's own paints, the relay, each app's data, when to merge, the presses, the fragment histories, and which refs still hold          |
| AgentsPool    | `src/agentsPool/`  | The connections to the apps: requests, time limits, cancel                                                                                               |
| IntentJournal | `src/journal/`     | One line per turn, appended to `STATE_DIR/intent-journal.jsonl`                                                                                          |
| Executor      | `src/executor.ts`  | The A2A entry point that runs it all                                                                                                                     |

The Planner and the Synthesizer run on Gemini through the Vercel AI SDK.

## Running it

```bash
pnpm dev:orch                                   # from the repo root
pnpm --filter @a2uiverse/orchestrator build | typecheck | test | lint
```

It listens on port **10001**. Start the apps first — `pnpm dev:agents`, or `pnpm dev:all` for both, in order. **Agent cards are fetched once, at startup**: an app that comes up later can't be asked anything until the orchestrator restarts. It names any app it couldn't reach at startup, so if nothing gets routed, read that line first.

## Apps

Started by the launcher (`pnpm dev:all`), it reads its apps from the `manifest.json` in each folder of the launcher's agents dir, so `pnpm dev:all --agents-dir ../a2uiverse-apps/mocks` runs on the two mock stores alone. Started on its own, it falls back to the five apps in `src/registry/entries.ts`: GitHub on `11001`, Gmail `11002`, Google Calendar `11003`, CircleCI `11004` and Linear `11005`.

## Configuration

| Variable                          | Default                                       | Meaning                                                                                                |
| --------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `PORT`                            | `10001`                                       | Listen port                                                                                            |
| `BASE_URL`                        | `http://localhost:<PORT>`                     | The address its agent card advertises                                                                  |
| `STATE_DIR`                       | `./.state`                                    | The journal and the cached embedding model                                                             |
| `GOOGLE_API_KEY`                  | —                                             | The Gemini key. Without it, questions fail; actions inside fragments still work                        |
| `A2UIVERSE_PLANNER_MODEL`         | `gemini-3.7-flash`                            | The Planner's model                                                                                    |
| `A2UIVERSE_PLANNER_EFFORT`        | `low`                                         | `low` (no thinking) or `default`                                                                       |
| `A2UIVERSE_SYNTHESIZER_MODEL`     | the Planner's if set, else `gemini-3.7-flash` | The Synthesizer's model                                                                                |
| `A2UIVERSE_SYNTHESIZER_EFFORT`    | `low`                                         | `low` or `default`                                                                                     |
| `A2UIVERSE_SHORTLIST_CAP`         | `5`                                           | How many apps the Router hands the Planner                                                             |
| `A2UIVERSE_SOFT_DEADLINE_SECONDS` | `10`                                          | How long with no answer releases the merge without the late apps                                       |
| `A2UIVERSE_HARD_CAP_SECONDS`      | `300`                                         | How long before an app's slot fails                                                                    |
| `A2UIVERSE_HEARTBEAT_SECONDS`     | `30`                                          | How often a quiet stream sends an empty event, so a proxy's idle timeout never cuts it                 |
| `A2UIVERSE_AGENTS_DIR`            | —                                             | Read the apps from this directory's manifests. The launcher sets it                                    |
| `A2UIVERSE_AGENT_URLS`            | —                                             | JSON `{"<appId>": "<url>"}` overriding apps' addresses                                                 |
| `A2UIVERSE_DEBUG_IDS`             | off                                           | `1` adds each app's own task and context ids to what it relays                                         |
| `A2UIVERSE_FAULTS`                | —                                             | Dev only: JSON making an app's answers slow, hang, break, refused, failed or invalid, to test failures |

The design record, with every step of a turn, is [`_dev/docs/design/orchestrator.md`](../../_dev/docs/design/orchestrator.md).
