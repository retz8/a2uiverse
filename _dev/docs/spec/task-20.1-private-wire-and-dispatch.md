# 20.1 — The private wire and the dispatch

Sub-task 20.1 of [Phase 20](phase-20-a2a-1-0.md) in [`_dev/TODO.md`](../../TODO.md). The client and the orchestrator move to `@a2a-js/sdk` 1.x, the wire between them speaks A2A 1.0 over JSON-RPC alone, and the nine agents that compose today, all on A2A 0.3 over JSON-RPC, still compose: the seven apps built on the agent kit and upstream's Node and Python ADK restaurant finders. It works under three decisions of the phase spec: decision 1 (the platform is on `@a2a-js/sdk` 1.x, and an agent composes on A2A 0.3 or 1.0), decision 3 (the orchestrator's A2A endpoint is a private wire) and decision 9 (the decisions and the agents win over the SDK). First in the phase, parallel with 20.2.

## Scope

1. The client and the orchestrator on `@a2a-js/sdk` 1.x.
2. The private wire: the orchestrator's A2A endpoint and its card, the client as its caller, and the callers beside the browser.
3. The dispatch to agents on A2A 0.3 through the SDK's 0.3 layer: when an agent's answer has ended, and what the journal records of a dispatch.
4. What a relayed agent's event is on the private wire.
5. What stands in for a 0.3 agent in the orchestrator's tests.
6. What proves the sub-task.
7. Out: the marketplace and Stellify (20.2); the card's one reading, and a card written in A2A 1.0's shape (20.3); how A2UI parts and `paintMeta` are marked on A2A 1.0 (20.4); the bindings other than JSON-RPC (20.5); an agent on A2A 1.0, its fake and its proof; SPEC's A2A vocabulary beyond the one register row of decision 6 (20.13).

## Locked decisions

### 1. Until 20.3, the orchestrator reads an installed card through one type of its own

The orchestrator's card readers keep reading A2A 0.3's fields from a card as its agent served it, through one type the orchestrator owns, in one file. Only the dispatch hands a card to the SDK. The orchestrator fetches a card itself and keeps it as served; the 1.x SDK's card resolver returns its translation ([SDK notes](../phase-20-a2a-js-sdk-1.3.0-notes.md), section 5) and is not what the registry keeps. 20.3 (the card) removes the type when the card's one reading lands. Until then a card written in A2A 1.0's shape is not installable, as today.

### 2. An agent's answer ends by state

One rule holds for an agent on either A2A version. An answer has ended when the stream's body ends after a message event, or with the task's last state terminal (completed, failed, canceled, rejected) or interrupted (input-required, auth-required). `final` is not read. A stream whose body ends any other way broke.

*Amended by task 20.4 decision 10.* An answer that reaches auth-required has ended when the state arrives, whether or not the agent closes its stream. Input-required is not touched.

### 3. A 0.3 agent in the orchestrator's tests is the 0.3.14 SDK's server

`@a2a-js/sdk` 0.3.14 stays as a dev dependency under an alias, for the [fake vendor](../../../apps/orchestrator/test/fakeVendor.ts) alone. The fake vendor and the scripts its tests give it stay as written. The assertions on what the dispatch relays move to the 1.x shapes.

### 4. Leniency toward 0.3 agents is on evidence

No patch is carried for what the 1.x SDK's 0.3 translators refuse and 0.3.14 passed through ([SDK notes](../phase-20-a2a-js-sdk-1.3.0-notes.md), section 1): a card with no `capabilities`, `defaultInputModes`, `defaultOutputModes` or `skills`, a skill with no `tags`, a sign-in scheme of an unknown `type`, a message with no `messageId`, a role other than `user` or `agent`, or `parts` that is not an array. When a real agent is refused, decision 9 of the phase spec applies: a patch or a reading around the SDK, a finding in [`_dev/a2a-findings.md`](../../a2a-findings.md), a Backlog line. What a publisher is told about a card the SDK cannot read is 20.3's.

### 5. The journal's dispatch record holds the end state, the A2A version and the binding

The [record](../../../apps/orchestrator/src/agentsPool/types.ts) the journal writes for each dispatch holds the state the answer ended on, in A2A 1.0's name, in place of `sawFinal`. The field is absent when the stream broke. Beside it the record holds the A2A version and the binding of the interface the dispatch used.

### 6. Everything relayed is a `working` status update of the orchestrator's one task

On the private wire an agent's task event becomes a status update carrying its status message, a bare message becomes a status update carrying that message, and every terminal and interrupted state is demoted to `working`. Artifact updates are relayed as they are. The wire then carries the orchestrator's task, `working` updates, artifact updates and the orchestrator's one terminal update. How an agent's answer ended stays on the orchestrator, in the slot's state and in the journal.

### 7. What proves 20.1

1. `pnpm verify` is green.
2. The client's two Playwright suites pass: the one over the recordings, with the recorded beats untouched, and the live one.
3. One live sitting through the tunnel in the browser covers all nine agents. The seven kit apps run in deterministic mode: the temporal merge, the entity join and the shops' merge, as 19.6 ran them, with a press inside a fragment and one sign-in asked and completed. Upstream's Node and Python ADK restaurant finders take one question and one press each, and the Node finder's booking goes through to its confirmation.

### 8. `@a2a-js/sdk` is pinned at exactly 1.3.0, and a fix is a pnpm patch

The client and the orchestrator pin `@a2a-js/sdk` at exactly `1.3.0`. A fix to the SDK is carried as a pnpm patch under `patches/`, as `@a2ui/react` and `@a2ui/web_core` are patched.

20.1 as specified carries no patch. Of the three cases decision 9 of the phase spec names:

1. The interface choice inside one binding cannot arise while every card lists one interface.
2. The translators' refusals are handled on evidence (decision 4).
3. The stream left open on a sign-in request concerns a server built on the 1.x SDK whose own task asks for sign-in, and the orchestrator's never does.

### 9. 20.1 claims agents on A2A 0.3 only

Nothing in the dispatch refuses an agent on A2A 1.0. Its fake and its proof arrive in a later sub-task.

### 10. No part changes its marking on the private wire

A2UI parts and `paintMeta` (the kit's per-paint shell object) carry the marks they carry today, and the client keeps recognising them by content. The spellings on A2A 1.0 are 20.4's.

*Amended by task 20.4 decisions 5, 6 and 8.* Between the client and the orchestrator the platform's own A2UI parts are one message per part, marked `application/a2ui+json` in `metadata.mimeType` and in `mediaType`, and `paintMeta` and the `operation` part are marked `application/a2ui-shell+json` the same way. An agent's part is relayed with the marks its agent gave it. Every reader still reads by content.

### 11. Decisions 2, 3, 4 and 8 are the platform's

An agent's answer ending by state, the 0.3.14 SDK's server as the 0.3 agent in tests, leniency on evidence, and the exact pin with pnpm patches hold for the marketplace and Stellify as for the orchestrator. 20.2 starts its grill from them.

### 12. The client and the orchestrator land in one merge

The private wire takes no caller on A2A 0.3, so both ends move together. The callers beside the browser move with the client: the beat recorder, the transparency check and the live suite's driver, all through [`drive.ts`](../../../apps/client/scripts/lib/drive.ts). The [replay transport](../../../apps/client/src/canvas/replayTransport.ts) rebuilds its events in the 1.x shape.

### 13. The documents 20.1 changes

20.1 corrects the [client's](../../../docs/design/client.md) and the [orchestrator's](../../../docs/design/orchestrator.md) design records where it makes them false, and rewrites the one row of the protocol delta register in section 14 of [`SPEC.md`](../../../SPEC.md) that decision 6 widens: the row on vendor terminal states demoted on relay. The rest of SPEC's A2A vocabulary waits for 20.13. 20.3's line in `_dev/TODO.md` gains the removal of decision 1's type.

## Open items

Facts left for the plan to check by running:

1. Whether the 1.x SDK's server mints a context id for a message sent without one.
2. Whether the 1.x SDK's client exposes the interface it chose.
3. Whether the nine agents tolerate the `A2A-Version: 0.3` header and the `configuration` block the 1.x client always sends.
