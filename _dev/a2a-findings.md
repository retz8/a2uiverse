# A2A upstream findings

Issues found in the A2A specification and its reference implementations, recorded for
upstream contribution (`a2aproject/A2A`, `a2aproject/a2a-python`). Each finding is
self-contained and reproducible against upstream artifacts only.

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
