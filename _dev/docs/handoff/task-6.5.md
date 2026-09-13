# Handoff — task 6.5, the client's shell surface

Done on `main` (`becad8b` shell catalog, `09f0090` orchestrator, `ecd9166` client), `pnpm verify` green, all 30 Playwright specs green. Spec: `_dev/docs/spec/task-6.5-client-shell-surface.md` (`22f0525`). The seven beats were recorded live on 2026-09-13 through the local stack (agents `--mode live`, Gmail pseudonymizer armed, orchestrator on `localhost`), `check:fixtures` clean.

## For 6.6 (acceptance)

- The 6.4 handoff's "the client does not read that data model yet" was wrong: the client always applied `updateDataModel` on `shell:main`. Platform answers render as recorded; beat 6 is the evidence.
- Beat 4 ("What needs my attention this morning?") now comes back with a reserved merged view: the Planner reserves synthesis for it as it does for beat 5. The recorded-beat spec admits three or four slots. Whether that is the intended fan-out behaviour for a morning prompt is 6.6's call.
- `weight` defaults to 1 on `Attribution` and `Slot`, so unweighted regions split their axis equally — the "side by side" control prompt should now come out side by side without the Planner writing weights.
- A shell action's journal line reads `openStore on surface shell:main in shell`, payload `{query}`; `sourceComponentId` is the tile's component id, or `functionCall` for the model's button. The overlay is `data-testid="trusted-page-overlay"` with `data-page` and `data-query`.
- An unattributed vendor slot (a painter bug) refuses its fragment and reports `VALIDATION_FAILED` with `refused: true`; the orchestrator's client-error path flips the slot. Never seen live; covered by turn-runner tests only.

## For 6.7 (design records)

- Client record: `shellActionRelay` (the catalog is built at the entry, the canvas binds its handler while mounted), `TrustedPageOverlay` and the store's `trustedPage`, `shellPaintSlots` (roster by `child`, `unattributed` on whole-tree paints), the turn runner's refusal, `reportShellAction` on the side channel beside `reportFragmentFailure`.
- Shell-catalog record: `ShellAction.componentId`, the weight default, the flex-share-before-floor rule in `Slot`.
- Orchestrator record: `#shellActionTurn` in the executor.
