# (idea) A2UIVerse Spectra and A2UIVerse Observatory — DevTool and Monitor for generative UI agents, A2UI first

Recorded 2026-10-09. Two members of the A2UIVerse family beside the canvas shell and Stellify: observability and evaluation for agents that generate user interfaces, in two parts on one floor — **Spectra**, the DevTool for the developer of one agent, local, which shows what one turn is made of; and **Observatory**, the Monitor for the engineers and designers who run agents in production, which keeps watch over all of them. Both depend on A2UI alone, not on A2UIVerse: the family name is branding, not a dependency. Protocol-agnostic in principle; A2UI is the first and, for now, the only target.

---

## The gap

LLM observability platforms — Langfuse, MLflow, Maxim, Arize, Datadog's LLM product — trace prompts, tool calls, tokens and latency and attach judge scores to spans. None renders what the model drew, measures its structure, or knows that a person acted on it. The trace stops at text. A search on 2026-10-09 found no product that monitors LLM-generated interfaces.

The evaluation model was written in the upstream UX thread ([Discussion #2095](https://github.com/a2ui-project/a2ui/discussions/2095)): four levels — task outcome, agent decision, generated UI plan, host renderer — a stable task id with the UI specification or its hash, components used, validation failures, revisions and outcome recorded per session, golden tasks replayed against each new version, A/B tests on generation policies rather than on screens. The unit of optimization is the task plus the generation policy: the widget library, the design rules and the prompt. Nobody built the tool.

## Why A2UI first

The protocol hands over hooks no other generative UI stack has: a tree that can be diffed and clustered; a catalog schema to lint against; a data model with declared bindings; a standard validation error format; `sendDataModel`, a data model snapshot on every action; in v1.0, an `extensions` container at component scope and action-egress scope that the spec names as the place for telemetry identifiers and attestations; agent SDKs whose generator and parser are tap points; renderer libraries that mount the tree and dispatch actions.

Artifact kinds across the wider field, and what a monitor can see of each:

| Artifact kind | Examples | Visible to a monitor |
| --- | --- | --- |
| Declarative spec | A2UI, other JSON-tree generators | Validity, structure, component usage, diffs, deterministic re-render |
| Widget selection | OpenAI Apps widgets, MCP Apps in a frame | Tool choice and arguments, render evidence |
| Generated code | HTML or React streamed from the model | Screenshots and a judge; little structure |

Expansion beyond A2UI is an adapter per artifact kind over one normalized turn record, and span attributes defined as an extension of one of the 2026 conventions — OpenTelemetry GenAI, OpenInference or OpenLLMetry. Not now.

## Two parts, one floor

| | Spectra (DevTool) | Observatory (Monitor) |
| --- | --- | --- |
| Scope | One agent, one developer, the turn that just happened | Many turns, a team, production |
| Where | Local: a panel beside the agent in development, served by the agent kit or a browser devtools pane | A service: a backend and a shared UI |
| Question it answers | Why did it draw this | What is it drawing, for whom, how well, and what changed |
| Users | The agent's developer | The engineer watching validity and latency; the designer watching coverage and misfit |
| Needs | Nothing: no account, no server, no aggregation | Agents in production emitting the turn record |

The floor they share: the two taps, the normalized turn record, and the renderer that replays a tree into pixels, built once as a library. Spectra is the library with a local viewer; Observatory is the library with a store behind it. Goldens sit on the seam: defined in Spectra from fixtures, run by Observatory as a gate and as the nightly drift check.

Spectra is what gets adopted — free, local, useful on the first turn an agent paints — and every Spectra user already emits the turn record Observatory ingests. Spectra can exist before there is production traffic to watch; Observatory waits for agents in production.

### The taps

Two taps, one id. An agent-side tap records generation; a renderer-side tap records the render and the person's actions on it; joined by surface id and the transport's context id, stamped through v1.0 extensions. The renderer side is where "did it work for the person" lives, and nothing in the field sits there.

## Features

Signature features are marked ★. Each group names the part that owns it.

### Capture and the turn view — Spectra

- **Two taps.** Agent side: the prompt snippet with its catalog version, the raw model text, each parsed message with its timestamp, validation findings, retries, tool calls, tokens, cost. Renderer side: arrival, render completion, mounted components, data model snapshots, every action with the component that fired it and the time since render.
- ★ **Film strip.** A surface replayed as it streamed, one frame per message, tool calls interleaved on the same timeline: where the seconds went — before the first token, between messages, inside a tool call.
- **Four panes.** Raw model text, parsed tree, data model, and the screenshot re-rendered through the real catalog implementation. A click on a component in the screenshot highlights its JSON, its binding and the span of model text that produced it.
- ★ **Token attribution.** For any component, the tool result and the prompt passage it came from.
- **Retry diff.** The tree diff between a failed attempt and its retry, beside the correction text that caused it.
- **Action trail.** What the person did on the surface and the next turn it caused, on the same timeline.

### Structural analytics — Observatory

- ★ **Intent by shape matrix.** Requests clustered by meaning, trees by normalized shape, crossed. One intent drawn as many shapes is an inconsistency; one shape serving many intents is an overloaded screen. The designer's coverage map, and later the list of widgets worth authoring.
- **Catalog heat.** Components used, never used, or failing validation most. A dead component is prompt tokens paid on every turn.
- **Binding health.** Paths bound that the data model never fills; data sent but never bound; literal leakage — values hardcoded that should have been bound and go stale on update.
- **Action health.** Actions declared but never fired; events the agent answered with an unhandled reply; `openUrl` to a domain never seen before.
- **Streaming quality.** Time to first component; whether the root arrived first; how long placeholders were on screen; components that moved after arrival.
- **Error taxonomy.** Unknown component, dangling child id, truncated output, streaming parse failure, each with example turns and a link to the matching upstream issue.

### Quality, review and rules — Observatory; design-rule lint also runs in Spectra on the current turn

- ★ **Design-rule lint.** The vendor's designers write rules over the tree: a destructive action is never primary; every list declares an empty state; at most seven choices in a picker; no credential input anywhere. Violations trend per rule and link to turns.
- **Review queue.** Sampled surfaces rendered for a person to score against a rubric, a vision model as first pass, disagreement tracked. A reviewed surface becomes a golden in one click.
- **Accessibility audit.** On the tree against v1.0's label requirements; on the render with a standard checker.
- **Vocabulary monitor.** Words on the screen that should never reach a person: protocol terms, developer terms, raw hosts.

### Evaluation and change control — one-click fixture and counterfactual replay in Spectra; goldens defined there and run by Observatory; the rest Observatory

- ★ **One-click fixture.** Any production turn exported as a deterministic test case with its recorded tool results, from the trace view.
- ★ **Counterfactual replay.** A recorded turn re-run with a different model, prompt, inference format or catalog version against the recorded tool results: no credentials, no live vendor.
- **Golden set as a gate.** Curated requests with expected properties — shape cluster, required action, validity, latency bound — run on every prompt, catalog, library or model change.
- **Policy experiments.** A/B over generation policies: prompt variant, model, Direct JSON versus Express, macro library version; compared on validity, latency, tokens, shape consistency, judge score.
- **Provider drift alarm.** The golden set run nightly with nothing changed locally; the only thing that notices a silent model update.
- **Catalog change impact.** A renamed or removed component shows every recorded turn and golden that used it.

### Operations and the designer's loop — Observatory

- **Dashboards and alerts** on validity, retry and apology rate, latency percentiles, tokens and cost, sliced by intent cluster, model and catalog version.
- **Interaction funnel per shape.** Rendered, interacted, completed or abandoned; the rage signals — the same question re-asked, immediate back, a question surface dismissed unanswered.
- **Macro library analytics**, once upstream ships macros ([Issue #2898](https://github.com/a2ui-project/a2ui/issues/2898)): usage and fit rate per macro; improvised shapes near a macro that should have been used; shapes far from every macro that want one.
- **Annotations that become rules.** A designer's comment pinned to a component in a trace, promoted to a lint rule or a golden.
- **Structure-only retention.** Trees kept with leaf values redacted: the shape history survives, nobody's data does.

## Where to start

Spectra first: the two taps and the four-pane turn view beside an agent in development, with one-click fixture and counterfactual replay as its two signature features. It can begin the moment the Phase 19 model-trial harness is written as a reusable module rather than a script, since that trial is counterfactual replay done by hand. Observatory follows at Phase 17 of A2UIVerse, in parallel with the ladder, when v1.0's extensions give the renderer tap a conformant home and the Phase 18 proposal has a second exhibit: not only a host that composes A2UI agents, but how an A2UI agent is operated.

## Raw material in hand

- The agent kit records every live turn — request, tool calls, tree — and derives deterministic and stub fixtures from recordings (`docs/design/agent-kit.md`).
- Stub mode replays against fixtures with no credentials: the golden run's substrate.
- The kit's validator and question policies produce the pass-or-fail; the recorder renders surfaces through the real runtime for the visual specs.
- The orchestrator's journal stamps `plan.planMs` and `synthesis.deadAirMs`: the platform's own generators as a second tenant of the same tool.
- Upstream's `eval/` and `conformance/` cover the SDKs and the protocol, not a vendor's agent in production.

## Risks

- An LLM observability vendor can add "render this JSON and screenshot it" in a quarter. The renderer-side tap, the designer workflow and the library-coverage loop are the parts they will not easily add; they are built first.
- Distribution runs through Spectra and through the renderer taps. A contribution adding telemetry hooks to upstream's renderers through v1.0 extensions is both the contribution and the channel: every host that updates gets the hooks, and the backend that understands them is Observatory.
- The demo has to show a designer fixing a real misfit in minutes, not a dashboard.

## Related

- `_dev/docs/(idea)A2UI-Agent-Widget-Layer.md` — the widget library Observatory maintains: authored by the vendor's designers in upstream's macro format; retrieval, fill and coverage telemetry derived from recordings.
- `_dev/docs/phase-19-model-trial-notes.md` — the model trial, an instance of counterfactual replay done by hand; the upstream threads; the A2UI-unique prompts.
