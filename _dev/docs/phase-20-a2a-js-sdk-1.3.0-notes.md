# Phase 20 notes — `@a2a-js/sdk` 1.3.0 as read from its source

What `@a2a-js/sdk` 1.3.0 does beyond what its [migration guide](https://github.com/a2aproject/a2a-js/blob/main/docs/migration-guide.md) and its [0.3 compatibility guide](https://github.com/a2aproject/a2a-js/blob/main/docs/compatibility-v0_3.md) say, read on 2026-11-12 for [Phase 20](spec/phase-20-a2a-1-0.md). Everything here comes from the source of [`a2aproject/a2a-js` at tag `v1.3.0`](https://github.com/a2aproject/a2a-js/tree/v1.3.0) (commit `29417a5b`) and from the published tarball. Nothing was run. Paths are in that repository at that tag, with line numbers; issue and pull request numbers are that repository's. "The A2A 1.0 specification" is `docs/specification.md` and `specification/a2a.proto` in `a2aproject/A2A` at tag `v1.0.0`. Section 11 lists what was not checked.

## 1. Where the SDK differs from the phase spec

Decision 9 of the phase spec says the decisions and the agents win over the SDK. These are the differences found so far.

1. Interface choice inside one binding (`src/client/factory.ts:104-131`). For each binding the client keeps the first interface the card lists, unless a later interface on that binding is on A2A 1.0, which replaces it. On one binding a 1.0 interface is therefore chosen over a 0.3 one whatever the card's order, and of several 1.0 interfaces the last is chosen (issue 734). Pull request 764, merged on 2026-10-08 and unreleased, makes the first 1.0 interface win; a 1.0 interface still replaces a 0.3 one. Across bindings the card's order decides, as long as the client sets no `preferredTransports`.
2. The 0.3 translators refuse what 0.3.14 passed through untranslated. A 0.3 card with no `capabilities`, `defaultInputModes`, `defaultOutputModes` or `skills`, or a skill with no `tags`, throws (`src/compat/v0_3/translate/agent_card.ts:116`, `:174-201`), and so does a sign-in scheme of an unknown `type` (`src/compat/v0_3/translate/security.ts:106-109`). A 0.3 message with no `messageId`, a role other than `user` or `agent`, or `parts` that is not an array throws (`src/compat/v0_3/translate/messages.ts:22-34`), which ends the whole stream.
3. The end of a stream. A server built on the SDK keeps a stream open when a task asks for sign-in (`src/server/events/execution_event_queue.ts:33-55`), while the A2A 1.0 specification closes a stream at "a terminal or interrupted state". On the client a stream ends only when the HTTP body ends (section 8).
4. The two guides are behind the code. The client sends `A2A-Version: 0.3` to a 0.3 agent, where the compatibility guide's header table says the header is absent (section 7). A server with the 0.3 layer on routes by the `A2A-Version` header, where the guide says by method name (section 9).

## 2. Package

1. `engines` is `node >=20`, and the package is ESM (`"type": "module"`) with a CommonJS build beside it.
2. The entry points are `.`, `./errors`, `./errors/grpc`, `./server`, `./server/express`, `./server/grpc`, `./server/database`, `./client`, `./client/grpc`, `./compat/v0_3`, `./compat/v0_3/server`, `./compat/v0_3/server/express`, `./compat/v0_3/server/grpc`, `./compat/v0_3/client` and `./compat/v0_3/client/grpc`.
3. The one dependency is `jose ^6.2.3`. The peer dependencies are all optional: `@bufbuild/protobuf`, `@grpc/grpc-js`, `better-sqlite3`, `express` (`^4.21.2 || ^5.1.0`), `kysely`, `mysql2` and `pg`.
4. The default client factory holds the JSON-RPC and HTTP+JSON transports (`src/client/factory.ts:34`). The gRPC transport comes from `@a2a-js/sdk/client/grpc`.
5. `require('@a2a-js/sdk')` throws `ERR_REQUIRE_ESM` on Node 20.0 to 20.18 and 22.0 to 22.11, because `jose` 6 is ESM-only (issue 759, open). ESM imports are unaffected.

## 3. In a browser

1. `@a2a-js/sdk/client` imports only `jose`, and `@a2a-js/sdk/compat/v0_3/client` imports nothing. Neither has a `node:` import.
2. Both use the Node global `Buffer` without importing it. The 0.3 part translator calls `Buffer.isBuffer` for every data part it sends (`src/compat/v0_3/translate/parts.ts:23-27`, `:147-150`), so sending an object-valued data part to a 0.3 agent from a browser with no `Buffer` global throws a `ReferenceError`. Receiving a 0.3 data part does not reach that line unless the part's metadata has `data_part_compat` set. No issue reports this.
3. The other uses of `Buffer` handle file bytes only: the codec for a `raw` part and 0.3 file parts carrying `bytes`.
4. The client bundle already contains the 0.3 transport and the card translators. Importing `@a2a-js/sdk/compat/v0_3/client` as well brings a second copy of those classes.

## 4. Three shapes of the same data

The SDK's in-memory shape is neither wire shape.

| | SDK 1.x in memory | A2A 1.0 wire JSON | A2A 0.3 wire JSON |
| --- | --- | --- | --- |
| Text part | `{content: {$case: 'text', value}, metadata, filename: '', mediaType: ''}` | `{"text": "hi"}` | `{"kind": "text", "text": "hi"}` |
| Data part | `{content: {$case: 'data', value}, metadata, filename: '', mediaType}` | `{"data": …, "mediaType": …, "metadata": …}` | `{"kind": "data", "data": {…}, "metadata": …}`, `data` an object only |
| Message | `{messageId, contextId: '', taskId: '', role: Role.ROLE_USER, parts, metadata, extensions: [], referenceTaskIds: []}` | `{"messageId", "role": "ROLE_USER", "parts", …}` | `{"kind": "message", "messageId", "role": "user", "parts", …}` |
| Status update | `{payload: {$case: 'statusUpdate', value: {taskId, contextId, status, metadata}}}` | `{"statusUpdate": {"taskId", "contextId", "status": {"state": "TASK_STATE_WORKING"}}}` | `{"kind": "status-update", "taskId", "contextId", "status": {"state": "working"}, "final": false}` |
| Task state | a numeric enum, 0 to 8 | `"TASK_STATE_COMPLETED"`, `"TASK_STATE_AUTH_REQUIRED"` and the rest | `"completed"`, `"auth-required"` and the rest |
| Role | `ROLE_USER = 1`, `ROLE_AGENT = 2` | `"ROLE_USER"`, `"ROLE_AGENT"` | `"user"`, `"agent"` |

1. The in-memory types are in `src/types/pb/a2a.ts`, and every key is required in them.
2. The package root exports a codec between the in-memory shape and the 1.0 wire JSON for each message type: `StreamResponse.toJSON(event)` and `StreamResponse.fromJSON(json)`, the same pair on `AgentCard`, `Message`, `Part` and `Task`, with `taskStateToJSON` and `roleToJSON` for the enums (`src/types/protojson.ts:2045-2048`). `toJSON` leaves out defaults and `fromJSON` restores them. `fromJSON` drops fields it does not know.
3. `JSON.stringify` of an in-memory object is not wire JSON: it writes `$case` and numeric enums.
4. There is no public codec between the in-memory shape and the 0.3 wire. The translators are internal. Two pieces are public: `parseLegacyAgentCard` and `isLegacyAgentCard` from `@a2a-js/sdk/compat/v0_3/client`, and `legacyPushNotificationToV1StreamResponse` from `@a2a-js/sdk/compat/v0_3`, which turns one bare 0.3 task, message, status update or artifact update into a 1.x `StreamResponse`. The 0.3 TypeScript types are not exported.
5. Two codec bugs are open: an unknown enum value is written as `"UNRECOGNIZED"` (issue 640), and a data part whose value is `null` loses its content (issue 642).

## 5. The agent card

The 1.0 card, as the SDK types it and the A2A 1.0 specification's `a2a.proto` defines it:

1. `AgentCard` has `name`, `description`, `supportedInterfaces[]`, `provider`, `version`, `documentationUrl`, `capabilities`, `securitySchemes`, `securityRequirements[]`, `defaultInputModes[]`, `defaultOutputModes[]`, `skills[]`, `signatures[]` and `iconUrl`.
2. The protocol version is on each interface, `{url, protocolBinding, tenant, protocolVersion}`. The card has no version field of its own.
3. `capabilities` is `{streaming, pushNotifications, extensions[], extendedAgentCard}`. An extension is `{uri, description, required, params}`.
4. A security requirement is `{schemes: {<name>: {list: [<scope>]}}}`.
5. A security scheme is one of `apiKeySecurityScheme`, `httpAuthSecurityScheme`, `oauth2SecurityScheme`, `openIdConnectSecurityScheme` and `mtlsSecurityScheme`, the member name being the discriminator on the wire. An OAuth2 scheme holds one flow: `authorizationCode`, `clientCredentials`, `deviceCode`, or the deprecated `implicit` and `password`.
6. The specification's own sample card still writes `"security"` and `"stateTransitionHistory"`, which `a2a.proto` does not define.

What a 0.3 card becomes (`toCoreAgentCard`, `src/compat/v0_3/translate/agent_card.ts:164-209`):

| 0.3 field | In the 1.x card |
| --- | --- |
| `url`, `preferredTransport` | The first interface: `protocolBinding` from `preferredTransport`, `JSONRPC` when absent; `protocolVersion` from the card's own `protocolVersion`, `0.3` when absent |
| `additionalInterfaces[]` | Appended in order, each at `protocolVersion` `0.3` |
| `security` | `securityRequirements`, each `{schemes: {<name>: {list: […]}}}` |
| `securitySchemes` | Each wrapped by its kind. An OAuth2 scheme keeps one flow, the first present of authorization code, client credentials, implicit, password (`security.ts:195-233`). `pkceRequired` is `false` |
| `capabilities.extensions[].params` | Kept |
| `supportsAuthenticatedExtendedCard` | `capabilities.extendedAgentCard` |
| `capabilities.stateTransitionHistory` | Dropped |
| `provider`, `documentationUrl`, `iconUrl`, `skills[].examples`, `signatures` | Copied |
| A field the translator does not name | Dropped |

1. A card counts as 0.3 when it has no non-empty `supportedInterfaces` and has a top-level `url`, a 0.3-only field, or a `protocolVersion` below 1.0 (`src/compat/v0_3/client/card-resolver.ts:28-49`). A card with both shapes is treated as 1.0.
2. The resolver does not keep the card as fetched: it returns the translation (`src/client/card-resolver.ts:39-49`). To keep the raw card, fetch it apart and pass it to `createFromAgentCard`, which normalizes without changing its input, or read the response in a `fetchImpl`.
3. A fetched 1.0 card goes through `AgentCard.fromJSON` only when it looks like it carries proto-style security. Any other card is returned as fetched, with no defaults filled in (`src/client/card-resolver.ts:68-79`), so `capabilities.extensions` can be `undefined`.
4. The Express `agentCardHandler` serves `JSON.stringify(agentCard)` (`src/server/express/agent_card_handler.ts:75`). A server card whose `securitySchemes` are in the in-memory form would be served with `$case` in it.

## 6. A 0.3 agent through the 0.3 layer

What arrives from a 0.3 agent's stream:

1. A 0.3 data part `{kind: 'data', data, metadata: {mimeType: …}}` becomes `{content: {$case: 'data', value: data}, metadata: {mimeType: …}, filename: '', mediaType: ''}` (`src/compat/v0_3/translate/parts.ts:78-100`). The metadata is kept whole. `mediaType` is empty, and nothing maps `metadata.mimeType` to it.
2. `final` is dropped (`src/compat/v0_3/translate/tasks.ts:76-86`).
3. `auth-required` becomes `TASK_STATE_AUTH_REQUIRED` and `input-required` becomes `TASK_STATE_INPUT_REQUIRED`. A state the translator does not know becomes `TASK_STATE_UNSPECIFIED`.
4. A message keeps its `metadata`, `extensions` and `referenceTaskIds`. A missing `contextId` or `taskId` becomes the empty string (`src/compat/v0_3/translate/messages.ts:35-44`); pull request 691, merged and unreleased, makes it `undefined`.
5. A status update's message goes through the same translation as any message.
6. When the card has no truthy `capabilities.streaming`, `sendMessageStream` sends a plain `message/send` and yields one event (`src/client/multitransport-client.ts:154-172`).

What is sent to a 0.3 agent:

1. The request is `{id, jsonrpc: '2.0', method: 'message/stream', params: {message, configuration, metadata}}`. The message carries `kind: 'message'`, and its `contextId`, `taskId`, `extensions` and `referenceTaskIds` only when they are not empty.
2. `configuration` is always present. For a stream the agent receives `{blocking: true, acceptedOutputModes: []}`.
3. A data part goes out as `{kind: 'data', data, metadata}`. `Part.mediaType` is not written, so a 0.3 agent that looks for `metadata.mimeType` finds it only when the caller put it in the part's metadata.
4. A data value that is not an object is wrapped as `{value: …}` with `data_part_compat` set in the part's metadata.

## 7. Headers

1. `withA2AExtensions(...uris)` sets `A2A-Extensions` (`src/client/service-parameters.ts:25-29`). Every call then passes through `withNormalizedHeaders` (`src/client/multitransport-client.ts:372-423`), which sets the transport's own version, replacing any value from the caller, and rewrites the extensions header to the spelling of that version.
2. A 1.0 agent receives `A2A-Version: 1.0` and `A2A-Extensions`. A 0.3 agent receives `A2A-Version: 0.3` and `X-A2A-Extensions`.
3. The card fetch always sends `A2A-Version: 1.0`, with the 0.3 layer on or off, and no extensions header (`src/client/card-resolver.ts:41-43`). 0.3.14 sent neither header.
4. A caller can still add any header in four ways: per call through `RequestOptions.serviceParameters`, which the transports spread into the request's headers (`src/client/transports/json_rpc_transport.ts:295-299`); in a `CallInterceptor.before` hook, which runs after the normalization; through `fetchImpl` on a transport factory or on the card resolver, the only hook the card fetch has; and with `createAuthenticatingFetchWithRetry`. There is no client-wide default for service parameters.

## 8. How a stream ends

On the client, for a 1.0 agent and a 0.3 agent alike:

1. The generator ends when the HTTP body ends (`src/client/transports/json_rpc_transport.ts:356-358`). Nothing looks at the task's state or at `final`. A 0.3 agent that keeps its connection open after `final: true` leaves the generator waiting.
2. It also ends on an error event, which throws; on the caller's abort signal; and when the consumer stops reading.

On a server built on the SDK:

1. The first event an executor publishes must be a task or a message. Anything else throws "Received … before initial 'Message'/'Task' event." A second task, or a message inside a task's stream, throws "Stream ordering violation" (`src/server/request_handler/default_request_handler.ts:1177-1199`).
2. The stream ends after a message, or after a status update whose state is terminal (completed, failed, canceled, rejected) or input-required (`src/server/events/execution_event_queue.ts:42-63`). It also ends when the executor returns, unless the last state seen is input-required or auth-required (`default_request_handler.ts:507-521`).
3. Auth-required does not end it: the stream stays open until a later terminal or input-required update, or until the client leaves.
4. Whatever is published after a terminal status update never reaches that stream. A terminal state carried inside a task event does not end the stream; only a status update does.
5. An executor that returns while its task is still working closes the stream with no terminal event.
6. There is no keep-alive in 1.3.0 (pull request 638, open).

## 9. A server with the 0.3 layer on

The orchestrator leaves the layer off (decision 3 of the phase spec). This section is for an agent or a test fake built on the SDK's server.

1. `jsonRpcHandler` routes by the `A2A-Version` header: no header, or exactly `0.3`, goes to the 0.3 handler, and anything else to the 1.0 handler (`src/server/express/json_rpc_handler.ts:72-75`). This changed in 1.2.1.
2. The version is then checked against the card by exact match: the request's version must equal the `protocolVersion` of a `JSONRPC` interface on the card (`src/server/version.ts:10-47`). An absent header counts as `0.3`. A card with no JSON-RPC interface at `0.3` answers a 0.3 client with code -32009, and an interface with an empty `protocolVersion` matches nothing.
3. The card is served apart, by `agentCardHandler`, which needs its own `legacyCompat`. It answers a request with no header with the card in both shapes, and with HTTP 400 when no interface is in the 0.3 range.
4. A 0.3 `message/send` whose `configuration` has no `blocking` is treated as non-blocking and returns a working task (`src/compat/v0_3/translate/requests.ts:54`; pull request 812, open).
5. For a 0.3 client, `final` is true on the four terminal states only, so a stream that closes on input-required closes with `final: false`.
6. Streamed answers leave out the header naming the activated extensions, on both versions (issue 710; pull request 762, merged and unreleased).

## 10. Issues and pull requests

1.3.0 was released on 2026-09-29 and is npm's `latest`. 1.0.0 was released on 2026-07-22. The release pull request for 1.3.1 (785) is open.

| Number | State | What it is |
| --- | --- | --- |
| 734, 764 | fixed on `main`, not in 1.3.0 | Of several 1.0 interfaces on one binding, the last is chosen |
| 678, 691 | fixed on `main`, not in 1.3.0 | A missing `taskId` or `contextId` from a 0.3 message becomes the empty string |
| 710, 762 | fixed on `main`, not in 1.3.0 | Streamed JSON-RPC answers leave out the activated-extensions header |
| 712, 788 | fixed on `main`, not in 1.3.0 | A streamed error event loses its typed A2A error |
| 714, 718 | fixed on `main`, not in 1.3.0 | The client drops stream events whose lines end in a bare carriage return |
| 770 | merged, not in 1.3.0 | The client skips a stream event of a kind it does not know, where 1.3.0 throws |
| 812 | open | A 0.3 request with no `blocking` flag treated as blocking |
| 775 | open | An incomplete event at the end of a stream discarded |
| 638 | open | Keep-alive, event ids and an idle timeout for streams |
| 632 | open | A second `sendMessage` refused while the task's executor runs |
| 759 | open | The CommonJS build throws on older Node 20 and 22 |
| 640, 642 | open | The two codec bugs of section 4 |
| 663 | open | Canonicalizing a card for signing drops `securitySchemes` when given an in-memory card |
| 666 | open | Optional fields typed as required |
| 646 | closed | A request to make the 0.3 translators public; only the push-notification converter was added |

## 11. Not verified

1. Nothing was run, against the SDK or against any 0.3 or 1.0 agent. The browser `Buffer` failure and the `$case` in a served card are read from code.
2. Sections 1, 5, 7, 8 and 9 and the 0.3 translation in section 6 were read twice. The table in section 4, the outbound half of section 6, the bundle contents in section 3 and everything in section 10 except issue 734 and pull request 764 were read once.
3. The issue list comes from keyword searches and may miss reports.
4. That a browser bundler supplies no `Buffer` by default, and that Express applies its default body limit to `jsonRpcHandler`, are assumed, not checked.
