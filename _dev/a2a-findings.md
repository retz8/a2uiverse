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
