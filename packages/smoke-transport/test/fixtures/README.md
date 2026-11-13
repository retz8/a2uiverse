# Wire fixtures

Sixteen wires captured on 2026-11-13 from a scratch agent on Python's `a2a-sdk` 1.3.0, [`scripts/serve_a2ui.py`](../../scripts/serve_a2ui.py), by [`scripts/capture-fixtures.mjs`](../../scripts/capture-fixtures.mjs). Each file is one request the client of `@a2a-js/sdk` 1.3.0 sent, as the platform sends one, and the answer as the agent's server wrote it. None is written by hand. The agent is not built on the agent kit.

A file is named `python-<A2A version>-<what was asked>.json`. The version is the interface the request reached: `1.0` is the agent's A2A 1.0 interface, and `0.3` is the 0.3 layer of `a2a-sdk` on the same agent. Each file holds the card as the agent served it, the request's headers and JSON-RPC body, and the response body as text, with whether the agent closed the stream itself.

What the agent was asked for, once on each A2A version:

1. `one`: two A2UI messages, one per data part, marked `application/a2ui+json` in `metadata.mimeType`.
2. `list`: one data part holding the two messages as a list. On the A2A 1.0 wire the list is bare. On the 0.3 wire the 0.3 layer wraps it as `{value: [...]}` and sets `data_part_compat` in the part's metadata.
3. `media-type`: the two messages marked in `media_type` alone. The mark reaches the A2A 1.0 wire as `mediaType`, and the 0.3 layer drops it.
4. `artifact`: the two messages in an artifact, with no A2UI in any status message.
5. `auth-1.0`: an auth-required request in A2A 1.0's requirement shape. The executor returns, and the server closes the stream.
6. `auth-0.3`: the same request in A2A 0.3's requirement shape.
7. `auth-held`: the request of `auth-1.0` from an executor that does not return. The server holds the stream open, and the capture left it after three seconds of silence.
8. `echo`: a press in the platform's one spelling of an A2UI part, answered with the parts as the executor held them. `mediaType` is on the A2A 1.0 wire and in what the executor held; on the 0.3 wire it is in neither.

`capturedWire` and `capturedFetch`, from `@a2uiverse/smoke-transport/testing/wire`, load a file and replay its answer to the client of `@a2a-js/sdk`. The smoke-transport package's suite and the orchestrator's read these wires through them.
