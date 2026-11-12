# Phase 20 notes — where A2A 0.3 shapes sit in the two repositories

Where `a2uiverse` and `a2uiverse-apps` rely on A2A 0.3's shapes, read on 2026-11-12 for [Phase 20](spec/phase-20-a2a-1-0.md) from `a2uiverse` with its code at `b1294d6` and `a2uiverse-apps` at `ee62de4`. Paths are relative to each repository's root. Counts come from regular expressions over TypeScript and JavaScript outside `node_modules`, `dist` and `.turbo`, and are approximate. Section 7 lists what was not checked.

## 1. JSON at rest

| Store | Where | What it holds of A2A |
| --- | --- | --- |
| The orchestrator's registry | `apps/orchestrator/.state/registry/registry.json`, untracked | Five apps, each `{id, cardUrl, card, catalogs, entitlement, installedAt, source}`. `card` is the whole 0.3 card: `protocolVersion: "0.3.0"`, `preferredTransport: "JSONRPC"`, `url`, `security`, `securitySchemes`, `capabilities.extensions` |
| The marketplace's index | `apps/marketplace/.state/public/index.json` and `apps/<id>/entry.json`, untracked | Seven entries, each `{appId, publisher, cardUrl, card, catalogs, versions, publishedAt, retired}`. `card` is the whole 0.3 card |
| The Store recordings | `apps/client/recordings/store/*.json`, tracked, 7 files | Each `{entry, preview}`; `entry.card` is a whole 0.3 card. `packages/registry-snapshot/world.js` builds the end-to-end tests' fixed world from them |
| Store previews | `apps/marketplace/.state/public/apps/<id>/preview.json`, and inside the Store recordings | A2UI messages only |
| The client's recorded beats | `apps/client/recordings/beats/beat-*.json`, tracked, 35 files, 7.3 MB | A2UI only: turns of batches `{offsetMs, messages, texts, stamp}`. No part `kind`, no `final`, no task state |
| The intent journal | `apps/orchestrator/.state/intent-journal.jsonl`, untracked | No A2A envelope. `dispatch[].sawFinal` is derived from 0.3's `final` |
| The sdk's card fixtures | `packages/sdk/js/test/fixtures/cards/*.json`, 4 files | Whole 0.3 cards: the ADK restaurant finder's and the kit's three shapes |
| The apps' recorded beats | `<app>/agent/recordings/beats/` in `a2uiverse-apps`, tracked, 31 files | A2UI only, the same beat shape |
| The apps' deterministic fixtures | `<app>/agent/app/fixtures/deterministic/` in `a2uiverse-apps`, tracked, 58 files | A2UI message arrays only |

1. The replay transport rebuilds 0.3 events in code from a beat's batches: `kind: 'status-update'`, `final: false`, `state: 'working'`, `kind: 'message'` (`apps/client/src/canvas/replayTransport.ts`, lines 53 to 87). The beats themselves need no change.
2. Three guards require the 0.3 card shape by requiring `url`: the registry store (`apps/orchestrator/src/registry/store.ts`, line 180), the marketplace's card fetch (`apps/marketplace/src/cardFetch.ts`, line 35) and the contract `packages/sdk/contracts/marketplace-entry.schema.json` (line 35), mirrored in `packages/sdk/js/src/marketplace.ts`.
3. The contract `packages/sdk/contracts/a2uiverse.v0.9.json` states two conventions in 0.3's terms. The `paintMeta` part is recognised by its part metadata `mimeType` (line 83). The auth-required request is "a data part of the status message of a task in A2A's `auth-required` state, recognized by the state and its `security` key", citing A2A 0.3 section 4.5 (lines 96 to 102).
4. `packages/sdk/js/src/a2uiverse.ts` holds the state's spelling, `AUTH_REQUIRED_STATE = 'auth-required'` (line 470), and types the request's requirement as 0.3's `Record<string, string[]>`.

## 2. Code that reads or writes 0.3 fields

Lines over files, source then test:

| Field | Client | Orchestrator | Marketplace | Stellify | sdk |
| --- | --- | --- | --- | --- | --- |
| A part's `kind` (`'data'`, `'text'`, `'file'`) | 13/3, 49/12 | 31/10, 110/18 | 4/1, 11/3 | 4/1, 11/3 | 1/1, 4/1 |
| An event's `kind` (`'status-update'`, `'artifact-update'`, `'message'`, `'task'`) | 14/4, 35/12 | 45/8, 123/18 | 7/1, 3/1 | 7/1, 3/1 | none |
| `final` | 4/3, 17/11 | 13/7, 57/12 | 1/1, 2/2 | 1/1, 1/1 | none |

1. The files that carry most of it: `apps/client/src/a2a/messages.ts`; in the orchestrator `src/executor.ts`, `src/agentsPool/agentsPool.ts`, `src/agentsPool/credentialBar.ts`, `src/journal/descriptor.ts` and `src/composition/{classify,fragmentRelay,shellPainter,synthesisPainter}.ts`; `apps/marketplace/src/smoke.ts`; `packages/stellify/src/transport.ts`.
2. Lowercase task-state strings are also the platform's own words for a slot's state and a turn's outcome, so a search for them is noisy. The sites that mean A2A's states are the orchestrator's `finalStatus` and its callers in `src/executor.ts`, the failed and terminal sets in `src/agentsPool/agentsPool.ts` (lines 91 to 92), `src/composition/fragmentRelay.ts`, `apps/marketplace/src/smoke.ts`, `packages/stellify/src/transport.ts` and `packages/stellify/src/preview.ts`.
3. The requirement list `security` is read in about 13 source files: the client's `src/canvas/trustedPage/appCard.ts` and `scripts/lib/signIn.ts`; the marketplace's `src/marketplace.ts`; the orchestrator's `src/accounts/accounts.ts`, `src/registry/updates.ts`, `src/vault/schemes.ts` and `src/vault/vault.ts`; Stellify's `src/credential.ts` and `src/preview.ts`; the sdk's `src/a2uiverse.ts` and `src/smoke.ts`; `packages/registry-snapshot/world.js`; `scripts/launch-preview.mjs`.
4. A scheme's internals (`type === 'oauth2'`, `flows.authorizationCode`, `oauth2MetadataUrl`) are read in about 6 of those files.
5. `card.url` is read at `apps/orchestrator/src/registry/registry.ts` (lines 198, 845 and 863) beside the two guards of section 1, and by the SDK when it builds a client from a card.
6. `capabilities.extensions` is read in the sdk's `readCatalogIdsByVersion` (`packages/sdk/js/src/catalog.ts`) and in `packages/registry-snapshot/world.js`.
7. No source file writes the JSON-RPC method names or the extensions header by hand. Tests assert `'tasks/cancel'` against the fake vendor's method log and read the header through the SDK's `HTTP_EXTENSION_HEADER`.

## 3. How an A2UI part is recognised and marked today

1. The orchestrator recognises an A2UI part by content: a data part whose `data` has a string `version` and an A2UI operation key (`isA2ui` in `apps/orchestrator/src/agentsPool/agentsPool.ts`, lines 738 to 743). The MIME type is not read. A list in `data` is not recognised.
2. The client does the same: it takes a data part whose inline `version` is one the sdk lists, "NOT the DataPart's MIME metadata" (`apps/client/src/a2a/messages.ts`, lines 191 to 211).
3. The sdk's reader for the smoke test takes one message object, or a list under a `messages` key (`a2uiMessagesIn` in `packages/sdk/js/src/smoke.ts`).
4. The platform writes a MIME type on one part only, its own `paintMeta` (`apps/orchestrator/src/composition/shellPainter.ts`, line 47). The A2UI parts it sends carry none.
5. The agent kit writes A2UI parts through upstream's `create_a2ui_part` and `paintMeta` parts with `metadata={"mimeType": …}` (`agent-kit/src/a2ui_agent_kit/paint_meta.py`, line 54).

## 4. The orchestrator as an A2A server

1. `apps/orchestrator/src/app.ts` builds `new DefaultRequestHandler(card, new InMemoryTaskStore(), executor)` (line 195) and mounts `agentCardHandler` and `jsonRpcHandler` (lines 252 to 253). JSON-RPC over HTTP, with server-sent events for a stream, is its only binding.
2. Its card is written by hand in `apps/orchestrator/src/agentCard.ts`: `protocolVersion: '0.3.0'`, `url`, `preferredTransport: 'JSONRPC'`, and one extension entry per A2UI version.
3. The executor publishes a task first, then status updates, and ends with `finalStatus`, which sets `final: true`. A heartbeat publishes `working` updates with `final: false`.
4. Besides the browser client, its endpoint is called by `apps/client/scripts/lib/drive.ts`, which `scripts/record-beats.ts`, `scripts/check-transparency.ts` and `e2e-live/orchestrator.ts` use, and by the orchestrator's own tests. The marketplace, Stellify and everything in `a2uiverse-apps` call agents, never the orchestrator.
5. The browser client builds its sender with `A2AClient.fromCardUrl` (`apps/client/src/a2a/client.ts`, line 54) and sends no extensions header.

## 5. Reaching agents

1. Three places build a client for an agent, each with `new ClientFactory({transports: [new JsonRpcTransportFactory({fetchImpl})], …})`: `apps/orchestrator/src/agentsPool/agentsPool.ts` (lines 587 to 592), `apps/marketplace/src/smoke.ts` (line 81) and `packages/stellify/src/transport.ts` (line 85).
2. Each sets the extensions header through the SDK, `ServiceParameters.create(withA2AExtensions(...))`, naming both A2UI extension URIs.
3. The orchestrator builds a client from the live card when it holds one, and from the card as stored otherwise.

## 6. In `a2uiverse-apps`

1. The kit requires `a2a-sdk[http-server]>=0.3.0,<0.4.0` and its lockfile resolves 0.3.26. In that lockfile only the kit and `a2ui-a2a` 0.1.0 depend on `a2a-sdk`; `a2ui-agent-sdk` 0.9.0, `a2ui-core` 0.4.0 and `google-adk` 2.8.0 do not.
2. All seven apps are built on the kit: calendar, circleci, github, gmail, linear, and the two mock shops. Each `app/__main__.py` is `run(CONFIG)`, and none builds a server of its own.
3. A kit agent serves JSON-RPC over HTTP alone: `A2AStarletteApplication(agent_card=card, http_handler=handler).build()` (`agent-kit/src/a2ui_agent_kit/server.py`, lines 107 to 112).
4. The card is built by `build_agent_card` in the same file. It sets no protocol version and no transport; the 0.3 SDK's defaults supply `"0.3.0"` and `"JSONRPC"`.
5. The kit imports six names from `a2ui-a2a`: `get_a2ui_agent_extension` (`server.py`), `get_a2ui_extension_uri`, `try_activate_a2ui_extension` and `create_a2ui_part` (`versions.py`), and `get_a2ui_datapart` and `is_a2ui_part` (`testing.py`).
6. `deterministic` is the default mode (`agent-kit/src/a2ui_agent_kit/cli.py`), started as `uv run python -m app --mode deterministic` from an app's `agent` folder. It needs no model and no API key.
7. The kit's own test client and beat runner post raw 0.3 JSON-RPC to the agent (`agent-kit/src/a2ui_agent_kit/testing.py` and `beats.py`).
8. The kit's use of 0.3 types, in source lines: parts (`DataPart`, `TextPart`, `Part(root=…)`) about 38 in 11 files, `final=` 10 in 2 files, task states about 16 in 3 files, JSON-RPC method names 9 in 6 files.

## 7. Not verified

1. The counts in section 2 and in item 8 of section 6 come from one sweep with regular expressions and were not recounted.
2. Read twice: every store in section 1 except the intent journal's contents and the apps' fixtures' contents, the three guards, the contract's two conventions, section 3, items 1, 2 and 5 of section 4, section 5, and items 1 to 6 of section 6. The remaining items were read once.
3. Nothing was run.
