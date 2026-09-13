# Handoff — task 6.4, the platform's card and the Planner rewrite

Done on `main` (`072b856` shell catalog + client, `6ad70b1` orchestrator), `pnpm verify` green. Spec: `_dev/docs/spec/task-6.4-planner-rewrite.md` (`7439749`). Live smoke (`A2UIVERSE_PLANNER_LIVE=1 pnpm --filter @a2uiverse/orchestrator test planner.live`, `gemini-2.5-flash`, low effort): fan-out 3.1 s, platform answer 4.2 s calling `installed_apps`, gap 2.5 s — each accepted on the first attempt.

## For 6.5 (client)

- `shell:main` now arrives as createSurface · `updateDataModel` (only when the data model is non-empty) · `updateComponents`. The client does not read that data model yet, so platform answers bound through it render empty until 6.5.
- The tree is model-authored: ids are the model's, layout is `Row`/`Column`, `Frame` is gone from the catalog. Each vendor `Slot` sits inside an `Attribution` (`attribution-<slotId>`) with `child` and the copied `weight`; the synthesis slot (`content: shell`) and gap slots are bare. The roster still pairs by "Attribution immediately before its Slot" — it may now follow `child` instead.
- Gap slots reach the client as `{component: Slot, gap}` with no state or label; the catalog's tile handles them.
- Recorded beats were transformed mechanically (`Frame` → `Row`/`Column`, old `wrap-`/`attr-` shapes kept); re-record per 6.5.

## For 6.6 (acceptance)

- The live fan-out's vendor requests mirror the worked example's wording almost verbatim; check the requests adapt to the utterance.
- `A2UIVERSE_PLANNER_EFFORT` stays `low`; whether tree authoring needs thinking is 6.6's measurement.
- The platform card is one blended vector like a vendor's; ranking quality on the real roster is 6.6's finding.

## For 6.7 (design records)

- `orchestrator.md`: the Planner (document · validate · readers · platformReaders · prompt · planner), the Registry's platform card, the painter, the journal's `PlanRecord` and ring, the executor's no-dispatch turn. Only the shell-catalog record's `Frame` row was touched in 6.4.
