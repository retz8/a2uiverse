# 20.11 — The fleet

Sub-task 20.11 of [Phase 20](phase-20-a2a-1-0.md) in [`_dev/TODO.md`](../../TODO.md), an `[apps]` sub-task: its code lands in `a2uiverse-apps`. The seven kit agents of the roster are spread over the six paths by the kit's setting, so that each path is the first path of a real agent, and the seven apps are republished. It works under decision 14 of the phase spec (a kit agent answers both A2A versions on all three bindings, and the roster is spread by that setting) and decision 12 (what proves the phase), and settles open item 8 of that spec, how the roster is spread over the six paths. It also settles what two earlier task specs left to it: whether a roster agent signs its card (the scope of the [20.9 task spec](task-20.9-the-agent-kit-on-a2a-1-0.md)) and whether one serves an extended card (decision 15 of the [20.8 task spec](task-20.8-the-extended-card.md)). After 20.5 (the bindings) and 20.9 (the agent kit on A2A 1.0).

These words are used throughout.

1. The kit is `a2ui-agent-kit`, in `agent-kit/` of `a2uiverse-apps`. A kit agent is an agent built on it. The app's config is the one object an app hands the kit, `AgentAppConfig`.
2. A path is one binding at one A2A version. There are six: JSON-RPC, HTTP+JSON and gRPC, each on A2A 1.0 and on A2A 0.3. An agent's first path is the one its card lists first, which the platform's dial takes.
3. The default list is the order a kit agent's card has with nothing set: JSON-RPC, HTTP+JSON and gRPC on A2A 1.0, then the same three on A2A 0.3.
4. The launcher is the set of scripts in `scripts/` of `a2uiverse` that starts the apps. Its roster is the list of apps it starts: GitHub, Gmail, Calendar, CircleCI and Linear in the default tier, and the two mock camera stores, Shop A and Shop B, in the mocks tier. All seven are kit agents.
5. Shop C is the hand-written A2A 1.0 agent of 20.10, a third mock camera store written in Go. It is no kit agent and is outside the roster.
6. The temporal merge composes Gmail, Calendar and GitHub. The entity join composes Linear, GitHub and CircleCI. The shops' merge composes Shop A and Shop B.
7. The real marketplace and the real registry are the state the marketplace and the orchestrator keep on the development machine between sittings, in each process's own `.state/`. Scratch state is a state directory made for one sitting.
8. The scaffolder is `create-a2ui-agent`, in `a2uiverse-apps`, which generates a new kit app.
9. Stellify is the platform's pack and publish tool.

The sources these decisions rest on:

1. The [phase spec](phase-20-a2a-1-0.md): decision 5 (a change of A2A version or bindings alone is not an update, and asks no new card version of the publisher), decision 9 (where an A2A SDK contradicts a decision or refuses an agent that composes today, the platform carries a patch or reads around the SDK, and the case is recorded in `_dev/a2a-findings.md`), decision 12 ("the kit's agents are spread over the six paths", and the hand-written agent signs its card and serves an extended card), decision 14, and invariant 1 (the boundary of a sub-task does not narrow a decision).
2. The [20.3 task spec](task-20.3-the-card.md): decision 4 (the card fetch sends `A2A-Version: 1.0`) and decision 12 (two cards are the same card when equal as read, how the agent is reached set aside).
3. The [20.5 task spec](task-20.5-the-bindings.md): decision 2 (a dial takes the first spoken interface in the card's order and moves on only from one never reached), decision 6 (the journal records the A2A version and the binding of the interface a dispatch used), decision 7 (publish and `stellify preview` walk the card as a dispatch does, and each interface passed over is a note) and decision 9 (on gRPC a credential rides as one metadata entry under the scheme's header name in lowercase).
4. The [20.7 task spec](task-20.7-signed-cards-verified.md): decision 8 (the signature check runs with every fetch of a card from a card URL), decision 9 (a signed card that does not pass is refused) and decision 17 (no agent in the roster is required to sign).
5. The [20.8 task spec](task-20.8-the-extended-card.md): decision 7 (the fetch of an account's card walks the public card's interfaces) and decision 15 (no agent in the roster is required to serve an extended card, and whether one does is 20.11's).
6. The [20.9 task spec](task-20.9-the-agent-kit-on-a2a-1-0.md): decision 6 (the publisher writes the whole list of six paths on the app's config, and the setting is not a launch option), decision 8 (the card lists a gRPC interface as a bare `host:port`), decision 19 (20.9 changed no platform code, amended for one change to the launcher) and decision 21 (what proved 20.9).
7. The [19.5 task spec](task-19.5-fleet-version-sets.md), the fleet's A2UI version sets: decision 2 (the fleet published through the launcher's publish path in deterministic mode over both tiers, the orchestrator on a throwaway state directory), decision 3 (every card at `0.2.0`, each package version unchanged), decision 4 (`a2ui_versions` written in all seven configs: v0.9 for Gmail, Linear and Shop A, v0.9.1 for GitHub and Shop B, both for Calendar and CircleCI), decision 5 (each card test asserts the exact list its set means), decision 8 (the apps README's roster table gained a column) and decision 10 (the proof read on disk with no browser).
8. The 20.9 line of `_dev/TODO.md`: which apps each of the three merges joined in 20.9's live sitting; `stellify preview` run against Shop B with each of the six paths first; Shop B put on gRPC at A2A 0.3 first, republished at the same version and reinstalled with nothing changed, on scratch state.
9. The [launcher's README](../../../scripts/README.md): `pnpm dev:all` runs the default tier; under `--publish` an app whose card requires sign-in is previewed first, then published, then installed by its id; the marketplace refuses a changed card at a version it has already published, so one marketplace state is published to with the same `A2UIVERSE_PUBLIC_URL` every time.
10. The [tunnel environment](../tunnel-environment.md), for the tunnel pattern of `A2UIVERSE_PUBLIC_URL`.
11. What was found on 2026-11-14, listed next.

Found on 2026-11-14, by reading `a2uiverse-apps` at `7c96d38`, `a2uiverse` at `5e31c78` and the state on disk. Nothing was run.

1. None of the seven apps' configs sets `interfaces`. Every kit agent's card is on the default list, and its first path is JSON-RPC at A2A 1.0.
2. The kit's README shows a list with another path first as that path followed by the default list without it.
3. A kit agent serves JSON-RPC at its base URL, HTTP+JSON under `/rest` of it, and gRPC at its launch host and gRPC port.
4. The real marketplace holds all seven apps at card `0.2.0`, with `versions` `0.1.0` and `0.2.0`. Each stored card was published on 2026-11-04, is in A2A 0.3's shape and names JSON-RPC alone. The stored cards of the five default-tier apps carry their sign-in page's address on the tunnel pattern.
5. The real registry holds the five default-tier apps, installed from the local checkout, each card at `0.2.0` in A2A 0.3's shape.
6. The marketplace refuses a publish at the version it last published only when the card is not the same card as the stored one ([`marketplace.ts`](../../../apps/marketplace/src/marketplace.ts)). After that rule an accepted publish dials the agent.
7. The seven apps' configs changed once since 2026-11-04, in 20.9's change, which 20.9 checked with the card package's sameness test.
8. Five apps sign in with OAuth's authorization-code flow. Shop B signs in with an API key in the header `X-Northlight-Key`, the only `apiKey` scheme in the roster. Shop A asks no sign-in.
9. Shop C's card lists A2A 1.0 alone, gRPC first.
10. Every app's `tests/test_server.py`, copied from the scaffolder's template, reads the card's first interface by its position and asserts its address is the app's base URL. `tests/test_llm_server.py` of GitHub, Gmail and Calendar does the same. No app's test names a path.
11. The scaffolder writes `a2ui_versions` and `default_grpc_port` in a generated config and nothing for `interfaces`.
12. The roster table of the apps README has columns for the app, what it answers about, its catalog, its A2UI versions, its port and its gRPC port.
13. The [agent kit's design record](../../../docs/design/agent-kit.md) shows Linear's config as its excerpt, and its decisions table says of the six paths that "the roster can put each path first on a real agent". The [card's design record](../../../docs/design/card.md) explains the dial with "Say Shop B's card listed gRPC at A2A 1.0 first".
14. The launcher's README and the tunnel environment name the apps' ports and no path.

## Scope

1. Which kit agent lists which path first, and how each app's config writes its list.
2. Whether a roster agent signs its card or serves an extended card.
3. The republish: the card version, the marketplace it goes to, and the registry.
4. What the apps' tests assert, and what changes in the scaffolder.
5. What happens when an agent's first path does not answer.
6. What proves the sub-task and the documents it changes.
7. Out: Shop C, which is not spread and is not published to the real marketplace here, whether 20.12 publishes it being 20.12's; Shop C in the launcher's roster; the live sitting over every path (20.12, integration and acceptance); SPEC (20.13, design records, READMEs and SPEC); any change to the kit's code or the platform's code.

## Locked decisions

### 1. Three rules decide the spread, in this order

1. The default tier covers five distinct paths, and the mocks tier holds the sixth.
2. Shop B takes gRPC.
3. Each merge spans all three bindings and both A2A versions, and each A2A version carries both A2UI versions.

### 2. The assignment

| Agent | First path | A2UI versions | Merge |
| --- | --- | --- | --- |
| GitHub | gRPC at A2A 1.0 | v0.9.1 | the temporal merge, the entity join |
| Gmail | HTTP+JSON at A2A 1.0 | v0.9 | the temporal merge |
| Calendar | JSON-RPC at A2A 0.3 | v0.9, v0.9.1 | the temporal merge |
| CircleCI | JSON-RPC at A2A 1.0 | v0.9, v0.9.1 | the entity join |
| Linear | HTTP+JSON at A2A 0.3 | v0.9 | the entity join |
| Shop B | gRPC at A2A 0.3 | v0.9.1 | the shops' merge |
| Shop A | JSON-RPC at A2A 1.0, the default list | v0.9 | the shops' merge |

Seven agents cover six paths, and JSON-RPC at A2A 1.0 is the path two of them list first.

### 3. Each config writes its list

The six agents whose first path is not that of the default list write their list as the kit's README does: the first path, then the default list without it. Shop A writes the field too, as the default list by its name in the kit. All seven configs name their order.

### 4. No roster agent signs its card or serves an extended card

`sign_card` and `account_skills` stay off in all seven apps. Shop C is the real agent that signs its card and serves an extended card.

### 5. The fleet is republished at the card version it has

All seven apps are republished at card `0.2.0`. Each app's package version is unchanged.

### 6. The republish goes to the real marketplace through the launcher

The fleet is published by the launcher's publish path in deterministic mode over both tiers, with `A2UIVERSE_PUBLIC_URL` on the tunnel pattern the stored cards already carry. The orchestrator the launcher installs into runs on a throwaway state directory, which is removed after.

### 7. The real registry is untouched

The republish changes nothing in the real registry. It keeps the five default-tier apps as they were installed before Phase 20.

### 8. Each app's card test names its first path

Each app's card test asserts, as literals, the path its card lists first and the address that path is served at.

### 9. The address tests find the JSON-RPC interface by its binding

The tests that check the address a card advertises look the JSON-RPC interface up by its binding and not by its position. This holds in all seven apps and in the scaffolder's template, and the scaffolder's snapshots follow the template.

### 10. The scaffolder's generated config is unchanged

A generated config writes nothing for `interfaces`.

### 11. A first path that does not answer is a defect, fixed where it lies

An agent whose first path does not answer the platform's dial is not moved to another path. A cause in the app or the kit is fixed in `a2uiverse-apps` as part of 20.11. A cause in the platform or in an A2A SDK is brought to the user before any platform code changes, and is then handled as decision 9 of the phase spec says, with its finding. 20.11 is not done while any of the seven falls back to a later interface.

### 12. No kit code and no platform code changes

The kit stays at 0.2.0, and the commit of the kit the scaffolder writes into a generated app does not move. The scaffolder changes in its template's address tests and their snapshots alone. In `a2uiverse` no package is released, the launcher's roster is untouched, and the Stellify pin in `a2uiverse-apps` does not move. The one exception is the route of decision 11.

### 13. The spread holds in every mode

The order is on each app's config, so an app lists the same order in `deterministic`, `stub` and `live`. 20.11 runs `deterministic` alone.

### 14. One change in `a2uiverse-apps`, then the republish

The seven configs, the tests, the scaffolder's template and the apps README land together on `main` of `a2uiverse-apps`. The fleet is republished from that commit.

### 15. What proves 20.11

1. The gates: each app's tests, the scaffolder's tests, and `pnpm verify` in `a2uiverse-apps`.
2. The publish, read on the launcher's terminal and on disk after the launch, with no browser:
   1. The launcher's summary names seven published.
   2. Each marketplace entry's stored card is in A2A 1.0's shape and lists the six paths with the app's own first path first. Its `versions` still read `0.1.0` and `0.2.0`.
   3. Each app's stored preview is newer than the launch's start.
   4. No note of an interface passed over appears for any of the seven.
   5. The real registry file is byte-identical before and after.
   6. The throwaway state directory is removed.

A press, a sign-in in the browser, a request for more access and the merges on the spread fleet are 20.12's.

### 16. The documents 20.11 changes

In `a2uiverse-apps`:

1. The root README: the roster table gains a "First path" column with each app's first path. The assignment is written in this one place.
2. Any sentence of an app's README that the spread makes false.

In `a2uiverse`:

3. The [agent kit's design record](../../../docs/design/agent-kit.md): Linear's config excerpt gains its `interfaces` line, and the row of the decisions table on the six paths says the roster puts each path first on a real agent, pointing at the apps README's table.
4. The [card's design record](../../../docs/design/card.md): the dial's example follows the real Shop B, gRPC at A2A 0.3 first, if the example still reads true with that change.
5. `_dev/TODO.md`: 20.11's line.

SPEC, the launcher's README, the tunnel environment and the kit's README are unchanged. No Backlog line and no finding is added unless the route of decision 11 produces one.

## Invariants

1. Each of the six paths is the first path of a kit agent (decision 14 of the phase spec).
2. Each of the seven cards is the same card as the one the real marketplace holds, how the agent is reached set aside. The spread changes how a kit agent is reached and nothing its card says.
3. Every agent that composes today composes after this sub-task (invariant 2 of the phase spec).

## Open items

Left to the plan:

1. Whether the dial's example in the card's design record still reads true with Shop B on gRPC at A2A 0.3 first.
2. Which sentences of the apps' READMEs the spread makes false.
