# Task 7.12 — `sdk`: the nested sort path

A sort declaration's path may pass through the enclosing arrays with `*`, so one declaration orders a list inside every row of the merged view. Task 7.6 spec decision 5; SPEC §5.2, §14.

## Scope

- Composition contract v0.6, amended in place: the sort declaration's path.
- The sdk's validator over nested sort paths.
- One exported walk that expands a sort path over a model.
- Contract tests.
- SPEC §5.2's sort declarations and the §14 synthesize data model row.
- The sdk README and the synthesis design record's contract section, for what this task changes.
- Not here: the orchestrator's template check (7.6); the client's nested sort (7.7).

## Locked decisions

### 1. The path grammar

A sort path's steps are object keys and `*`. `*` stands for every element and is valid only on an array. The last step names the sorted array. A predicate step is rejected; a position was already refused by the sdk's pointer resolution. Option keys stay plain pointers inside one element of the sorted list, with no `*`.

### 2. Any depth

`*` may appear at any depth of a sort path.

### 3. Every element reached carries the list

Every element a path reaches carries the sorted array, `[]` when it has no entries. An element without it is an error naming its location.

### 4. The option-key rule at every depth

Every element of every list a path reaches carries each option key as a formula with at least one ref.

### 5. One declaration per path

One declaration per array compares the path as written: a nested path is declared once.

### 6. One choice for every row

One declaration is one control and one choice, applied to the list in every row, written at `/sorts/N` as today.

### 7. The exported walk

The sdk exports one function that, given a model and a sort path, returns every array the path reaches with its concrete location. The sdk's validator is built on it; the client's nested sort (7.7) uses it.

### 8. The orchestrator's nested-sort check is the sdk's

The orchestrator already runs the sdk's validator over the Synthesizer's output, so the check that a nested sort names a list inside each row lives here.

### 9. One version line

Contract v0.6 amended in place; its version and extension URI unchanged. The JS projection's sort declaration type is unchanged. Landed on `main`, every consumer in the workspace.

### 10. The records follow the change

SPEC §5.2's sort declarations and the §14 synthesize data model row gain the nested path; the sdk README and the synthesis design record's contract section follow.
