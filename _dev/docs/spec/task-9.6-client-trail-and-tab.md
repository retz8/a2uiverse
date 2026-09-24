# Task 9.6 — Client, the trail and the past canvas as a tab

The client's part of Phase 9's canvases (`_dev/docs/spec/phase-9-durable-composition.md`, decisions 1, 4, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16 and 17; `_dev/docs/spec/task-9.2-composition-contract.md`; `_dev/docs/spec/task-9.3-orchestrator-canvases.md`): the trail as board F5 of the 7.14 design canvas (https://claude.ai/artifact/W324EkZXFze2CxddzNve1o) draws it, a past canvas as a tab that acts and keeps running, every message naming its canvas, Phase 1's fork hold and the ring cap retired. SPEC §4.3, §6.4, §10, §14.

## Scope

- A canvas as a runtime of its own on the client, held for the session.
- The trail: entries, marks, the branch annotation, the close, the hover preview, the rail and the Trail button.
- The past canvas as a tab: the banner, "Ask this again now", "Return to live", actions and presses landing in it, its own progress line.
- The canvas and its parent on every message.
- Phase 1's fork hold, the paint ring and its cap retired.
- The synthetic beat, tests, README updates, a live sanity pass through the tunnel.

## Locked decisions

### 1. A runtime per canvas

Each canvas owns its own live processor, turn runner, synthesis session, binding index and composition state, created at its opening utterance and kept for the session. The viewed canvas's runtime is the one mounted on the stage; the others run on unmounted, their streams arriving and their synthesis evaluating in the background. The paint ring, serialize-on-swap, the parked sandbox and the unpark write-back are retired. Hold-and-swap survives inside a canvas, for an action repaint streaming into staging. Within a canvas a new stage paint replaces the old with no entry; the per-agent stacks are 9.7's.

### 2. A store per canvas, a trail store above

Each canvas runtime owns its own instance of today's store with the timeline fields removed, so the turn runner, the synthesis session, the progress line and the composition readers keep their present API. A trail store above holds the list of canvases with their entry facts — title, question, asked-at, parent, loading — which one is live and which is viewed. The overlay question, the blocked-action cue while a turn is in flight, notices, prose and the strip's error are each the canvas's own; the trusted page and the palette are page-wide.

### 3. A client-minted canvas id, the context attached when learned

The trail keys canvases by an id the client mints at the send. The runtime records the A2A context from the first event, and every later message on the canvas — action, press, error report, close — carries it. A canvas whose first send never reached the orchestrator stands as an entry with its question and the strip's words, and can be closed with nothing sent.

### 4. The question labels the entry until the Planner's title arrives

The truncated question is the entry's label from the send. The Planner's title, arriving as `paintMeta` for `shell:main`, replaces it with a short crossfade — none under reduced motion — and the label never changes again. No typing animation. The question stays the canvas's header verbatim.

### 5. The parent on every question, "from" only on a branch

Every opening utterance carries the viewed canvas as its parent; only the session's first question, asked on an empty canvas, is a root. The opening utterance carries no client data model. A real branch — an entry whose parent is not its chronological predecessor — is annotated by the spine's line into its parent and a branch glyph in its meta line, no time: the glyph names the parent's title on hover and for assistive technology, and hovering it lights the parent's row; once the parent is closed it says so.

### 6. The loading mark follows the running predicate

A canvas is loading whenever its progress line would show a spinner: the opening turn until the orchestrator's final, an action turn inside a fragment, or a press sent or running. The mark and the spinner never disagree.

### 7. "Ask this again now" sends at once; live gets no new button

On a past canvas the banner's button sends the canvas's question verbatim as a new opening utterance with this canvas as its parent, no palette, and the view moves to the new canvas, which becomes live. The live canvas gets nothing new in 9.6; the header's "Edit and ask again" then Enter is the same thing in two steps. The Ask pill on a past canvas reads "Ask from this view" as board F5 draws it, and the header's "Edit and ask again" on a past canvas sends a child too.

### 8. The close is immediate

The close on an entry shows on hover and focus. The click sends the close operation on the canvas's context, aborts every stream on the canvas, drops its runtime and its entry, with no confirmation. Closing the viewed canvas goes to live; closing live makes the newest remaining canvas live and shows it; closing the last canvas leaves an empty canvas with the palette open.

### 9. The preview is a scaled second mount with the canvas's progress line

On hover or focus of an entry the canvas's shell surface is mounted a second time from its own runtime, in an inert box scaled down, pointer events off. Beneath it, one line: the canvas's own progress line — the words under its question, where that canvas got to — which is also the preview's accessible name. No list of sources or paint titles. One preview exists at a time, torn down when the pointer leaves; the entry being viewed gets none.

### 10. One time, on the banner

The band reads "Parked · asked at HH:MM", with "Ask this again now" and "Return to live" naming the live question, laid out as board F5 draws it. The progress line shows on a past canvas exactly as on live — its own state, running or landed — with no time appended. Per-fragment time is out of 9.6.

### 11. The rail stays open

The Trail button beside Back opens the rail as a drawer over the canvas, as board F5 draws it — nothing beneath it moves; the rail is 272px and grows 16px per lane the spine needs past its second, so the names keep their room however many branches there are. Picking an entry switches the view and closes the rail, since the drawer covers what the pick brought on screen; the rail also closes on its own icon, on the Trail button again, on Escape, and on a click on the faint scrim over the page, which lands nowhere else. Entries group under day headers — "Today", "Yesterday", then the date. Closed, the canvas shows only Back — to the older neighbour by asked-at, disabled on the oldest, no Forward — and, on a past canvas, the banner.

### 12. Board F5 is followed as closely as the client can

The rail, its entries and marks, the band and the Trail button follow board F5's drawing — its layout, words, icons and placement — as closely as the client can, departing only where a phase decision says otherwise (the banner's time, the close per entry, the loading mark). The trail's branching is drawn as F5 draws it: a spine beside the entries, newest first with live at the top — a node per entry, the live one filled with a halo, the viewed one filled, the rest rings — each entry's line running down to its parent's node, a branch in a lane of its own curving into the canvas it was asked from. The viewed canvas's lineage is drawn in ink, the rest in the faint grey; hovering a "from" mark lights its parent's row. The node column is 48px and the row's highlight covers the names alone, 8px inside it. The Trail button's icon is a branch; the rail closes on a close icon.

### 13. A new utterance ends nothing

A new utterance never cancels or supersedes anything; the `superseded` state and the side-stream cancel on utterance go. `a2uiForkContext`, the fork fields on the cause and the timeline cap are deleted; the cause keeps its kind and payload.

### 14. The design check is a synthetic beat

A `trail` beat whose turns open several canvases — a root, a child asked from live, a branch asked from a past canvas, one held loading — so the rail shows every mark at once and the banner stands on a past one. The Playwright spec takes its baselines from it. The shell catalog's states page is untouched. A multi-beat replay opens one canvas per utterance beat, a press beat belonging to the utterance before it.

### 15. Tests, docs and the sanity pass

The time-travel and history tests are rewritten to the trail. The canvas README's timeline section and the client README's beat list are updated in the task. The live sanity pass runs the three processes and drives the canvas through the tunnel URLs.

## Invariants

- Only asking makes a trail entry.
- A canvas keeps running after the user leaves it; nothing but its close ends it.
- The trail's words are the client's; the entry's label is the Planner's title, the header the user's question.

## Open items

- Per-fragment time at the attribution row, noted for 9.9's sittings.
- A refresh press on the live canvas, if 9.9's sittings want it.
