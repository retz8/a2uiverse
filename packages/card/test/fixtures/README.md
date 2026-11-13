# Card fixtures

Agent cards written in A2A 1.0's shape, captured from two real servers on 2026-11-13 by `scripts/capture-fixtures.mjs`: each card fetched over HTTP by this package's own fetch and written as served. None is written by hand. The cards written for A2A 0.3 that the reading is tested against are tracked elsewhere: the platform sdk's four card fixtures and the seven Store recordings.

From the card handler of the `@a2a-js/sdk` 1.3.0 server:

- `javascript-1.0.json`: a card with no sign-in, served to a caller naming A2A 1.0.
- `javascript-1.0-sign-in.json`: the same card with an OAuth scheme. The server serves its in-memory form, so the scheme arrives under `scheme.$case` and the A2A SDK's own reader drops it.
- `javascript-no-version-named.json`: the sign-in card as the server, with its A2A 0.3 layer on, serves it to a caller naming no A2A version: A2A 1.0's interfaces beside 0.3's fields, which the A2A SDK's own reader reads as asking no sign-in.

From Python's `a2a-sdk` 1.3.0, one card told four ways by `scripts/serve_card.py`:

- `python-1.0.json`: one JSON-RPC interface at A2A 1.0.
- `python-1.0-then-0.3.json`: JSON-RPC at A2A 1.0, then at 0.3. The server writes 0.3's fields beside 1.0's.
- `python-1.0-grpc-and-rest.json`: gRPC and HTTP+JSON at A2A 1.0, no JSON-RPC.
- `python-as-0.3.json`: the card in A2A 0.3's shape, by `a2a-sdk`'s own conversion to 0.3, `to_compat_agent_card`.
