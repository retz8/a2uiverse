# (idea) A widget layer for A2UI agents — choose and fill, draw only what is new

Recorded 2026-10-09. An idea for how an A2UI agent picks what it paints. It concerns the agent side of A2UI alone, not A2UIVerse; a candidate for a separate project, contributed to upstream's agent SDK.

---

## The idea

Today an agent composes every surface from the catalog's primitives, on every turn, and every action inside a fragment is a full generation. The idea is a hierarchy of UI vocabulary, the way a routing engine keeps a hierarchy of paths: answer a query on the coarse levels, descend to the fine level only near the endpoints.

Three levels:

| Level | What it is | Upstream's name for it | Who owns it |
| --- | --- | --- | --- |
| 0 — primitives | The catalog's components, as today | the catalog | the vendor's designers |
| 1 — widgets | A composed subtree with slots where values vary: an email row, an issue card, a confirm dialog | macros (Agent SDK) | the vendor's designers |
| 2 — screens | A whole surface: an inbox list, a thread view | templates | the vendor's designers |

At inference the agent works coarse first: a screen if one fits, widgets for its parts, primitives only where the request has something no authored shape covers. The output is a short expression, which widget with which bindings, expanded by code into ordinary A2UI before it reaches the wire.

The model's job becomes to choose and to fill, and to draw only what has never been drawn.

## Widgets are authored

A widget is a UX pattern. What is shown first, what is hidden until asked, what the empty and error states say, which action is primary, how it reads to a screen reader: none of that is in any corpus. The vendor's designers author widgets, in upstream's macro format, the way they already author the vendor's catalog in its own design language. The widget library is the artifact the upstream UX thread asked for — designers "defining the component vocabulary, composition rules, accessibility invariants" and "boundaries where dynamic generation should not be used" ([Discussion #2095](https://github.com/a2ui-project/a2ui/discussions/2095)).

A pattern derived from what a model happened to draw inherits the model's taste, and nobody signed off on that taste. It is not promoted into the library. The routing analogy ends here: a road shortcut is correct by construction, so deriving it loses nothing; a UI pattern carries intent only a designer owns.

## What the recordings supply

The agents record every live turn — the request, the tool calls, the tree. Those recordings serve the authored library without taking the designer's chair:

- **The index.** An authored widget has to be found at inference. Each recorded tree comes with the request that produced it, so every widget gains real examples of the requests that lead to it. Retrieval over those examples beats a hand-written when-to-use sentence. In A2UIVerse the request is the Planner's prose, since a vendor never sees the user's words (SPEC §16); for a standalone agent it is the utterance.
- **The fill.** Aligning a recorded tool result with a widget's slots shows which field lands where, so filling becomes code where the result shape is known, and a model turn only where it is not. A2UI v1.0's agent functions are the clean place for the latter.
- **Coverage telemetry for the designer.** How often a turn fell through to primitives because no widget fit, and what the model improvised there, clustered by shape and by the requests that caused it. A report of patterns the library lacks, with their variants. Mining proposes; the designer authors or declines.
- **A consistency cache for the long tail, at most.** Where no designer will ever author a pattern, the model improvises anyway; reusing its own prior output for the same vendor makes the improvisation stable and fast. A per-agent memo of its own habits, marked as such, never part of the library.

## Selection

- **By retrieval.** An embedder indexes widgets by signature, description and recorded example requests. For a request, retrieval returns the top candidates and the model sees only those few, not the catalog. The model keeps the right to descend to primitives when no candidate fits.
- **Fit.** Never certain at decision time. Three signals: coverage of the asks — the request's facts and the tool result's fields map onto the slots with nothing left over, a check; retrieval confidence against the recorded examples, a threshold tuned where fit has a ground truth, whether a turn's eventual tree equalled a widget's expansion; and the model's own call among the candidates, which is how upstream's macros already work. The residue — a confident wrong pick looks right until a person sees it — is what Spectra and Observatory are for.

## What it changes

- Output tokens: a widget call is tens of tokens where its expansion is hundreds.
- Prompt tokens: the top candidates in context, not the whole catalog.
- Validity: expansion is code, so a widget always expands to valid A2UI; the model can only misfit, not malform.
- Consistency: the same widget draws the same way every time, which is what a person's familiarity with a screen rests on.
- Streaming: a widget pick reveals a whole subtree at once, a skeleton at the first token.
- Clicks: the screen after a click is almost always an authored shape, so the model's job shrinks to which widget with which data, or to nothing.

## Relation to A2UIVerse

Nothing on the wire changes: the shell sees ordinary components, composability is untouched, no protocol delta. A widget-stable tree has stable data paths across turns, so the Synthesizer's refs and the client's reverse index survive repaints better — the binding-validity concern of SPEC §6.2, which says a composition's bindings into a vendor partition go absent or invalid when the vendor's tree changes under them.

## Shape of the project

An inference layer between the model and the A2UI wire, around an authored widget library in upstream's macro format: a widget index with embeddings over signatures and recorded example requests; retrieval and candidate presentation; expansion to A2UI, built on upstream's macro expander rather than beside it; the fill derived from recorded tool results; coverage telemetry for designers, which is Observatory's job (`(idea)Generative-UI-Monitor.md`); evals on tokens, time to first token, first-try validity and fit. Depends on A2UI alone. First dataset: the five agents in `a2uiverse-apps` and their recorded live corpora. Natural home: upstream's agent SDK, as a sibling of the macro expander and the inference formats.

Order: Spectra and Observatory first, since they are the only way to see whether a library is working; the authored library second, run under Observatory; retrieval last, once the library is large enough that the model reading a list stops working.

## Upstream state

Upstream has each level as a separate, flat idea, and selection is always the model reading a list.

- [Issue #2898](https://github.com/a2ui-project/a2ui/issues/2898), 2026-09-30, by a maintainer — Agent SDK macros: `@macro` functions composing builder nodes into a reusable component, presented to the model as a tool, expanded into primitives before the message is lowered; this issue adds pre-inference verification that a macro's primitives exist in the active catalog.
- [Issue #657](https://github.com/a2ui-project/a2ui/issues/657) — template-based inference with a formalized template format; "still important for us to pursue", a candidate for the top priority tier.
- [Issue #1898](https://github.com/a2ui-project/a2ui/issues/1898) — progressive disclosure: a manifest of names and descriptions in the prompt, a `loadCatalogItems` tool to fetch schemas before use; measured about two thirds fewer tokens for a slightly slower turn; a maintainer called it reasonable and asked for benchmarks. Its author considered retrieval and set it aside as heavier than a tool call.
- [Discussion #1328](https://github.com/a2ui-project/a2ui/discussions/1328) — layered catalogs: named layers with a when-to-load sentence, activated per turn; the full catalog compiled into the agent, only a subset in the prompt.
- [Discussion #1207](https://github.com/a2ui-project/a2ui/discussions/1207) — a maintainer's answer to slow, varying generation: custom catalogs for well-known requirements, or pre-made A2UI JSON stored in a vector database and retrieved by context.
- [Issue #1826](https://github.com/a2ui-project/a2ui/issues/1826) — "Gen UI is feeling less responsive than I hoped!": 10.6 s for 722 output tokens, 19.5 s for 2,248; open since August 2025.
- Compact inference formats on `upstream/main` under `specification/proposals/`: Express, Elemental, Atom.

Absent from all of them: selection by retrieval over recorded requests, the fill derived from recorded tool results, coverage telemetry for the library's owners, and descent across levels. Positioning: comment on the macros issue describing retrieval over recorded requests and the coverage loop, early.

## Related

- `_dev/docs/(idea)Generative-UI-Monitor.md` — A2UIVerse Spectra and Observatory, the DevTool and Monitor that maintain the library: fall-through, misfit, the intent by shape matrix, the review queue, goldens.
- `_dev/docs/phase-19-model-trial-notes.md` — where the time goes today, the model candidates, the upstream threads on generation versus deterministic UI, the A2UI-unique prompts.
