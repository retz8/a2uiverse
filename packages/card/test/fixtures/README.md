# Card fixtures

Agent cards written in A2A 1.0's shape, captured from two real servers on 2026-11-13 by `scripts/capture-fixtures.mjs`: each card fetched over HTTP by this package's own fetch and written as served. None is written by hand. The cards written for A2A 0.3 that the reading is tested against are tracked elsewhere: the platform sdk's four card fixtures and the seven Store recordings.

From the card handler of the `@a2a-js/sdk` 1.3.0 server:

- `javascript-1.0.json`: a card with no sign-in, served to a caller naming A2A 1.0.
- `javascript-1.0-sign-in.json`: the same card with an OAuth scheme. The server serves its in-memory form, so the scheme arrives under `scheme.$case` and the A2A SDK's own reader drops it.
- `javascript-no-version-named.json`: the sign-in card as the server, with its A2A 0.3 layer on, serves it to a caller naming no A2A version: A2A 1.0's interfaces beside 0.3's fields, which the A2A SDK's own reader reads as asking no sign-in.

From Python's `a2a-sdk` 1.3.0, one card told five ways by `scripts/serve_card.py`:

- `python-1.0.json`: one JSON-RPC interface at A2A 1.0.
- `python-1.0-then-0.3.json`: JSON-RPC at A2A 1.0, then at 0.3. The server writes 0.3's fields beside 1.0's.
- `python-1.0-grpc-and-rest.json`: gRPC and HTTP+JSON at A2A 1.0, no JSON-RPC.
- `python-1.0-custom-binding.json`: one interface on a binding of the agent's own, `ACME-RPC` at A2A 1.0, which the platform does not speak. Captured on 2026-11-14.
- `python-as-0.3.json`: the card in A2A 0.3's shape, by `a2a-sdk`'s own conversion to 0.3, `to_compat_agent_card`.

Signed cards, captured on 2026-11-14 by the same script, each fetched as served and not checked. From Python's `a2a-sdk` 1.3.0 signer, `create_agent_card_signer`, by `scripts/serve_signed_card.py`: the `python-1.0.json` card signed eleven ways, served at `http://127.0.0.1:18731/<variant>/agent-card.json`, the key set they name at `http://127.0.0.1:18731/.well-known/jwks.json`:

- `python-1.0-signed-key-set.json`: the key set, holding `es-1` (ES256), `rs-1` (RS256) and `ed-1` (EdDSA).
- `python-1.0-signed-es256.json`, `-rs256.json`, `-eddsa.json`: one signature by each key.
- `python-1.0-signed-rotated.json`: a signature by `es-0`, a key not in the key set, then one by `es-1`.
- `python-1.0-signed-typ-jwt.json`: `typ` "JWT".
- `python-1.0-signed-no-typ.json`, `-no-jku.json`: a protected header naming no `typ`, and no `jku`.
- `python-1.0-signed-unprotected.json`: `kid` and `jku` in the unprotected header alone.
- `python-1.0-signed-other-origin.json`: a `jku` on port 18732.
- `python-1.0-signed-hs256.json`: signed with a shared secret, HS256.
- `python-1.0-signed-as-0.3.json`: the `python-1.0-then-0.3.json` card signed by `es-1`, then put in A2A 0.3's shape by `to_compat_agent_card`, the signature carried.

From Python's `a2a-sdk` 0.3.26 signer, by `scripts/serve_signed_card_v0_3.py`:

- `python-0.3-signed.json`: a card written for A2A 0.3, signed by `es-1`.
- `python-0.3-signed-key-set.json`: the key set it names.
