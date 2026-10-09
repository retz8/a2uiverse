# (idea) A widget layer for A2UI agents — choose and fill, draw only what is new

Recorded 2026-10-09. An idea for how an A2UI agent picks what it paints. It concerns the agent side of A2UI alone, not A2UIVerse; a candidate for a separate project, contributed to upstream's agent SDK.

---

## The idea

Today an agent composes every surface from the catalog's primitives, on every turn, and every action inside a fragment is a full generation. The idea is a hierarchy of UI vocabulary, the way a routing engine keeps a hierarchy of paths: precompute shortcuts offline, answer a query on the coarse levels, descend to the fine level only near the endpoints.

Three levels:

| Level | What it is | Upstream's name for it |
| --- | --- | --- |
| 0 — primitives | The catalog's components, as today | the catalog |
| 1 — widgets | A composed subtree with slots where values vary: an email row, an issue card, a confirm dialog | macros (Agent SDK) |
| 2 — screens | A whole surface: an inbox list, a thread view | templates |

At inference the agent works coarse first: a screen if one fits, widgets for its parts, primitives only where the request has something no cached shape covers. The output is a short expression, which widget with which bindings, expanded by code into ordinary A2UI before it reaches the wire.

Two mechanisms carry the idea:

- **Selection by retrieval.** An embedder indexes widgets by their signature and description. For a request, retrieval returns the top candidates and the model sees only those few, not the catalog. The model keeps the right to descend to primitives when no candidate fits.
- **A derived layer.** Widgets are mined, not only authored. The agents record every live run; recurring subtrees across recordings are promoted to widgets, with slots where their values varied. The first time a shape appears the model builds it from primitives; afterwards it is a one-token pick. The cache grows with use, the way a tracing JIT compiles hot paths.

The model's job becomes to choose and to fill, and to draw only what has never been drawn.

## What it changes

- Output tokens: a widget call is tens of tokens where its expansion is hundreds.
- Prompt tokens: the top candidates in context, not the whole catalog.
- Validity: expansion is code, so a widget always expands to valid A2UI; the model can only misfit, not malform.
- Consistency: the same widget draws the same way every time, which is what a person's familiarity with a screen rests on.
- Streaming: a widget pick reveals a whole subtree at once, a skeleton at the first token.
- Clicks: the screen after a click is almost always a cached shape, so the model's job shrinks to which widget with which data, or to nothing.

## Cautions

- **Fit is not a cost function.** Routing has an exact cost; UI fit does not. Retrieval can return the familiar wrong widget, an inbox list for a search result, and the person sees a screen that looks right and is not. The model sees the candidates rather than receiving one; misses are logged; the recorded corpus with first-try validity is the eval.
- **The fill is real work.** A widget has typed slots; tool results must be shaped into them. Where the tool's result shape is known from recordings, code does it; otherwise the model does, and A2UI v1.0's agent functions are the clean place for that.
- **Promotion needs a gate.** A mined widget is reviewed before it is promoted, the place a vendor's designers own quality.

## Relation to A2UIVerse

Nothing on the wire changes: the shell sees ordinary components, composability is untouched, no protocol delta. A widget-stable tree has stable data paths across turns, so the Synthesizer's refs and the client's reverse index survive repaints better — the binding-validity concern of SPEC §6.2, which says a composition's bindings into a vendor partition go absent or invalid when the vendor's tree changes under them.

## Shape of the project

An inference layer between the model and the A2UI wire: a widget index with embeddings over signatures; retrieval and candidate presentation; expansion to A2UI, built on upstream's macro expander rather than beside it; the miner that derives widgets from recordings; evals on tokens, time to first token, first-try validity and fit. Depends on A2UI alone. First dataset: the five agents in `a2uiverse-apps` and their recorded live corpora. Natural home: upstream's agent SDK, as a sibling of the macro expander and the inference formats.

## Upstream state

Upstream has each level as a separate, flat, hand-authored idea, and selection is always the model reading a list.

- [Issue #2898](https://github.com/a2ui-project/a2ui/issues/2898), 2026-09-30, by a maintainer — Agent SDK macros: `@macro` functions composing builder nodes into a reusable component, presented to the model as a tool, expanded into primitives before the message is lowered; this issue adds pre-inference verification that a macro's primitives exist in the active catalog.
- [Issue #657](https://github.com/a2ui-project/a2ui/issues/657) — template-based inference with a formalized template format; "still important for us to pursue", a candidate for the top priority tier.
- [Issue #1898](https://github.com/a2ui-project/a2ui/issues/1898) — progressive disclosure: a manifest of names and descriptions in the prompt, a `loadCatalogItems` tool to fetch schemas before use; measured about two thirds fewer tokens for a slightly slower turn; a maintainer called it reasonable and asked for benchmarks. Its author considered retrieval and set it aside as heavier than a tool call.
- [Discussion #1328](https://github.com/a2ui-project/a2ui/discussions/1328) — layered catalogs: named layers with a when-to-load sentence, activated per turn; the full catalog compiled into the agent, only a subset in the prompt.
- [Discussion #1207](https://github.com/a2ui-project/a2ui/discussions/1207) — a maintainer's answer to slow, varying generation: custom catalogs for well-known requirements, or pre-made A2UI JSON stored in a vector database and retrieved by context.
- [Issue #1826](https://github.com/a2ui-project/a2ui/issues/1826) — "Gen UI is feeling less responsive than I hoped!": 10.6 s for 722 output tokens, 19.5 s for 2,248; open since August 2025.
- Compact inference formats on `upstream/main` under `specification/proposals/`: Express, Elemental, Atom.

Absent from all of them: selection by retrieval, a layer derived from recordings, and descent across levels. Positioning: comment on the macros issue describing mined widgets and retrieval, early.

## Related

- `_dev/docs/phase-19-model-trial-notes.md` — where the time goes today, the model candidates, the upstream threads on generation versus deterministic UI, the A2UI-unique prompts.
