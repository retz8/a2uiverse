# Card fixtures

Agent cards the sdk's card reader is tested against (task 19.1).

- `adk-restaurant-finder.json` — the upstream Python ADK restaurant finder's card, captured verbatim on 2026-11-03 over `GET /.well-known/agent-card.json` from the sample running from `../a2ui-upstream/` at `upstream/main` `825beac2` on port 11006. One flat entry per version it runs, v0.8 and v0.9, each naming that version's basic catalog id.
- `kit-v091-only.json`, `kit-v09-only.json`, `kit-both.json` — the three card shapes the agent kit writes from its per-app version set (phase 19 decision 6), written by hand to that decision's letter: a v0.9.1-only app's one entry keyed `v0.9.1`; a v0.9-only app's one flat entry under the v0.9 URI; a both app's two flat entries.
