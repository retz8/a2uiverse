# A2A upstream findings

Issues found in the A2A specification and its reference implementations, recorded for
upstream contribution (`a2aproject/A2A`, `a2aproject/a2a-python`, `a2aproject/a2a-js`). Each
finding is self-contained and reproducible against upstream artifacts only.

---

## 1. A streamed answer never names the extensions the agent activated (a2a-python 0.3, JSON-RPC)

**Component:** `a2a-sdk` 0.3.26, `src/a2a/server/apps/jsonrpc/jsonrpc_app.py`:
`_process_streaming_request` calls the handler's `on_message_send_stream` (line 434) and builds
the response from what it returns (line 442); `_create_response` writes
`context.activated_extensions` into the response's `X-A2A-Extensions` header (line 549). The same
lines stand at the `v0.3.26` tag, the 0.3 line's newest. Reached from
`RequestContext.add_activated_extension` (`src/a2a/server/agent_execution/context.py`, line 155),
which a2ui-a2a 0.1.0's `try_activate_a2ui_extension` calls.

**Severity:** spec conformance — an agent that activates an extension on a `message/stream`
request never names it back, so a streaming client cannot learn from the response which
extension the agent answered under.

### Issue

A2A 0.3's extensions topic says the agent names what it activated on the response
(`docs/topics/extensions.md` at A2A `v0.3.0`, line 120): "Once the agent has identified all
activated extensions, the response should include the `X-A2A-Extensions` header identifying all
extensions that were activated." The SDK's `add_activated_extension` promises the same: "This
causes the extension to be indicated back to the client in the response." (`context.py`,
line 158).

On `message/send` the handler is awaited before `_create_response` runs, so the agent has
activated what it will by then, and the header carries it. On `message/stream`,
`on_message_send_stream` is an async generator: the call at line 434 returns it without starting
it, and line 442 hands it straight to `_create_response`, which reads
`context.activated_extensions` into the headers of the `EventSourceResponse`. The executor runs
only once the response starts streaming, after its headers are fixed, so nothing it activates
reaches them.

The other transports differ. gRPC sets the activated extensions as trailing metadata after the
stream ends (`src/a2a/server/request_handlers/grpc_handler.py`, line 176), so a streamed gRPC
answer carries them. The REST adapter (`src/a2a/server/apps/rest/rest_adapter.py`) reads no
activated extensions on either path.

### Reproduction

An agent that activates the one extension it is asked for, served over JSON-RPC:

```python
from a2a.server.agent_execution import AgentExecutor
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentExtension
from a2a.utils import new_agent_text_message
from starlette.testclient import TestClient

EXT = "https://example.com/ext/v1"


class Activating(AgentExecutor):
    async def execute(self, context, event_queue):
        context.add_activated_extension(EXT)
        await event_queue.enqueue_event(new_agent_text_message("hi"))

    async def cancel(self, context, event_queue):
        pass


card = AgentCard(
    name="activating", description="Activates the extension it is asked for.",
    url="http://localhost", version="1.0.0", skills=[],
    capabilities=AgentCapabilities(streaming=True, extensions=[AgentExtension(uri=EXT)]),
    default_input_modes=["text/plain"], default_output_modes=["text/plain"],
)
app = A2AStarletteApplication(
    agent_card=card, http_handler=DefaultRequestHandler(Activating(), InMemoryTaskStore())
).build()
message = {"kind": "message", "messageId": "1", "role": "user", "parts": [{"kind": "text", "text": "hi"}]}
with TestClient(app) as client:
    for method in ("message/send", "message/stream"):
        rpc = {"jsonrpc": "2.0", "id": 1, "method": method, "params": {"message": message}}
        response = client.post("/", json=rpc, headers={"X-A2A-Extensions": EXT})
        print(f"{method}: X-A2A-Extensions = {response.headers.get('X-A2A-Extensions')}")
```

```bash
uv run --no-project --isolated --python 3.13 \
  --with 'a2a-sdk[http-server]==0.3.26' --with httpx python -I repro.py
```

```text
message/send: X-A2A-Extensions = https://example.com/ext/v1
message/stream: X-A2A-Extensions = None
```

Run on 2026-11-04.

### Fix

Build a stream's response after its first event, and read the activated extensions then.
`main`'s JSON-RPC dispatcher already takes a stream's first event before it builds the response,
to raise a request's errors up front (`src/a2a/server/routes/jsonrpc_dispatcher.py` at
`f666ba3eb3`, lines 393–395). An extension activated after the first event still cannot reach
the headers, which precede the body.

On A2UIVerse the agent kit's agents answer the hub over `message/stream`, and a2ui-a2a's helper
registers the A2UI version each request is answered in. The hub never receives that header. It
reads the version from the `version` stamp on each A2UI part.

### Prior art

PR [#333](https://github.com/a2aproject/a2a-python/pull/333) ("feat: Add server-side support for
plumbing requested and activated extensions", merged 2025-07-22) added the activated extensions
and their header.

PR [#984](https://github.com/a2aproject/a2a-python/pull/984) ("fix(extensions): support both
header names and remove "activation" concept", merged into `1.0-dev` on 2026-04-17) removed them
from the 1.x line: "1.0 spec uses `A2A-Extensions` instead of `X-A2A-Extensions` header/metadata
name. It also doesn't have "activation" concept - used extensions are not propagated back via
headers and should be put into message.extensions or artifact.extensions instead." On `main`
(`f666ba3eb3`, 2026-11-04; latest release v1.3.0), `ServerCallContext` carries
`requested_extensions` alone, and `RequestContext` has no `add_activated_extension`.

A2A's 1.0 specification defines the header as the extension URIs "that the client wants to use
for the request" (`docs/specification.md` at A2A `main` `7c861a597b`, §14.2.2), and names no
echo on the response. A2A's extensions topic on the same `main` (`docs/topics/extensions.md` at
`65dadbd9b9`, lines 183–185) still says the response SHOULD include the `A2A-Extensions` header
listing the activated extensions.

a2ui-a2a on A2UI's `upstream/main` (`43696ef43`) pins `a2a-sdk>=0.3.0,<0.4.0`, and its
`try_activate_a2ui_extension` calls `context.add_activated_extension`
(`python/a2ui_a2a/src/a2ui/a2a/extension.py`, line 178), which a2a-sdk 1.x does not have.

No issue or PR on `a2aproject/a2a-python` names the streaming case, searched 2026-11-04.

---

## 2. Whether a response names the extensions its agent activated: the extensions topic asks for it, the specification does not define it, and the SDKs differ (A2A 1.0)

**Component:** `a2aproject/A2A` at `main` `9fff3e08ab`: `docs/topics/extensions.md` (lines 183–185, 217–222) and `docs/specification.md` (§3.2.6, §9.2, §11.2, §14.2.2). The SDKs, each at `main` on 2026-11-05: `a2a-python` `05aaff6241`, `a2a-js` `3d3ca8291e`, `a2a-dotnet` `e93f834a4e`, `a2a-go` `f86cf6c0f4`, `a2a-java` `a2c8a9383e`, `a2a-rs` `bd7f1dd35e`.

**Severity:** spec ambiguity — a client that sends `A2A-Extensions` and receives no response header cannot tell an agent that activated nothing from an SDK that does not report what it activated.

**Reported:** `a2aproject/A2A` issue
[#2428](https://github.com/a2aproject/A2A/issues/2428) (open, no PR).

### Issue

The extensions topic says the agent names what it activated on the response (lines 183–185): "Once the agent has identified all activated extensions, the response SHOULD include the `A2A-Extensions` header, listing all extensions that were successfully activated for that request." Lines 217–222 show such a response, under "Corresponding response echoing activated extensions".

The specification defines the parameter for the request only. §3.2.6, the table of standard service parameters, and §14.2.2, the header's registration, describe it as the extension URIs "that the client wants to use for the request". §9.2 and §11.2 say service parameters "**MUST** be transmitted using standard HTTP request headers". No form of the word "activate" appears in the specification or in `specification/a2a.proto`.

The SDKs differ. `a2a-python` and `a2a-js` 1.3.0 were run; the rest is read from source.

| SDK | JSON-RPC and HTTP+JSON | gRPC | Source |
|---|---|---|---|
| `a2a-js` | `A2A-Extensions` response header | response metadata | `src/server/express/json_rpc_handler.ts:100-109`, `src/server/express/rest_handler.ts:164-168`, `src/server/grpc/grpc_service.ts:269-275` |
| `a2a-dotnet` | `A2A-Extensions` response header | initial metadata and trailers | `src/A2A.AspNetCore/A2AExtensionNegotiation.cs:26-29`, `docs/extensions.md:169-171` |
| `a2a-go` | none | trailers | `a2agrpc/v1/handler.go:317-323`; `a2asrv/jsonrpc.go` and `a2asrv/rest.go` do not read the activated set |
| `a2a-java` | none found | none found | `ServerCallContext` has `activateExtension` and `getActivatedExtensions`; no other non-test source refers to them |
| `a2a-rs` | none found | none found | `a2a-server/src/handler.rs:754-772` reads the request parameter; no write to a response found |
| `a2a-python` | none | none | `src` has no activated-extension code |

`a2a-dotnet`'s client reads the activated set from this header (`src/A2A/Client/A2AResponseActivation.cs:22`). From the code, it would see an empty set from an `a2a-python` agent, whatever that agent used.

`message.extensions` and `artifact.extensions`, which `a2a-python` directs agents to use, carry different information. `a2a.proto` describes them as the extensions "present or contributed to" that message or artifact, so an extension that changes how an agent behaves without contributing to one goes unnamed.

The topic does not say what a stream does. Response headers precede the body, so a header carries only what was activated by then. `@a2a-js/sdk` 1.3.0 reads the activated set before the executor runs, so `SendStreamingMessage` returns no header. `a2a-js` `main` writes it after the first event, which covers extensions activated while producing that event. `a2a-dotnet` negotiates the set up front; its documentation says the set "remains fixed for that request, including its stream" (`docs/extensions.md:25-26`). `a2a-go` reports over gRPC in trailers, sent after the stream ends.

### Reproduction

`a2a-python`: an agent that declares one extension and names it in `message.extensions`.

```python
from a2a.helpers import new_text_message
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.routes import create_jsonrpc_routes
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import (
    AgentCapabilities,
    AgentCard,
    AgentExtension,
    AgentInterface,
    AgentSkill,
    Role,
)
from starlette.applications import Starlette
from starlette.testclient import TestClient

EXT = "https://example.com/ext/v1"


class Agent(AgentExecutor):
    async def execute(self, context, event_queue):
        message = new_text_message("hi", role=Role.ROLE_AGENT)
        if EXT in context.requested_extensions:
            message.extensions.append(EXT)
        await event_queue.enqueue_event(message)

    async def cancel(self, context, event_queue):
        pass


card = AgentCard(
    name="agent",
    description="Declares one extension.",
    version="1.0.0",
    capabilities=AgentCapabilities(streaming=True, extensions=[AgentExtension(uri=EXT)]),
    default_input_modes=["text/plain"],
    default_output_modes=["text/plain"],
    skills=[AgentSkill(id="hi", name="hi", description="Says hi.", tags=["hi"])],
    supported_interfaces=[
        AgentInterface(protocol_binding="JSONRPC", protocol_version="1.0", url="http://localhost/")
    ],
)
handler = DefaultRequestHandler(agent_executor=Agent(), task_store=InMemoryTaskStore(), agent_card=card)
app = Starlette(routes=create_jsonrpc_routes(request_handler=handler, rpc_url="/"))
message = {"messageId": "1", "role": "ROLE_USER", "parts": [{"text": "hi"}]}

print("RequestContext.add_activated_extension exists:", hasattr(RequestContext, "add_activated_extension"))
with TestClient(app) as client:
    for method in ("SendMessage", "SendStreamingMessage"):
        rpc = {"jsonrpc": "2.0", "id": 1, "method": method, "params": {"message": message}}
        headers = {"A2A-Version": "1.0", "A2A-Extensions": EXT}
        response = client.post("/", json=rpc, headers=headers)
        print(f"{method}: A2A-Extensions = {response.headers.get('A2A-Extensions')}")
        print(f"  message.extensions names it in the body: {EXT in response.text}")
```

```bash
uv run --no-project --isolated --python 3.13 \
  --with 'a2a-sdk[http-server]==1.3.0' --with httpx2 python -I repro.py
```

```text
RequestContext.add_activated_extension exists: False
SendMessage: A2A-Extensions = None
  message.extensions names it in the body: True
SendStreamingMessage: A2A-Extensions = None
  message.extensions names it in the body: True
```

`a2a-js`: an agent that activates one extension before its first event and one after.

```js
import {setTimeout as sleep} from 'node:timers/promises';
import express from 'express';
import {TaskState} from '@a2a-js/sdk';
import {AgentEvent, DefaultRequestHandler, InMemoryTaskStore} from '@a2a-js/sdk/server';
import {jsonRpcHandler, UserBuilder} from '@a2a-js/sdk/server/express';

const BEFORE = 'https://example.com/ext/before-first-event';
const AFTER = 'https://example.com/ext/after-first-event';

const executor = {
  async execute(ctx, bus) {
    const {taskId: id, contextId} = ctx;
    ctx.context.addActivatedExtension(BEFORE);
    bus.publish(
      AgentEvent.task({
        id,
        contextId,
        status: {state: TaskState.TASK_STATE_WORKING, message: undefined, timestamp: undefined},
        artifacts: [],
        history: [],
        metadata: {},
      })
    );
    await sleep(50);
    ctx.context.addActivatedExtension(AFTER);
    bus.publish(
      AgentEvent.statusUpdate({
        taskId: id,
        contextId,
        status: {state: TaskState.TASK_STATE_COMPLETED, message: undefined, timestamp: undefined},
        metadata: {},
      })
    );
    bus.finished();
  },
  cancelTask: async () => {},
};

const card = {
  name: 'agent',
  description: 'Activates one extension before its first event and one after.',
  version: '1.0.0',
  supportedInterfaces: [
    {url: 'http://localhost/', protocolBinding: 'JSONRPC', tenant: '', protocolVersion: '1.0'},
  ],
  capabilities: {
    streaming: true,
    pushNotifications: false,
    extensions: [
      {uri: BEFORE, required: false, description: '', params: {}},
      {uri: AFTER, required: false, description: '', params: {}},
    ],
  },
  securitySchemes: {},
  securityRequirements: [],
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['text/plain'],
  skills: [],
  signatures: [],
};

const app = express();
app.use(
  jsonRpcHandler({
    requestHandler: new DefaultRequestHandler(card, new InMemoryTaskStore(), executor),
    userBuilder: UserBuilder.noAuthentication,
  })
);
const server = app.listen(0, async () => {
  const url = `http://127.0.0.1:${server.address().port}/`;
  const message = {messageId: '1', role: 'ROLE_USER', parts: [{text: 'hi'}]};
  for (const method of ['SendMessage', 'SendStreamingMessage']) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'A2A-Version': '1.0',
        'A2A-Extensions': `${BEFORE},${AFTER}`,
      },
      body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params: {message}}),
    });
    await response.text();
    console.log(`${method}: A2A-Extensions = ${response.headers.get('A2A-Extensions')}`);
  }
  server.close();
});
```

```bash
npm init -y && npm install @a2a-js/sdk@1.3.0 express@5
node repro.mjs
```

```text
SendMessage: A2A-Extensions = https://example.com/ext/before-first-event, https://example.com/ext/after-first-event
SendStreamingMessage: A2A-Extensions = null
```

Run on 2026-11-05: `a2a-sdk` 1.3.0 on Python 3.13.0; `@a2a-js/sdk` 1.3.0 and Express 5.3.0 on Node 22.15.0.

### Fix

Settle whether a response names what was activated, in one of two directions:

- **A response names them.** The specification defines the response side for each binding, including when a stream reports them, and the SDKs that do not report them add it.
- **A response does not name them.** The topic drops step 3 and its example, and the SDKs' reporting becomes behaviour outside the protocol.

A2UIVerse stands on A2A 0.3 (`SPEC.md` §14), so neither direction reaches it before its move to 1.0.

### Prior art

PR [#984](https://github.com/a2aproject/a2a-python/pull/984) on `a2a-python` ("fix(extensions): support both header names and remove "activation" concept", merged into `1.0-dev` on 2026-04-17) removed activation: "It also doesn't have "activation" concept - used extensions are not propagated back via headers and should be put into message.extensions or artifact.extensions instead."

Issue [#710](https://github.com/a2aproject/a2a-js/issues/710) on `a2a-js` ("JSON-RPC streaming responses omit activated extension headers") reported the missing header on `SendStreamingMessage` as a bug, and PR [#762](https://github.com/a2aproject/a2a-js/pull/762) (merged 2026-10-14) fixed it. `@a2a-js/sdk` 1.3.0, published 2026-09-29, predates the fix.

`a2a-tck`'s checks on this header (`tests/compatibility/core_operations/test_transport_behavior.py` at `d4d6fae788`) send it and look only for the request being rejected.

No issue or PR across `a2aproject` names the disagreement, searched 2026-11-05.

---

## 3. Inside one binding the client takes an A2A 1.0 interface over a 0.3 one, whatever the card's order (a2a-js 1.3.0)

**Component:** `@a2a-js/sdk` 1.3.0, `src/client/factory.ts`, `ClientFactory.createFromNormalizedAgentCard`: for each binding it keeps the first interface the card lists, and replaces it with any later interface on that binding whose `protocolVersion` is `"1.0"`.

**Severity:** spec conformance. The A2A 1.0 specification's `AgentCard.supported_interfaces` is an "Ordered list of supported interfaces. The first entry is preferred." (`specification/a2a.proto` at A2A `v1.0.0`). An agent that lists its A2A 0.3 interface first is dialed on 1.0.

### Issue

An agent that answers both A2A versions over JSON-RPC states its preference by the order of its interfaces. The client ignores that order inside one binding: with `JSONRPC` at 0.3 listed before `JSONRPC` at 1.0, it dials the 1.0 interface. Of several 1.0 interfaces on one binding it takes the last.

### Reproduction

```js
import {AgentCard, Role} from '@a2a-js/sdk';
import {ClientFactory, JsonRpcTransportFactory} from '@a2a-js/sdk/client';

const calls = [];
const fetchImpl = async (input, init) => {
  calls.push([String(input), new Headers(init?.headers).get('a2a-version')]);
  return new Response('{}', {status: 500});
};
const card = AgentCard.fromJSON({
  name: 'Agent',
  version: '1.0.0',
  supportedInterfaces: [
    {url: 'http://agent.example/v0_3', protocolBinding: 'JSONRPC', protocolVersion: '0.3'},
    {url: 'http://agent.example/v1', protocolBinding: 'JSONRPC', protocolVersion: '1.0'},
  ],
});
const legacyCompat = {enabled: true};
const client = await new ClientFactory({
  transports: [new JsonRpcTransportFactory({fetchImpl, legacyCompat})],
}).createFromAgentCard(card);
const message = {
  messageId: 'm', contextId: '', taskId: '', role: Role.ROLE_USER, parts: [],
  metadata: {}, extensions: [], referenceTaskIds: [],
};
await client
  .sendMessage({tenant: '', message, configuration: undefined, metadata: undefined})
  .catch(() => {});
console.log(calls);
```

```text
[ [ 'http://agent.example/v1', '1.0' ] ]
```

Run on 2026-11-13: `@a2a-js/sdk` 1.3.0 on Node 22.15.0.

### Fix

Keep the first interface the card lists for each binding that the client can speak, whatever its A2A version.

A2UIVerse reads around it (task-20.3 decision 11): it chooses the interface itself, the first in the card's order that it speaks, and hands the client the card listing that one interface, which the client then dials. `_dev/TODO.md` carries the Backlog line to drop this at the release that follows the card's order.

### Prior art

Issue [#734](https://github.com/a2aproject/a2a-js/issues/734) reports that of several 1.0 interfaces on one binding the last is chosen. Pull request [#764](https://github.com/a2aproject/a2a-js/pull/764), merged on 2026-10-08 and not in 1.3.0, makes the first 1.0 interface win, and keeps a 1.0 interface replacing a 0.3 one. No issue reports the 0.3 case, searched in `a2aproject/a2a-js` on 2026-11-13.

---

## 4. The server's card handler serves the in-memory card, whose sign-in schemes the SDK's own reader drops (a2a-js 1.3.0)

**Component:** `@a2a-js/sdk` 1.3.0, `src/server/express/agent_card_handler.ts`, `agentCardHandler`: the body is `JSON.stringify(agentCard)` of the in-memory `AgentCard`. Read back by `AgentCard.fromJSON` (`src/types/protojson.ts`).

**Severity:** interoperability. A server built on the SDK whose card declares a sign-in scheme serves a card no A2A 1.0 client reads the scheme from, the SDK's own client among them.

### Issue

The in-memory `SecurityScheme` holds its kind under `scheme.$case` with the scheme under `scheme.value`. A2A 1.0's JSON names the kind by a member, `apiKeySecurityScheme`, `oauth2SecurityScheme` and the rest. `agentCardHandler` writes the in-memory form to the wire, and `AgentCard.fromJSON` reads neither `scheme` nor `$case`, so each scheme comes back empty. The security requirements survive, since their in-memory keys are the wire's, so the card reads as requiring a scheme that says nothing.

### Reproduction

```js
import {createServer} from 'node:http';
import express from 'express';
import {AgentCard} from '@a2a-js/sdk';
import {DefaultRequestHandler, InMemoryTaskStore} from '@a2a-js/sdk/server';
import {agentCardHandler} from '@a2a-js/sdk/server/express';

const card = AgentCard.fromJSON({
  name: 'Agent',
  version: '1.0.0',
  supportedInterfaces: [
    {url: 'http://127.0.0.1:18731/', protocolBinding: 'JSONRPC', protocolVersion: '1.0'},
  ],
  securitySchemes: {key: {apiKeySecurityScheme: {location: 'header', name: 'X-Key'}}},
  securityRequirements: [{schemes: {key: {list: []}}}],
});
const executor = {execute: async () => {}, cancelTask: async () => {}};
const handler = new DefaultRequestHandler(card, new InMemoryTaskStore(), executor);
const app = express();
app.use('/.well-known/agent-card.json', agentCardHandler({agentCardProvider: handler}));
const server = createServer(app).listen(18731, '127.0.0.1', async () => {
  const served = await (
    await fetch('http://127.0.0.1:18731/.well-known/agent-card.json', {
      headers: {'A2A-Version': '1.0'},
    })
  ).json();
  console.log('served', JSON.stringify(served.securitySchemes));
  console.log('read  ', JSON.stringify(AgentCard.fromJSON(served).securitySchemes));
  server.close();
});
```

```text
served {"key":{"scheme":{"$case":"apiKeySecurityScheme","value":{"description":"","location":"header","name":"X-Key"}}}}
read   {"key":{}}
```

Run on 2026-11-13: `@a2a-js/sdk` 1.3.0 and Express 5.2.1 on Node 22.15.0. Python's `a2a-sdk` 1.3.0 serves the same card as `{"key":{"apiKeySecurityScheme":{"location":"header","name":"X-Key"}}}`, which `AgentCard.fromJSON` reads whole. Both captures are tracked under `packages/card/test/fixtures/`: `javascript-1.0-sign-in.json` and `python-1.0.json`.

### Fix

Serve `AgentCard.toJSON(agentCard)`, the codec the package already exports.

A2UIVerse carries nothing for it (task-20.3 decisions 1, 8): what the SDK's reader drops, the card's one reading drops, so an app on such a server reads as asking a sign-in the platform does not support. No agent in the roster is built on the SDK's server.

### Prior art

Issue [#663](https://github.com/a2aproject/a2a-js/issues/663) reports that canonicalizing a card for signing drops `securitySchemes` when given an in-memory card, the same two forms meeting in another place. No issue reports the served form, searched in `a2aproject/a2a-js` on 2026-11-13.

---

## 5. A card served to a caller naming no A2A version reads, by the SDK's own reader, as asking no sign-in (a2a-js 1.3.0)

**Component:** `@a2a-js/sdk` 1.3.0. The server: `src/compat/v0_3/server/express/agent_card_handler.ts`, `legacyAgentCardRouter`, which answers a request whose `A2A-Version` is absent or in 0.3's range with `toCompatAgentCard(card, {embedV1Interfaces: true})`. The client: `src/compat/v0_3/client/card-resolver.ts`, `isLegacyAgentCard`, and `AgentCard.fromJSON`.

**Severity:** interoperability. A client that fetches a card without naming an A2A version and reads it with the SDK's functions sees an agent that requires sign-in as requiring none.

### Issue

With its A2A 0.3 layer on, the card handler serves a caller that names no A2A version a card in 0.3's shape with 1.0's `supportedInterfaces` embedded beside it: `url`, `preferredTransport`, 0.3's `security` and `securitySchemes`, and `supportedInterfaces`. `isLegacyAgentCard` returns false for any card with a non-empty `supportedInterfaces`, so such a card goes to `AgentCard.fromJSON`, which reads `securityRequirements` and not `security`, and reads 0.3's schemes as empty. The read card has no requirement.

### Reproduction

The server of finding 4, its handler given `legacyCompat: {enabled: true}` and its card a second interface at `protocolVersion: '0.3'`, fetched with no `A2A-Version` header:

```text
served security            [{"key":[]}]
served securitySchemes     {"key":{"type":"apiKey","name":"X-Key","in":"header"}}
served supportedInterfaces [{"url":"http://127.0.0.1:18731/","protocolBinding":"JSONRPC","protocolVersion":"1.0"},{"url":"http://127.0.0.1:18731/","protocolBinding":"JSONRPC","protocolVersion":"0.3"}]
isLegacyAgentCard          false
read securityRequirements  []
read securitySchemes       {"key":{}}
```

Run on 2026-11-13: `@a2a-js/sdk` 1.3.0 on Node 22.15.0. The capture is tracked as `packages/card/test/fixtures/javascript-no-version-named.json`.

### Fix

Either read 0.3's `security` and `securitySchemes` when a card carries both shapes, or leave 1.0's interfaces out of the card served to a 0.3 caller.

A2UIVerse's card fetch names A2A 1.0 (task-20.3 decision 4), as the SDK's own resolver does, and is served the 1.0 form.

### Prior art

Pull request [#504](https://github.com/a2aproject/a2a-js/pull/504) ("feat: add v0.3 compatibility layer for client and server agent-card handling", merged) added both halves. No issue reports the two together, searched in `a2aproject/a2a-js` on 2026-11-13.

---

## 6. The client takes any A2A version outside 0.3's range as 1.0 (a2a-js 1.3.0)

**Component:** `@a2a-js/sdk` 1.3.0, `src/client/transports/json_rpc_transport.ts`, `JsonRpcTransportFactory.create`, with `src/version_utils.ts`, `isLegacyVersion`: an interface whose `protocolVersion` is from 0.3 up to but not including 1.0, or empty, gets the 0.3 transport, and every other interface the 1.0 transport.

**Severity:** robustness. An interface at a version the client does not speak is dialed as A2A 1.0.

### Issue

The A2A 1.0 specification's `AgentInterface.protocol_version` names "The version of the A2A protocol this interface exposes." The client does not compare it with the versions it implements: an interface at `2.0`, or at `0.2`, is sent A2A 1.0's `SendMessage` with `A2A-Version: 1.0`.

### Reproduction

The script of finding 3 with one interface, `{url: 'http://agent.example/v2', protocolBinding: 'JSONRPC', protocolVersion: '2.0'}`:

```text
[ [ 'http://agent.example/v2', '1.0' ] ]
```

Run on 2026-11-13: `@a2a-js/sdk` 1.3.0 on Node 22.15.0.

### Fix

Refuse an interface whose major version the client does not implement, as it refuses a binding it has no transport for ("No compatible transport found").

A2UIVerse speaks an interface only at a version from 0.3 up to 1.x (task-20.3 decision 10), and turns an agent listing nothing else away before the client is built.

### Prior art

None found, searched in `a2aproject/a2a-js` on 2026-11-13.

---

## 7. The client reads an in-memory card over again as JSON and drops its sign-in schemes (a2a-js 1.3.0)

**Component:** `@a2a-js/sdk` 1.3.0, `src/client/card-resolver.ts`, `DefaultAgentCardResolver.normalizeAgentCard` and its `isProtoAgentCard`; reached from `ClientFactory.createFromAgentCard` in `src/client/factory.ts`.

**Severity:** correctness. A caller that hands `createFromAgentCard` a card it already holds in memory gets a client whose card has empty sign-in schemes.

### Issue

`normalizeAgentCard` passes a card to `AgentCard.fromJSON` when it looks like A2A 1.0's JSON, which `isProtoAgentCard` decides from the first sign-in scheme having no `type` key. An in-memory `SecurityScheme` has no `type` key either: its kind is under `scheme.$case`. So an in-memory card is parsed as JSON, and `fromJSON` reads no scheme from the in-memory form.

### Reproduction

```js
import {AgentCard} from '@a2a-js/sdk';
import {DefaultAgentCardResolver} from '@a2a-js/sdk/client';

const card = AgentCard.fromJSON({
  name: 'Agent',
  version: '1.0.0',
  supportedInterfaces: [
    {url: 'http://127.0.0.1:1/a2a', protocolBinding: 'JSONRPC', protocolVersion: '1.0'},
  ],
  securitySchemes: {key: {apiKeySecurityScheme: {location: 'header', name: 'X-Key'}}},
  securityRequirements: [{schemes: {key: {list: []}}}],
});
console.log('before', JSON.stringify(card.securitySchemes));
const normalized = new DefaultAgentCardResolver().normalizeAgentCard(card);
console.log('after ', JSON.stringify(normalized.securitySchemes));
```

```text
before {"key":{"scheme":{"$case":"apiKeySecurityScheme","value":{"description":"","location":"header","name":"X-Key"}}}}
after  {"key":{}}
```

Run on 2026-11-13: `@a2a-js/sdk` 1.3.0 on Node 22.15.0.

### Fix

Tell the in-memory form from A2A 1.0's JSON before parsing, by the `scheme` key an in-memory scheme carries.

A2UIVerse's dispatch and its smoke runner give the client factory a card resolver with no `normalizeAgentCard`, so the card they hand over is the card the client holds.

### Prior art

Pull request [#344](https://github.com/a2aproject/a2a-js/pull/344) ("fix: support proto-based AgentCard in AgentCardResolver", merged) added the detection. No issue reports the in-memory case, searched in `a2aproject/a2a-js` on 2026-11-13.

---

## 8. The specification says a stream closes at an interrupted state and asks an agent to keep it open at auth-required (A2A 1.0)

**Component:** `a2aproject/A2A` at tag `v1.0.0` (commit `17369575`), `docs/specification.md`: section 3.1.2 (line 212), section 7.6.1 (line 1907) and section 11.7 (line 2949).

**Severity:** specification conflict. A client that waits for a stream to close before it treats an answer as ended waits as long as the agent keeps the stream, which section 7.6.1 asks the agent to do.

### Issue

Three sentences describe when a stream closes:

1. Section 3.1.2: "The stream MUST close when the task reaches a terminal state (e.g. completed, failed, canceled, rejected)."
2. Section 11.7: "… then zero or more status or artifact update events until the task reaches a terminal or interrupted state, at which point the stream closes."
3. Section 7.6.1: "If the credential is received out-of-band, the agent SHOULD maintain any active response streams with the client after setting the TaskState to `TASK_STATE_AUTH_REQUIRED`."

Auth-required is an interrupted state. Section 11.7 closes the stream there, section 7.6.1 keeps it open, and section 3.1.2 says nothing of interrupted states. A2A 1.0 has no `final` on a status update, so nothing on the wire tells a client which of the two the agent chose.

### Reproduction

Both A2A SDKs' servers do either, by what the executor does. Run on 2026-11-13, each asked over JSON-RPC by the client of `@a2a-js/sdk` 1.3.0:

| Server | The executor returns after setting auth-required | The executor waits |
| --- | --- | --- |
| Python `a2a-sdk` 1.3.0, on A2A 1.0 and through its 0.3 layer | the stream closes | the stream stays open |
| `@a2a-js/sdk` 1.3.0, on A2A 1.0 and through its 0.3 layer | the stream closes, the executor having called `finished()` | the stream stays open |

Through the 0.3 layer both servers write the auth-required status update with `final: false`, whether or not they then close the stream.

The Python wires are in `retz8/a2uiverse` under `packages/smoke-transport/test/fixtures/`: `python-1.0-auth-1.0.json` and `python-0.3-auth-1.0.json` (closed), `python-1.0-auth-held.json` and `python-0.3-auth-held.json` (held, left by the capture after three seconds of silence). The agent is `packages/smoke-transport/scripts/serve_a2ui.py`. The JavaScript server is the fake agent in `packages/smoke-transport/src/testing/fakeAgentV1.ts`, whose `authRequiredScriptV1` waits.

A client that leaves a held stream: the generator of `@a2a-js/sdk` 1.3.0's client cancels the response body's reader when its consumer stops reading. On Node 22.15.0 the agent saw the connection close about four seconds later.

### Fix

Make the three sentences say one thing: a stream closes at a terminal state or at input-required, and at auth-required it closes or stays open by the agent's choice, with a client told to treat the answer as ended when the state arrives.

A2UIVerse's dispatch and its smoke request end an answer at auth-required when the state arrives and leave the stream.

### Prior art

No issue or pull request on `a2aproject/A2A` reports the three sentences disagreeing, searched on 2026-11-13.

## 9. Toward an agent on A2A 0.3 over HTTP+JSON and gRPC, the client drops every part's metadata, both ways (a2a-js 1.3.0)

**Component:** `@a2a-js/sdk` 1.3.0, its A2A 0.3 layer on HTTP+JSON and gRPC (`LegacyRestTransport` and `LegacyGrpcTransport`, `dist/client/transports/grpc/index.js` and `dist/client/index.js`). Its codec for A2A 0.3's `Part` holds one field, `part`, the oneof of `text`, `file` and `data`, as `specification/grpc/a2a.proto` at A2A `v0.3.0` defines it. The field `google.protobuf.Struct metadata = 4` was added to that `Part` on 2025-09-03 (A2A commit `a8b45dcc`, pull request 1004, fixing issue 1005), after `v0.3.0`. Python's `a2a-sdk` carries it on its 0.3 `Part`, at 0.3.26 and in the 0.3 layer of 1.3.0.

**Severity:** interoperability. On these two paths a part's `metadata` never reaches the agent and never reaches the caller, while JSON-RPC carries it both ways. A mark in `metadata.mimeType`, which A2UI's extension specification requires on an A2UI part, does not arrive, and neither does the flag the 0.3 layers set when they wrap a list in `data`.

### Issue

A2A 0.3 over JSON-RPC carries a part's `metadata` (the 0.3 JSON schema's `Part` has it), and so does A2A 1.0 on every binding. The client's 0.3 layer writes and reads HTTP+JSON and gRPC with a codec generated from a proto that predates the field, so it drops it in both directions.

The flag is lost with it. Both SDKs' 0.3 layers wrap a `data` value that is not an object as `{value: ...}` and set `data_part_compat` in the part's metadata, and a reader unwraps the value by that flag. Over HTTP+JSON and gRPC at A2A 0.3 the client gets the wrapped object with no flag, so a list in one part from Python's `a2a-sdk` arrives as `{value: [...]}`.

### Reproduction

Run on 2026-11-14 by the client of `@a2a-js/sdk` 1.3.0 against a scratch agent on Python's `a2a-sdk` 1.3.0, which answers both A2A versions on the three bindings, its 0.3 layer on. The agent is `packages/smoke-transport/scripts/serve_a2ui.py` in `retz8/a2uiverse`, and the wires are under `packages/smoke-transport/test/fixtures/`.

1. A press sent with `metadata: {mimeType: 'application/a2ui+json'}` and the same `mediaType`, echoed back by the agent as it held the parts:

   | Path | On the wire the client wrote | What the agent held |
   | --- | --- | --- |
   | HTTP+JSON at A2A 1.0 (`python-http+json-1.0-echo.json`) | `metadata` and `mediaType` | both |
   | HTTP+JSON at A2A 0.3 (`python-http+json-0.3-echo.json`) | `{"data": {"data": {...}}}`, no `metadata` | no `metadata` |
   | gRPC at A2A 1.0, run live | | both |
   | gRPC at A2A 0.3, run live | | no `metadata` |
   | JSON-RPC at A2A 0.3 (`python-0.3-echo.json`) | `metadata` | `metadata` |

2. A list in one part: over HTTP+JSON at A2A 0.3 (`python-http+json-0.3-list.json`) the agent writes `{"data": {"data": {"value": [...]}}, "metadata": {"data_part_compat": true, "mimeType": "application/a2ui+json"}}`, and the client hands its caller `{value: [...]}` with no metadata. Over gRPC at A2A 0.3, run live, the same. Over JSON-RPC at A2A 0.3 the client unwraps it to the bare list.

The same holds against the servers of `@a2a-js/sdk` 1.3.0 and 0.3.14: a part's metadata reaches an agent on A2A 1.0 on every binding and on A2A 0.3 over JSON-RPC alone (`packages/smoke-transport/src/dial.test.ts`).

### Fix

Carry `metadata = 4` on the 0.3 layer's `Part`, as Python's `a2a-sdk` does, so A2A 0.3 over HTTP+JSON and gRPC carries what JSON-RPC carries.

A2UIVerse carries no patch for it: its readers read an A2UI part by what it holds, its one reading takes an object holding `value` and nothing else, `value` a list, as that list, and the agents it composes read a press by its content.

### Prior art

No issue or pull request on `a2aproject/a2a-js` reports it, searched on 2026-11-14. Issue 536 (closed) made the 0.3 layer wrap a `data` value that is not an object instead of throwing; the wrap's flag is the metadata this finding loses.

## 10. Neither A2A version names the gRPC metadata key a credential rides under (A2A 0.3, 1.0)

**Component:** `a2aproject/A2A` at tag `v1.0.0`, `docs/specification.md`, section 7.3 (Client Authentication Process) and section 10.2 (Service Parameter Transmission); at tag `v0.3.0`, the same document.

**Severity:** specification gap. A client and an agent on gRPC agree on where a credential rides only by convention, and for an `apiKey` scheme no convention is written down.

### Issue

Section 7.3 has a client send its credentials "in protocol-appropriate headers or metadata for every A2A request", and names no header or key. Section 10.2 has service parameters ride as gRPC metadata keys, "automatically converted to lowercase by gRPC". A credential is not a service parameter, and no sentence says it rides the same way.

The one place a key appears is the Go example in section 10.2, whose `metadata.Pairs` writes `"authorization", "Bearer token"` beside `a2a-version` and `a2a-extensions`. It is an example, and it covers a bearer token alone. An `apiKey` scheme names an HTTP header (`location: header`, `name`), and nothing says whether that name becomes a gRPC metadata key, though some header names cannot be one: gRPC over HTTP/2 allows `0-9 a-z _ - .` in a key, reserves the prefix `grpc-`, and keeps the suffix `-bin` for binary values. A2A 0.3's specification says less: its gRPC binding names metadata only as a feature gRPC has.

### Reproduction

A reading, not a run. A2UIVerse sends the credential on gRPC as one plain metadata entry under the scheme's header name in lowercase (`authorization: Bearer <token>`, or the `apiKey` header's name), and passes over a gRPC interface whose `apiKey` header cannot be a key (`packages/smoke-transport/src/credentialOnBinding.ts` in `retz8/a2uiverse`). The servers of `@a2a-js/sdk` 1.3.0 and of Python's `a2a-sdk` 1.3.0 receive it there.

### Fix

Say in section 7.3, or in each binding's section, where a credential rides: on gRPC, as metadata under the scheme's header name in lowercase, and what an `apiKey` scheme whose header name is no legal key means for a gRPC interface.

### Prior art

No issue or pull request on `a2aproject/A2A` reports it, searched on 2026-11-14. Issue 2374 (open) reports that the 1.0 specification's examples send `A2A-Version: 0.3`, the section 10.2 example among them.

## 11. The specification's example card lists a gRPC interface at a URL the A2A SDK cannot dial (A2A 0.3, 1.0; a2a-js 1.3.0)

**Component:** `a2aproject/A2A`, `docs/specification.md`: the example card's gRPC interface `https://georoute-agent.example.com/a2a/grpc`, at tag `v1.0.0` in `supportedInterfaces` and at tag `v0.3.0` in `additionalInterfaces`. `@a2a-js/sdk` 1.3.0's `GrpcTransportFactory`, which hands an interface's URL to `@grpc/grpc-js` as the target, untouched.

**Severity:** interoperability. A card written as the specification writes one cannot be dialed over gRPC by the A2A SDK, and the specification says nothing of how a gRPC interface's URL is spelled.

### Issue

The specification's example writes a gRPC interface as an `https://` URL with a path. The A2A SDK's own sample, `src/samples/agents/multi-transport-agent/index.ts` in `a2aproject/a2a-js` at `v1.3.0`, writes `localhost:${GRPC_PORT}`, a bare `host:port`. `@grpc/grpc-js` reads a target with a scheme it has no resolver for as a DNS name, so the URL of the example fails to resolve. A gRPC target has no path: a gRPC call's path is `/<package>.<Service>/<Method>`.

The SDK also dials a gRPC interface without TLS unless its caller hands it channel credentials, whatever the URL's scheme says.

### Reproduction

Run on 2026-11-14 with `@a2a-js/sdk` 1.3.0 and `@grpc/grpc-js` 1.14.7, a gRPC server of `@a2a-js/sdk` listening on `127.0.0.1:<port>`: a card listing that interface as `127.0.0.1:<port>` is dialed, and the same interface listed as `http://127.0.0.1:<port>`, `http://127.0.0.1:<port>/a2a/grpc` or `https://127.0.0.1:<port>/a2a/grpc` fails with `gRPC error for sendStreamingMessage: 14 Name resolution failed for target dns:http://127.0.0.1:<port>/a2a/grpc`.

### Fix

In the specification, say how a gRPC interface's URL is spelled and what its scheme means for TLS. In the SDK, read both spellings: a URL with a scheme handed to `@grpc/grpc-js` as its host and port, TLS for `https://`.

A2UIVerse reads both spellings: it hands the A2A SDK `host:port`, the path left out, dials `https://` with TLS and `http://` without, and a bare `host:port` with TLS unless its host is the local machine (`packages/smoke-transport/src/address.ts` in `retz8/a2uiverse`).

### Prior art

No issue or pull request on `a2aproject/A2A` or `a2aproject/a2a-js` reports it, searched on 2026-11-14.

## 12. A card written for A2A 0.3 is read with its further interfaces at a version it never names (a2a-js 1.3.0)

**Component:** `@a2a-js/sdk` 1.3.0, `src/compat/v0_3/translate/agent_card.ts` at tag `v1.3.0`, reached through `parseLegacyAgentCard` in `@a2a-js/sdk/compat/v0_3/client`: `toCoreAgentCard` gives the card's own URL `compat.protocolVersion || PROTOCOL_VERSION_0_3` (line 169), and `toCoreAgentInterface` gives every entry of `additionalInterfaces` the fixed `PROTOCOL_VERSION_0_3`, `"0.3"` (line 48).

**Severity:** consistency. One card that names one A2A version reads as two. The client's choice of transport is unharmed, since the SDK counts every version from 0.3 up to 1.0 as A2A 0.3, but anything that records or compares an interface by its version sees the agent on `0.3.0` at one interface and on `0.3` at the next.

### Issue

In A2A 0.3 the version belongs to the card: `AgentCard.protocolVersion` is "The version of the A2A protocol this agent supports" (`specification/json/a2a.json` at `v0.3.0`), and an `AgentInterface` holds `transport` and `url` alone. The translator's own header says so: "`protocolVersion`: card-level in v0.3, per-interface in v1.0." Yet only the first interface takes the card's version. Each further one takes the constant, whatever the card says.

### Reproduction

Run on 2026-11-14 with `@a2a-js/sdk` 1.3.0:

```js
import {parseLegacyAgentCard} from '@a2a-js/sdk/compat/v0_3/client';
const card = parseLegacyAgentCard({
  name: 'Shop B', description: 'd', version: '0.2.0', protocolVersion: '0.3.0',
  url: 'grpc.shop-b.example:443', preferredTransport: 'GRPC',
  additionalInterfaces: [{url: 'http://localhost:12002', transport: 'JSONRPC'}],
  capabilities: {}, defaultInputModes: ['text'], defaultOutputModes: ['text'], skills: [],
});
card.supportedInterfaces.map(i => [i.protocolBinding, i.protocolVersion]);
// [["GRPC","0.3.0"],["JSONRPC","0.3"]]
```

### Fix

In `toCoreAgentCard`, give every further interface the version the first one takes: `compat.protocolVersion || PROTOCOL_VERSION_0_3`.

A2UIVerse's card reading does so after `parseLegacyAgentCard` returns (`packages/card/src/readCard.ts` in `retz8/a2uiverse`).

### Prior art

No issue or pull request on `a2aproject/a2a-js` reports it, searched on 2026-11-14. Pull request 504 brought the translation in, and issue 646 asks for its converters to be exported, neither touching the version.

## 13. A card written for A2A 0.3 whose OAuth scheme names only the device-code flow does not read (a2a-js 1.3.0)

**Component:** `@a2a-js/sdk` 1.3.0, `src/compat/v0_3/translate/security.ts` at tag `v1.3.0`: `toCoreOAuthFlows` (line 195) takes `authorizationCode`, `clientCredentials`, `implicit` or `password` and otherwise throws `OAuthFlows must declare at least one flow` (line 232). Reached for every scheme from `toCoreAgentCard` (`src/compat/v0_3/translate/agent_card.ts`, line 188) through `parseLegacyAgentCard` in `@a2a-js/sdk/compat/v0_3/client`.

**Severity:** interoperability. An agent on A2A 0.3 that signs in by the device-code flow, which A2A 1.0 adds, cannot say so on its card: the SDK refuses the whole card, every other scheme and skill with it, and a client on the SDK cannot reach the agent at all.

### Issue

A2A 0.3's `OAuthFlows` names four flows, none of them required (`specification/json/a2a.json` at A2A `v0.3.0`), and the schema leaves other properties open. A2A 1.0 adds `deviceCode` (`DeviceCodeOAuthFlow`: `deviceAuthorizationUrl`, `tokenUrl`, `refreshUrl`, `scopes`). An agent still serving its card in 0.3's shape writes the flow it has under `flows.deviceCode`, in 1.0's field names, as the only place a client can find it.

The 1.0 → 0.3 direction already knows the gap: `toCompatOAuthFlows` in the same file says "v1.0's `deviceCode` is silently dropped (no v0.3 equivalent)". The 0.3 → 1.0 direction does not read `deviceCode` where it is written, and with no other flow beside it throws for the whole card.

### Reproduction

Run on 2026-11-14 with `@a2a-js/sdk` 1.3.0:

```js
import {parseLegacyAgentCard} from '@a2a-js/sdk/compat/v0_3/client';
parseLegacyAgentCard({
  name: 'TV', description: 'd', version: '0.1.0', protocolVersion: '0.3.0',
  url: 'http://localhost:12009', capabilities: {}, defaultInputModes: ['text'],
  defaultOutputModes: ['text'], skills: [],
  securitySchemes: {signIn: {type: 'oauth2', flows: {deviceCode: {
    deviceAuthorizationUrl: 'https://tv.example/device', tokenUrl: 'https://tv.example/token',
    scopes: {watch: 'See what you watch'}}}}},
  security: [{signIn: ['watch']}],
});
// RequestMalformedError: OAuthFlows must declare at least one flow
```

A scheme naming the authorization-code flow beside `deviceCode` reads, with the authorization-code flow.

### Fix

In `toCoreOAuthFlows`, read `deviceCode` as the 1.0 flow of the same name when none of 0.3's four flows is present, ahead of the throw.

A2UIVerse's card reading takes such a scheme out before `parseLegacyAgentCard` and reads it with the SDK's own `SecurityScheme.fromJSON`, in A2A 1.0's shape (`packages/card/src/readCard.ts` in `retz8/a2uiverse`).

### Prior art

No issue or pull request on `a2aproject/a2a-js` reports it, searched on 2026-11-14. Pull request 358 (closed unmerged on 2026-03-18) would have added the device-code flow to the 0.3 SDK's own `OAuthFlows` type and its converters; pull request 481 brought the translation units in.

## 14. A card written for A2A 0.3 does not read when one OAuth scheme holds none of A2A 0.3's four flows (a2a-js 1.3.0)

**Component:** `@a2a-js/sdk` 1.3.0, `src/compat/v0_3/translate/security.ts` at tag `v1.3.0`, `toCoreOAuthFlows` (lines 195 to 232), reached from `toCoreAgentCard` (`src/compat/v0_3/translate/agent_card.ts`, line 188) through `parseLegacyAgentCard`.

**Severity:** spec conformance. A card valid under A2A 0.3's schema is refused whole, for one scheme the client may not need: an agent with a usable `apiKey` scheme beside it is unreachable too.

### Issue

A2A 0.3's `OAuth2SecurityScheme` requires `flows` and `type`, and its `OAuthFlows` requires none of its four properties (`specification/json/a2a.json` at A2A `v0.3.0`), so `flows: {}`, or `flows` holding a flow 0.3 does not name, is a valid 0.3 scheme. `toCoreOAuthFlows` throws for it, because the 1.0 proto's `flow` oneof has no empty case, and `toCoreAgentCard` lets the throw end the reading of the whole card. The SDK's own 1.0 → 0.3 writer produces such a scheme: `toCompatOAuthFlows` in the same file returns an empty result for a 1.0 scheme whose only flow is `deviceCode`, as its comment says.

Finding 13 is one case of this one: there a flow sits under `deviceCode`, which a reader could take.

### Reproduction

Run on 2026-11-14 with `@a2a-js/sdk` 1.3.0: the card of finding 13 with `flows: {}` throws `RequestMalformedError: OAuthFlows must declare at least one flow`.

### Fix

Read an OAuth scheme with no flow it can represent as a scheme with no flow (its `flow` unset, as `OAuthFlows.fromJSON` reads a 1.0 card's `flows` that names none), or leave that one scheme out, and read the rest of the card.

A2UIVerse carries no change for it: such a card is refused at publish, at install and at `stellify preview`, in the SDK's words.

### Prior art

No issue or pull request on `a2aproject/a2a-js` reports it, searched on 2026-11-14.

## 15. The card signature verifier takes any algorithm its key callback hands a key for (a2a-js 1.3.0)

**Component:** `@a2a-js/sdk` 1.3.0, `src/signature.ts` at tag `v1.3.0`: `verifyAgentCardSignature` (line 80) decodes each signature's protected header (line 97), asks the caller's `retrievePublicKey(kid, jku)` for a key, and verifies with `jose.flattenedVerify(jws, publicKey)` (line 110), passing no `algorithms` option.

**Severity:** security hardening. The algorithm a card's signature is checked under is whatever its own protected header names, as long as the key the callback returns fits it. A callback that resolves keys from a key set holding a symmetric key, or one that returns the wrong kind of key for a `kid`, lets a shared-secret signature pass. RFC 8725 section 3.1: "Libraries MUST enable the caller to specify a supported set of algorithms and MUST NOT use any other algorithms when performing cryptographic operations."

### Issue

`verifyAgentCardSignature(retrievePublicKey)` takes no list of algorithms, so a caller cannot say which ones it accepts. It requires `alg`, `typ` and `kid` in the protected header (line 98) and takes any value of `typ`. The Python SDK's `create_signature_verifier(key_provider, algorithms)` takes the list as a required argument.

### Reproduction

Run on 2026-11-14 with `@a2a-js/sdk` 1.3.0 and `jose` 6.2.17, each card signed by the SDK's own `generateAgentCardSignature` and verified with a callback returning the matching key:

```js
import {AgentCard, generateAgentCardSignature, verifyAgentCardSignature} from '@a2a-js/sdk';
import {generateKeyPair, generateSecret} from 'jose';

const card = AgentCard.toJSON(AgentCard.fromJSON({
  name: 'Shop', description: 'a shop', version: '1.0.0',
  supportedInterfaces: [{url: 'https://shop.example/a2a', protocolBinding: 'JSONRPC', protocolVersion: '1.0'}],
}));
async function tryAlg(alg, header = {}) {
  const key = alg.startsWith('HS') ? await generateSecret(alg) : await generateKeyPair(alg);
  const signed = await generateAgentCardSignature(key.privateKey ?? key, {alg, kid: 'k', typ: 'JOSE', ...header})(card);
  try {
    await verifyAgentCardSignature(async () => key.publicKey ?? key)(signed);
    return 'passes';
  } catch (e) {
    return `fails: ${e.message}`;
  }
}
for (const alg of ['RS256', 'EdDSA', 'ES384', 'HS256']) console.log(alg, await tryAlg(alg));
console.log('typ JWT', await tryAlg('ES256', {typ: 'JWT'}));
console.log('no typ', await tryAlg('ES256', {typ: undefined}));
// RS256 passes
// EdDSA passes
// ES384 passes
// HS256 passes
// typ JWT passes
// no typ fails: No valid signatures found on agent card.
```

### Fix

Give `verifyAgentCardSignature` an `algorithms` argument, as the Python SDK's verifier has, and pass it to `jose.flattenedVerify` as `{algorithms}`; with none given, default to the public-key algorithms and never to HMAC.

A2UIVerse checks a signature with its own code around `canonicalizeAgentCard`, under a fixed list of public-key algorithms (`packages/card/src/signatures.ts` in `retz8/a2uiverse`).

### Prior art

No issue or pull request on `a2aproject/a2a-js` reports it, searched on 2026-11-14 ("signature", "signature algorithms"). Issue 663 (open) reports `canonicalizeAgentCard` dropping sign-in schemes from a card already read into memory, and issue 627 (open) its dropping of required fields with default values.

## 16. The client reads a card's sign-in schemes from the A2A 0.3 copy served beside them, and checks the signature against that copy (a2a-python 1.3.0)

**Component:** `a2a-sdk` 1.3.0, `src/a2a/client/card_resolver.py` at tag `v1.3.0`: `parse_agent_card` (line 21) runs `_handle_security_compatibility` (line 91), which for every scheme holding a 0.3 `type` pops it (line 119) and wraps the whole scheme object, the 1.0 copy's key with it, under the 1.0 key that `type` maps to (lines 125 to 128). `ParseDict(..., ignore_unknown_fields=True)` (line 32) then drops the nested 1.0 copy. `A2ACardResolver.get_agent_card` (line 151) hands that reading to the caller's `signature_verifier` (lines 201 and 202), and `create_signature_verifier` (`src/a2a/utils/signing.py`, line 103) canonicalizes the reading with `_canonicalize_agent_card` (line 208). The served card comes from `agent_card_to_dict` (`src/a2a/server/request_handlers/response_helpers.py`, line 88), which merges `to_compat_agent_card`'s output into the 1.0 card key by key (lines 105 to 117), so each scheme holds both shapes in one object.

**Severity:** correctness. A card signed by the SDK's signer and served by the SDK's card route fails the SDK's own client when a scheme holds something A2A 0.3 cannot say, and the client reads that scheme without it even when no signature is checked. Where the check passes, it vouches for the 0.3 copy the Python client read, not for the signed 1.0 copy a reader of A2A 1.0's shape reads: the 1.0 copy can be changed and the Python verifier still passes, while `@a2a-js/sdk` 1.3.0 refuses the same card.

### Issue

A 1.3.0 card that lists an interface at A2A 0.3 is served with 0.3's fields beside 1.0's. `agent_card_to_dict` writes `MessageToDict` of the card and merges in the dump of `to_compat_agent_card`, so `securitySchemes.signIn` holds `oauth2SecurityScheme` (1.0) and `type` and `flows` (0.3) in one object, and the card holds `security` beside `securityRequirements`. The signature is made before this, over `MessageToDict` of the 1.0 card, and covers none of the 0.3 keys.

`parse_agent_card` treats the two copies differently by field. For requirements it keeps `securityRequirements` and drops `security` when both are present (lines 93 to 100), and for interfaces it keeps `supportedInterfaces` (line 56). For schemes it does not check: any scheme holding a 0.3 `type` is rewritten from the 0.3 copy, and the 1.0 copy inside it is lost as an unknown field. The verifier then canonicalizes that reading and checks it against a signature over the 1.0 form. A2A 1.0 section 8.4.3 asks a verifier to canonicalize "the received Agent Card".

Two things follow. The 0.3 copy is written by `to_compat_oauth_flows` (`src/a2a/compat/v0_3/conversions.py`, line 507), which writes no `pkceRequired` (lines 514 to 522) and drops a device-code flow (line 547). A scheme with either reads back without it, and a signed card carrying one fails at the SDK's own client, while `@a2a-js/sdk`, which reads the 1.0 copy, passes it. And the Python client neither reads nor checks the 1.0 copy, so a pass from the Python verifier says nothing about the scheme a reader of 1.0's shape uses.

### Reproduction

Run on 2026-11-14 with `a2a-sdk[http-server,signing]` 1.3.0 (`uv run --no-project --with 'a2a-sdk[http-server,signing]==1.3.0' python -I f16_repro.py cards.json`), then `@a2a-js/sdk` 1.3.0 and `jose` 6.2.17 on the cards it writes (`node --input-type=module - cards.json < f16_repro.mjs`, from a directory where `@a2a-js/sdk` resolves). Each card is signed by the SDK's signer, served by its `create_agent_card_routes`, and read by its `A2ACardResolver` with its verifier:

```python
import asyncio, copy, json, sys
import httpx
from cryptography.hazmat.primitives.asymmetric import ec
from google.protobuf.json_format import ParseDict
from jwt.algorithms import ECAlgorithm
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route
from a2a.client.card_resolver import A2ACardResolver
from a2a.server.routes import create_agent_card_routes
from a2a.types.a2a_pb2 import (AgentCapabilities, AgentCard, AgentInterface, AgentSkill,
    AuthorizationCodeOAuthFlow, DeviceCodeOAuthFlow, OAuth2SecurityScheme, OAuthFlows,
    SecurityRequirement, SecurityScheme, StringList)
from a2a.utils.signing import create_agent_card_signer, create_signature_verifier

key = ec.generate_private_key(ec.SECP256R1())
sign = create_agent_card_signer(key, {'alg': 'ES256', 'typ': 'JOSE', 'kid': 'k1'})
verify = create_signature_verifier(lambda kid, jku: key.public_key(), ['ES256'])
URL = 'https://shop.example/authorize'

def card(flows):  # JSON-RPC at A2A 1.0 and at 0.3, one OAuth scheme, signed
    return sign(AgentCard(name='Shop', description='d', version='0.1.0',
        supported_interfaces=[AgentInterface(url='https://shop.example/', protocol_binding='JSONRPC',
                                             protocol_version=v) for v in ('1.0', '0.3')],
        capabilities=AgentCapabilities(streaming=True), default_input_modes=['text'],
        default_output_modes=['text'],
        skills=[AgentSkill(id='orders', name='Orders', description='Your orders', tags=['shop'])],
        security_schemes={'signIn': SecurityScheme(
            oauth2_security_scheme=OAuth2SecurityScheme(flows=flows))},
        security_requirements=[SecurityRequirement(schemes={'signIn': StringList(list=['orders'])})]))

code = lambda pkce=False: OAuthFlows(authorization_code=AuthorizationCodeOAuthFlow(
    authorization_url=URL, token_url='https://shop.example/token',
    scopes={'orders': 'See your orders'}, pkce_required=pkce))
device = OAuthFlows(device_code=DeviceCodeOAuthFlow(device_authorization_url='https://shop.example/device',
    token_url='https://shop.example/token', scopes={'orders': 'See your orders'}))

async def served(c):  # the card as the SDK's own card route serves it
    app = Starlette(routes=create_agent_card_routes(c))
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app)) as h:
        return (await h.get('https://shop.example/.well-known/agent-card.json')).json()

async def resolve(body, verifier=verify):  # the SDK's card resolver, with the SDK's verifier
    app = Starlette(routes=[Route('/.well-known/agent-card.json', lambda _: JSONResponse(body))])
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app)) as h:
        try:
            read = await A2ACardResolver(h, 'https://shop.example').get_agent_card(
                signature_verifier=verifier)
        except Exception as e:
            return f'{type(e).__name__}: {e}'
    flows = read.security_schemes['signIn'].oauth2_security_scheme.flows
    return (f'{"verified" if verifier else "not verified"}, reads flow {flows.WhichOneof("flow")}, '
            f'{flows.authorization_code.authorization_url}, '
            f'pkceRequired {flows.authorization_code.pkce_required}')

async def main():
    body = await served(card(code()))
    print('signIn as served:', json.dumps(body['securitySchemes']['signIn']))
    print('1. as served:', await resolve(body))
    copy_0_3 = copy.deepcopy(body)
    copy_0_3['securitySchemes']['signIn']['flows']['authorizationCode']['authorizationUrl'] = 'https://evil.example/'
    print("2. 0.3 copy's URL changed:", await resolve(copy_0_3))
    copy_1_0 = copy.deepcopy(body)
    copy_1_0['securitySchemes']['signIn']['oauth2SecurityScheme']['flows']['authorizationCode'][
        'authorizationUrl'] = 'https://evil.example/'
    print("3. 1.0 copy's URL changed:", await resolve(copy_1_0))
    read = ParseDict(copy.deepcopy(copy_1_0), AgentCard(), ignore_unknown_fields=True)
    print('   read in 1.0 shape alone:',
          read.security_schemes['signIn'].oauth2_security_scheme.flows.authorization_code.authorization_url)
    pkce = await served(card(code(pkce=True)))
    print('4. pkceRequired, as served:', await resolve(pkce))
    print('   unverified:', await resolve(pkce, None))
    device_card = await served(card(device))
    print('5. device code, as served:', await resolve(device_card))
    print('   unverified:', await resolve(device_card, None))
    json.dump({'jwk': ECAlgorithm.to_jwk(key.public_key(), as_dict=True), 'asServed': body,
               'copy10Changed': copy_1_0, 'pkce': pkce, 'deviceCode': device_card}, open(sys.argv[1], 'w'))

asyncio.run(main())
```

```js
import {readFileSync} from 'node:fs';
import {verifyAgentCardSignature} from '@a2a-js/sdk';
import * as jose from 'jose';

console.debug = () => {};
const {jwk, ...cards} = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const verify = verifyAgentCardSignature(async () => jose.importJWK(jwk, 'ES256'));
for (const [name, card] of Object.entries(cards)) {
  console.log(`${name}: ${await verify(card).then(() => 'verified', (e) => e.message)}`);
}
```

Output, the Python run then the JavaScript one:

```text
signIn as served: {"oauth2SecurityScheme": {"flows": {"authorizationCode": {"authorizationUrl": "https://shop.example/authorize", "tokenUrl": "https://shop.example/token", "scopes": {"orders": "See your orders"}}}}, "flows": {"authorizationCode": {"authorizationUrl": "https://shop.example/authorize", "scopes": {"orders": "See your orders"}, "tokenUrl": "https://shop.example/token"}}, "type": "oauth2"}
1. as served: verified, reads flow authorization_code, https://shop.example/authorize, pkceRequired False
2. 0.3 copy's URL changed: InvalidSignaturesError: No valid signature found
3. 1.0 copy's URL changed: verified, reads flow authorization_code, https://shop.example/authorize, pkceRequired False
   read in 1.0 shape alone: https://evil.example/
4. pkceRequired, as served: InvalidSignaturesError: No valid signature found
   unverified: not verified, reads flow authorization_code, https://shop.example/authorize, pkceRequired False
5. device code, as served: InvalidSignaturesError: No valid signature found
   unverified: not verified, reads flow None, , pkceRequired False
asServed: verified
copy10Changed: No valid signatures found on agent card.
pkce: verified
deviceCode: verified
```

Emptying the 0.3 copy's `security` changes nothing the Python client reads, and the card still verifies there, since `parse_agent_card` keeps `securityRequirements` when both are present.

### Fix

In `_handle_security_compatibility`, leave a scheme as it is when it already holds one of A2A 1.0's scheme keys (the values of `type_mapping`), as the same function does for `securityRequirements` and `_handle_connection_fields_compatibility` does for `supportedInterfaces`, and rewrite only a scheme that holds no 1.0 key. The client then reads, and the verifier checks, the copy the signature covers.

A2UIVerse reads such a card with `AgentCard.fromJSON`, the 1.0 copy, and checks its signature with `canonicalizeAgentCard` over the card as served, the same copy (`packages/card/src/readCard.ts` and `packages/card/src/signatures.ts` in `retz8/a2uiverse`).

### Prior art

No issue or pull request on `a2aproject/a2a-python` reports it, searched on 2026-11-14 ("parse_agent_card", "agent_card_to_dict", "to_compat_agent_card", "_handle_security_compatibility", "pkce_required", "pkceRequired", "signature compat", "card resolver signature", "oauth2SecurityScheme flows", "compat security"). Issue 1051 (closed as stale on 2026-06-10) asked what the 0.3 fields `agent_card_to_dict` merges into a served card say about the agent's protocol version, not about sign-in or signatures. Pull request 1434 (merged on 2026-11-13, after 1.3.0) fixes the 0.3 gRPC card method failing on a card with a device-code scheme, which JSON-RPC and HTTP+JSON serve as `flows: {}`.

## 17. The card `to_compat_agent_card` writes keeps the signature over its A2A 1.0 form, which fails every verifier once the card lists a 1.0 interface (a2a-python 1.3.0)

**Component:** `a2a-sdk` 1.3.0, `src/a2a/compat/v0_3/conversions.py` at tag `v1.3.0`: `to_compat_agent_card` (line 917) keeps only the interfaces at a 0.3 version (lines 920 to 927) and copies the card's signatures as they are (lines 984 to 988, through `to_compat_agent_card_signature`, line 833). The 0.3 extended card is that card: `RequestHandler03.on_get_extended_agent_card` (`src/a2a/compat/v0_3/request_handler.py`, lines 168 to 178) returns it, and `JSONRPC03Adapter` answers `agent/getAuthenticatedExtendedCard` with it (`src/a2a/compat/v0_3/jsonrpc_adapter.py`, line 231), as the 0.3 HTTP+JSON and gRPC handlers do for their card methods. A 1.3.0 client reads it back in `CompatJsonRpcTransport.get_extended_agent_card` (`src/a2a/compat/v0_3/jsonrpc_transport.py`, line 371) with `to_core_agent_card` (line 394; defined in `conversions.py`, line 846) and checks it in `BaseClient.get_extended_agent_card` (`src/a2a/client/base_client.py`, line 337) with the caller's verifier (lines 365 and 366).

**Severity:** interoperability. A 1.3.0 agent that signs its card and offers it on A2A 0.3 beside 1.0 hands a 0.3 client a signature that cannot pass: a client that checks signatures refuses the card, and one that does not holds a signature that vouches for nothing it was given.

### Issue

The signer signs `MessageToDict` of the 1.0 card (`_canonicalize_agent_card`, `src/a2a/utils/signing.py`, line 208). `to_compat_agent_card` writes a different card: 0.3's field names and shapes, with only the interfaces at a 0.3 version, since A2A 0.3's card cannot name an interface's version. It keeps the 1.0 form's signatures.

Each verifier rebuilds a different payload from that card:

1. The 0.3.26 `create_signature_verifier` canonicalizes the 0.3 model (`url`, `protocolVersion`, `security`, schemes under `type` and `flows`), never the 1.0 form, so it fails every such card.
2. The 1.3.0 verifier, on the card read back by `parse_agent_card` or by `to_core_agent_card`, gets the 1.0 form back without the interfaces the conversion dropped, so it fails whenever the card listed a 1.0 interface. Anything else the conversion drops breaks it the same way: a card whose every interface is at 0.3 passes, and the same card with `pkceRequired` on its scheme fails (finding 16).
3. `@a2a-js/sdk` 1.3.0's `verifyAgentCardSignature` canonicalizes `AgentCard.fromJSON` of what it is handed. Handed the 0.3 JSON, it reads it in 1.0's shape, losing the URL, the requirements and the schemes, so it fails every such card. Handed `AgentCard.toJSON(parseLegacyAgentCard(card))`, it gives what the 1.3.0 verifier gives.

A2A 0.3 says nothing of how a card is canonicalized for signing (finding 18), so no rule makes a signature over one shape valid on the other.

### Reproduction

Run on 2026-11-14 with `a2a-sdk[http-server,signing]` 1.3.0 (`uv run --no-project --with 'a2a-sdk[http-server,signing]==1.3.0' python -I f17_repro.py cards.json`), then 0.3.26 on the cards it writes (`uv run --no-project --with 'a2a-sdk[http-server,signing]==0.3.26' python -I f17_repro_v0_3.py cards.json`), then `@a2a-js/sdk` 1.3.0 and `jose` 6.2.17 (`node --input-type=module - cards.json < f17_repro.mjs`). Each 0.3 card is written as `JSONRPC03Adapter` writes the extended card:

```python
# f17_repro.py, a2a-sdk 1.3.0
import copy, json, sys
from cryptography.hazmat.primitives.asymmetric import ec
from jwt.algorithms import ECAlgorithm
from a2a.client.card_resolver import parse_agent_card
from a2a.compat.v0_3 import types as types_v03
from a2a.compat.v0_3.conversions import to_compat_agent_card, to_core_agent_card
from a2a.types.a2a_pb2 import (AgentCapabilities, AgentCard, AgentInterface, AgentSkill,
    AuthorizationCodeOAuthFlow, OAuth2SecurityScheme, OAuthFlows, SecurityRequirement,
    SecurityScheme, StringList)
from a2a.utils.signing import create_agent_card_signer, create_signature_verifier

key = ec.generate_private_key(ec.SECP256R1())
sign = create_agent_card_signer(key, {'alg': 'ES256', 'typ': 'JOSE', 'kid': 'k1'})
verify = create_signature_verifier(lambda kid, jku: key.public_key(), ['ES256'])

def card(versions):
    return AgentCard(name='Shop', description='d', version='0.1.0',
        supported_interfaces=[AgentInterface(url='https://shop.example/', protocol_binding='JSONRPC',
                                             protocol_version=v) for v in versions],
        capabilities=AgentCapabilities(streaming=True), default_input_modes=['text'],
        default_output_modes=['text'],
        skills=[AgentSkill(id='orders', name='Orders', description='Your orders', tags=['shop'])],
        security_schemes={'signIn': SecurityScheme(oauth2_security_scheme=OAuth2SecurityScheme(
            flows=OAuthFlows(authorization_code=AuthorizationCodeOAuthFlow(
                authorization_url='https://shop.example/authorize', token_url='https://shop.example/token',
                scopes={'orders': 'See your orders'}))))},
        security_requirements=[SecurityRequirement(schemes={'signIn': StringList(list=['orders'])})])

def check(read):
    try:
        verify(read)
        return 'verified'
    except Exception as e:
        return f'{type(e).__name__}: {e}'

cards = {}
for name, versions in {'both': ('1.0', '0.3'), 'only-0.3': ('0.3',)}.items():
    # as the SDK's 0.3 JSON-RPC adapter writes it for agent/getAuthenticatedExtendedCard
    compat = to_compat_agent_card(sign(card(versions))).model_dump(
        mode='json', by_alias=True, exclude_none=True)
    cards[name] = compat
    by_resolver = parse_agent_card(copy.deepcopy(compat))
    by_transport = to_core_agent_card(types_v03.AgentCard.model_validate(compat))
    print(f'{name}: signed over interfaces at {list(versions)}, the 0.3 card lists one at '
          f'{compat["protocolVersion"]} and carries {len(compat["signatures"])} signature')
    print(f'  1.3.0, read by parse_agent_card:   {check(by_resolver)}')
    print(f'  1.3.0, read by to_core_agent_card: {check(by_transport)}')
json.dump({'jwk': ECAlgorithm.to_jwk(key.public_key(), as_dict=True), 'cards': cards},
          open(sys.argv[1], 'w'))
```

```python
# f17_repro_v0_3.py, a2a-sdk 0.3.26
import json, sys
from jwt.algorithms import ECAlgorithm
from a2a.types import AgentCard
from a2a.utils.signing import create_signature_verifier

data = json.load(open(sys.argv[1]))
key = ECAlgorithm.from_jwk(json.dumps(data['jwk']))
verify = create_signature_verifier(lambda kid, jku: key, ['ES256'])
for name, served in data['cards'].items():
    try:
        verify(AgentCard.model_validate(served))
        print(f'{name}: 0.3.26: verified')
    except Exception as e:
        print(f'{name}: 0.3.26: {type(e).__name__}: {e}')
```

```js
// f17_repro.mjs, @a2a-js/sdk 1.3.0
import {readFileSync} from 'node:fs';
import {AgentCard, verifyAgentCardSignature} from '@a2a-js/sdk';
import {parseLegacyAgentCard} from '@a2a-js/sdk/compat/v0_3/client';
import * as jose from 'jose';

console.debug = () => {};
const {jwk, cards} = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const verify = verifyAgentCardSignature(async () => jose.importJWK(jwk, 'ES256'));
const check = (card) => verify(card).then(() => 'verified', (e) => e.message);
for (const [name, card] of Object.entries(cards)) {
  console.log(`${name}: a2a-js, handed the JSON: ${await check(card)}`);
  const read = AgentCard.toJSON(parseLegacyAgentCard(card));
  console.log(`${name}: a2a-js, read by parseLegacyAgentCard: ${await check(read)}`);
}
```

Output, the three runs in order:

```text
both: signed over interfaces at ['1.0', '0.3'], the 0.3 card lists one at 0.3 and carries 1 signature
  1.3.0, read by parse_agent_card:   InvalidSignaturesError: No valid signature found
  1.3.0, read by to_core_agent_card: InvalidSignaturesError: No valid signature found
only-0.3: signed over interfaces at ['0.3'], the 0.3 card lists one at 0.3 and carries 1 signature
  1.3.0, read by parse_agent_card:   verified
  1.3.0, read by to_core_agent_card: verified
both: 0.3.26: InvalidSignaturesError: No valid signature found
only-0.3: 0.3.26: InvalidSignaturesError: No valid signature found
both: a2a-js, handed the JSON: No valid signatures found on agent card.
both: a2a-js, read by parseLegacyAgentCard: No valid signatures found on agent card.
only-0.3: a2a-js, handed the JSON: No valid signatures found on agent card.
only-0.3: a2a-js, read by parseLegacyAgentCard: verified
```

### Fix

Leave the signatures off the card `to_compat_agent_card` returns unless `to_core_agent_card` of that card gives back the signed card without its signatures, since in every other case they cannot pass on it. A 0.3 client then holds an unsigned card rather than a signature that fails. Even kept, a signature over the 1.0 form never passes a 0.3.26 verifier, which canonicalizes the 0.3 shape.

A2UIVerse keeps the signatures of a card read as written for A2A 0.3 and does not check them (`checkSignatures` in `packages/card/src/signatures.ts` in `retz8/a2uiverse`).

### Prior art

No issue or pull request reports it, searched on 2026-11-14: on `a2aproject/a2a-python` for "to_compat_agent_card", "signature compat", "signature legacy", "signature 0.3", "signature extended card", "signed card 0.3" and "AgentCardSignature", and on `a2aproject/a2a-js` for "verifyAgentCardSignature", "canonicalizeAgentCard", "signature legacy" and "signature 0.3". On `a2aproject/a2a-js`, issue 663 (open) reports `canonicalizeAgentCard` dropping the schemes of a card already read into memory, and issue 627 (open) its dropping of required fields at their default value; neither concerns a card in 0.3's shape.

## 18. The 0.3 line signs a card over `json.dumps` with sorted keys, which is not RFC 8785 (a2a-python 0.3.26)

**Component:** `a2a-sdk` 0.3.26, `src/a2a/utils/helpers.py` at tag `v0.3.26`: `canonicalize_agent_card` (line 369), whose docstring says "Canonicalizes the Agent Card JSON according to RFC 8785 (JCS)" (line 370), takes `model_dump(exclude={'signatures'}, exclude_defaults=True, exclude_none=True, by_alias=True)` (lines 371 to 376) and returns `json.dumps(cleaned_dict, separators=(',', ':'), sort_keys=True)` (line 379). `create_agent_card_signer` (`src/a2a/utils/signing.py`, line 53) signs it (line 71) and `create_signature_verifier` (line 98) checks it (line 133). `v0.3.26` is the 0.3 line's newest tag.

**Severity:** interoperability. A card signed by a 0.3.26 agent passes only a verifier that repeats 0.3.26's own serialization. A verifier that follows RFC 8785, which A2A 1.0 requires and the SDK's docstring names, fails it whenever the card holds a character outside ASCII or a number Python writes differently from ECMAScript, and fails every card when it canonicalizes the card as served.

### Issue

A2A 0.3 names no canonical form. Its `AgentCardSignature` "represents a JWS signature of an AgentCard" and "follows the JSON format of an RFC 7515 JSON Web Signature (JWS)" (`specification/json/a2a.json` at A2A `v0.3.0`), and `docs/specification.md` at `v0.3.0` says no more (section 5.5.6). A2A 1.0 section 8.4.1 requires RFC 8785, with REQUIRED fields kept even at their default value.

`json.dumps` with these arguments departs from RFC 8785 in three places:

1. `ensure_ascii` is left on, so every character outside ASCII is written as a `\uXXXX` escape. RFC 8785 section 3.2.2.2 writes it as it is.
2. A number is written by Python's `repr`, so `2.0` stays `2.0`. RFC 8785 section 3.2.2.3 writes it by ECMAScript's rules, as `2`. Numbers reach a 0.3 card through `AgentExtension.params`.
3. `sort_keys` orders keys by code point. RFC 8785 section 3.2.3 orders them by UTF-16 code unit, which differs once a key holds a character outside the Basic Multilingual Plane. This one is not reproduced below; issue 1174 shows it on the 1.x line.

The content signed differs from the card served as well. `exclude_defaults=True` leaves out `protocolVersion` when it is "0.3.0", which A2A 0.3's `AgentCard` requires and its schema gives that default, `preferredTransport` when it is "JSONRPC", and every security scheme's `type`, which A2A 0.3 requires and fixes by a `const`. A verifier that canonicalizes the card it received, as A2A 1.0 section 8.4.3 describes, finds those fields and fails.

The signer hands `json.loads` of the canonical string to PyJWT's `jwt.encode` (lines 72 to 79), which writes it again with `json.dumps(payload, separators=(",", ":"))`. The escapes come out the same, so the bytes signed are the canonical form's, and the SDK's own verifier passes its own cards.

### Reproduction

Run on 2026-11-14 with `a2a-sdk[http-server,signing]` 0.3.26, PyJWT 2.15.1 and `rfc8785` 0.1.4 (`uv run --no-project --with 'a2a-sdk[http-server,signing]==0.3.26' --with rfc8785==0.1.4 python -I f18_repro.py`). Each card is signed by the SDK's signer and served as its card handler serves it, and the SDK's verifier passes all three. The JCS check takes the signature over RFC 8785's bytes, first for the content the SDK canonicalizes, then for the card as served:

```python
import base64
import rfc8785
from cryptography.hazmat.primitives.asymmetric import ec
from jwt import api_jws
from a2a.types import (AgentCapabilities, AgentCard, AgentExtension, AgentSkill,
    AuthorizationCodeOAuthFlow, OAuth2SecurityScheme, OAuthFlows, SecurityScheme)
from a2a.utils.helpers import _clean_empty, canonicalize_agent_card
from a2a.utils.signing import create_agent_card_signer, create_signature_verifier

key = ec.generate_private_key(ec.SECP256R1())
sign = create_agent_card_signer(key, {'alg': 'ES256', 'typ': 'JOSE', 'kid': 'k1'})
verify = create_signature_verifier(lambda kid, jku: key.public_key(), ['ES256'])

def card(description, params):
    return AgentCard(name='Shop', description=description, version='0.1.0',
        url='https://shop.example/', default_input_modes=['text'], default_output_modes=['text'],
        capabilities=AgentCapabilities(streaming=True, extensions=[
            AgentExtension(uri='https://shop.example/ext', params=params)]),
        skills=[AgentSkill(id='orders', name='Orders', description='Your orders', tags=['shop'])],
        security_schemes={'signIn': SecurityScheme(root=OAuth2SecurityScheme(flows=OAuthFlows(
            authorization_code=AuthorizationCodeOAuthFlow(
                authorization_url='https://shop.example/authorize',
                token_url='https://shop.example/token', scopes={'orders': 'See your orders'}))))},
        security=[{'signIn': ['orders']}])

def jcs_check(payload, sig):  # the JWS over RFC 8785's bytes for `payload`
    body = base64.urlsafe_b64encode(rfc8785.dumps(payload)).rstrip(b'=').decode()
    try:
        api_jws.decode(f'{sig["protected"]}.{body}.{sig["signature"]}', key.public_key(), ['ES256'])
        return 'verified'
    except Exception as e:
        return f'{type(e).__name__}: {e}'

for name, c in {'ascii': card('Order food', {'size': 2}),
                'non-ascii': card('Réservez à Zürich', {'size': 2}),
                'number': card('Order food', {'size': 2.0})}.items():
    served = sign(c).model_dump(exclude_none=True, by_alias=True)  # as its card handler serves it
    read = AgentCard.model_validate(served)
    verify(read)  # the SDK's own verifier passes every card here
    content = _clean_empty(read.model_dump(exclude={'signatures'}, exclude_defaults=True,
                                           exclude_none=True, by_alias=True))
    as_served = {k: v for k, v in served.items() if k != 'signatures'}
    print(f'{name}: JCS over what the SDK signs: {jcs_check(content, served["signatures"][0])}; '
          f'JCS over the card as served: {jcs_check(as_served, served["signatures"][0])}')
    sdk, jcs = canonicalize_agent_card(read), rfc8785.dumps(content).decode()
    at = next((i for i, (a, b) in enumerate(zip(sdk, jcs)) if a != b), None)
    if at is not None:
        print(f'  0.3.26:   ...{sdk[at - 14:at + 34]}...\n  RFC 8785: ...{jcs[at - 14:at + 18]}...')
print('served but not signed:', sorted(set(as_served) - set(content)), 'and signIn',
      sorted(set(as_served['securitySchemes']['signIn']) - set(content['securitySchemes']['signIn'])))
```

Output:

```text
ascii: JCS over what the SDK signs: verified; JCS over the card as served: InvalidSignatureError: Signature verification failed
non-ascii: JCS over what the SDK signs: InvalidSignatureError: Signature verification failed; JCS over the card as served: InvalidSignatureError: Signature verification failed
  0.3.26:   ...escription":"Réservez à Zürich","...
  RFC 8785: ...escription":"Réservez à Zürich",...
number: JCS over what the SDK signs: InvalidSignatureError: Signature verification failed; JCS over the card as served: InvalidSignatureError: Signature verification failed
  0.3.26:   ...ams":{"size":2.0},"uri":"https://shop.example/ex...
  RFC 8785: ...ams":{"size":2},"uri":"https://s...
served but not signed: ['preferredTransport', 'protocolVersion'] and signIn ['type']
```

### Fix

Canonicalize with an RFC 8785 implementation and hand its bytes to the JWS layer as they are, as the 1.x line does since pull request 1193 (`_canonicalize_agent_card` over `src/a2a/utils/_jcs.py`, and `api_jws.encode(payload=canonical_payload.encode('utf-8'), ...)` in `src/a2a/utils/signing.py` at `v1.3.0`, lines 77 to 86), and keep required fields in the payload at their default value. Both change the bytes the 0.3 line signs, so a card signed by an earlier 0.3 release would stop passing a verifier on the new one.

A2UIVerse keeps the signatures of a card read as written for A2A 0.3 and does not check them (`checkSignatures` in `packages/card/src/signatures.ts` in `retz8/a2uiverse`).

### Prior art

Issue 1174 on `a2aproject/a2a-python` (closed on 2026-08-25) reports the same three departures on the 1.x line, where `_canonicalize_agent_card` ended in the same `json.dumps` call, against a2a-sdk 1.1.2 and `@a2a-js/sdk` 1.0.1. Pull request 1193 (merged on 2026-08-25) fixed it on `main`, first released in 1.1.4 (2026-09-08). 0.3.26 was released on 2026-04-09 and no 0.3 release has followed. Issue 1278 (open) reports the 1.x line dropping REQUIRED fields at their default value from the payload, the 1.x counterpart of the dropped `protocolVersion` and `type` here. No issue or pull request asks for either fix on the 0.3 line, searched on 2026-11-14 ("canonicalize", "RFC 8785", "JCS", "ensure_ascii", "0.3 backport", "signature 0.3").

## 19. The specification does not say what makes a key the agent's own (A2A 1.0)

**Component:** the A2A 1.0 specification, `docs/specification.md` at tag `v1.0.0` of `a2aproject/A2A`, section 8.4.3 (Signature Verification), with section 8.4.2 (Signature Format).

**Severity:** security, specification. A client that follows section 8.4.3 as written can verify a forged card: whoever serves a card can sign it with a fresh key and name a key set holding that key.

### Issue

Section 8.4.2 lists `jku`, "URL to JSON Web Key Set (JWKS) containing the public key", among the protected header's parameters, all chosen by the signer. Section 8.4.3 has a client "Retrieve the public key using the `kid` and `jku` (or from a trusted key store)", and its security considerations say "Public keys **SHOULD** be retrieved over secure channels (HTTPS)", "Clients **MAY** maintain a trusted key store for known agent providers" and "Expired or revoked keys **MUST NOT** be used for verification". Nothing says which keys a client may trust for a given agent: where a key set may be, or how a key comes to be the agent's. Read literally, any key set the signature names is acceptable, so a pass shows only that the card matches a key its signer chose.

RFC 7515, which section 8.4 builds on, asks for this decision without making it: "The key management technique employed to obtain public keys must authenticate the origin of the key" (section 10.3). RFC 8725 section 3.10 warns that "blindly following a "jku" (JWK set URL) or "x5u" (X.509 URL) header, which may contain an arbitrary URL, could result in server-side request forgery (SSRF) attacks", and suggests "matching the URL to a whitelist of allowed locations".

### Reproduction

Read on 2026-11-14 from `docs/specification.md` at `v1.0.0`:

1. Section 8.4.2: "`jku`: URL to JSON Web Key Set (JWKS) containing the public key", one of the protected header's parameters.
2. Section 8.4.3, step 2: "Retrieve the public key using the `kid` and `jku` (or from a trusted key store)".
3. Section 8.4.3, Security Considerations: HTTPS retrieval, a trusted key store as a MAY, expired or revoked keys, multiple signatures for rotation; no rule on where a key set may be or which keys belong to an agent.

`@a2a-js/sdk` 1.3.0's `verifyAgentCardSignature` leaves the whole decision to its caller's `retrievePublicKey(kid, jku)` callback (finding 15), and so does the Python SDK's `create_signature_verifier(key_provider, algorithms)`.

### Fix

Say in section 8.4.3 which key sets a client may take a key from. One rule a client can apply with nothing configured: a key set must be on the origin (RFC 6454: scheme, host and port) of the URL the card was fetched from, over HTTPS, with no redirect followed; a client with a trusted key store for a provider uses that instead.

A2UIVerse takes a key only from a key set on the card URL's own origin, `https` unless on the local machine, its `kid` and `jku` read from the protected header alone, and records the rule as a local convention in the protocol delta register of `SPEC.md` section 14 (`retz8/a2uiverse`). A pass there says the card is intact against the keys at its agent's own origin, nothing about who the publisher is.

### Prior art

Issue 2096 on `a2aproject/A2A`, "spec(§8.4.3): Agent Card signature verification permits signer-controlled trust root via jku", open since 2026-08-02, reports the same gap; it points to `a2aproject/a2a-go` pull request 368, merged on 2026-09-23, whose verifier takes its trust root from its own policy and never from the signer's `jku`. Searched on 2026-11-14 ("jku", "agent card signature key").


## 20. The client hands back an extended card it has read, never the answer as served (a2a-js 1.3.0)

**Component:** `@a2a-js/sdk` 1.3.0. `Client.getAgentCard` (`src/client/multitransport-client.ts`) returns what the transport's `getExtendedAgentCard` returns, and each transport reads the answer before returning it: `AgentCard.fromJSON(rpcResponse.result)` in `src/client/transports/json_rpc_transport.ts`, `_sendRequest(..., AgentCard)` in `src/client/transports/rest_transport.ts`, the decoded message in `src/client/transports/grpc/grpc_transport.ts`, and `toCoreAgentCard(...)` in each of the three A2A 0.3 transports under `src/compat/v0_3/client/transports/`.

**Severity:** interoperability, security. A signed extended card that carries a sign-in scheme cannot be verified from what the client hands back, by the SDK's own verifier included, and a caller that reads cards its own way cannot have the card as the agent wrote it.

### Issue

Section 3.1.11 of the A2A 1.0 specification answers Get Extended Agent Card with "A complete Agent Card object", and section 8.4.3 has a client "verify at least one signature before trusting an Agent Card". A signature covers the card as served, in its canonical JSON. `getAgentCard` hands back the in-memory `AgentCard`, and `canonicalizeAgentCard` given an in-memory card drops its sign-in schemes (issue 663), so the payload a verifier computes from it is not the one that was signed. `getAgentCard(options, verifySignature)` verifies the same in-memory card, and fails the same way. Over A2A 0.3 the transports also translate the card before handing it back, so a caller cannot apply its own reading of a 0.3 card either.

### Reproduction

Run on 2026-11-14 with `@a2a-js/sdk` 1.3.0 and `jose` 6.2.17. An agent answers `GetExtendedAgentCard` with a card that carries an `apiKey` scheme, signed over `canonicalizeAgentCard` of the card as served:

```js
// f20_repro.mjs, @a2a-js/sdk 1.3.0
import {createServer} from 'node:http';
import express from 'express';
import {exportJWK, FlattenedSign, generateKeyPair, importJWK} from 'jose';
import {AgentCard, canonicalizeAgentCard, verifyAgentCardSignature} from '@a2a-js/sdk';
import {ClientFactory} from '@a2a-js/sdk/client';

console.debug = () => {};
const app = express();
app.use(express.json());
const server = createServer(app);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const card = {
  name: 'Shop', description: 'a shop', version: '1.0.0',
  supportedInterfaces: [{url, protocolBinding: 'JSONRPC', protocolVersion: '1.0'}],
  capabilities: {extendedAgentCard: true},
  securitySchemes: {key: {apiKeySecurityScheme: {location: 'header', name: 'X-Key'}}},
  securityRequirements: [{schemes: {key: {list: []}}}],
  skills: [{id: 'orders', name: 'Orders', description: 'Your orders', tags: []}],
};
const {privateKey, publicKey} = await generateKeyPair('ES256');
const jws = await new FlattenedSign(new TextEncoder().encode(canonicalizeAgentCard(card)))
  .setProtectedHeader({alg: 'ES256', typ: 'JOSE', kid: 'k1'})
  .sign(privateKey);
const signed = {...card, signatures: [{protected: jws.protected, signature: jws.signature}]};
app.post('/', (req, res) => res.json({jsonrpc: '2.0', id: req.body.id, result: signed}));
const jwk = await exportJWK(publicKey);
const verifier = verifyAgentCardSignature(async () => importJWK(jwk, 'ES256'));
const ok = card => verifier(card).then(() => 'verified', e => e.message);
console.log('the answer as served:', await ok(signed));
const client = await new ClientFactory().createFromAgentCard(AgentCard.fromJSON(card));
const extended = await client.getAgentCard();
console.log('what getAgentCard() hands back:', await ok(extended));
console.log('getAgentCard(options, verifier):', await client.getAgentCard(undefined, verifier).then(() => 'verified', e => e.message));
server.close();
```

Output:

```text
the answer as served: verified
what getAgentCard() hands back: No valid signatures found on agent card.
getAgentCard(options, verifier): No valid signatures found on agent card.
```

### Fix

Hand back the answer as served beside the card read, for instance as `getAgentCard(options, verifier, {raw: true})` or a `getExtendedAgentCardJson` on each transport, and have `getAgentCard`'s own verifier run on the answer as served.

A2UIVerse asks each transport directly and keeps the body of the answer through the fetch it hands the client (`keepingFetch` in `packages/smoke-transport/src/extendedCard.ts` in `retz8/a2uiverse`), reading the JSON-RPC result or the HTTP+JSON body with its own reading and checking a signature over it; on gRPC at A2A 1.0 it takes the JSON form of the message received, and on gRPC at A2A 0.3, where only the SDK's reading can be had, that reading. Its Backlog holds a line to drop this at the release that hands the answer back.

### Prior art

Issue 663 on `a2aproject/a2a-js` (open) reports `canonicalizeAgentCard` dropping the schemes of an in-memory card, the cause of the failure above; issue 705 (closed) the client caching an extended card before its signature passed. Neither asks for the answer as served. Searched on 2026-11-14 ("extended agent card", "getExtendedAgentCard", "getAgentCard").

## 21. The two SDKs write an extended card over A2A 0.3 on HTTP+JSON in different JSON forms (a2a-js 1.3.0, a2a-python 1.3.0)

**Component:** `@a2a-js/sdk` 1.3.0: its A2A 0.3 HTTP+JSON server writes `GET /v1/card` as `AgentCard.toJSON(ToProto.agentCard(card))` (`src/compat/v0_3/server/express/rest_handler.ts`), the JSON form of A2A 0.3's protobuf, and its 0.3 client reads it as such (`LegacyRestTransport.getExtendedAgentCard`, `src/compat/v0_3/client/transports/rest_transport.ts`). `a2a-sdk` 1.3.0: its 0.3 layer writes the same answer with `model_dump(mode='json', exclude_none=True)` (`src/a2a/compat/v0_3/rest_handler.py`), A2A 0.3's JSON-schema form.

**Severity:** interoperability. The JavaScript client throws on the Python server's extended card once the card names a sign-in scheme, and a reader of A2A 0.3's JSON-schema form refuses the JavaScript server's.

### Issue

A2A 0.3's section 3.2.3 has an HTTP+JSON transport "use JSON objects that are structurally equivalent to the core A2A data structures", and its section 7.10 answers `GET /v1/card` with an `AgentCard`. The core `AgentCard` of A2A 0.3 is the one its JSON schema defines, where a sign-in scheme is `{"type": "apiKey", "in": ..., "name": ...}`. The JavaScript server writes the JSON form of A2A 0.3's protobuf instead, where it is `{"apiKeySecurityScheme": {...}}` and an empty list is left out (a skill's `tags`, which the schema requires), and the JavaScript client reads only that form.

### Reproduction

Run on 2026-11-14 with `@a2a-js/sdk` 1.3.0, an agent answering in A2A 0.3's JSON-schema form, as `a2a-sdk` 1.3.0's 0.3 layer answers:

```js
// f21_repro.mjs, @a2a-js/sdk 1.3.0: its 0.3 HTTP+JSON client asking for the extended card of an
// agent that answers GET /v1/card in A2A 0.3's JSON-schema form, as a2a-sdk 1.3.0's 0.3 layer does.
import {createServer} from 'node:http';
import express from 'express';
import {AgentCard} from '@a2a-js/sdk';
import {ClientFactory, RestTransportFactory} from '@a2a-js/sdk/client';

const app = express();
const server = createServer(app);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const answer = {
  name: 'Shop', description: 'a shop', version: '1.0.0', protocolVersion: '0.3.0',
  url: `${url}/rest`, preferredTransport: 'HTTP+JSON', capabilities: {streaming: true},
  defaultInputModes: ['text'], defaultOutputModes: ['text'],
  skills: [{id: 'orders', name: 'Orders', description: 'Your orders', tags: ['orders']}],
  securitySchemes: {key: {type: 'apiKey', in: 'header', name: 'X-Key'}},
  security: [{key: []}],
  supportsAuthenticatedExtendedCard: true,
};
app.get('/rest/v1/card', (_req, res) => res.json(answer));
const card = AgentCard.fromJSON({
  name: 'Shop', version: '1.0.0',
  supportedInterfaces: [{url: `${url}/rest`, protocolBinding: 'HTTP+JSON', protocolVersion: '0.3'}],
  capabilities: {extendedAgentCard: true}, skills: [],
});
const client = await new ClientFactory({
  transports: [new RestTransportFactory({legacyCompat: {enabled: true}})],
}).createFromAgentCard(card);
await client.getAgentCard().then(
  read => console.log('read:', JSON.stringify(read.securitySchemes)),
  err => console.log(`${err.constructor.name}: ${err.message}`),
);
server.close();
```

Output:

```text
JsonRpcTransportError: Unsupported security scheme type
```

The other way, captured on 2026-11-14 by `scripts/capture-extended-cards.mjs` in `packages/smoke-transport` of `retz8/a2uiverse` against both servers: the JavaScript server's answer carries `"securitySchemes": {"key": {"apiKeySecurityScheme": {"location": "header", "name": "X-Scratch-Key"}}}`, which `parseLegacyAgentCard` refuses with "Unsupported v0.3 security scheme type: undefined"; the Python server's carries `{"key": {"type": "apiKey", "in": "header", "name": "X-Scratch-Key", ...}}`.

### Fix

Write and read `GET /v1/card` in A2A 0.3's JSON-schema form in `@a2a-js/sdk`'s 0.3 layer, as its 0.3 JSON-RPC layer already does for `agent/getAuthenticatedExtendedCard`.

A2UIVerse reads the answer as served with its own reading, and where that reading refuses a card the answer names, at A2A 0.3, takes the SDK's own reading of it (`cardOf` in `packages/smoke-transport/src/dial.ts` in `retz8/a2uiverse`), with a Backlog line to drop it at the release that fixes this.

### Prior art

Issue 1418 on `a2aproject/a2a-python`, "Compat REST client drops security from the v0.3 extended agent card", closed on 2026-11-09, reports the same disagreement from the Python client's side: it parsed `GET /v1/card` as A2A 0.3's protobuf JSON while 0.3 servers "send the pydantic card JSON". Nothing on `a2aproject/a2a-js` reports it, searched on 2026-11-14 ("v1/card", "extended agent card", "getExtendedAgentCard").

## 22. The 0.3 line answers the extended card's request over gRPC with the public card (a2a-python 0.3.26)

**Component:** `a2a-sdk` 0.3.26, `src/a2a/server/request_handlers/grpc_handler.py`: `GetAgentCard` returns `self.agent_card`, through its `card_modifier`, and never the extended card; `src/a2a/server/apps/jsonrpc/jsonrpc_app.py` serves the extended card for `agent/getAuthenticatedExtendedCard`.

**Severity:** spec conformance. A client of an agent on the 0.3 line that asks over gRPC never gets the extended card the same agent serves over JSON-RPC.

### Issue

A2A 0.3's section 7.10 maps `agent/getAuthenticatedExtendedCard` to the gRPC method `GetAgentCard` and the HTTP+JSON path `GET /v1/card`, the same operation on each transport, and its section 3.4 asks an agent serving several transports for "functionally equivalent" methods. `GrpcHandler` takes only the public card and a modifier of it, so on gRPC the operation answers the public card.

### Reproduction

Run on 2026-11-14 by `scripts/capture-extended-cards.mjs` in `packages/smoke-transport` of `retz8/a2uiverse`, against `scripts/serve_extended_card_v0_3.py`, an `a2a-sdk` 0.3.26 agent built with `A2AStarletteApplication(agent_card=card, http_handler=handler, extended_agent_card=extended)` and `GrpcHandler(card, handler)`, the extended card the public card with one skill more:

```text
a2a-sdk 0.3.26, JSONRPC: skills shop, lanterns
a2a-sdk 0.3.26, GRPC: skills shop
```

### Fix

Give `GrpcHandler` the extended card and its modifier, as `A2AStarletteApplication` takes them, and answer `GetAgentCard` with the extended card when the request carries a credential and `supports_authenticated_extended_card` is true. The 1.x line serves the extended card on gRPC through its 0.3 layer.

A2UIVerse takes whatever card the answer holds: an agent on the 0.3 line over gRPC is served on its public card.

### Prior art

None found, searched on `a2aproject/a2a-python` on 2026-11-14 ("GetAgentCard grpc", "extended agent card", "extended_card_modifier").

## 23. A refusal for sign-in on JSON-RPC arrives as a plain error with no status (a2a-js 1.3.0)

**Component:** `@a2a-js/sdk` 1.3.0, `src/client/transports/json_rpc_transport.ts`: an HTTP answer that is not a success is thrown as `new Error("HTTP error for <method>! Status: ...")`, the status only in the message.

**Severity:** interoperability. A caller cannot tell a refusal for sign-in from any other failure without reading the message's words.

### Issue

Section 3.3.2 of the A2A 1.0 specification has an agent signal a missing or invalid credential with HTTP 401 on JSON-RPC and HTTP+JSON, and section 7.10 of A2A 0.3 names a 401 for the extended card's request. The JSON-RPC transport throws a plain `Error` with no own field, so the status is not available to the caller as a value.

### Reproduction

Run on 2026-11-14 with `@a2a-js/sdk` 1.3.0:

```js
// f23_repro.mjs, @a2a-js/sdk 1.3.0: a refusal for sign-in on JSON-RPC, through its own client.
import {createServer} from 'node:http';
import express from 'express';
import {AgentCard} from '@a2a-js/sdk';
import {ClientFactory} from '@a2a-js/sdk/client';

const app = express();
app.post('/', (_req, res) => res.status(401).set('WWW-Authenticate', 'Bearer').json({}));
const server = createServer(app);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const client = await new ClientFactory().createFromAgentCard(
  AgentCard.fromJSON({
    name: 'Shop', version: '1.0.0',
    supportedInterfaces: [{url, protocolBinding: 'JSONRPC', protocolVersion: '1.0'}],
    capabilities: {extendedAgentCard: true}, skills: [],
  }),
);
await client.getAgentCard().catch(err =>
  console.log(`${err.constructor.name} (${Object.keys(err).join(', ') || 'no own fields'}): ${err.message}`),
);
server.close();
```

Output:

```text
Error (no own fields): HTTP error for GetExtendedAgentCard! Status: 401 Unauthorized. Response: {}
```

### Fix

Throw an error carrying the status as a field, as the HTTP+JSON transport's `RestTransportError` subclasses carry `statusCode`, or a typed error for 401.

A2UIVerse hands the client a fetch that turns an HTTP 401 into an error of its own before the transport sees it (`answeringFetch` in `packages/smoke-transport/src/answers.ts` in `retz8/a2uiverse`).

### Prior art

Issue 317 on `a2aproject/a2a-js`, "Passthrough http status code in error", is closed; in 1.3.0 the JSON-RPC transport still throws the status in the message alone. Searched on 2026-11-14 ("401", "status code error").

## 24. The extended card's handler makes no authentication check of its own (a2a-python 1.3.0)

**Component:** `a2a-sdk` 1.3.0, `src/a2a/server/request_handlers/default_request_handler.py`, `on_get_extended_agent_card`: it checks the card's `capabilities.extended_agent_card`, then serves `extended_agent_card` through `extended_card_modifier`, whatever `context.user.is_authenticated` says.

**Severity:** security. An agent that configures an extended card and no modifier serves it to any caller, signed in or not.

### Issue

Section 13.3 of the A2A 1.0 specification says the Get Extended Agent Card operation "MUST require authentication", and section 3.1.11 that "The client MUST authenticate the request". The handler leaves the check to the agent's modifier and serves the configured card when there is none. The `@a2a-js/sdk` 1.3.0 server, given a card rather than a function, serves it only when `context.user?.isAuthenticated` and the public card otherwise (`src/server/request_handler/default_request_handler.ts`).

### Reproduction

Run on 2026-11-14 by `scripts/capture-extended-cards.mjs` in `packages/smoke-transport` of `retz8/a2uiverse`: the request for the extended card of `scripts/serve_extended_card.py`, an `a2a-sdk` 1.3.0 agent whose card asks a key, sent with no credential at all, is answered with a card (`asked with no credential: served`), never refused.

### Fix

Refuse the request when `context.user.is_authenticated` is false, with the binding's refusal for sign-in, unless the agent's modifier says otherwise, as `@a2a-js/sdk` does for a configured card.

A2UIVerse sends the account's credential with every such request and makes no use of a card served to a caller that sent none.

### Prior art

Issue 657 on `a2aproject/a2a-python` (open) asks to pass the call context to the modifier of the unauthenticated card; nothing reports the missing check, searched on 2026-11-14 ("extended agent card", "authenticated extended card authentication", "extended_card_modifier").

## 25. Both servers answer gRPC `FAILED_PRECONDITION` for an operation not supported (a2a-js 1.3.0, a2a-python 1.3.0)

**Component:** `@a2a-js/sdk` 1.3.0, `src/errors/grpc/grpc.ts`: `UnsupportedOperationError` (and `VersionNotSupportedError`) mapped to `GRPC_STATUS_CODE.FAILED_PRECONDITION`. `a2a-sdk` 1.3.0, `src/a2a/server/request_handlers/grpc_handler.py`, `_ERROR_CODE_MAP`: the same.

**Severity:** spec conformance. A client that reads gRPC statuses by section 5.4 of the A2A 1.0 specification takes these answers for a failed precondition.

### Issue

Section 5.4 of the A2A 1.0 specification maps `UnsupportedOperationError` and `VersionNotSupportedError` to `UNIMPLEMENTED`, and `ExtendedAgentCardNotConfiguredError` to `FAILED_PRECONDITION`. Both servers answer `FAILED_PRECONDITION` for all three, so the status alone does not tell an agent that serves no extended card from one that has not configured it.

### Reproduction

Run on 2026-11-14 by `scripts/capture-extended-cards.mjs` in `packages/smoke-transport` of `retz8/a2uiverse`: the request for the extended card of an agent whose card does not say it serves one, over gRPC at A2A 1.0 and 0.3, to the `@a2a-js/sdk` 1.3.0 server and to `a2a-sdk` 1.3.0. Each answered status 9, `FAILED_PRECONDITION`, `@a2a-js/sdk` and `a2a-sdk`'s 1.0 handler with an `ErrorInfo` naming `UNSUPPORTED_OPERATION`, and `a2a-sdk`'s 0.3 layer with the details `UnsupportedOperationError: The agent does not support authenticated extended cards` and no `ErrorInfo`.

### Fix

Map `UnsupportedOperationError` and `VersionNotSupportedError` to `UNIMPLEMENTED`, as section 5.4 has them.

A2UIVerse reads an answer that the agent has no extended card by the `ErrorInfo` reason, the JSON-RPC code, the reason in an HTTP answer's body, or the error's name in a gRPC status's details, and never by the status alone (`noneAnswered` in `packages/smoke-transport/src/extendedCard.ts` in `retz8/a2uiverse`).

### Prior art

Issue 1166 on `a2aproject/a2a-python`, "grpc_handler maps 3 A2A errors to FAILED_PRECONDITION instead of UNIMPLEMENTED", closed on 2026-09-16; its fix, pull request 1167, is open, and 1.3.0 still answers `FAILED_PRECONDITION`. Nothing on `a2aproject/a2a-js` reports it, searched on 2026-11-14 ("FAILED_PRECONDITION", "UNIMPLEMENTED", "grpc status").
