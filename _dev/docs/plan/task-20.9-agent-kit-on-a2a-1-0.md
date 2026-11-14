# 20.9 — The agent kit on A2A 1.0: plan

The plan for the [20.9 task spec](../spec/task-20.9-the-agent-kit-on-a2a-1-0.md). The code lands on `main` of `a2uiverse-apps`, with no worktree. The documents land on `main` of `a2uiverse`.

## The open items, settled

1. **The four HTTP paths.** JSON-RPC answers both A2A versions at the base URL itself, where the kit answers it today. HTTP+JSON answers both under `<base URL>/rest`, the prefix the platform's own scratch agents on the Python A2A SDK use (`packages/smoke-transport/scripts/serve_a2ui.py`). The prefix keeps the SDK's tenant catch-all (finding 13 of the task spec) off the card, the sign-in routes and the key set.
2. **The gRPC ports.** Each app's HTTP port plus 100, inside its tier's band of the [tunnel environment](../tunnel-environment.md): 11101 to 11105 for the five vendor apps, 12101 and 12102 for the two mocks. None takes a port the tunnel environment lists. The scaffolder suggests the HTTP port it chose plus 100.
3. **The config's new fields.** `default_grpc_port`, required. `interfaces`, the ordered list of six paths, each a binding and an A2A version. `sign_card`, a boolean, `False` by default. `account_skills`, the optional function from the signed-in account to that account's skills.
4. **The `a2a-sdk` pin.** `a2a-sdk[http-server,grpc,signing]>=1.3.0,<2.0.0` in the kit and in each app, as the kit's present pin is a range bounded below the next major version. 1.3.0 is the newest release (2026-10-27).
5. **The key set's path.** `<base URL>/.well-known/jwks.json`. The card's signing key is the kit's own file in the app's state directory, apart from the sign-in server's ID-token key, which an app with no sign-in or a key sign-in does not have.
6. **The older task decisions amended.** Decision 12 of the 12.2 task spec, decision 7 of 12.9, decision 2 of 12.10, decision 1 of 16.2, decisions 3, 5 and 7 of 19.4, decision 4 of the phase-3 spec and decisions 16 and 17 of the phase-1 spec.

## Steps

1. **The kit on `a2a-sdk` 1.x.** The kit's types move to the SDK's protobuf messages. Its own part-building replaces `a2ui-a2a`: the A2UI part, `paintMeta`, the auth-required request, the card's A2UI extension entries, the reading of a press and the choice of the A2UI version. The server serves the six paths in the config's order, the four HTTP ones on the one HTTP port and gRPC on its own; one credential check covers every A2A call on each; the card is signed when `sign_card` is on; the extended card is served when `account_skills` is set. The launch takes `--grpc-port`. The startup refusals: a path list that repeats a path, names an unknown one or leaves one out; an `apiKey` header gRPC cannot carry; `account_skills` with no sign-in. The kit is 0.2.0.
2. **The kit's tests over real sockets.** A kit agent driven on each of the six paths with the Python A2A SDK's own client: a question, a press as one object and as a list, a refusal without a credential and an answer with one, the request for more access, a signed card, an account's card.
3. **The seven apps and the scaffolder.** Each app's pin and `default_grpc_port`; each app's lock and tests; the scaffolder's pin, its gRPC port suggestion and its templates.
4. **The cards read the same.** Each app's card served at `2769609` and after the move, compared with the card package's `sameCard`.
5. **Stellify's preview.** Shop B's agent with each of the six paths first in turn, once with signing on, then once with the extended card on after 20.8 lands.
6. **The facts checked by running.** A kit agent's signed card through the card package's `fetchLiveCard`; a press from the platform's dial reaching a kit agent on gRPC at A2A 0.3.
7. **The live sitting** of decision 21, item 5, through the tunnel.
8. **The documents** of decision 22.
