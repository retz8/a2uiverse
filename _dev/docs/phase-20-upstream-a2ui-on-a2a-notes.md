# Phase 20 notes — upstream A2UI and A2A 1.0

What upstream A2UI says and does about A2A 1.0, read on 2026-11-12 for [Phase 20](spec/phase-20-a2a-1-0.md) from `a2ui-project/a2ui` at `upstream/main` `8bf644a3` (committed 2026-11-12) and from that repository's issues and pull requests. Paths are in that repository at that commit, with line numbers; issue and pull request numbers are that repository's. Section 8 lists what was not checked.

## 1. Summary

1. Upstream is on A2A 0.3 everywhere it ships code: every npm manifest, every Python manifest, and the one first-party card that states a version.
2. Its A2UI extension specifications are written in A2A 0.3's terms and name no A2A version.
3. The only A2A 1.x work is three open Python pull requests that make the Python helper types work on `a2a-sdk` 1.x. Nothing upstream touches the A2A 1.0 wire, the header name, the card's shape or `@a2a-js/sdk` 1.x.

## 2. How A2UI rides A2A in the extension specifications

The files are `specification/v0_9/docs/a2ui_extension_specification.md`, `specification/v0_9_1/docs/a2ui_extension_specification.md` and `specification/v1_0/extensions/a2a/docs/a2ui_extension_specification.md`. Line numbers below are the v0.9.1 file's unless the v1.0 file is named.

1. An A2UI part is a `DataPart` marked in its own metadata: "To identify a `DataPart` as containing A2UI data, it must have the following metadata: `DataPart.metadata["mimeType"] = "application/a2ui+json"`" (lines 174 to 176; v1.0 file, lines 179 to 181). No file mentions `mediaType`.
2. The MIME string is `application/a2ui+json` in all three. The older `application/json+a2ui` survives in the v0.8 specification and in code (section 5).
3. `data` holds a list: "It MUST be an array of messages." (line 178; v1.0 file, line 183), with no condition on the A2A version.
4. The extension URI is `https://a2ui.org/a2a-extension/a2ui/v0.9.1`, and `…/v1.0` in the v1.0 file (line 11 of each).
5. Activation is optional: "Clients and agents can negotiate A2UI support using `message.metadata["a2uiClientCapabilities"]` and A2A `DataPart.metadata["mimeType"]`" (line 51). Where it is used, the header is `X-A2A-Extensions` (line 64), and the form without a header is `sendMessageParams.metadata["X-A2A-Extensions"]` (line 89).
6. Client capabilities ride message metadata: `message.metadata["a2uiClientCapabilities"]` in v0.9 and v0.9.1, `message.metadata["a2uiRendererCapabilities"]` in v1.0 (v1.0 file, line 114). The v1.0 file adds a rule: an agent "MUST treat a message that carries no `a2uiRendererCapabilities` entry for its version as a turn in which the renderer offers no A2UI" (line 144).
7. The data model rides message metadata the same way: `a2uiClientDataModel` in v0.9 and v0.9.1, `a2uiRendererDataModel` in v1.0 (v1.0 file, line 148).
8. The card declares the extension as an entry of `AgentCapabilities.extensions` with `uri`, `description`, `required` and `params`, the params holding `supportedCatalogIds` and `acceptsInlineCatalogs`. The declaration is optional (line 17).
9. The A2A terms in these files are 0.3's: `"kind": "data"` in the part examples, `X-A2A-Extensions`, and `DataPart` with `metadata.mimeType`. None of A2A 1.0's terms appears: `mediaType`, `supportedInterfaces`, `A2A-Extensions` without the prefix, `ROLE_USER`, `TASK_STATE_COMPLETED`.

## 3. What upstream says about A2A versions

1. One sentence in the documentation and the specifications names an A2A version, in `docs/public/concepts/actions.md`, line 413: "NOTE: **A2A Versioning**: The use of a **list** in the `data` field was introduced in **A2A v1.0**. Earlier versions of the A2A protocol expect the `data` field to contain a single JSON object."
2. Three upstream sources disagree on whether `data` holds a list or one message. The extension specifications say a list, as a MUST, for every A2UI version. `specification/v0_9_1/docs/a2ui_protocol.md`, line 104, says "Each A2UI envelope (e.g., `updateComponents`) corresponds to the payload of a single A2A message Part." The reference implementations write one message per part (sections 4 and 5).
3. Issue 645, closed on 2026-05-14, is where upstream met A2A 1.0's part shape. Its author, a maintainer, wrote that the A2A specification "defines a data part as `{ "data": {...}, "mediaType": "application/json" }`", and closed it saying "the underlying libraries now all support lists in a data part."

## 4. Which A2A SDK upstream's code is on

1. npm: seven manifests name `@a2a-js/sdk`, all at `^0.3.13`. They are `samples/agent/node/restaurant_finder`, `samples/client/angular`, `samples/client/lit`, `samples/client/lit/shell`, `samples/client/react/shell`, `samples/community/client/angular` and `samples/community/mcp/a2ui-kanban/client`.
2. Python: twelve manifests name `a2a-sdk`, all on the 0.3 line. `python/a2ui_a2a/pyproject.toml` requires `a2a-sdk>=0.3.0,<0.4.0` (line 24). The samples require `>=0.3.0`, some of them capped below 0.4.0, and two pin 0.3.25.
3. Kotlin and Java: two build files name `io.github.a2asdk:a2a-java-sdk-client:1.0.0.Alpha3`. The Kotlin handler does not use it for the wire and builds 0.3-shaped JSON-RPC by hand (`kotlin/agent_sdk_legacy/src/main/kotlin/com/google/a2ui/a2a/A2aHandler.kt`).
4. No upstream agent SDK, sample agent or sample client is on A2A 1.0. The Node restaurant finder's card states `protocolVersion: '0.3.0'`.
5. Upstream has no TypeScript A2A binding for agents. The Node restaurant finder carries its own, `toA2aParts` in `samples/agent/node/restaurant_finder/src/a2a.ts` (lines 23 to 38), which writes one data part per A2UI message with `metadata: {mimeType: 'application/a2ui+json'}`.
6. Upstream's Lit and React sample clients put the MIME type on the part itself, not in its metadata (`samples/client/react/shell/middleware/a2a.ts`, lines 101 to 105). Issue 3601 and pull request 3602 track it, both open.
7. Upstream's sample clients do not agree on reading `data`: the Angular client accepts a list or one message, and the Lit and React clients treat `data` as one message.

## 5. The Python `a2ui-a2a` package

1. Its pin is `a2a-sdk>=0.3.0,<0.4.0` (`python/a2ui_a2a/pyproject.toml`, line 24).
2. `create_a2ui_part` in `python/a2ui_a2a/src/a2ui/a2a/parts.py` builds `Part(root=DataPart(data=<one message>, metadata={"mimeType": …}))` (lines 83 to 90). It writes one message per part.
3. The MIME string depends on the A2UI version of the message (lines 79 to 81): `application/json+a2ui` for v0.8, v0.9 and a message with no version, and `application/a2ui+json` for v0.9.1 and v1.0. `is_a2ui_part` accepts either.
4. `get_a2ui_agent_extension` builds the card's extension entry, and `try_activate_a2ui_extension` picks the newest version the request names that the card declares (`python/a2ui_a2a/src/a2ui/a2a/extension.py`).
5. Three things tie it to `a2a-sdk` 0.3: the `Part(root=…)` wrapper, the `DataPart` and `TextPart` types, and `RequestContext.add_activated_extension`.
6. Its latest release is 0.3.0 of 2026-11-10 (`python/a2ui_a2a/CHANGELOG.md`, line 8). The agent kit pins 0.1.0.

## 6. Issues and pull requests

| Number | Kind and state on 2026-11-12 | What it is |
| --- | --- | --- |
| 3161 | issue, open | A request to allow `a2a-sdk` 1.x beside the A2UI Python packages. A maintainer on 2026-10-15: "Let's let the open PRs land, since they appear to take care of most of it, and then see what's left." |
| 3162 | pull request, open | Widens `a2ui-a2a`'s pin to `a2a-sdk>=0.3.0,<2` and adds helpers that work on both generations of the Python types. A maintainer on 2026-11-09 wrote that the change was verified and would be escalated for review. It is 2337 and 2363 rebased. |
| 2337 | pull request, open | The first version of those helpers. Its description says it is "not a2a-sdk's `enable_v0_3_compat` / `supported_interfaces` wire layer — servers still opt into that separately." |
| 2363 | pull request, open | Runs the Python tests on `a2a-sdk` 1.x in upstream's continuous integration. |
| 2364 | pull request, open | Stops the first-party ADK samples using `Part.root`. |
| 2033 | pull request, open, last updated 2026-07-28 | Removes extension activation from the A2UI v1.0 extension specification. Approved by two maintainers and not merged. |
| 3601, 3602 | issue and pull request, open | The Lit and React sample clients' MIME type on the part (section 4, item 6). |
| 3603 | pull request, merged 2026-11-03 | Put the MIME type in `DataPart.metadata` in the extension specifications. |
| 645 | issue, closed 2026-05-14 | The list in `data` (section 3, item 3). |
| 4159 | pull request, open | An end-to-end harness of scripted Python and TypeScript A2A agents. It adds `@a2a-js/sdk` `^0.3.13` and `a2a-sdk[http-server]>=0.3.0`, and sends `X-A2A-Extensions`. |
| 3176 | pull request, merged 2026-10-14 | Moved the A2A and ADK integrations out of the agent SDK, into `a2ui-a2a` and `a2ui-adk`. |
| 4013 | pull request, merged 2026-11-11 | Helpers that read renderer capabilities from a message, with a conformance suite. |

No issue or pull request was found about `@a2a-js/sdk` 1.x, about renaming `X-A2A-Extensions`, about `mediaType`, about `supportedInterfaces` on the card, or about rewriting the extension specification for A2A 1.0.

## 7. Conformance material

1. `conformance/extensions/a2a/a2a_integration.yaml` holds 11 cases. They check the MIME string in a part's metadata, the extension URI, the card entry's `params`, and the choice of the newest version.
2. No case exercises the A2A envelope: a message's or a part's JSON, the header name, the card's shape, streaming events, or a list against one message in `data`. Nothing is parameterised by A2A version.
3. `conformance/agent/renderer_capabilities.yaml` holds the cases for reading capabilities from a metadata object, independent of the transport.

## 8. Not verified

1. The A2A specification was not read for this note. Calling a term 0.3's or 1.0's rests on the `@a2a-js/sdk` migration guide and on upstream's own issue 645 and pull request 2337.
2. Read twice: the lines quoted in sections 2 and 3 from the v0.9.1 and v1.0 files, the manifests in section 4, `create_a2ui_part` and `is_a2ui_part` in `parts.py`, the changelog, the Node sample's `toA2aParts`, the React client's part, and the state of every issue and pull request in section 6. The v0.9 extension specification, the Node sample's card, the Kotlin handler, the Angular and Lit clients, `extension.py`, the conformance cases' content, and the quoted maintainer comments were read once.
3. Whether `a2a-java-sdk-client:1.0.0.Alpha3` speaks the A2A 1.0 wire was not checked.
4. Whether `a2a-sdk` 0.3.25 and `@a2a-js/sdk` 0.3.13 accept a list in a data part's `data`, as the closing comment on issue 645 says, was not checked.
5. The issue search was by keyword and may miss reports.
