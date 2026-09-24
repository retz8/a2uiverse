# Task 9.3 — Orchestrator, canvases

The orchestrator's part of Phase 9's canvases (`_dev/docs/spec/phase-9-durable-composition.md`, decisions 4, 5, 6, 10, 14, 15 and 17; `_dev/docs/spec/task-9.2-composition-contract.md`): a composition per canvas, a canvas running on after the user leaves it, the close, the parent and the readers over the ancestry, the Planner's title emitted as `paintMeta`. SPEC §5.3, §5.6, §6, §6.4, §10, §14.

## Scope

- A composition per A2A context, the context minted on the opening utterance.
- A new utterance no longer ending the previous turn.
- The parent canvas recorded, the this-canvas and recent-turns readers over the viewed canvas and its ancestry.
- The Planner's title, clipped, emitted as `paintMeta` for the layout surface.
- The close: what it cancels, what it drops, what it keeps.
- Journal.

## Locked decisions

### 1. An utterance inside an existing context is refused

A question opens a canvas of its own, in a context the orchestrator mints. An utterance that arrives with a `contextId` is refused with a failed final, "A question opens a canvas of its own." The supersede-and-retire path — a new utterance ending the running turn and the replaced composition's presses — goes; nothing ends a canvas but its close.

### 2. Recent turns from the composition chain

The recent-turns reader walks `parent` links from the canvas the question was asked from, up to five ancestors, and writes one line per canvas from its composition state — the utterance, which sources answered, what became of the merged view, when it was opened, still loading or closed. The journal's per-conversation ring is not the source.

### 3. A parent the orchestrator does not hold

An opening utterance naming a parent with no composition here — after a restart, or a client bug — is planned as a root: no parent recorded, this canvas empty, recent turns empty, one log line naming the parent that was not found.

### 4. The title's `paintMeta` leads the shell create

The orchestrator emits `{paintMeta: {surfaceId: shell:main, title}}`, its part metadata `mimeType` the contract's, as the first part of the shell create event, stamped like the rest. No part when the Planner wrote no title.

### 5. What a close does

A close cancels everything running in the canvas — the utterance turn's model calls and dispatches, their vendors told to cancel, every press — and drops its partitions, synthesis, held answers, operations and the vendors' contexts for it. It keeps a light record — utterance, parent, opened when, which sources answered, the merged view's outcome — marked closed, so an ancestry through it stays whole. Later messages in that context are refused, "This canvas is closed."

### 6. The trail entry's name is the Planner's title alone

The current state of a canvas — where each fragment stands — rides the hover preview, drawn by the client from the vendors' `paintMeta` titles (task 9.6). The orchestrator relays a vendor's `paintMeta` untouched and re-titles nothing.

### 7. Consequences

- A vendor's conversation is per canvas — a fresh vendor context for each; continuity across canvases is the Planner's, through the readers.
- The this-canvas reader on an opening utterance describes the parent's composition; the composition state gains `parent` and `openedAt`.
- The plan document gains an optional `title`, asked for in the prompt as a short noun phrase, clipped at the contract's cap with a journal note.
- The journal's `superseded` marker becomes `closed`; the close is journaled as an operation turn; a cancelled turn's final is `canceled`.
- The vendor context map gains a drop per canvas.
- Planner, Synthesizer and pool hold no per-conversation state; canvases running at once need nothing new.
- Orchestrator tests and recorded beats that sent a second utterance in the first context are rewritten to open a new context with a parent.
