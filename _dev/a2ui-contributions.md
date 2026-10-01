# A2UI contributions

Upstream contributions to [a2ui-project/a2ui](https://github.com/a2ui-project/a2ui). Findings
are numbered per `a2ui-findings.md`.

## Merged

| Finding | What | Issue | PR |
| --- | --- | --- | --- |
| 1 | `ChoicePicker` radio groups collide across surfaces (React/Angular) | [#2447](https://github.com/a2ui-project/a2ui/issues/2447) | [#2449](https://github.com/a2ui-project/a2ui/pull/2449), merged 2026-09-01 |
| 2 | Unsatisfiable `catalogId` requirement in `server_to_client.json` prose | [#2445](https://github.com/a2ui-project/a2ui/issues/2445) | [#2446](https://github.com/a2ui-project/a2ui/pull/2446), merged 2026-09-01 |
| 4 | Generated setter for a binding-only prop is uncallable (`never` parameter) | [#2528](https://github.com/a2ui-project/a2ui/issues/2528) | [#2529](https://github.com/a2ui-project/a2ui/pull/2529), merged 2026-09-29 |
| — | Typo in the custom component video name in the docs | — | [#728](https://github.com/a2ui-project/a2ui/pull/728), merged 2026-02-26 |

## In review

| Finding | What | Issue | PR |
| --- | --- | --- | --- |
| 3 | Basic catalog's CSS-module class maps are dead code (React renderer) | [#1307](https://github.com/a2ui-project/a2ui/issues/1307) (filed by another user) | [#2639](https://github.com/a2ui-project/a2ui/pull/2639) — ditman's review of 2026-09-28 addressed 2026-09-29; awaiting his second round |
| 10 | Kotlin streaming parser's placeholder is the basic catalog's `Row` whatever the catalog | [#2924](https://github.com/a2ui-project/a2ui/issues/2924) | [#2925](https://github.com/a2ui-project/a2ui/pull/2925), opened 2026-10-01 |
| 11 | `componentTree` lets a component's own `type` prop replace its type (web_core, Python core) | [#2929](https://github.com/a2ui-project/a2ui/issues/2929) | [#2930](https://github.com/a2ui-project/a2ui/pull/2930), opened 2026-10-01 |

## Closed

| Finding | What | Issue | PR | Why |
| --- | --- | --- | --- | --- |
| 6 | `GenericBinder` misclassifies nested dynamic unions as `STATIC` (dead `DateTimeInput` `min`/`max` bindings) | [#2530](https://github.com/a2ui-project/a2ui/issues/2530) | [#2531](https://github.com/a2ui-project/a2ui/pull/2531) | No longer reproduces after the `web_core` move to `typescript/web_core`; the symptom remains for JSON catalogs loaded through `Catalog.fromSchema`, left to [#2822](https://github.com/a2ui-project/a2ui/issues/2822). Both closed 2026-09-29 |
| — | `demo:orchestrator` missing `--subagent_urls` and sub-agent ports (lit sample) | — | [#739](https://github.com/a2ui-project/a2ui/pull/739) | [#1628](https://github.com/a2ui-project/a2ui/pull/1628) moved the orchestrator out of the lit sample and removed the scripts. Closed 2026-07-03 |

## Waiting

| Finding | What | Target |
| --- | --- | --- |
| 5 | Dynamic prop types are unenforced claims; coerce at the binder boundary | evidence + implementation contributed to [#846](https://github.com/a2ui-project/a2ui/issues/846); fix design in `a2ui-findings.md` §5 |
