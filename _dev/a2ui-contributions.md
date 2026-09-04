# A2UI contributions

Upstream contributions to [a2ui-project/a2ui](https://github.com/a2ui-project/a2ui). Findings
are numbered per `a2ui-findings.md`.

## Merged

| Finding | What | Issue | PR |
| --- | --- | --- | --- |
| 1 | `ChoicePicker` radio groups collide across surfaces (React/Angular) | [#2447](https://github.com/a2ui-project/a2ui/issues/2447) | [#2449](https://github.com/a2ui-project/a2ui/pull/2449) |
| 2 | Unsatisfiable `catalogId` requirement in `server_to_client.json` prose | [#2445](https://github.com/a2ui-project/a2ui/issues/2445) | [#2446](https://github.com/a2ui-project/a2ui/pull/2446) |

## In review

| Finding | What | Issue | PR |
| --- | --- | --- | --- |
| 6 | `GenericBinder` misclassifies nested dynamic unions as `STATIC` (dead `DateTimeInput` `min`/`max` bindings) | [#2530](https://github.com/a2ui-project/a2ui/issues/2530) | [#2531](https://github.com/a2ui-project/a2ui/pull/2531) |

## Filed, PR drafted but not opened

| Finding | What | Issue | PR |
| --- | --- | --- | --- |
| 4 | Generated setter for a binding-only prop is uncallable (`never` parameter) | [#2528](https://github.com/a2ui-project/a2ui/issues/2528) | branch `fix/web_core-binding-only-prop-setter` on fork; body in `A2UI/drafts/PR_DRAFT_binder_setter_never.md` |

## Blocked

| Finding | What | Blocked on |
| --- | --- | --- |
| 3 | Basic catalog's CSS-module class maps are dead code (React renderer) | comment on [#1307](https://github.com/a2ui-project/a2ui/issues/1307) to be posted and answered; local branch `fix/react-basic-catalog-styles`, drafts in `A2UI/drafts/` |

## Waiting

| Finding | What | Target |
| --- | --- | --- |
| 5 | Dynamic prop types are unenforced claims; coerce at the binder boundary | evidence + implementation contributed to [#846](https://github.com/a2ui-project/a2ui/issues/846); fix design in `a2ui-findings.md` §5 |
