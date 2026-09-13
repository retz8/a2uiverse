# Phase 6 — The shell as an agent

The orchestrator's model answers an utterance itself, in the shell catalog, when no vendor serves it — installed agents, what the canvas can do, the platform's own state (M3s). SPEC §4.2, §4.4, §5, §8, §10, §12. The phase re-frames the Planner the way Phase 5 re-framed the Synthesizer: from a closed layout grammar into the author of the shell's own surface, the same act as an A2UI agent authoring its surface.

## Scope

- The platform's own AgentCard in the Registry, ranked by the Router like any vendor's.
- The Planner authoring `shell:main` — layout, framing content, and the platform's answers — as a tree in the shell catalog. `direction` and `archetype` are gone.
- Platform state exposed to the Planner as a closed set of readers, called on demand.
- The line between what the model may author and what stays a trusted page: the Store page and the App Library.
- Capability gaps named by the Planner and painted as a fixed tile.
- The shell's closed action set, declared in the shell catalog, journaled.
- First paint measured on the real roster; streaming the layout as the planned mitigation, added to this phase if the number calls for it.
- SPEC amendments where the decisions below change it: §4.4 (archetypes), §5 (the turn), §8 (the gap), §10 (the Planner's row), §12 (M3s).

## Locked decisions

### 1. The platform has a card in the Registry

The orchestrator's own AgentCard — the one it already serves at its well-known path — gains hand-authored skills describing what A2UIVerse is, what the canvas can do, describing installed apps, and how apps are found and installed. Its `palette` skill stays. The Registry indexes it under the reserved `shell` id beside the vendors' cards, so the Router ranks it and the Planner reads it as card content, exactly as it does a vendor's. One card, two readers: the client and the Router. Its skill texts are what let the Planner tell a platform question from a capability gap.

### 2. The Planner is the shell's designer and its voice — one call

There is no second call. The shell's answer to a platform question is content the Planner writes into `shell:main`, from the readers in decision 4. The Planner's prompt gains the shell catalog and its guidance through the same sdk builder the Synthesizer uses, framed as the shell's UI designer. The plan's `shell` slot keeps its one meaning, the merged view over two or more sources; the shell's own answer is never a slot. A second call is reopened only if a reader ever needs to be large.

### 3. The Planner authors `shell:main` as a tree in the shell catalog

The Planner emits the shell's layout surface as text, validated after, one retry carrying the failure, a second failure a broken turn — the Synthesizer's loop. `direction` and `archetype` are dropped from the plan. `Slot` is the Planner's placeholder: one per dispatched source, one for the reserved merged view, one per gap. `Attribution` is not in the Planner's vocabulary; the painter wraps every vendor-fragment `Slot` in its `Attribution` deterministically, so the unsuppressable guarantee stays in code — the `shell` synthesis slot and gap slots are the shell's own content and carry none (§4.3). The Planner may paint framing content in the layout — headings, a restated question, the shell's own words — and platform answers; it still sees no vendor data. The validator checks exactly one `Slot` per dispatched source, a merged-view `Slot` if and only if one is reserved, a `Slot` per gap, no unknown component, no formula-bound path, no `Frame`, no `Attribution`, no action outside decision 7.

### 4. Platform state is a closed set of readers, called on demand

Platform state never rides the Planner's prompt as text. It is exposed as a closed tool set the Planner calls only when the utterance needs it, the way a vendor agent calls its MCP — a vendor turn pays nothing beyond the tool descriptions. Three readers, each a bounded deterministic projection of orchestrator state:

- **Installed apps** — from the Registry: id, display name, the card's name and description, its skills by name and description, whether the card was reachable at boot.
- **This canvas** — the current composition for this conversation, structure only: the utterance it came from, which sources sit in which slots and each slot's state, whether a merged view is live, collapsed or declined and the decline's reason. Never a partition's contents, never the synthesis document.
- **Recent turns** — the last few turns of this conversation from the journal, one line each: what was asked, which sources answered, outcome, when. Bounded to a fixed small count.

Vendor partitions never reach the Planner. SPEC §10's "never sees data" resolves as: never vendor data; the platform's own projections, on request. The config and the marketplace index are not readers. A new projection is a new tool, behind the one in-process seam, so the Planner does not change if the platform's state ever moves behind a real MCP server. What A2UIVerse is needs no reader: it is the platform's card, on the shortlist.

### 5. The shell knows what; deterministic pages are how

The shell answers what A2UIVerse is and what is there. Every *how* that changes state is a deterministic page. The Store page stays a trusted route: its content is third-party-authored marketplace cards, prompt-injection surface named in SPEC §16, sitting in front of the install grant, so the whole path from browsing to grant is model-free, not only the consent dialog. The App Library stays a trusted route for management — uninstall, accounts, permissions — every one of which touches a grant. The model may describe installed apps in the canvas from the Registry reader and may paint an affordance into either page; it authors neither, and never reads the marketplace index. Whether the two pages are two routes or one route with two tabs is Phase 13's.

### 6. A capability gap is a `Slot` with a gap source

When the Planner judges that nothing installed serves the utterance — the platform's card included — it names the gap as a prose entry in the dispatch list, beside the sources, and places a `Slot` for it in the tree. The painter fills a gap slot with the fixed capability tile, no model wording in it, no model call; the tile's action is decision 7's "open the Store" carrying the capability as query. A platform question ("how do I add apps here?") is not a gap: the platform's card matches it and the Planner answers. The Planner chooses where a gap sits; the shell chooses what it looks like and says.

### 7. The shell's actions are a closed set, declared in the shell catalog, journaled

Two actions: **open the Store**, with an optional query, and **open the App Library**. They are declared in the shell catalog's schema as the actions a shell surface may raise, so the validator rejects any other name in the Planner's tree. A shell-source action is handled by the client locally, no turn. Until Phase 13 builds the routes, the client shows an ambient notice naming the page and the query and reports the action to the orchestrator as an action turn so the journal records the intent. The capability tile and the model's button share the one action and the one landing.

### 8. `shell:main` carries a data model of literals

Beside the tree the Planner may emit the shell partition's data — literal values, bound by the tree through the catalog's templates for lists. The validator adds one rule: every value is a literal, no formula, no ref. The two shell surfaces stay distinct in kind: `shell:main` holds the platform's own values, `shell:synthesis` holds wiring over vendors' values.

### 9. First paint is measured before streaming is spent

The tree-authoring Planner ships as one response. Its acceptance run records first paint on the real roster. Streaming the layout — the Planner's tree arriving as the model writes it, the dispatch list ordered ahead of the tree so vendors start before the layout completes — is the planned mitigation, not a retreat to a fixed grammar; if the number calls for it, the streaming sub-task is added to this phase.

### 10. Acceptance

On the real roster (GitHub · Gmail · Calendar) with the platform's card beside them, live through the tunnel, evidence recorded as the earlier phases did:

1. **Platform questions, one call each** — "what apps do I have?", "what can I do here?", "how do I add apps?", "what's on my screen?" after a composed turn. Each answered in `shell:main` from the right reader, the journal showing which was called, the Store or App Library button raising its action into the journal and the notice.
2. **A mixed utterance** — "what can I do with my calendar?" dispatches Calendar and carries the shell's words in the same layout.
3. **A gap** — "book me a flight" yields a gap slot and the tile, no vendor dispatched, no shell prose.
4. **Regression** — the S1 temporal merge, a single-agent turn, and the mock-roster comparison all compose under the model-authored layout, with the "side by side" control prompt from 5.7 now side by side.
5. **First paint measured** on the real roster, the number recorded, the streaming decision (decision 9) taken against it.
6. **Vocabulary checks** — the validator rejecting a tree with an unknown action, a formula in `shell:main`, an `Attribution` authored by the model, and a missing source `Slot`.

Not in the list: tile wording beyond a minimal line (Phase 14), the pages themselves (Phase 13), re-planning an existing composition (Phase 9).

## Invariants

- The shell is one more A2UI agent whose catalog is the shell catalog: in-process, reading platform projections instead of an MCP, but painting like any vendor from the Planner's side and the client's.
- The model authors nothing that reads third-party-authored content or leads to a grant. It may author an affordance into it.
- `Attribution` is added by code, never by the model.
- A `shell` `Slot` means synthesis and nothing else.
- Vendor partitions never reach the Planner.

## Open items

- What the capability tile says beyond a minimal line, and whether a gap slot collapses or stands — Phase 14's grill, as the backlog records.
- The streaming sub-task, conditional on the first-paint measurement (decision 9).
