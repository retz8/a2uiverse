# Task 7.6 — Orchestrator: the join hypothesis, the match claim, appearance

The orchestrator's half of the entity join: the Planner states the join hypothesis in its brief, the Synthesizer writes and the validator checks the match claim, and the IntegrityChecker's walk gains appearance. Phase 7 spec decisions 4, 5, 7 and 11; SPEC §5.2, §6.3.

## Scope

- Planner: the join hypothesis in the merged view's request, the vendor requests asking for the cue fields, a worked example.
- Synthesizer: the rules doc's join, the worked examples, the validator rules.
- IntegrityChecker: appearance, the change account, broken relations.
- Journal.
- SPEC §5.2 and §6.3 amendments.
- Not here: the nested sort path in the contract (a new sdk sub-task, landed before this task's implementation); the client's nested sort (7.7); the entity join's synthesis landing on 7.8's recorded turn (7.13, after 7.8).

## Locked decisions

### 1. The join hypothesis in the Planner's brief

When the merge is over an entity, the merged view's request states the join hypothesis in prose: the entity, the home source, and each other source's cue. Each vendor request asks, in the vendor's own terms, for the fields its cue needs, and says nothing about the merge. The Planner's validator gains no check.

### 2. The Planner's join example is another entity over fixture cards

"Where are my orders?": a store as the home source, a parcel carrier by the tracking number the order carries, a mailbox by the order number in the confirmation's subject. It stands beside the morning timeline example.

### 3. The hypothesis is the Synthesizer's starting point

The rows are the home source's instances. To attach another source's entry the Synthesizer uses the named cue where the data carries it, otherwise any other fact that links the two, and `judged` only when nothing but understanding does. It never attaches without a reason. The note says where it departed from the hypothesis.

### 4. A row may carry a list of a source's matching entries

A row attaches one entry of a source, or a list of that source's matching entries, each entry an object with its own `match`. The Synthesizer chooses by what the brief asks.

### 5. A list inside a row is sorted through a nested sort path

A sort declaration's path may pass through the enclosing arrays with `*`: one declaration orders that list in every row, and one `SortControl` shows and changes it for all rows.

### 6. A list inside a row carries its count

Every list inside a row comes with a `count` over its entries' refs. A row with no matching entries has a count with no refs: the empty cell, 0 of 0.

### 7. No rows from the home source is a decline

When the home source failed or arrived with no instances, the Synthesizer declines, its reason in the shell's own words.

### 8. The rules doc carries the join, with no domain in it

The Synthesizer's rules doc teaches decisions 3–7. The paragraph that makes two sources' refs in one object an assertion "only when the data says it" becomes: bringing entries from different apps together as one thing is a join, written with `match`. Its re-synthesis section gains: an appeared entry is attached — to a row, into a row's list, or as a new row when it is the home source's — or ignored; a relation that no longer holds is re-pointed, re-evidenced, or detached.

### 9. The camera comparison leaves the Synthesizer's prompt

It stays the mock storefronts' regression bed and the client's own fixture copy. The today timeline stays. The entity join has no worked example (task 7.13).

### 10. Holds now

At accept, every `equal` and `contains` of a match claim is resolved against the partitions and run on the shell catalog's relation functions. A relation that does not hold is a finding naming its path, both refs and both resolved values, and saying: write a fact that holds, or do not attach the entry. The finding never mentions `judged`.

### 11. The tree binds no path under `match`

The validator rejects any binding in the tree whose path passes through a `match` key.

### 12. The nested checks

A nested sort must name a list inside each row. A nested template's bindings are checked against the first non-empty list.

### 13. Broken does not fire re-synthesis

A fact that stops holding while both its refs resolve is disclosed as broken on the client and fires nothing. Any re-synthesis that runs is told which relations no longer hold.

### 14. The watched arrays

The IntegrityChecker watches every array that any accepted document of the composition has referenced. Each watched array's key set is recorded at every accept, re-synthesis included, and is empty when the array is not there. A key is the field set a ref selects by, one key set per field set; an element missing those fields is not keyed. A key present after an action that was not in the set at the last accept has appeared.

### 15. The change account

The change account carries the refs that no longer resolve, the entries that appeared, and the relations that no longer hold. An appeared entry is written as its surface and a pointer selecting the element by its key.

### 16. The journal

The journal gains the change account's two new kinds. The holds-now findings are in the attempts. The watched key sets are not journaled.

### 17. The output schema is the sdk's

The Synthesizer's output schema takes `match` from the sdk's shared definitions and changes nothing of its own.

### 18. Sequencing

The nested-sort sdk sub-task lands before this task's implementation and amends contract v0.6 in place; 7.7 depends on it too and gains the client's nested sort. 7.8 follows this task: its prompts are the requests this Planner writes, read from the journal. 7.13, after 7.8 and before 7.9, lands the entity join's synthesis on 7.8's recorded turn.

### 19. SPEC amendments

SPEC §5.2: lists inside a row and their count, the hypothesis as the Synthesizer's starting point, the decline when the home source brings no rows. SPEC §6.3: the watched arrays, and broken firing no re-synthesis. The nested sort path's SPEC wording goes with the sdk sub-task.

## Invariants

- Nothing a2uiverse-specific reaches the vendor wire: a vendor request asks for data, never for the merge.
- A holds-now finding never offers `judged`.
