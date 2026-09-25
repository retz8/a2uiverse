# Phase 9 — Durable composition

Durable composition (M5): the timeline as a trail of canvases, a past canvas as a previous tab rather than a frozen past, "Ask this again now", add/drop source and "compare these", and the way back inside a fragment. The trail is board F5 of the 7.14 design canvas (https://claude.ai/artifact/W324EkZXFze2CxddzNve1o), followed as closely as we can. Rewrites SPEC §6.4. SPEC §4.3, §4.4, §5.6, §6, §7, §10, §14.

## Scope

- The trail: one entry per question, drawn flat by time, branches visible, opened on demand.
- A past canvas as a tab: actable, running while the user is elsewhere, stamped with its question's time, closed by the user.
- Asking from a view — a new question, "Ask this again now", add/drop source, "compare these" — as a child canvas planned from the viewed one.
- Each agent's paints inside a canvas as local state, with a way back that costs no call and brings the merged view's wiring with it.
- The canvas named on every message between client and orchestrator, and a composition per canvas on the orchestrator.
- The Planner's title for a canvas, carried through `paintMeta`.
- SPEC and delta-register amendments named below.

## Locked decisions

### 1. The trail is per question

One trail entry per canvas, the answer to one question. Everything that happens inside a canvas — a drill-down in a fragment, a press, a re-synthesis, a sort — is that canvas's own life and adds no entry. Only asking makes an entry.

### 2. An agent's paints inside a canvas are local state

The composition keeps, per agent, the sequence of that agent's paints in this canvas — a linear back/forward stack. A step in it is a surface replacement; a vendor's `updateDataModel` changes the current step, so an agent that drills down by data update alone has no way back, the §4.4 fallback. A new paint after a step back drops the forward ones. Returning to a past canvas shows each agent's last state.

### 3. A step back restores the paint and its wiring

The composition remembers, per combination of agent paints, the wiring it accepted over them — the synthesize data model, never evaluated values. Stepping a fragment back restores its paint and re-evaluates the remembered wiring over it, with no call, as long as every other agent is where it was then. A combination never seen falls to the walk and its call. The step puts that paint's data model back on the orchestrator's partition too, so the merge and the vendor's next answer see what the user sees.

*Amended during the run (task 9.9 decisions 16, 17).* A combination never seen is first covered by a wiring remembered over fewer sources — every source it names where it stands now, the rest having painted since — restored with no call, the sources painted since late for Include. Only a combination nothing covers falls to the walk and its call, and a later step abandons that walk.

### 4. Acting inside a past canvas is the tab's own life

An action inside a fragment of a past canvas runs on that canvas: the answer lands in its slot, its per-agent history grows, the merged view follows as in decision 3. No new entry; the trail entry stays labelled by its question. Presses — Retry, Include, Try again — work in a past canvas the same way. "Live" keeps meaning the newest question's canvas; "Return to live" goes there. The orchestrator answers against that canvas's composition, not the newest one. Phase 1's fork path — holding the parked view while a forked paint is in flight, then returning to live — is retired.

### 5. The trail is a tree, and a question asked from a view is planned from it

Asking from a past canvas makes the new canvas a child of the one it was asked from. The Planner's *this canvas* and *recent turns* readers describe the canvas the user is looking at and its ancestry, so a question asked from a past view resolves against what the user sees.

### 6. A tab keeps running after the user leaves it

Leaving a canvas changes nothing in it: dispatches still out arrive, the soft deadline, the hard cap and the one automatic merge run, presses in flight finish — all in the background. A new utterance no longer ends the previous turn. Going back shows where the canvas got to, its own progress line saying so. No cap on how many run at once; cost is not this project's concern.

### 7. "Ask this again now" is asking from this view

"Ask this again now" is the canvas's own question asked from this view: a new child entry, planned fresh, today's answer; the past answer stays untouched. Refresh on the live canvas is the same press. There is no reload in place; SPEC §6.4's frozen past and its refresh sentence are rewritten to this.

### 8. A canvas is stamped with its question's time

The canvas carries when its question was asked; the parked banner says so. Freshness is per fragment — each agent's paint has its own time, shown at the fragment. "As it was at" is dropped.

*Amended during the run (task 9.9 decision 13).* A fragment carries no time of its own; the question's time on the parked banner is the canvas's one time.

### 9. The trail is drawn flat by time

Entries newest first, each its title and time, a branch annotated with the canvas it was asked from, "Live" on the newest, "Viewing" on the one on screen, a quiet mark on a canvas still loading in the background, a close on each entry.

### 10. The Planner names the canvas

The Planner writes a short title for the canvas in its one call — a new field of the plan, validated for length — written at plan time so the entry is named the moment it appears. It reaches the client as a `paintMeta` for `shell:main`, the part the client already accepts; the truncated question is the fallback. The question stays the canvas's header, verbatim; the title is the trail's label only. A vendor's own `paintMeta` title keeps naming its fragment's paints.

### 11. Hovering an entry shows a preview

A scaled render of the canvas on hover or focus of a trail entry, rendered lazily, one at a time. The list itself stays text.

### 12. Add/drop source and "compare these" are words at the palette

"Add Gmail to this", "without CircleCI", "compare these" are questions asked from this view: the Planner reads the canvas and plans the child — the same sources with one added or removed, or the merge now reserved. Each is a new entry; the parent stands.

### 13. A fragment's way back is beside the attribution marker

A back arrow beside the attribution marker, present only when there is somewhere to go back to, a forward arrow beside it after a back. The previous paint's `paintMeta` title is its name on hover, focus and for assistive technology; "Back" when the agent named nothing.

*Amended during the run (task 9.9 decision 15).* The arrows sit at the right edge of the attribution row, the marker at its start, each a soft accent icon button.

### 14. In memory for the session

The trail and the orchestrator's compositions live as long as their processes; a reload starts fresh. Durable means outliving the turn, not the process.

### 15. The user closes a canvas

A close on each trail entry. Closing a canvas still loading cancels its turn — the one place cancel-on-leave survives. Closing the canvas being viewed returns to live; closing live makes the newest remaining canvas live. No automatic eviction; the ring cap goes, or becomes a guard far above use.

### 16. The trail opens on demand

A Trail button beside Back opens the panel over the canvas, as board F5 draws it. Closed, the canvas shows only Back — to the chronological neighbour — and, on a past canvas, the parked banner with "Ask this again now" and "Return to live". The question stays the one header.

### 17. Every message names its canvas

Every client message — utterance, action, press, error report — names the canvas it acts on, and the orchestrator holds a composition per canvas for the session. `a2uiForkContext` is replaced by that.

### 18. SPEC and delta-register amendments

SPEC §6.4 is rewritten: a past canvas is a tab — not frozen, stamped with its question's time, asked again from the view, never reloaded in place. §5.6 gains the Planner's title. §7 records add/drop source and "compare these" as words at the palette making a child canvas. §10's Composition is per canvas. §4.3 gains the fragment's back and forward beside the attribution marker. The delta register gains rows for the canvas named on every client message and the shell's own `paintMeta` for `shell:main`.

## Invariants

- Only asking makes a trail entry.
- A past canvas is never destroyed by a press on it: ask again, add, drop and compare make a child; the parent stands.
- A step back inside a fragment costs no call when the screen it returns to was seen.
- The trail's words are the client's; the canvas's title is the Planner's, the question the user's.

## Open items

- Reload-survival — the orchestrator persisting a conversation's canvases and the client rehydrating the trail on mount — is a later item, not this phase.
- A user-given name for a canvas stays open for later.
