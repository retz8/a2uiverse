# Phase 7 — Entity resolution

Entity join (M4): the differentiator proven. The Synthesizer asserts that entries from different vendors are the same real-world thing without the vendors sharing an identifier or a shape, the merged row over that claim is painted beside each vendor's own fragment, the claim is disclosed and checked, and the user moves from a merged cell to the originating subtree in the vendor's fragment. SPEC §3 (the entity join scenario), §5.2, §5.4, §6.3, §7, §9.4, §10, §12. Navigation from a merged cell is the item Phase 5 decision 14 deferred here.

## Scope

- The entity join proven over real agents: a work item across developer tools, on the `a2uiverse` repository.
- Two new vendor apps, CircleCI and Linear, beside the existing GitHub and Gmail.
- Entity resolution as the Planner's join hypothesis in prose and the Synthesizer's checked match claim per merged object.
- Relation operators in the shell catalog; the match claim in the synthesize data model; the validator rules over it.
- The join disclosed on the values it affects, through the derived-value component, escalating by state.
- Navigation from a merged cell to the originating subtree in the vendor fragment.
- Re-synthesis on appearance, the second half of the IntegrityChecker's walk.
- The composition contract bumped to v0.6.
- SPEC, TODO, apps-repo, and design-record amendments named below.

## Locked decisions

### 1. The bed is real agents

The phase runs over real vendor agents. The mock storefronts remain a regression instrument, as the apps repo's CLAUDE.md defines them, and gate nothing in this phase.

### 2. The entity is a work item across developer tools

The join resolves a work item as it appears in Linear, GitHub, and CircleCI: a Linear issue, the pull request that implements it, and the CI runs on its branch. The work is on the `a2uiverse` repository. This is the developer-tool expansion SPEC §9.4 names.

### 3. Two agents are added: CircleCI and Linear

CircleCI's runs carry the branch and commit hash, the hard-key pair. Linear's issues join on text, the ambiguous middle. Each agent is backed by its vendor's official public MCP server, per SPEC §9.4. Linear's MCP server returns an issue's linked pull requests as attachments on its issue read, `get_issue` — each the pull request's title and URL, the number only inside the URL, with no state and no branch — whether Linear linked it by branch name or by a magic word; its list read, `list_issues`, carries no attachments. The issue's git branch name, on both reads, equals the pull request's branch only when the link was made by branch name. With Linear's issue sync on, the issue's mirrored GitHub issue is an attachment beside it, told apart by its URL. Checked live in task 7.3.

### 4. Resolution is top-down: the Planner states the hypothesis, the Synthesizer confirms it

When the merge is over an entity, the Planner's prose brief on the shell slot names the entity and, per dispatched source, the cue that identifies it there; each vendor's prose request asks for those fields, as Phase 5 decision 9 already does. The Synthesizer confirms the hypothesis against the arrived partitions inside its one call and writes the claim per merged object. Agents communicate with each other in prose. The deterministic embed-and-match pre-pass that SPEC §10 sketches is recorded as the unbuilt later stage for scale, feeding candidates into the same claim shape.

### 5. The match claim is formula leaves over relation operators

The shell catalog gains relations over two refs: equal and contains, facts checked against the data, and judged, the Synthesizer's judgment. Where the Synthesizer judges entries from different apps to be one thing, the object carries its evidence as named relation formulas under the reserved key `match`, each over two refs in two different apps; no rule states which objects carry one. The orchestrator's validator checks at accept time that every relation written holds now; a failure goes back with the one retry. The client's evaluator computes the match formulas live, so the evidence goes absent with the cells when a source vanishes.

### 6. The join is disclosed on the values, escalating by state

A claimed object's join is disclosed on its values by the shell's derived-value component, which every formula cell already renders through; there is no separate component, and the tree binds no path under `match`. The confirmed facts tie apps into the row's core, whose values carry no mark; a value from an app tied in only by judgment is marked guessed, one whose only link no longer holds is marked broken. On hover or focus, each value from another app says where it came from and what matched, in the Synthesizer's words.

### 7. The home source defines the rows

The Planner's hypothesis names where the entity's instances come from; the merged view has one row per instance as that source paints it. Every other source attaches to a row or attaches to nothing. Unmatched entries in the other sources are not rows and stay visible in their vendor's fragment. A row missing an attachment shows the empty cell, a formula with no refs, disclosed as 0 of 0.

### 8. Every derived-value cell navigates

A tap on a derived-value cell focuses the element its ref names in that source's fragment. A cell over several sources goes to its winning contributor for a selector operator and to its first contributor otherwise, and every other source of a row is reached through its own values.

### 9. Landing scrolls, focuses, highlights, and degrades

The client scrolls the component bound to the ref's data path into view, moves keyboard focus to it, and highlights it briefly. When nothing is bound to the exact path, landing walks up the path to the nearest bound ancestor; when nothing under the fragment binds any prefix of the path, it lands on the fragment's boundary. A cell that names a source is always tappable. Nothing is sent to the vendor or to the orchestrator; the client builds the reverse index from data path to rendered component out of what it already renders.

### 10. Navigation is not journaled

A navigation changes nothing in the composition, the partitions, or the plan; it is handled locally and reported to no one. The journal keeps recording utterances, actions inside fragments, and the shell's two actions.

### 11. Appearance fires re-synthesis

On its post-action walk the IntegrityChecker also compares each referenced array's key set against what it held when the document was accepted. A new key in an array the synthesis reads is a change-account entry of its own kind, and the Synthesizer is called with the previous document, told what appeared, to attach or ignore it. Vanish and appear are the two halves of one mechanism.

### 12. The new agents are written to their vendor, never to the merge

Each agent's domain doc and prompt describe what a CircleCI app or a Linear app shows its own user, drawn from what the official MCP server returns. Nothing in them mentions the merge, the shell, the join key, or the other agents. Phase 5 decision 10 applies unchanged to agents this project authors; an agent that does not paint a field the merge needs is the §4.4 fallback, recorded as a finding.

### 13. Acceptance

Utterance pinned: **"what's the status of what I'm working on?"**, its plan dispatching Linear · GitHub · CircleCI, with Gmail, Calendar and the platform's card present in the roster. The real roster live through the tunnel is the gate; beats recorded from the unmodified agents are the deterministic bed; the mocks in deterministic mode, their fixtures re-recorded with match claims, are the regression check.

1. **The entity join end to end**: the plan reserves the merged view, three fragments fill, the merged view lands with one row per active Linear issue, each attachment a derived value over the matching element, every value confirmed, none marked guessed or broken, sorted by last activity, the criterion displayed and changeable. Both beds.
2. **The join is checked**: the validator rejects a document whose match claim carries a relation that does not hold against the partitions, or whose tree binds a path under `match`.
3. **Vanish, live**: opening a pull request inside GitHub's fragment or a run inside CircleCI's turns the affected rows partial at once, in words, with no round trip; the re-synthesis that follows re-points what it can, its note saying what changed.
4. **Appear, live**: rerunning a workflow inside the CircleCI fragment makes a new workflow appear in its run; the walk fires re-synthesis with an appeared entry; the row re-points to the new workflow.
5. **Broken, deterministic**: a scripted repaint that changes a matched field marks the values it cut off broken.
6. **Unmatched**: a Linear issue with no pull request shows the empty cell disclosed as 0 of 0; a pull request with no issue is not a row and stays in its fragment.
7. **Navigation, live**: a tap on a value cell lands on the element's row in the vendor fragment; a tap on a value whose field the fragment does not render lands on its row by degradation; a tap on an absent cell lands on the fragment boundary. No request leaves the client.
8. **Regression**: the temporal merge, a single-agent turn, a platform question, and the mocks' comparison all compose.
9. **Recorded**: the entity-join turn as a beat over the live roster, replayable; dead air measured over three sources and written into the backlog.

Final gate: **Claude-in-Chrome live verification through the tunnel** for every live item, the deterministic items on the same sitting.

### 14. Doc amendments

- SPEC §3: the entity join row keeps its camera example and gains that the milestone proves it over a work item across developer tools; the note that entity resolution is the Synthesizer's named responsibility stays.
- SPEC §5.2: the synthesize data model gains the match claim, named relation formulas under `match` where the Synthesizer judges a join, checked by the validator; the Planner's brief names the entity and each source's cue, in prose.
- SPEC §5.4: the join is disclosed on the values of a claimed object, through the derived-value component, escalating by state.
- SPEC §6.3: appearance is handled, the second half of the IntegrityChecker's walk.
- SPEC §7: the navigation row gains its landing rule and degradation, and that it is not journaled; the reverse-index note becomes what was built.
- SPEC §9.4: the roster gains CircleCI and Linear.
- SPEC §10: the Synthesizer's row names the match claim; the closing "shape only; not settled" paragraph is replaced by the settled shape, with the deterministic pre-pass recorded as the unbuilt stage for scale.
- SPEC §12: the M4 line gains what it proves.
- SPEC §14: the relation operators added to the operator row; a normative machine-checked row for the join disclosure carried by the derived-value rule; the synthesize data model row gains the match claim.
- The composition contract bumped to v0.6, one file, one version line.
- TODO: the Phase 7 line rewritten to the decided scope, with the sub-tasks inlined.
- The apps repo's README and CLAUDE.md roster, and both repos' tunnel port tables, gain the two vendors.
- Design records (`synthesis.md`, and the Synthesizer, IntegrityChecker, client, and shell-catalog sections) rewritten to this design as a closing sub-task.

SPEC §6.2's accepted hazard, a reused identifier resolving to the wrong entity, is unchanged by this phase.

## Invariants

- Nothing a2uiverse-specific reaches the vendor wire; the new agents know nothing of the merge.
- Every leaf of the derived data model is a formula, the match claim included. No value is copied out of a partition.
- A claimed join never renders like a plain one: the derived-value component carries it, and the derived-value rule lives in the validator, not in the tree.
- Navigation is free: no request leaves the client.
- Absent is not invalid.

## Open items

- Slot expansion into a focused or full view of one fragment, and whether navigation lands in the expanded slot — the navigation sub-task's grill.
- The CircleCI project and config on this repository, and the Linear workspace with its GitHub integration, as real setup — the agent sub-tasks.
- How the broken state is provoked on the deterministic bed — the acceptance sub-task.
