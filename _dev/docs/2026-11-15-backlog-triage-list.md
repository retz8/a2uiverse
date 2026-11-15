# Backlog triage list, 2026-11-15

The items of the [Backlog in `_dev/TODO.md`](../TODO.md#backlog) to take up, read against the code and upstream on 2026-11-15.

## Workflow

1. Items are done in order, one at a time, one session per item, a fresh session each time where possible.
2. When an item is started, Claude recommends skipping the grill if the task is small enough. Otherwise the item is grilled, with no spec written afterward. Either way it is implemented directly on `main`.
3. Once an item is done and confirmed by the user, it is marked [DONE] here, and its Backlog line is removed from `_dev/TODO.md`, with nothing recorded.
4. Every commit is an off-phase commit, such as `fix: …` or `chore: …`, never `fix(backlog): …`.

## Do now

In this order.

1. [DONE] (`a2uiverse-apps` 82821e9) `pnpm verify` in `a2uiverse-apps` runs no Python agent's tests. Its script is `turbo run build typecheck test check && pnpm lint && pnpm format:check`, and no `package.json` in the repository runs `pytest`, so each agent's `uv run pytest` runs apart; the prompt goldens failed under it while the gate was green. Under an hour. Before item 3.
2. [DONE] (`a2uiverse-apps` a4488a9, platform 25e2093) The name the privacy gate guards is in the platform's beat 24 and in 12 fixtures and beats of `a2uiverse-apps`. The gate is [`apps/client/scripts/check-fixture-privacy.ts`](../../apps/client/scripts/check-fixture-privacy.ts), its needles read from `A2UI_FIXTURE_FORBIDDEN`. Beat 24, [`beat-24-step-unseen.json`](../../apps/client/recordings/beats/beat-24-step-unseen.json), a step back to a paint not seen before, holds it as the assignee in Linear's deterministic `open-issue.json`. In `a2uiverse-apps` it is in Linear's stub `user.json`, `users.json`, `list-issues.json` and `get-issue.json`, its beats 2 and 3, its deterministic `open-issue.json` and `confirm-change.json`, and, as the sender's name, Gmail's stub `get-thread.json` and `search-threads.json` of both fake accounts. The fix:
   1. the stub fixtures given a made-up name;
   2. Linear's beats recorded again against its stub, a model painting over the recorded data with nothing reaching Linear, and its deterministic fixtures derived from them (`linear/agent/README.md` of `a2uiverse-apps`);
   3. beat 24 recorded again by the client's beat recorder, which runs beats 10 to 26 on an orchestrator of its own over apps in `deterministic` mode, the Planner still calling a model ([`apps/client/README.md`](../../apps/client/README.md)).

   Under an hour to about a session.

3. [DONE] (`a2uiverse-apps` 252d1d8, platform 30b8020) The agent kit moved to a newer `a2ui-agent-sdk` and `a2ui-core`, and its own fix for `a2ui-core`'s child-reference fallback dropped (`agent-kit/src/a2ui_agent_kit/upstream_patches.py` of `a2uiverse-apps`). The kit pins `a2ui-agent-sdk==0.9.0` and `a2ui-core==0.4.0`. `a2ui-core` 0.5.0 carries the fix (#3606), and `a2ui-agent-sdk` 0.10.0 is the first release that allows it: 0.9.0 requires `a2ui-core>=0.4.0,<0.5.0`, 0.10.0 `>=0.5.0,<0.6.0` and 0.11.0 `>=0.6.0,<0.7.0`. What changes:
   1. the kit's streaming parse in `executor_llm.py`, from `DirectJsonParser.parse_chunk` to `open_stream()` with `feed()` and `close()`;
   2. every app's prompt goldens, taken again for the SDK's `generate_base_rules()`;
   3. the `a2ui-agent-sdk` pin in the seven apps and in the scaffolder, `create-a2ui-agent/src/generate.ts`.

   About a session, after item 1.

4. [DONE] (platform 82c88a7, f8e9619, e37a98d, 203ea0f, 957cd89) Words on the screen that are not the customer's. Four fixes, each under an hour, each with its wording approved first:
   1. A Planner model call that fails puts its error on the screen: the broken turn's final carries the message the call threw, in the provider's or the AI SDK's words ([`apps/orchestrator/src/executor.ts`](../../apps/orchestrator/src/executor.ts)).
   2. The orchestrator's sign-in window says only "Sign-in didn't finish" when a sign-in for added access is made as a different account than the fragment's, and the canvas puts the tile back with no words ([`vault.ts`](../../apps/orchestrator/src/vault/vault.ts), [`pages.ts`](../../apps/orchestrator/src/vault/pages.ts)).
   3. A card update newly asking for a key, or for a sign-in with no named scope, shows a consent card with nothing in it, the card having words only for scopes ([`ConsentCard.tsx`](../../apps/client/src/canvas/trustedPage/ConsentCard.tsx), [`appCard.ts`](../../apps/client/src/canvas/trustedPage/appCard.ts)).
   4. The platform card's publishing skill says the sample is "captured with the publisher's own account", and the Planner repeats the third person to the publisher it is speaking to ([`apps/orchestrator/src/agentCard.ts`](../../apps/orchestrator/src/agentCard.ts)).
5. [DONE] (platform 415e5b7) A press resent after an added-access sign-in that goes unanswered leaves the slot asking for the access again, "Gmail needs more access to finish this" with Allow, though the access was granted. The slot should say the app did not answer and offer to try again ([`canvasRuntime.ts`](../../apps/client/src/canvas/canvasRuntime.ts), [`turnProgress.ts`](../../apps/client/src/canvas/turnProgress.ts), the shell catalog's [`slot.tsx`](../../packages/shell-catalog/src/components/slot/slot.tsx)). Under an hour to about a session.
6. CircleCI's agent cannot open a run. `list_runs` answers with its runs in `structuredContent` and only "Found 5 run(s)" as its `content`, and the model is handed the `content` alone (`circleci/agent/app/mcp.py` of `a2uiverse-apps`). It needs a decision on how the structured half reaches the model, through the kit's `shape_result` hook so a policy still sees one dict, then a read-only live check on a CircleCI account. Fixed (`a2uiverse-apps` b60e604, platform 5570cb3) through that hook, the structured half copied into `content` as JSON before the policy sees it; the read-only live check is still to do: the CircleCI agent live on `anthropic/claude-haiku-5-5` with the stored sign-in, "Show me the recent runs" then "Open the latest run", the run opening. It needs `ANTHROPIC_API_KEY` in `circleci/agent/.env`.
7. [DONE] (platform 87275d9, 989c9f2, b062bed, 2b15d1c, 7a3a98d; `a2uiverse-apps` 057e83c) Small tooling fixes, each under an hour, none needing a decision:
   1. Stellify's build clears `dist/` first ([`packages/stellify/scripts/build.mjs`](../../packages/stellify/scripts/build.mjs)), so the gate over its committed `dist/` ([`scripts/stellify-dist.test.mjs`](../../scripts/stellify-dist.test.mjs)) fails on a declaration left after its source is deleted, which `tsc` does not remove.
   2. The sdk exports the `a2uiClientDataModel` metadata key beside `A2UI_CLIENT_CAPABILITIES_KEY` ([`packages/sdk/js/src/catalog.ts`](../../packages/sdk/js/src/catalog.ts)), and the client ([`messages.ts`](../../apps/client/src/a2a/messages.ts)) and the orchestrator ([`partition.ts`](../../apps/orchestrator/src/composition/partition.ts)) import it in place of their own copies.
   3. The beat recorder leaves an installed app with no fake account, such as Shop C, the hand-written agent in Go that signs in by device code, as it is when the orchestrator already holds an account for it, where today it stops (`accountsFor` in [`apps/client/scripts/lib/signIn.ts`](../../apps/client/scripts/lib/signIn.ts)).
   4. The kit's recorder keeps one turn per task, so two accounts of one app answering at once in one agent both stay on record (`agent-kit/src/a2ui_agent_kit/recorder.py` of `a2uiverse-apps`).
   5. The marketplace's log lines carry their time ([`apps/marketplace/src/log.ts`](../../apps/marketplace/src/log.ts)), and a publish's hello-fragment smoke test is timed on its own ([`apps/marketplace/src/marketplace.ts`](../../apps/marketplace/src/marketplace.ts)).
8. [DONE] (platform 303bcc1, 20e5e1c) Client work ahead of Phase 21, the move to A2UI v1.0:
   1. The client's `linkCatalogs` call dropped ([`apps/client/src/catalogs/paintBuilds.ts`](../../apps/client/src/catalogs/paintBuilds.ts)): upstream's `main` removes `linkCatalogs`, `withPeerCatalogs` and `Catalog.peerCatalogs`, unreleased, and a test first shows a swapped build drawn the same without the call.
   2. Stellify refuses at pack a named import that a lent specifier does not export at the host's version ([`packages/stellify/src/bundle.ts`](../../packages/stellify/src/bundle.ts)): today an import of `basicCatalog` from `@a2ui/react/v0_9`, gone since react 0.13.0, packs clean and the catalog fails only in the client. About a session.

## Safe once you decide something

Checked group by group, each item decided, after the Do now list is all done.

### Group 1

1. [DONE] (platform 2ef6bc3) The journal records a press that ended asking for more access as a failed dispatch; decide what it records it as. The press's turn is journaled completed, as the client is told; its dispatch stays failed with the request on its `authority`.
2. [DONE] (platform ccd0553) A catalog's rules aimed at `body`, `html` or `:root` stay page-wide, so Primer's `body{margin:0}` reaches the whole page, and the collision detector flags only a custom property written at those three; decide what the platform does with such a rule. Such a rule stays page-wide, and the detector flags every declaration written there, Primer's three accepted for `github-catalog`.
3. [DONE] (platform 8e4ce13) The scoped stylesheet loader does not follow a sheet's `@import`, an adopted sheet having none, and no catalog uses one today; decide whether Stellify refuses one at pack. Stellify refuses one at pack, relative or absolute.

### Group 2

4. [DONE] (platform 8400800) The Planner's and Synthesizer's model calls carry no time limit: a hung call holds its canvas's turn open until the canvas is closed. No hang has been seen (slowest synthesis 18.9 s, slowest plan 7.2 s), and the Backlog line takes it up only if one is; decide whether to add one now. Each model request runs at most the apps' hard cap, 300 s by default.
5. GitHub's canned tools hold no write (`STUB_TOOLS` in `github/agent/app/tools.py` of `a2uiverse-apps` are `list_pull_requests` and `get_pull_request`), so its request for more access never arises in `stub`; decide whether to add one.
6. Gmail's thread view paints "Draft a reply" (`draft-reply`), which the deterministic corpus does not answer; decide between recording the draft turn into the corpus and dropping the button from the deterministic thread view.

### Group 3

7. Calendar's fragment shows an event's time with no zone, "Today, 11:00 – 12:00", where the timeline beside it shows the same event at 8:00 PM local time and Gmail names UTC; decide which zone Calendar shows and whether it names it.
8. The App Library shows nothing of what an app or an account can do, though an account's own card adds skills; decide what the page shows.
9. An unweighted `Row` or `Column` gets no flex ([`weightStyle` in `layout.ts`](../../packages/shell-catalog/src/components/shared/layout.ts)), only a `Slot` and an `Attribution` taking a weight of 1 when the Planner writes none, while the Planner's prompt says unweighted siblings share their parent's axis equally; decide which of the two changes.
