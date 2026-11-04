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
