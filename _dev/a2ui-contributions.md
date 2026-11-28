# A2UI contributions

Upstream contributions to [a2ui-project/a2ui](https://github.com/a2ui-project/a2ui). A finding
still open is described in `a2ui-findings.md` under the same number.

## Merged

| Finding | What | Issue | PR |
| --- | --- | --- | --- |
| 1 | `ChoicePicker` radio groups collide across surfaces (React/Angular) | [#2447](https://github.com/a2ui-project/a2ui/issues/2447) | [#2449](https://github.com/a2ui-project/a2ui/pull/2449), merged 2026-09-01 |
| 2 | Unsatisfiable `catalogId` requirement in `server_to_client.json` prose | [#2445](https://github.com/a2ui-project/a2ui/issues/2445) | [#2446](https://github.com/a2ui-project/a2ui/pull/2446), merged 2026-09-01 |
| 3 | Basic catalog's CSS-module class maps are dead code (React renderer) | [#1307](https://github.com/a2ui-project/a2ui/issues/1307) (filed by another user) | [#2639](https://github.com/a2ui-project/a2ui/pull/2639), merged 2026-11-03 — narrowed to the CSS-module build config left in `@a2ui/react` after #2630 removed its basic catalog |
| 4 | Generated setter for a binding-only prop is uncallable (`never` parameter) | [#2528](https://github.com/a2ui-project/a2ui/issues/2528) | [#2529](https://github.com/a2ui-project/a2ui/pull/2529), merged 2026-09-29 |
| 10 | Kotlin streaming parser's placeholder is the basic catalog's `Row` whatever the catalog | [#2924](https://github.com/a2ui-project/a2ui/issues/2924) | [#2925](https://github.com/a2ui-project/a2ui/pull/2925), merged 2026-10-05 |
| 11 | `componentTree` lets a component's own `type` prop replace its type (web_core, Python core) | [#2929](https://github.com/a2ui-project/a2ui/issues/2929) | [#2930](https://github.com/a2ui-project/a2ui/pull/2930), merged 2026-10-05 |
| 12 | v0.9.1 capabilities keyed `v0.9` by the schemas and Python agent SDK, `v0.9.1` by the guide and web_core | [#3134](https://github.com/a2ui-project/a2ui/issues/3134) | [#3135](https://github.com/a2ui-project/a2ui/pull/3135), merged 2026-11-25 |
| 14 | No way to add a catalog to a `MessageProcessor` after it is built (web_core, Python core, Dart core, Swift core) | [#3303](https://github.com/a2ui-project/a2ui/issues/3303) | [#3304](https://github.com/a2ui-project/a2ui/pull/3304), merged 2026-11-20 |
| 15 | `Catalog.to_json` raises for a function without an argument schema, and with it any `MessageProcessor` of two or more catalogs (Python core) | [#3305](https://github.com/a2ui-project/a2ui/issues/3305) | [#3306](https://github.com/a2ui-project/a2ui/pull/3306), merged 2026-10-28 |
| 16 | A string prop naming a component reads as a child reference from v0.9 (Python core) | [#3605](https://github.com/a2ui-project/a2ui/issues/3605) | [#3606](https://github.com/a2ui-project/a2ui/pull/3606), merged 2026-10-29 |
| — | Dart `ComponentModel.toJson` lets an `id` or `component` property replace the model's own (raised in gspencergoog's review of #2930) | [#2979](https://github.com/a2ui-project/a2ui/issues/2979) | [#2980](https://github.com/a2ui-project/a2ui/pull/2980), merged 2026-10-05 |
| — | Typo in the custom component video name in the docs | — | [#728](https://github.com/a2ui-project/a2ui/pull/728), merged 2026-02-26 |

## In review

| Finding | What | Issue | PR |
| --- | --- | --- | --- |

## Closed

| Finding | What | Issue | PR | Why |
| --- | --- | --- | --- | --- |
| 6 | `GenericBinder` misclassifies nested dynamic unions as `STATIC` (dead `DateTimeInput` `min`/`max` bindings) | [#2530](https://github.com/a2ui-project/a2ui/issues/2530) | [#2531](https://github.com/a2ui-project/a2ui/pull/2531) | No longer reproduces after the `web_core` move to `typescript/web_core`; the symptom remains for JSON catalogs loaded through `Catalog.fromSchema`, left to [#2822](https://github.com/a2ui-project/a2ui/issues/2822). Both closed 2026-09-29 |
| 9 | A prop removed by `updateComponents` keeps its last value (web_core generic binder) | [#3779](https://github.com/a2ui-project/a2ui/issues/3779) (filed by another user) | [#3869](https://github.com/a2ui-project/a2ui/pull/3869) and [#3937](https://github.com/a2ui-project/a2ui/pull/3937) (by other authors), merged 2026-11-03 and 2026-11-05 | Never filed. Upstream rebuilds `GenericBinder`'s props from an empty snapshot, and `NodeResolver`'s with them, so a property an update omits is dropped; released in `@a2ui/web_core` 0.16.0 |
| 17 | A prop declared as a plain array of strings is typed as a child list (web_core generic binder) | — | [#3688](https://github.com/a2ui-project/a2ui/pull/3688) (by another author), merged 2026-10-28 | Never filed. Upstream's `ResolveA2uiProp` types only a property declared as a child list as one, so a plain array of strings is `string[]`; released in `@a2ui/web_core` 0.15.0 |
| 19 | `@a2ui/react` draws developer text where a component cannot be drawn — `[Loading …]` for a pending child, `Unknown component type` for an unknown type, the error of a child reference it cannot resolve | [#2013](https://github.com/a2ui-project/a2ui/issues/2013) (filed by another user) | [#3723](https://github.com/a2ui-project/a2ui/pull/3723) (by another author), merged 2026-10-29 | Never filed. Upstream draws nothing for a pending child, an unknown type and an unresolved child reference, the last still reported through the surface's `onError`; released in `@a2ui/react` 0.15.0. A host drawing a stand-in of its own waits on the fallback API of #2013, open |
| — | `demo:orchestrator` missing `--subagent_urls` and sub-agent ports (lit sample) | — | [#739](https://github.com/a2ui-project/a2ui/pull/739) | [#1628](https://github.com/a2ui-project/a2ui/pull/1628) moved the orchestrator out of the lit sample and removed the scripts. Closed 2026-07-03 |

## Waiting

| Finding | What | Target |
| --- | --- | --- |
| 5 | Dynamic prop types are unenforced claims; coerce at the binder boundary | evidence + implementation contributed to [#846](https://github.com/a2ui-project/a2ui/issues/846); fix design in `a2ui-findings.md` §5 |
