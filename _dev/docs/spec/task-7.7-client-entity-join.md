# Task 7.7 — Client: the join evaluated, the nested sort, navigation

The client's half of the entity join: the evaluator computes each match claim live and writes each cell's join and navigation target, a nested sort orders the list inside every row, and a tap on a merged cell lands on the element it names in the vendor's fragment. Phase 7 spec decisions 5, 6, 8, 9 and 10; SPEC §5.2, §5.4, §7; task 7.5 decisions 8, 9, 11, 12 and 13; task 7.12.

## Scope

- The evaluator: relation formulas, each cell's join, each cell's navigation target, the nested sort.
- The sdk: the located form of pointer resolution.
- The reverse index from data path to rendered component, per partition.
- Landing: scroll, focus, highlight, degradation.
- The host relay: the shell-action handler, the navigation handler and the app-name lookup.
- SPEC §7 amendment.
- Not here: slot expansion (Backlog); the synthesis fixture, which stays as it is; the live gate over the real roster (7.9).

## Locked decisions

### 1. Slot expansion is not in this task

Navigation lands in the slot as the Planner sized it. Slot expansion is a Backlog item: a UX improvement for the case where the user wants to focus on a specific slot — zoom in, a new tab, or something different — worth revisiting soon.

### 2. The client ties a rendered element to its component

The client decorates each vendor catalog's component implementations where it resolves the catalogs: every component registers its id, its base path and its data context in the index while it is mounted. Which element a component put on the page is asked only at a tap: the components asked about render a pair of hidden markers around their output for one synchronous read, gone before the browser paints. At rest a vendor's DOM is the vendor's alone. The renderer package is not patched. The shell catalog is not decorated: refs point into vendor partitions only.

### 3. The sdk gains the located form of pointer resolution

Beside the value, the sdk returns the concrete path a key-based pointer resolved to, and on a partial resolve the longest prefix that resolved. The client's index lookup and the degradation walk run on it, at tap time, never at evaluation time. The sdk's tests and README follow.

### 4. What "bound" means

A component is bound to a path when one of its properties binds exactly that path, a `{path}` inside a function call's arguments included; or it is the root of a template instance whose base path is exactly that path; or it owns a template child list over exactly that path. When several components are bound to one path, the first in document order wins.

### 5. Degradation

Landing walks the located path upward one segment at a time and lands on the first path anything is bound to; when nothing under the fragment binds any prefix, on the fragment boundary; when no fragment is mounted for the target's source — its slot failed, collapsed, pending, or resting on prose — on that source's `Slot` element. A source with no slot on the canvas: the tap does nothing and logs a warning.

### 6. Landing

The element scrolls into view, centered, instantly under reduced motion. Focus waits for the scroll to end, and a scroll that stalled or was cut short is finished at once, so a landing always arrives. Keyboard focus moves to the element itself through a temporary `tabindex="-1"`, removed on blur, never to a link or button inside it. The highlight is a ring the shell draws in its own layer over the element's box, fading out; a second navigation replaces it. Nothing is written into a vendor's styles. The ring's duration starts at about 1.5 seconds and is adjusted in 7.9.

### 7. Navigation works on a parked composition

As on the live canvas, against what is mounted, with nothing built for it. Nothing special happens under promotion.

### 8. A cell takes the nearest enclosing claim

A cell's join is computed from the `match` of the closest object above it that carries one, looking through plain objects and arrays alike. An entry of a list inside a row takes its own claim; an entry written without one takes the row's. The shell catalog's mark rule receives one claim and is unchanged.

### 9. `match` is left out of the evaluated model

The evaluator evaluates each claim, hands it to the mark rule, and writes nothing at the key. The evidence is on each cell's join.

### 10. The target, the nested sort and the app names follow their tasks

The target is task 7.5 decision 12's, carrying the ref's key-based pointer. The nested sort is task 7.12's: one declaration, one user choice, the sdk's walk over the arrays the path reaches. App names come from the mounted composition's roster, per task 7.5 decision 11; a parked view's roster is read off its own shell paint.

### 11. One host relay

The shell-action relay becomes the one seam between the shell catalog and the canvas, renamed for what it is: it carries the shell-action handler, the navigation handler and the app-name lookup, bound once by the mounted canvas.

### 12. The synthesis fixture stays as it is

"Synthesis fixture re-recorded" is struck from the task. The camera comparison remains the plain case, a merged view with no match claim. What this task builds is tested on payloads written inside each test.

### 13. Done

`pnpm verify` green with every existing visual baseline unchanged. A Playwright spec on a synthetic navigation beat — the synthesis fixture's storefronts painted in their own catalogs, the synthesis beat painting them in the shell catalog, which is not decorated: a tap lands on the storefront's row with focus and the ring, a tap degrades, navigation works parked, no request leaves the client on a tap. One Claude-in-Chrome sitting through the tunnel on the deterministic real roster with the pinned utterance: the values unmarked, the detail naming the app and the relation, the runs inside every row re-sorting from the one control, a tap on a pull request value landing in GitHub's fragment and on a run value in CircleCI's, the cell of an issue with no pull request landing on the boundary; its findings in the task's handoff. The real demo over the live roster is 7.9's.

### 14. Doc amendments

- SPEC §7: the navigation row's degradation gains the slot as its last stop.
- Phase 7 spec: the slot-expansion open item moves to the Backlog.
- TODO: the 7.7 line drops the fixture and the slot-expansion grill; the Backlog gains slot expansion.
- The sdk README gains the located form. The client and synthesis design records are 7.10's.

## Invariants

- Navigation is free: no request leaves the client, and nothing is journaled.
- The shell never styles inside a fragment.
- A claimed join never renders like a plain one.
