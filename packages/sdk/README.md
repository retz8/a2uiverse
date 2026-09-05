# sdk

The A2UIVerse app contract (SPEC §13): one normative definition, one JS projection.

```
contracts/   normative JSON — the arbiter every projection is tested against
js/          @a2uiverse/sdk (npm name) — the platform- and catalog-facing projection
```

## What the projection is for

**`js/` — the TypeScript projection.** Built against by the platform (orchestrator: stamping relayed events, surface-id namespacing; client: reading stamps into the placement map; marketplace: publish gate) and by the **catalog half** of a vendor app. The **agent half** of a vendor app depends on the A2UI/A2A protocols alone — nothing a2uiverse-specific rides the vendor wire, so there is nothing for an agent to consume here.

The projection carries a contract test asserting its constants and field names against `contracts/` — drift is a red build, not a runtime surprise. The contract JSON stays normative on its own: a projection in another language is created when a real consumer for it exists.

## Consuming

The projection is consumed as a **git dependency** for now — no registry publishes yet, same channel as `github-catalog`: a git-tarball dependency on this repo, `#path:packages/sdk/js`. In-workspace consumers use `workspace:*`.

Current content: the composition extension (`contracts/composition.v0.3.json`, SPEC §14), internal to the platform (orchestrator ↔ client), in two halves:

- **The composition stamp** — provenance, placement, and per-surface generation counters, on every relayed event's metadata (`a2uiverse`). Descriptive in the contract; a field-name test pins the projection.
- **The synthesize data model** — the data model for a2ui composition: what the Synthesizer authors (SPEC §5.2) and the client evaluates. A shell-catalog tree (the A2UI components list, painted as ordinary A2UI), a free-form derived data model whose every leaf is a formula over refs into partitions — a ref's pointer may carry a `[key=value]` predicate — sort declarations, and a note; or a decline. JSON Schema in the contract, in two named schemas: the model-facing `synthesizeDataModel` (a synthesis or a decline, a `oneOf`; recursive where the model is free-form) and the client-facing `synthesis` (the derived model and the sorts plus the orchestrator's `computedAgainst`), riding the metadata of the event that paints a synthesis surface (`a2uiverseSynthesis`).

Beside the types, the projection ships what both processes must compute identically:

- **The validator** — compiled from the contract (ajv), plus the structure the schema cannot express: every pointer parses, every sort names an array of the model whose elements carry every option key as a formula, the initial key is an option, the tree has one `root` and unique ids. The tree against the shell catalog and the derived-value rule are the orchestrator's checks after it — that is A2UI's validation, not this contract's.
- **The resolution kit** — pointer and predicate resolution against a data model (a value, or absent: missing, ambiguous, null); the model walk enumerating every formula leaf and every ref; ref validity against generations (a predicate ref never goes stale; an index ref is stale under a moved generation).

`js/src/wiring.ts` and `contracts/composition.v0.2.json` are the Phase 4 synthesis wiring, kept only until the orchestrator (5.4) and the client (5.5) switch; they go with those sub-tasks.

The app manifest schema lands with Phase 10.
