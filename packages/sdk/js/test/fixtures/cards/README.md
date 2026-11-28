# Card fixtures

Agent cards the sdk's card reader is tested against (task-21.10 decision 23.3).

- `node-restaurant-finder.json`: the upstream Node restaurant finder's card, captured on 2026-11-28 over `GET /.well-known/agent-card.json` from the sample running from `../a2ui-upstream/` at `7a776e7a4` with `STUB_LLM=true` on port 11002. It has no A2UI entry.
- `adk-restaurant-finder.json`: the upstream Python ADK restaurant finder's card, captured on 2026-11-03 the same way from the sample at `upstream/main` `825beac2` on port 11006. It has one flat entry for each version it runs, v0.8 and v0.9, each naming that version's basic catalog id.
- `e2e-typescript-agent.json`: the card of upstream's end-to-end TypeScript agent, captured on 2026-11-28 the same way from `e2e/agents/typescript` at `7a776e7a4` on port 11011. It has a v0.9 entry and a v1.0 entry, each with flat params naming that version's basic catalog id.
- `keyed-wrapper.json`: written by hand. Its one v1.0 entry holds its params under a `1.0` key.
- `newer-only.json`: written by hand. Its one A2UI entry is for v1.1.
