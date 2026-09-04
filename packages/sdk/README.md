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

Current content: the composition extension (`contracts/composition.v0.2.json`, SPEC §14), internal to the platform (orchestrator ↔ client), in two halves:

- **The composition stamp** — provenance, placement, and per-surface generation counters, on every relayed event's metadata (`a2uiverse`). Descriptive in the contract; a field-name test pins the projection.
- **The synthesis wiring** — the derived data model the Synthesizer emits and the client evaluates (fields, entities of positional cells, refs into other surfaces, a sort criterion, the generations it was computed against), on the metadata of the event that paints a synthesis surface (`a2uiverseWiring`). JSON Schema in the contract, in two named schemas: the model-facing `synthesizerOutput` (a synthesis or a decline) and the client-facing `wiring` (inner output plus the orchestrator's envelope). Both union-free and non-recursive. The projection embeds them and ships no validator — the orchestrator and client validate with what they already have; a compile-time pin keeps the exported types equal to the schemas.

The app manifest schema lands with Phase 9.
