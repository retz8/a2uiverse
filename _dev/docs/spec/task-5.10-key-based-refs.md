# Task 5.10 — Key-based refs, one form

Phase 5's decision 6 amended: synthesis refs collapse to a single key-based form and index refs are removed from the contract. SPEC §6.2, §6.3, §14; phase spec `_dev/docs/spec/phase-5-heterogeneous-shapes.md` decisions 6 and 23.

## Scope

- The ref contract reduced to one form, with the predicate grammar extended to cover what index refs covered.
- Re-synthesis re-based on ref resolution rather than partition generations.
- The generation baseline and the stale cell state removed from the synthesis path, with the SPEC and phase-spec amendments that follow.
- The composition contract bumped to v0.4.

The worked examples are not in scope. The composition **stamp** half is not in scope.

## Locked decisions

### 1. The collapse is in the contract, not the output surface

One ref form everywhere, rather than a contract that keeps both forms with the Synthesizer constrained to one. Constraining only the output would leave the second validity rule, the cell-marking rule and the two-kinds-of-breakage change account alive in code nothing exercises.

### 2. The predicate grammar gains compound keys

A predicate becomes a conjunction of field/value tests, still requiring exactly one match. This covers arrays whose elements have no single unique field — what index refs were covering — and preserves the property the collapse rests on: a predicate that stops matching fails loudly rather than silently pointing at a different element.

### 3. No value keys

Keying a scalar array by the element's own value is not added. It is circular for retrieval — the value must be written to be selected — and the real questions about a scalar array are membership and size, which are operator questions over the array, not element refs.

### 4. Re-synthesis triggers on absence only

A re-synthesis runs when a ref no longer resolves. The change account collapses to its absent half, and the model is told one thing rather than two. A drill-down fires it; a reorder does not.

### 5. A partition gaining rows without breaking a ref does not re-synthesize

The merged view keeps the rows it wired and does not show new ones. This is Phase 8's scope — late arrival and absorbing a new answer as a visible attributed update — and is not solved here.

### 6. The generation baseline leaves the synthesis payload

The payload no longer carries the generations it was computed against, and the client's evaluator no longer takes them. The ref-validity module goes with them, and its exports leave the sdk's public surface. The composition stamp half is untouched: partitions keep tracking generations, and the stamps on composition events stay as built under phase decision 5.

### 7. The stale cell state is removed

`stale` leaves the shell catalog's derived-value contract — the schema field, the cell state, its rendering — because nothing can produce it once ref validity is resolution-based. `absent` is unaffected. The shell catalog republishes. Phase 9's durable composition is a plausible future producer; re-adding a rendering state then is cheaper than shipping one nothing can reach.

### 8. An index ref is rejected by name

A positional segment stepping into an array is reported as the rule it breaks, not as a generic failure to resolve. The retry is the only signal the Synthesizer responds to, and a message saying the pointer does not resolve would send it looking for a data problem that does not exist. Integer segments addressing object properties stay legal, so the rejection is at the point of stepping into an array rather than at parse time.

### 9. The contract bumps to v0.4

The ref grammar changes and a required payload field is removed, so the change is breaking on both counts and takes a new version line rather than an amendment in place.

### 10. The worked examples are a separate sub-task

The examples do not block this change — they are already key-based, and the model-facing half carries no generation baseline. Their defect is fidelity to the phase's difficulty, and rewriting them wants task 5.6's recorded shapes and its own judgment about how much difficulty to show. That is task 5.11, also before 5.7.

## Invariants

- Absent is not invalid: a ref that never resolved is malformed, and one that resolved when written and later stopped is absent.
- A predicate selects exactly one element; none and several are both absent to a formula.
- Nothing about this reaches the vendor wire — vendors never see the synthesis contract.

## Open items

- **Id reuse across a repaint is accepted, not solved.** A vendor that reuses an identifier for a different entity will have its predicate resolve silently to the wrong element. Generation stamps could detect it only by marking every ref into a repainted partition stale, which is the index-ref rule applied universally and would negate what predicates buy. To be recorded in the SPEC §14 delta register as a known limitation.
