# Wire fixtures

Thirty-two wires captured on 2026-11-14 from a scratch agent on Python's `a2a-sdk` 1.3.0, [`scripts/serve_a2ui.py`](../../scripts/serve_a2ui.py), by [`scripts/capture-fixtures.mjs`](../../scripts/capture-fixtures.mjs): sixteen over JSON-RPC and sixteen over HTTP+JSON. Each file is one request the client of `@a2a-js/sdk` 1.3.0 sent through the platform's dial, and the answer as the agent's server wrote it. None is written by hand. The agent is not built on the agent kit. It answers gRPC too, on both A2A versions; a gRPC stream is not replayed here, and the capture script asks it over gRPC and prints what each answer ended on.

A JSON-RPC wire is named `python-<A2A version>-<what was asked>.json`, and an HTTP+JSON one `python-http+json-<A2A version>-<what was asked>.json`. The version is the interface the request reached: `1.0` is the agent's A2A 1.0 interface, and `0.3` is the 0.3 layer of `a2a-sdk` on the same agent. Each file holds the binding and the A2A version, the card as the agent served it with that interface first, the request's URL, headers and body, and the response body as text, with whether the agent closed the stream itself.

What the agent was asked for, once on each A2A version and binding:

1. `one`: two A2UI messages, one per data part, marked `application/a2ui+json` in `metadata.mimeType`.
2. `list`: one data part holding the two messages as a list. On the A2A 1.0 wire the list is bare. On the 0.3 wire the 0.3 layer wraps it as `{value: [...]}` and sets `data_part_compat` in the part's metadata, which the client of `@a2a-js/sdk` drops over HTTP+JSON, so it hands on the wrapped object, which the platform's reading takes as the list.
3. `media-type`: the two messages marked in `media_type` alone. The mark reaches the A2A 1.0 wire as `mediaType`, and the 0.3 layer drops it.
4. `artifact`: the two messages in an artifact, with no A2UI in any status message.
5. `auth-1.0`: an auth-required request in A2A 1.0's requirement shape. The executor returns, and the server closes the stream.
6. `auth-0.3`: the same request in A2A 0.3's requirement shape.
7. `auth-held`: the request of `auth-1.0` from an executor that does not return. The server holds the stream open, and the capture left it after three seconds of silence.
8. `echo`: a press in the platform's one spelling of an A2UI part, answered with the parts as the executor held them. `mediaType` is on the A2A 1.0 wire and in what the executor held; on the 0.3 wire it is in neither. Over HTTP+JSON at A2A 0.3 the client writes no `metadata` either, so the mark in `metadata.mimeType` is not held.

`capturedWire` and `capturedFetch`, from `@a2uiverse/smoke-transport/testing/wire`, load a file and replay its answer to the client of `@a2a-js/sdk`. The smoke-transport package's suite and the orchestrator's read these wires through them.

## Extended cards

Fourteen extended cards captured on 2026-11-14 by [`scripts/capture-extended-cards.mjs`](../../scripts/capture-extended-cards.mjs), each asked for through the platform's dial with Alice's key and written as served: on JSON-RPC the result, on HTTP+JSON the body, on gRPC at A2A 1.0 the JSON form of the message. On gRPC at A2A 0.3 the A2A SDK hands back only its own reading of the message, so a file named `-read` holds that reading, in A2A 1.0's JSON. None is written by hand.

From the server of `@a2a-js/sdk` 1.3.0, as the fake A2A 1.0 agent runs it, and from a scratch agent on Python's `a2a-sdk` 1.3.0, [`scripts/serve_extended_card.py`](../../scripts/serve_extended_card.py), one file for each of the six paths, named `extended-<javascript|python>-<binding>-<A2A version>.json`. Alice's card is the public card with a skill more, `lanterns`. Over A2A 0.3 on HTTP+JSON the two servers write it differently: `@a2a-js/sdk` in the JSON form of A2A 0.3's protobuf, its key scheme under `apiKeySecurityScheme` and a skill with no tags written with none, which the card's one reading does not take; `a2a-sdk` in A2A 0.3's JSON-schema form, which it does.

From a scratch agent on Python's `a2a-sdk` 0.3.26, [`scripts/serve_extended_card_v0_3.py`](../../scripts/serve_extended_card_v0_3.py): `extended-python-0.3.26-jsonrpc-0.3.json`, the extended card, and `extended-python-0.3.26-grpc-0.3-read.json`, what its gRPC answers to the same request, the public card.
