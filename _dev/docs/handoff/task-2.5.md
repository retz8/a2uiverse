# Handoff — 2.5 client composition

## Where it stands

**Not started — marked `[WIP]` as the next pickup.** No spec, no plan, no code.
The session that closed here built 2.4 (orchestrator composition core), which
landed on `main` with everything 2.5 consumes.

## What 2.5 consumes from 2.4 (all live on `main`)

- **Every event is stamped**: `metadata.a2uiverse = {source, slot?, role: 'shell'|'fragment', …}` — read with `readStamp` from `@a2uiverse/sdk`. `role:'shell'` → mount at canvas root; `role:'fragment'` + `slot` → mount into that slot.
- **Shell surface** `shell:main`, painted in `@a2uiverse/shell-catalog` (Slot `name` = `slot-<appId>`, Attribution above each slot). Arrives as single-object `version:'v0.9'` DataParts on non-final `working` status-updates — the existing `extractA2uiMessagesFromEvent` already accepts this envelope.
- **Fragments arrive namespaced** `<appId>:<surfaceId>`; outbound actions must carry the namespaced id (the orchestrator reverses it and routes to the owner). The client's `a2uiClientDataModel.surfaces` keys must be namespaced ids — the orchestrator partition-filters per vendor.
- **Slot mounting seam already exists**: `SlotContentContext` / `SlotContentResolver` in `@a2uiverse/shell-catalog` (2.3).
- **`VALIDATION_FAILED`** reporting shape: `{version:'v0.9', error: {code:'VALIDATION_FAILED', surfaceId: <namespaced>, path, message}}` — the orchestrator flips that slot to failed via shell repaint.
- **Exactly one final per turn** (vendor finals are demoted hub-side); slot-state changes arrive as `updateComponents` repaints of `shell:main`.

## What's next

1. Pickup briefs 2.5 from the phase spec (scope: multi-catalog processor, placement map, fragment boundary, Slot mounting, validation + `VALIDATION_FAILED`, ChoicePicker pnpm patch, collision detector — plus deferred-from-1.3: unknown-component degradation, shell re-skin on Radix tokens).
2. Route: grill (recommended — client-internal design is untouched) → spec → plan/implement.

## Open threads

- gmail/calendar catalog ids in `registry/entries.ts` are convention-guessed until 2.6/2.7 publish; the client's static catalog map (`orchestratorApi.listCatalogs()`) is still github-only and 2.5 must grow it in step.
- `@a2uiverse/shell-catalog` gained a `./id` subpath export (catalog id without React) — useful client-side too.
- Whether 2.4's per-conversation composition state needs any client mirror beyond the placement map was deliberately left minimal (phase decision 12: client holds only the placement map).
