# Phase 20 notes — an A2UI part on A2A 0.3 and 1.0

What the A2A specifications, the two A2A SDKs, upstream A2UI and ADK say and do about a JSON data part that carries A2UI, read on 2026-11-13 for [sub-task 20.4](spec/task-20.4-a2ui-on-a2a-1-0.md) of [Phase 20](spec/phase-20-a2a-1-0.md). It adds to the three earlier notes: [`@a2a-js/sdk` 1.3.0 as read from its source](phase-20-a2a-js-sdk-1.3.0-notes.md), [upstream A2UI and A2A 1.0](phase-20-upstream-a2ui-on-a2a-notes.md) and [where A2A 0.3 shapes sit in the two repositories](phase-20-a2a-0.3-shapes-notes.md).

The sources, each at a fixed point, with paths and line numbers at that point:

1. The A2A specification: `a2aproject/A2A` at tag `v1.0.0` (commit `17369575`) and at tag `v0.3.0`.
2. The Python A2A SDK: `a2aproject/a2a-python` at tag `v1.3.0` (commit `0d9dafb9`).
3. Upstream A2UI: `a2ui-project/a2ui` at `upstream/main` `8bf644a37`.
4. ADK: `google/adk-python` at tag `v2.3.0`, compared with `v2.2.0` and `v1.28.1`.
5. The agent kit: `a2uiverse-apps` at `c24e22c`.
6. `@a2a-js/sdk` 1.3.0 as installed in this repository.
7. RFC 6838 and RFC 6839, from `rfc-editor.org`.

Nothing was run. Section 13 lists what was not verified.

## 1. Summary

1. A2A 1.0 gives every part a field of its own for its MIME type, `mediaType`, and lets a part's `data` hold any JSON value. A2A 0.3's data part holds an object only and has no MIME field.
2. The 0.3 layers of both A2A SDKs drop `mediaType` on a data part and wrap a value that is not an object as `{value: …}`, flagged in the part's metadata. Both unwrap it on the way in.
3. Upstream's extension specifications require `metadata.mimeType` on an A2UI part and a list in its `data`. Every upstream agent read here takes a press from one object and reads no mark.
4. No upstream source says whether an A2UI part rides a message or an artifact. A2A 1.0 says results belong in artifacts. Agents on ADK's stock executor send A2UI in status messages and repeat the last message's parts in an artifact.
5. Neither A2A version names a field for the scheme or the scopes an agent needs mid-task. A2A 1.0 asks an agent to keep its stream open after it asks for sign-in.

## 2. The part in the A2A specifications

1. A2A 1.0 defines the part in `specification/a2a.proto`, lines 221 to 242. Its `data` is a `google.protobuf.Value`: "Arbitrary structured `data` as a JSON value (object, array, string, number, boolean, or null)." (line 232). Its `metadata` is a `google.protobuf.Struct`, an object.
2. The same message defines `media_type` (lines 239 to 241): "The `media_type` (MIME type) of the part content (e.g., "text/plain", "application/json", "image/png"). This field is available for all part types."
3. `docs/specification.md` at `v1.0.0` has no sentence of its own on what `mediaType` means on a part. Its sections 4.1 to 4.5 hold macros that render the proto, so the proto's comments are the text. Its appendix A.2.1 gives the data part as "Legacy: `{ "kind": "data", "data": {...} }`" and "Current: `{ "data": {...}, "mediaType": "application/json" }`" (lines 3468 to 3470). `docs/whats-new-v1.md`, line 343, calls it "`mediaType` field (replaces `mimeType`) - available for all part types".
4. JSON names are camelCase: "All JSON serializations of the A2A protocol data model **MUST** use **camelCase** naming for field names" (`docs/specification.md`, section 5.5, line 1206). So `media_type` is `mediaType` on the wire.
5. A2A 0.3.0 defines the data part in `types/src/types.ts`, lines 799 to 809: `kind: "data"` and `data: {[key: string]: any}`. `specification/json/a2a.json`, lines 694 to 718, types `data` as `"type": "object"`. Its only other field is the optional `metadata` of every part (lines 726 to 734 of `types.ts`).
6. A2A 0.3.0 defines no MIME field on a data part. `mimeType` exists on a file alone (`types.ts`, line 757).
7. No statement was found in either version that a data part must carry a MIME type, or what a reader should assume when it carries none.

## 3. Security requirements in the two versions

1. A2A 1.0 (`specification/a2a.proto`, lines 480 to 492): `message SecurityRequirement { map<string, StringList> schemes = 1; }` and `message StringList { repeated string list = 1; }`. The card holds them as `repeated SecurityRequirement security_requirements = 9` (lines 375 to 378).
2. By the camelCase rule, one requirement on a 1.0 card is `{"schemes": {"<scheme>": {"list": ["<scope>"]}}}` under `securityRequirements`. That shape is derived from the proto. The specification gives no JSON example of it, and its own sample card (section 8.5, line 2142) still writes `"security": [{ "google": ["openid", "profile", "email"] }]`.
3. A2A 0.3.0 (`types/src/types.ts`, lines 440 to 449): `security?: { [scheme: string]: string[] }[]`, described as "an OR of ANDs", with the example `[{"oauth": ["read"]}, {"api-key": [], "mtls": []}]`.

## 4. A task that needs sign-in mid-task

1. A2A 1.0 names it "In-Task Authorization" (`docs/specification.md`, section 7.6, lines 1884 to 1938). The agent "MUST transition the TaskState to `TASK_STATE_AUTH_REQUIRED`" and "MUST include a TaskStatus message explaining the required authorization, unless the details of the authorization have been negotiated out-of-band or via an extension" (section 7.6.1, lines 1899 to 1903).
2. No field in A2A 1.0 names the scheme or the scopes needed. The only carrier is the status message.
3. Section 7.6.1, line 1907: "If the credential is received out-of-band, the agent SHOULD maintain any active response streams with the client after setting the TaskState to `TASK_STATE_AUTH_REQUIRED`. The agent MAY immediately continue Task processing after receiving the credential, without a requirement that clients send a follow-up message."
4. A2A 0.3.0 names it "In-Task Authentication (Secondary Credentials)" (`docs/specification.md`, section 4.5, lines 255 to 261). The agent "SHOULD transition the A2A task to the `auth-required` state", and "The accompanying `TaskStatus.message` (often a `DataPart`) SHOULD provide details about the required secondary authentication".
5. A2A 1.0 says three things about when a stream closes. Section 3.1.2, line 212: "The stream MUST close when the task reaches a terminal state (e.g. completed, failed, canceled, rejected)." Section 11.7, line 2949: the stream runs "until the task reaches a terminal or interrupted state, at which point the stream closes". Section 7.6.1 asks the agent to keep streams open in the auth-required state, which the proto calls "an interrupted state" (line 206).
6. A2A 1.0 has no `final` on a status update. A2A 0.3.0 has it (`types/src/types.ts`, lines 528 to 529).

## 5. Messages and artifacts in A2A 1.0

1. `docs/specification.md`, section 3.7, line 760: "Messages SHOULD NOT be used to deliver task outputs. Results SHOULD BE returned using Artifacts associated with a Task."
2. The same section, line 764: "Messages MUST NOT be considered a reliable delivery mechanism for critical information."
3. `specification/a2a.proto`, line 279: "Artifacts represent task outputs."

## 6. The extensions header and a message's `extensions`

1. A2A 1.0 names the header `A2A-Extensions` (`docs/specification.md`, section 3.2.6, line 487, and section 14.2.2, line 3295).
2. A2A 0.3.0 names it `X-A2A-Extensions`, in `docs/topics/extensions.md` alone (lines 110 and 120). Its `docs/specification.md` does not mention the header.
3. A message's `extensions` field is "The URIs of extensions that are present or contributed to this Message." in A2A 1.0 (`specification/a2a.proto`, lines 273 to 274) and "The URIs of extensions that are relevant to this message." in 0.3.0 (`types/src/types.ts`, lines 710 to 711).

## 7. The Python A2A SDK 1.3.0 and a data part

A server built on `a2a-sdk` 1.3.0 with its 0.3 layer on, as the agent kit will be after 20.9 (the agent kit on A2A 1.0).

1. An executor builds one part, the generated protobuf message, with the fields `text`, `raw`, `url`, `data`, `metadata`, `filename` and `media_type` (`src/a2a/types/a2a_pb2.pyi`, lines 86 to 102).
2. To a caller on A2A 1.0 the part is written by ProtoJSON: `{"data": …, "metadata": {…}, "mediaType": "…"}`. A list in `data` goes out as a bare list (`src/a2a/server/routes/jsonrpc_dispatcher.py`, lines 403 to 407).
3. To a caller on A2A 0.3 the part goes through `to_compat_part` (`src/a2a/compat/v0_3/conversions.py`, lines 75 to 99). It never reads `media_type` for a data part and writes it nowhere. A value that is not an object becomes `{'value': …}` with `data_part_compat` set to true in the part's metadata. An object passes through with the part's metadata unchanged. The SDK's own test asserts the wrap (`tests/compat/v0_3/test_conversions.py`, lines 116 to 140).
4. On the JSON-RPC wire to a 0.3 caller the part is then `{"data": {…}, "kind": "data", "metadata": {…}}`, or `{"data": {"value": […]}, "kind": "data", "metadata": {…, "data_part_compat": true}}` for a list.
5. The 0.3 HTTP+JSON binding writes another part shape, with no `kind`: `{"data": {"data": {…}}, "metadata": {…}}` (`src/a2a/compat/v0_3/rest_handler.py`, lines 76 to 77). The drop and the wrap are the same.
6. Inbound from a 0.3 caller, `to_core_part` (the same file, lines 40 to 53) removes `data_part_compat` from the metadata and unwraps `data['value']`. A 0.3 data part whose `data` is not an object is refused as an invalid request.
7. An executor is given no field that says which A2A version its caller spoke. `ServerCallContext` holds `state`, `user`, `tenant` and `requested_extensions` (`src/a2a/server/context.py`, lines 14 to 25). On JSON-RPC and HTTP+JSON the request's headers are in `state['headers']`. On gRPC the state is `{'grpc_context': context}` (`src/a2a/server/request_handlers/grpc_handler.py`, line 55).
8. The server serves one card to every caller, whatever `A2A-Version` the request names: the 1.0 card with 0.3's `url`, `preferredTransport`, `protocolVersion` and `additionalInterfaces` merged in (`src/a2a/server/request_handlers/response_helpers.py`, lines 93 to 117).
9. A status message's parts, an artifact's and a task history's go through the same `to_compat_part`.
10. A `google.protobuf.Value` stores a number as a double, so `4326` reads back as `4326.0` in Python (`src/a2a/helpers/proto_helpers.py`, lines 342 to 345).

## 8. `@a2a-js/sdk` 1.3.0 and a wrapped value

1. The 0.3 layer's `toCorePart` (`dist/compat/v0_3/index.js`, from `src/compat/v0_3/translate/parts.ts`) unwraps a data part whose metadata has `data_part_compat` set to true: it takes `data.value` and deletes the flag. A list that a 0.3 layer wrapped therefore arrives as a bare list.
2. The same function gives every 0.3 data part `mediaType: ''` and keeps its metadata.
3. Outbound, the [`@a2a-js/sdk` notes](phase-20-a2a-js-sdk-1.3.0-notes.md), section 6, record the same drop and wrap as Python's.

## 9. What upstream's extension specifications ask

Line numbers are those of `specification/v0_9_1/docs/a2ui_extension_specification.md`.

1. Line 172: "Agents and clients encode A2UI messages as an A2A `DataPart`." The part is named and what holds it is not.
2. Line 176: the part "must have" `DataPart.metadata["mimeType"] = "application/a2ui+json"`. The v0.9 and v1.0 files name the same string (their lines 176 and 181).
3. Line 178: "The `data` field of the `DataPart` contains a list of A2UI JSON messages (e.g., `createSurface`, `updateComponents`, `action`). It MUST be an array of messages."
4. The processing rules (lines 180 to 186): the list "is NOT a transactional unit"; a receiver "MUST continue processing the remaining messages in the list" when one fails; "a renderer SHOULD NOT repaint the UI until all messages in the list have been processed".
5. The rule holds in both directions. Line 227: a client "also uses a `DataPart` with the same `application/a2ui+json` MIME type", and the example wraps the `action` in a list.
6. The list schemas are bare arrays: `specification/v0_9_1/json/server_to_client_list.json` and `client_to_server_list.json` are each `"type": "array"`.
7. `specification/v0_9_1/json/client_to_server.json` admits two messages, `action` and `error`, each with `version`.
8. `docs/public/concepts/actions.md`, line 413, ties the list to the A2A version: "The use of a **list** in the `data` field was introduced in **A2A v1.0**. Earlier versions of the A2A protocol expect the `data` field to contain a single JSON object."
9. Upstream renamed its MIME string in commit `c712e0fee` (2026-05-29), titled "POTENTIALLY BREAKING CHANGE refactor: IANA convention requires mime type application/a2ui+json (#1493)". `python/a2ui_a2a/src/a2ui/a2a/parts.py` now names the old string `DEPRECATED_A2UI_MIME_TYPE`, still writes it for a v0.8 or v0.9 message and for one with no version (lines 79 to 81), and `is_a2ui_part` accepts either string in `metadata.mimeType` and reads nothing else.
10. An object holding a `messages` list is not a part form in any upstream source. The shape appears in the basic catalog's example files (`specification/v0_9/catalogs/basic/examples/*.json`) and as a model's raw output, which `python/a2ui_core/src/a2ui/core/processing/adapters/factory.py`, line 174, unwraps before any part is built.

## 10. How an agent takes a press

| Reader | How it takes the press | Given a list in `data` |
| --- | --- | --- |
| The agent kit, `extract_action` in `agent-kit/src/a2ui_agent_kit/versions.py` | `root.data.get("version")`, then `root.data.get("action")` (line 96) | `.get` on a list raises |
| Upstream's Node restaurant finder, `readInboundMessage` in `samples/agent/node/restaurant_finder/src/a2a.ts` | `data.version === version && data.action` (lines 79 to 82) | No action is found, and the press is lost with nothing said |
| Upstream's Python ADK restaurant finder, `samples/agent/adk/restaurant_finder/agent_executor.py` | `part.root.data.get("version")` and `"action" in part.root.data` (lines 79 to 94) | `.get` on a list raises |

1. None of the three reads a mark.
2. Upstream's Lit sample client writes a press as one object in `data`, with `mimeType` on the part itself and not in its metadata (`samples/client/lit/shell/client.ts`, lines 63 to 93).

## 11. Where A2UI rides upstream

1. No sentence in `specification/` or `docs/` says whether an A2UI part rides a message or an artifact.
2. Both restaurant finders put A2UI in the message of a status update and never in an artifact (`samples/agent/node/restaurant_finder/src/a2a.ts`, lines 137 to 144; `samples/agent/adk/restaurant_finder/agent_executor.py`, lines 159 and 179 to 183).
3. Eight upstream agents run on ADK's stock `A2aAgentExecutor`: `samples/community/agent/adk/rizzcharts/python`, `mcp_app_proxy`, `file_upload_summarizer`, `orchestrator` and the orchestrator's four subagents. Each card declares `streaming=True`.
4. On its legacy path the stock executor sends every ADK event as a `working` status update carrying a message. After the run it publishes one artifact holding the parts of the last status message, then a `completed` status update with no message (`src/google/adk/a2a/executor/a2a_agent_executor.py`, lines 292 to 323, with `task_result_aggregator.py`, lines 61 to 62). The last message's parts are therefore sent twice.
5. Upstream's own test asserts the double send (`python/a2ui_adk/tests/a2a/test_rpc_callback.py`, lines 633 to 643): "The reply goes out in the working status update, from the agent, and again as the task's artifact."
6. The stock executor has a newer path that sends artifacts only. It runs when the caller requests the extension `https://google.github.io/adk-docs/a2a/a2a-extension/` or the agent passes `force_new_version=True` (`a2a_agent_executor.py`, lines 135 to 137). Upstream A2UI names neither.
7. One upstream agent uses an artifact alone: `samples/community/agent/adk/gemini_enterprise/v0_8/agent_engine` (`agent_executor.py`, lines 139 to 140). It paints in A2UI v0.8 and its card declares `streaming=False`.
8. Upstream's sample clients differ. The Lit and React shells read status messages and bare messages only. The Angular restaurant sample reads an artifact update too when streaming (`samples/client/angular/projects/restaurant/src/server.ts`, lines 162 to 166), and `samples/community/client/angular/projects/a2a-chat-canvas` reads a task's status message and every artifact (`src/lib/utils/a2a.ts`, lines 40 to 51).
9. The carrier logic of the stock executor is the same at `v2.3.0`, `v2.2.0` and `v1.28.1`. Upstream's root `uv.lock` resolves `google-adk` 2.3.0 with `a2a-sdk` 0.3.25.

## 12. The MIME suffix rule

1. RFC 6838, section 4.2 (Naming Requirements): "the final "+" in a subtype name introduces a structured syntax specifier suffix."
2. RFC 6838, section 4.2.8 (Structured Syntax Name Suffixes): ""+suffix" constructs for as-yet unregistered structured syntaxes SHOULD NOT be used, given the possibility of conflicts with future suffix definitions."
3. RFC 6839, section 3.1, registers `+json`: "The suffix "+json" MAY be used with any media type whose representation follows that established for "application/json"."

## 13. Not verified

1. Nothing was run, against any SDK, agent or client. What a wire carries is read from code.
2. Read twice: the A2A 1.0 part and its `media_type`; the two requirement shapes; section 7.6 of the A2A 1.0 specification; `to_compat_part` and `to_core_part` in the Python SDK, with their test; the Python SDK's card merge; the extension specification's data encoding section; both restaurant finders' carriers; the stock executor's legacy path, with upstream's test.
3. Read once: the three readers of section 10 and the Lit client's writer; the A2A 0.3.0 texts; the extensions header's sections; the Python SDK's HTTP+JSON path and its call context; `toCorePart` in the installed `@a2a-js/sdk`; the stock executor's newer path; the sample clients of section 11; the cards' `streaming` values, by search alone.
4. The JSON shape of a 1.0 security requirement is derived from the proto and the camelCase rule. No source showed it written out.
5. Whether the stock-executor agents emit partial ADK events was not determined. If they do, the final artifact holds only the last chunk's parts.
6. What the Python server does with its stream after a task asks for sign-in was not read.
7. The Python SDK's 0.3 gRPC path and its legacy request handler were not read. The `a2a-sdk` 1.3.0 package on PyPI was not compared with the tag.
8. The RFC sentences were read through a fetch of the RFC text files, once.
