# Task 7.5 — `shell-catalog`: relations, the join on the values, navigation

The shell catalog's half of the entity join: the relations a match claim is written in, the join disclosed on the values it affects through the derived-value component, and navigation raised from a value through a host handler. Phase 7 spec decisions 5, 6, 8, 9; SPEC §5.2, §5.4, §7, §14.

## Scope

- The relations declared in `catalog.json` and executed, exported as their own list.
- `CellObject` gains the join and the navigation target; `DerivedValue` draws the join marks, the detail, and the tap.
- The mark rule of decision 9 as a pure function over an object's evaluated relations and a cell's apps, returning the cell's join; the evaluator calls it.
- `createCatalog` takes a navigation handler and an app-name lookup from the host.
- The Synthesizer's keep-set gains the relations; the guidance doc gains the join.
- The orchestrator's validator and the client's intake enforce decision 5's placement: a match claim is written in relations, and no relation stands outside one.
- The composition contract's description of `match` follows decision 7.
- Not here: writing each cell's join and computing its target (7.7, the evaluator); "holds now" and the rule that the tree binds no path under `match` (7.6); landing a navigation in the fragment (7.7).

## Locked decisions

### 1. Three relations: `equal`, `contains`, `judged`

`equal` and `contains` are checkable facts, evaluated live, and can break. `judged` is the Synthesizer's semantic judgment that two values name the same thing where no fact links them: it holds while both values resolve, goes absent when either does, and is never broken.

### 2. Text compares as token sequences

Unicode is normalized and case ignored; text splits on anything that is not a letter or a digit; in scripts written without spaces between words, each character is a token. `equal` is the same token sequence; `contains(a, b)` is b's sequence appearing unbroken inside a's.

### 3. Numbers and instants compare by value

When both sides read as instants — the runtime's existing time reading — `equal` compares the moment, to the coarser precision of the two spellings. When both read as numbers — a JSON number, or text that is only a number with a currency symbol and grouping separators allowed — `equal` compares the value. A spelling that reads two ways stays text. Otherwise, token sequences. `contains` stays token-based; a date without a clock stays text.

### 4. Lists of plain values compare as lists; objects never do

`contains(list, value)` is membership by decisions 2 and 3; `contains(list, list)` is every member of the second in the first; `equal(list, list)` is the same members in any order. A relation over an object does not hold. `contains(a, b)` reads "b inside a" for text and lists alike.

### 5. Relations live only in `match`

The relations are exported as their own list, apart from the formula operators. A relation outside `match` is rejected, an operator inside `match` must be a relation, and the tree binds no path under `match`.

### 6. A relation's state and sides

Each relation evaluates to a kind (fact or judged), its operator, a state — holds, fails, or absent when either side does not resolve; a `judged` relation only holds or is absent — and two sides, each carrying its app, its ref, and its resolved value.

### 7. The join shows on the values, through `DerivedValue`

There is no separate join-disclosure component. The join of a claimed object is disclosed on its values by the derived-value component, which every formula cell already renders through.

### 8. `CellObject` carries its join

The evaluator writes each cell's `join`, computed by the shell catalog's mark rule (decision 9): its mark — none, guessed, or broken — and its evidence, the relations touching the cell's apps, as in decision 6. `DerivedValue` only draws. Nothing binds to `match` directly.

### 9. Which values a link marks

A relation that is absent keeps the link it made: the facts — `equal` and `contains` — that hold or are absent tie apps together; a fact that fails does not. The largest group so tied is the row's core, and its values are unmarked; when no single group is largest, there is no core. An app outside the core tied in only by `judged`, or by no relation, is guessed; an app whose only link fails is broken. A two-app object whose link is in doubt marks both sides. A cell over several apps takes the worst of its apps' marks. An object with no `match` has no join marks. An absent app adds no mark; its cells already show absence.

### 10. The drawing

A guessed value: a dotted underline and a small "?". A broken value: an amber ⚠. On hover or focus, every value from another app shows "From {App} · {the relation's name}", with both values when guessed or broken. The accessible name carries the value, the mark, and the detail. The join marks are a second family beside the contributor marks, so a value can be both partial and guessed.

### 11. App names from the host

`createCatalog` takes a lookup from app id to display name, answered by the client from its roster, falling back to the app id. `DerivedValue`'s contributor detail uses it too.

### 12. `CellObject` carries its target

The evaluator picks each cell's `target` — app, surface, pointer: the winning contributor for a selector operator, the first contributor otherwise. A cell with no refs has no target, and neither has a cell none of whose refs resolves (amended by task 7.9 decision 2).

### 13. The value is the button

Every cell with a target is focusable and raises the host's navigation handler on click, tap, or Enter; the cursor and a faint hover background show it. Its detail is text: the values inside it do not navigate separately. Navigation is a handler `createCatalog` takes, not a catalog function the Synthesizer writes; without a handler, cells are not interactive. A cell with no target is not interactive.

### 14. The catalog and the keep-sets

The relations are declared as functions in `catalog.json`, their descriptions written for the Synthesizer. The Synthesizer's keep-set includes them; the Planner's does not.

### 15. The synthesis guidance doc

It teaches: write `match` on an object whose entries from different apps you judge to be one thing — nothing requires it; `equal` or `contains` whenever a fact links them, `judged` only when nothing but understanding does; how the relations compare (word by word, numbers and times by value, `contains` over a list as "is among"); name each relation as the user would say it; more than one fact keeps a value unmarked when one changes; the join shows on the values, so there is nothing to place, and the tree binds no path under `match`.
