# Handoff — 2.3 shell-catalog

## Where it stands

Implementation complete and committed on `main`; gates green (`pnpm verify`).
**Only the visual pass remains** — it needs Claude-in-Chrome, which the building
session didn't have.

- `packages/shell-catalog`: catalog.json (basic v0_9_1 + `Slot` + `Attribution`),
  runtime CATALOG reusing `basicCatalog` impls, `Provider` binding `--a2ui-*` →
  Radix vars (wrapper-scoped, explicit fallbacks), `SlotContentContext` host seam,
  16 tests incl. schema↔runtime parity and token-scoping assertions.
- Design-check fixture: `pnpm --filter @a2uiverse/shell-catalog dev` → port
  **5174** → `https://vnw20xbg-5174.asse.devtunnels.ms` (forward + set Public).

## What's next

1. Start the fixture; open the tunnel URL in Claude-in-Chrome.
2. Judge: Attribution reads as *quiet* at rest (grayish caption + info glyph),
   expands on hover/focus; Slot pending/failed/collapsed panels look right in
   Radix light · dark · no-Radix fallback columns; scoping-proof row shows red vs
   blue primary side by side.
3. Iterate on feedback → then tick 2.3 via wrap-up.

## Session-end note (phase-level)

Google Workspace Developer Preview enrollment for `a2uiverse-506907` **cleared
and verified**: `tools/call` returns real data from both MCP endpoints (Calendar
`list_calendars`, Gmail `list_labels`) with the umich ADC token +
`X-Goog-User-Project: a2uiverse-506907`. 2.6/2.7 fully unblocked credential-side.

## Open threads

- Parity test asserts functions as subset: upstream implements arithmetic beyond
  its v0_9_1 schema; declaring those waits for M2.
- 7 non-failing react-refresh lint advisories (catalog files export Api beside
  component) — accepted, matches catalog-package shape.
