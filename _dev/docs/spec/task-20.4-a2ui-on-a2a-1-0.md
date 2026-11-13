# 20.4 — A2UI on A2A 1.0

Sub-task 20.4 of [Phase 20](phase-20-a2a-1-0.md) in [`_dev/TODO.md`](../../TODO.md). The platform reads an A2UI part in every spelling an agent on A2A 0.3 or 1.0 may give it, and writes its own A2UI parts in one spelling. `paintMeta` (the kit's per-paint shell object) and the auth-required request (the data part an agent puts on its status message when it needs more access mid-task) follow the same rule. It works under decision 8 of the phase spec (where upstream A2UI is silent on A2A 1.0: read every spelling, write each agent's own) and settles open item 3 of that spec, the exact fields of the reading and the writing. After 20.1 (the private wire and the dispatch), 20.2 (marketplace and Stellify) and 20.3 (the card).

Three packages carry similar names here. The A2A SDK is `@a2a-js/sdk`. The platform sdk is `@a2uiverse/sdk`. The smoke-transport package is `@a2uiverse/smoke-transport`.

Two words are used throughout. A mark is the MIME type a data part carries, in its part metadata as `mimeType` or in its own `mediaType` field. A press is the A2UI `action` message the client sends when the person presses something inside a fragment.

The sources these decisions rest on are in the [notes on an A2UI part on A2A 0.3 and 1.0](../phase-20-a2ui-part-on-a2a-notes.md).

## Scope

1. The reading of A2UI from an agent's answer: what makes a part A2UI, the forms of its `data`, what carries it, and who goes through the reading.
2. The writing: the spelling of an A2UI part the platform authors, toward an agent and on the wire between the client and the orchestrator, and what the relay does to an agent's part.
3. The A2UIVerse extension's own parts: `paintMeta` and the client's `operation` part (the reader's presses on the composition: Retry, Include, a step in a fragment's history and the others).
4. The auth-required request: the shapes read, and when an answer that asks for sign-in has ended.
5. The contract's text for these parts, and what is left to 20.9 (the agent kit on A2A 1.0).
6. Versions, the Stellify pin in `a2uiverse-apps`, what proves the sub-task, and the documents it changes.
7. Out: what a kit agent writes (20.9); the bindings other than JSON-RPC (20.5); A2UI v1.0's renamed metadata keys (Phase 21, the v1.0 migration); anything live for an agent on A2A 1.0, which waits for 20.9, 20.10 (the hand-written A2A 1.0 agent) and 20.12 (integration and acceptance); SPEC's A2A vocabulary beyond the sentences decision 16 names (20.13).

## Locked decisions

### 1. One reading of the A2UI a part carries, in the platform sdk

The A2UI messages a part's `data` carries are read by one function in the platform sdk. Every reader in the client, the orchestrator and the smoke-transport package goes through it.

### 2. Content decides, and no reader reads a mark

A part is A2UI by what its `data` holds, under either MIME string, in `metadata.mimeType` or in `mediaType`, or with no mark. No reader reads a mark, on an A2UI part or on a `paintMeta` part: `paintMeta` is read by its `paintMeta` key, whatever its mark, or with none.

### 3. `data` holds one message or a bare list of messages

The reading takes one message object, or a bare list of messages. Each entry of a list is judged on its own. An object holding a `messages` list is not read, and that form is removed from every reader.

### 4. A2UI is read from a message, never from an artifact

The reading takes A2UI from a bare message and from the status message of a task or a status update. A2UI in an artifact is not read by either end: the orchestrator stops reading an artifact's parts, so the client and the orchestrator count the same paints. An agent that carries A2UI in an artifact alone draws nothing.

### 5. The platform writes one spelling of an A2UI part

Wherever the platform authors an A2UI part it writes one message per part, marked `application/a2ui+json` in `metadata.mimeType` and in `mediaType`. That holds for a press sent to an agent on either A2A version, and in both directions between the client and the orchestrator: the shell's own paints, the client's press and its error report. The platform builds one part with both marks, and the A2A SDK writes `mediaType` to an agent on A2A 1.0 and leaves it off the wire to an agent on 0.3. The string is `application/a2ui+json` whatever A2UI version the message is stamped.

One message per part is held on evidence, as decision 4 of the [20.1 task spec](task-20.1-private-wire-and-dispatch.md) holds leniency: it stands until a real agent is found that reads only a list.

### 6. The relay passes an agent's part as written

The relay passes an agent's A2UI part to the client in the form and with the marks the agent gave it, its surface ids namespaced as today. The client reads it through the reading of decision 1.

### 7. What does not change in the writing

1. The A2A SDK spells the extensions header for each A2A version: `A2A-Extensions` to an agent on A2A 1.0 and `X-A2A-Extensions` to one on 0.3.
2. `a2uiClientCapabilities` and `a2uiClientDataModel` stay on message metadata.
3. A message's `extensions` field stays empty.

### 8. The A2UIVerse extension's own parts carry `application/a2ui-shell+json`

`paintMeta` and the client's `operation` part are marked `application/a2ui-shell+json`, in `metadata.mimeType` and in `mediaType`. The string replaces `application/json+a2ui-shell`. The platform writes it in 20.4: the orchestrator on its own `paintMeta`, the client on its `operation` part. The kit takes it up in 20.9, and a kit agent that still writes the older string keeps composing, since decision 2 reads `paintMeta` by its key.

### 9. The auth-required request is read in either shape

A data part of the auth-required status message is a request when it holds `securityRequirements` in A2A 1.0's shape or `security` in A2A 0.3's, on either A2A version. A part holding both is read by `securityRequirements`. Once read, a request has one shape, A2A 1.0's, and its keys are checked against the installed card through the card's one reading (decision 1 of the [20.3 task spec](task-20.3-the-card.md)). A key the installed card does not declare makes the request invalid, as today. The part stays unmarked.

### 10. An answer that reaches auth-required has ended when the state arrives

On either A2A version, the smoke runner stops reading once the task's state is auth-required, as the orchestrator's dispatch already does, whether or not the agent closes its stream. Input-required is not touched.

### 11. The contract describes the parts, and what a kit agent writes is 20.9's

20.4 rewrites the text of the [contract](../../../packages/sdk/contracts/a2uiverse.v0.9.json) for `paintMeta`, the auth-required request and the `operation` part: every spelling the platform reads, and the spelling the platform itself writes. What a kit agent writes is left whole to 20.9's grill, which starts from the contract and from the notes.

### 12. No word changes

Nothing drawn on the screen changes, and no publisher's finding changes its words.

### 13. 20.4 starts from 20.3's landing and lands in one merge

20.4 starts from `main` at `cbc042e`, where the card's one reading and the fake A2A 1.0 agent are. The client and the orchestrator land together, with the marketplace, Stellify, the platform sdk and the smoke-transport package in the same merge.

### 14. Versions, and the `[apps]` tail

The platform sdk is 0.10.0 and Stellify is 0.7.0. The Stellify pin in `a2uiverse-apps` moves as 20.4's `[apps]` tail, as decision 22 of the 20.3 task spec moved it, and is proven the same way: the install there, `pnpm verify` there, and one `stellify preview` with the pinned build from Shop B's catalog folder against its running agent.

### 15. What proves 20.4

1. `pnpm verify` is green.
2. The reading is tested against both fake agents, the 0.3.14 `@a2a-js/sdk` server and the 1.x one: a part marked with each MIME string in `metadata.mimeType`, marked in `mediaType`, and unmarked; one message and a bare list; a list with one entry in an A2UI version the platform does not speak; an object holding a `messages` list, not read; A2UI in an artifact, not read, with the client and the orchestrator counting the same paints.
3. The writing is tested by what each fake agent receives for a press: one message per part, `metadata.mimeType` on both A2A versions, `mediaType` on the A2A 1.0 wire and absent on the 0.3 wire.
4. `paintMeta` is read under the older string, the new one and none. The orchestrator's own `paintMeta` and the client's `operation` part are written with `application/a2ui-shell+json` in both fields.
5. The auth-required request is tested in each shape on each A2A version, with a part holding both and with a key the card does not declare. The fake A2A 1.0 agent holds its stream open after asking for sign-in, and the dispatch and the smoke runner both end at the state. A sign-in agent on A2A 1.0 passes publish.
6. The client's two Playwright suites pass: the one over the recordings, with the recorded beats untouched, and the live one.
7. One live sitting through the tunnel in the browser covers the nine agents that compose today, all on A2A 0.3, as the 20.3 sitting ran: published and installed from scratch state, the temporal merge, the entity join and the shops' merge composed, one press inside a kit app's fragment, one request for more access answered with Allow, and one press on each of upstream's Node and Python ADK restaurant finders.
8. The spellings are run once against a scratch agent on Python's `a2a-sdk` 1.3.0, not the kit, answering on A2A 1.0 and through its 0.3 layer with one message, a list, `media_type` set, and an auth-required request. The test fixtures for those wires are captured from it, never written by hand.

### 16. The documents 20.4 changes

1. A design record of its own in `docs/design/`, for how A2UI rides A2A: what a part is on each A2A version, the reading, the platform's one spelling, where a part rides, and the two conventions with the auth-required ending.
2. The six design records 20.4 makes false, corrected and pointing to it: the [orchestrator's](../../../docs/design/orchestrator.md), the [client's](../../../docs/design/client.md), the [marketplace's](../../../docs/design/marketplace.md), [authority](../../../docs/design/authority.md), the [agent kit's](../../../docs/design/agent-kit.md) and the [shell catalog's](../../../docs/design/shell-catalog.md).
3. The protocol delta register in section 14 of [`SPEC.md`](../../../SPEC.md): a new row on how an A2UI part is read and written on A2A where upstream is silent or its sources disagree; the `paintMeta` row, for its mark; the auth-required row, for its two shapes; the row on an answer ending by state, for the auth-required sentence; the rows on the composition's presses, for the `operation` part's mark.
4. Section 8 (Authority) of SPEC: its sentence on the auth-required request, in A2A 1.0's vocabulary. The rest of SPEC's A2A vocabulary waits for 20.13.
5. [`_dev/a2ui-findings.md`](../../a2ui-findings.md), the report for upstream that decision 8 of the phase spec asks for: the extension specifications written in A2A 0.3's terms and naming no A2A version; the list in `data`, required by the specification, written by no reference implementation and read by no upstream agent; the carrier no source names, with ADK's stock executor sending the last message's parts twice; upstream's Python helper writing the deprecated MIME string for a v0.9 message where the v0.9 extension specification names the new one.
6. [`_dev/a2a-findings.md`](../../a2a-findings.md): what the plan's runs confirm about the two A2A SDKs and the A2A 1.0 specification, each reported upstream where nobody has.
7. The contract, as decision 11 has it.
8. READMEs that name these: the [platform sdk's](../../../packages/sdk/README.md), the [smoke-transport package's](../../../packages/smoke-transport/README.md), the [marketplace's](../../../apps/marketplace/README.md), the [orchestrator's](../../../apps/orchestrator/README.md) and the [client's](../../../apps/client/README.md).
9. Older task decisions, amended in place under an "Amended by task 20.4" line: decision 10 of the 20.1 task spec (no part changes its marking on the private wire); decision 2 of the 20.1 task spec and decision 7 of the [20.2 task spec](task-20.2-marketplace-and-stellify.md) (when an answer has ended, and a stream held open left to the timeout); decision 12 of the [12.2 task spec](task-12.2-authority-contract.md) (the auth-required request as `{security: …}` alone); the [9.2 task spec's](task-9.2-composition-contract.md) decision that marks `paintMeta` with `application/json+a2ui-shell`.
10. `_dev/TODO.md`: 20.4's line gains its `[apps]` tail; 20.9's line gains that it starts from 20.4's contract and takes up the new `paintMeta` string; the phase's line of notes read for the spec names the notes on an A2UI part on A2A 0.3 and 1.0.

## Invariants

1. An existing A2UI agent composes with zero changes (section 14 of SPEC), and no agent that composes today is lost (invariant 2 of the phase spec).
2. The relay's one rewrite of an agent's A2UI is the surface id (section 4.1 of SPEC).
3. The platform sdk depends on no A2A package (the [13.2 task spec](task-13.2-sdk-marketplace-contracts.md)).

## Open items

Left to the plan:

1. Where the one builder of an A2UI part lives, given invariant 3.
2. The design record's name, and the findings' numbers.

Facts left for the plan to check by running:

1. Whether a list wrapped by the Python A2A SDK's 0.3 layer reaches the reading as a bare list.
2. Whether the Python A2A SDK's server holds its stream open after a task asks for sign-in.
3. Whether each of the nine agents takes a marked press.
4. Whether `mediaType` reaches an agent on A2A 1.0 and is absent on the 0.3 wire.
5. What leaving a stream at auth-required leaves behind in the A2A SDK's client.
