# Task 5.11 — The Synthesizer's worked examples

The examples the Synthesizer's system prompt carries, rewritten against the shapes task 5.6 recorded from the unmodified roster. Phase 5 (`_dev/docs/spec/phase-5-heterogeneous-shapes.md`) decisions 7 and 19; SPEC §3 (S1), §4.4.

## Scope

- The S1 worked example rewritten over the shapes the real roster paints, replacing one that assumed a uniformity the roster does not have.
- The composition doc gains the rule the example illustrates.
- Task 5.6's finding about the un-comparable calendar time discharged.

The operator set is not touched. The comparison example is not touched. The Planner's prompt is not touched.

## Locked decisions

### 1. Examples teach form; the doc teaches vocabulary and rules

The governing principle, and the reason for the decisions below. Too many examples pull the model toward imitating them rather than reasoning inside the closed vocabulary, so anything that generalizes is stated as a rule in prose and the examples carry only what makes the form legible.

### 2. No new operator

Decision 19 stays closed. A normalizing operator has nowhere to get the date a wall-clock time omits, a time range is not a time at all, and an operator reducing every value to a time of day would order a pull request from a previous year into the current morning. There is no single operator that makes this axis honest.

### 3. Two examples, and the comparison is untouched

The comparison example keeps both its shape and its data: it is also the client's synthesis fixture and the mock storefronts' regression shape, so changing it would churn work outside this task. One S1 example beside it.

### 4. The S1 example is over the real recorded shapes

Because those shapes include a source whose time cannot join the axis, the single example necessarily shows that case. There is no paired clean-and-degraded set: ranking the situations invites the model to treat one as the normal shape and the other as an exception.

### 5. A source that cannot share the axis gets its own region

The merged view orders the sources that genuinely share the sort key and presents the one that cannot as a separate group, with its time shown as a label rather than a sort key. One sort declaration, over the ordered array only. The note records why. Nothing on the screen claims an ordering that is not real.

This makes the merged view structurally asymmetric — sources are no longer interchangeable rows, and the Synthesizer must judge which sources can share an axis before laying anything out.

### 6. The rule is stated in the composition doc

The doc states, where it covers sorts, that the sources able to share a key are decided before anything is ordered, and that a source whose values cannot join gets its own group rather than a false position. Unlike the ref form settled in task 5.10, this rule cannot be enforced by a validator — it is a judgment about data — so prose and depiction are the only levers, and both are used.

### 7. The example's data is trimmed hard

Field names and value formats are the recorded ones, including the opaque identifiers and the compound identifier one source spreads across two fields. Two entries per source, filler prose dropped. The tree stays near-minimal: the second region adds one group, not a demonstration of the catalog.

## Invariants

- The examples are fixtures that make the form legible; they are never a document to reuse and never the sources of the current turn.
- Nothing here reaches the vendor wire.

## Open items

- Whether the composition doc's vocabulary coverage is adequate more broadly. The same instinct is already recorded against the `packages/sdk` README rewrite in task 5.8, and it belongs there rather than in this task.
