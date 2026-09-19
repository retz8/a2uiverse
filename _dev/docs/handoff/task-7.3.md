# Handoff — task 7.3, the Linear app

Done. Apps `1ac2e19` (the app), `9d9c7d0` (Linear's Markdown rendered by the bundle; the key's email address replaced in recordings); platform `b263f03` (the wiring), `e08503c` (the client on `9d9c7d0`); spec `f88cdb9`, amended at close (decisions 11 and 13). `pnpm verify` green in both repos; the agent's suite 76 passed, `linear-catalog` 24.

## The empirical check

Phase spec decision 3 now states the result. The captured responses, `get_issue` on 2026-09-19:

- **A2U-5, linked by branch name** — pull request #6, head branch `ekkicb71/a2u-5-say-on-the-canvas-when-an-utterance-fails`, equal to the issue's `gitBranchName`:
  ```json
  [{"id": "2b460851-7ae7-4a93-a928-9bdbdbaf5206", "title": "Say on the canvas when an utterance fails", "subtitle": null, "url": "https://github.com/retz8/a2uiverse/pull/6"},
   {"id": "3b45cdb8-b4cd-40f7-ae5f-808de10b0dc6", "title": "#3 Say on the canvas when an utterance fails", "subtitle": null, "url": "https://github.com/retz8/a2uiverse/issues/3"}]
  ```
- **A2U-6, linked by `Fixes A2U-6` in the description** — pull request #7, head branch `status-line-names-the-workflow`; the issue's `gitBranchName` is `ekkicb71/a2u-6-name-the-workflow-not-its-id-in-the-confirm-status-line`, not the pull request's:
  ```json
  [{"id": "81a35d2d-227d-4bb3-a957-59ef63962def", "title": "Name the workflow, not its id, in the confirm status line", "subtitle": null, "url": "https://github.com/retz8/a2uiverse/pull/7"},
   {"id": "90872ba8-f2bd-43a8-9fbe-be6ef1a63544", "title": "#4 Name the workflow, not its id, in the confirm status line", "subtitle": null, "url": "https://github.com/retz8/a2uiverse/issues/4"}]
  ```
- **A2U-7, no pull request** — its mirrored GitHub issue #5 only.
- `list_issues` carries `gitBranchName` and no `attachments`. `get_attachment` on a pull-request attachment refuses the content ("Cannot fetch external URL") and with `format: "url"` returns `{id, title, url}` only.
- Opening each pull request moved its issue to In Progress: the team's default automation.

## The canvas passes

Through the tunnel with Claude-in-Chrome, `pnpm dev:all --agents-dir ../a2uiverse-apps --only linear`.

- **Live, 2026-09-18.** "What's assigned to me in Linear?" — 23 s, three rows, priority bars, status icons in the sampled colors. A2U-5's row tapped — 25 s, the detail with pull request #6 and its branch. "Move A2U-5 back to In Progress." — 22 s, the proposal In Review → In Progress; `list_issue_statuses` read, no write. Confirmed — 27 s, `save_issue` fired, the detail repainted, Linear agreeing.
- **Deterministic, 2026-09-18.** The recorded list, grouped by state, and the row tap's recorded detail in 11 ms.
- **Deterministic, 2026-09-19, after `9d9c7d0`.** The comment reads as text ("…a corresponding GitHub issue…"), no anchor in the fragment, the assignee "Jioh In", the real address nowhere on the page.

The proposal and its confirm and decline are reached by typing, so in deterministic mode they are covered by the suite, not the canvas.

## Findings, not fixed

- The first row tap of the 2026-09-18 deterministic pass never reached the orchestrator; after 90 s a reload and a second tap arrived in 24 ms — the backlog's tunnel hang.
- A cold canvas load through the tunnel stalled at 233 of 237 modules, twice; a reload completed it.
- The stack launched from a shell outside VS Code: port 10001 was not auto-forwarded and read 404 at the tunnel until forwarded by hand.
- The email address is the author email on every commit in both repos, and the copy in apps `1ac2e19` stays in history.
- Linear's GitHub issue sync mirrored A2U-5–7 as GitHub issues #3–#5 and posts its sync notice as each issue's first comment. Sync is now one way.
- `@a2ui/markdown-it` 0.1.2 declares `@a2ui/web_core ^0.11.0`; the platform is on 0.10.6. Not used.

## Open threads

- Pull requests #6 and #7 are open and unmerged; 7.8 decides reuse or close. Linear: A2U-5 In Review, A2U-6 In Progress, A2U-7 Backlog.
- A re-record needs `LINEAR_MCP_TOKEN` and the Gemini settings in `linear/agent/.env` (the Gemini key is CircleCI's) and the full name kept on the Linear account; beat 3 really changes A2U-5's status.
