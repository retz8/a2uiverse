# 20.10 — The hand-written A2A 1.0 agent: plan

The plan for the [20.10 task spec](../spec/task-20.10-the-hand-written-a2a-1-0-agent.md). The code lands on `main` of `a2uiverse-apps`, with no worktree. The documents land on `main` of `a2uiverse`.

## The open items, settled

1. **Stellify.** It is run from a catalog package of `a2uiverse-apps`, which each hold it at the one pin. Shop C's README runs it from Shop B's catalog folder with `--out` naming a file in Shop C's folder. Shop C depends on no part of the platform and holds no pin of its own.
2. **The authorization server.** It is written by hand on Go's standard library: `net/http`, `crypto/ecdsa`, `crypto/rand`. No OAuth library is used. Shop C is one Go module in `mocks/shop-c/agent/`. `main.go` holds the launch options, the servers and the `token` command, and these packages sit under `internal/`:
   1. `stock`: the dataset's listing, trade prices and policy.
   2. `paint`: the A2UI messages Shop C writes and the press it reads.
   3. `members`: the two members.
   4. `signin`: the authorization server, Shop C's sign-in page and what it keeps.
   5. `cards`: the public card, each member's card and signing.
   6. `keys`: the two P-256 keys in the state directory and the key set.
   7. `agent`: the three bindings, the credential check and the answers.
3. **The words.**
   1. The card describes "Halide Supply, a members' warehouse for working photographers". Signing in shows its stock and the member's prices.
   2. Its sign-in scope `stock` reads "See Halide Supply's stock and your member prices".
   3. Shop C's sign-in page names the client by the `client_name` it registered with, and says nothing of A2UIVerse.
4. **The data.**
   1. Shop C lists all five cameras, with prices and ratings of its own and a trade price for each.
   2. Its policy: members' orders ship insured within one working day, trade accounts may collect from the warehouse, and unused stock may be returned within thirty days.
   3. The trade member is Mara Okafor of Okafor Studio, `mara@okafor-studio.example`. The ordinary member is Theo Lindqvist, `theo.lindqvist@example.com`.
5. **Lifetimes.** A device code lives 10 minutes and is asked at most every 5 seconds. An access token lives 1 hour and an ID token 1 hour. A refresh token lives 30 days and is not rotated.
6. **The A2UI schemas in tests.**
   1. `server_to_client.json`, `server_to_client_list.json`, `client_to_server.json` and `common_types.json` of v0.9.1, and the basic catalog of v0.9.1, are copied from `upstream/main` of the A2UI fork at `3ed96018` into the tests' `testdata`. The commit is named in the test file.
   2. The tests validate with `github.com/santhosh-tekuri/jsonschema/v6`. Only test files import it.
7. **The ordinary member asking for trade prices.** The listing is painted with its ordinary prices, under the line "Trade prices are shown to trade accounts."
8. **The findings.** The next number in `_dev/a2a-findings.md` is 26.

## Found before the steps

These were read from a2a-go v2.8.0's source.

1. a2a-go's own call interceptor refuses a call with no credential as `a2a.ErrUnauthenticated`. On JSON-RPC it answers HTTP 200 with the error code -31401.
   1. A2A 1.0 names no JSON-RPC code for an authentication error. Section 3.3.2 gives "HTTP `401 Unauthorized`, gRPC `UNAUTHENTICATED`, JSON-RPC custom error" as examples, and section 5.4 maps A2A's errors to -32001 through -32009.
   2. Decision 8 of the 20.5 task spec reads HTTP 401 on JSON-RPC as the sign-in signal.
   3. Shop C therefore refuses at the HTTP layer on both HTTP bindings: HTTP 401 with a `WWW-Authenticate: Bearer` challenge, as RFC 6750 has it. On gRPC it refuses with `UNAUTHENTICATED` from a call interceptor.
   4. -31401 is recorded as a finding.
2. a2a-go's ready-made signed-card producer signs `json.Marshal` of the card, under a protected header holding `alg`, `kid`, `typ` "JOSE" and `jku`. The platform's check takes any non-empty `typ`.
3. The executor is handed the caller as `ExecutorContext.User`, set by a call interceptor on every binding.
4. The vault asks for `openid` only when the server's metadata lists it in `scopes_supported`. It checks an ID token's signature against the metadata's `jwks_uri`, and its issuer, audience and expiry.
5. The vault registers with `redirect_uris` and `response_types: ["code"]` even when it signs in by device code alone. Shop C's registration endpoint takes both and uses neither.

## Found while building

1. Shop C's public card and each member's card, signed by a2a-go's signer over the cards as Shop C writes them, pass the card package's `fetchLiveCard` and `checkSignatures` (run). Every field the cards write is set and none is empty. The canonical forms of the two SDKs part on an empty field, and section 8.4.1 of A2A 1.0 backs a2a-go's form for an empty required field: finding 28, the platform question of decision 17.
2. a2a-go writes an OAuth flow as JSON only by value and converts it for gRPC only by pointer (run): finding 27. Shop C's gRPC binding is handed each member's card with the flow by pointer.
3. A data part's `data` on gRPC must be plain JSON, maps and lists of `any`, as a protobuf value takes it. Shop C writes its part's data through a JSON round trip.

## Steps

1. **The store.** The dataset's `shop-c` entry; `stock`, `paint` and `members`. The answers are built by code: a question, the policy, trade prices, and the three presses.
2. **The authorization server.**
   1. Metadata, registration, the device grant, the token endpoint with refresh, revocation and the ID token.
   2. Shop C's sign-in page and `login_hint`.
   3. The state directory: the two keys, the registered clients and the tokens.
3. **The cards.** The public card and each member's card, signed by a2a-go's signer; the key set.
4. **The bindings.** gRPC, HTTP+JSON and JSON-RPC, in that order on the card. One request handler; the credential check on every call; the extended card for a signed-in member.
5. **The `token` command.**
6. **The tests.** Over real sockets on each binding with a2a-go's client. The authorization server. The A2UI messages against the schemas.
7. **The facts checked by running.**
   1. The signed cards through the card package's `fetchLiveCard`.
   2. `stellify preview` as the trade member, with each binding first.
   3. `stellify publish` with no artifact folder.
8. **The gates.**
   1. `gofmt`, `go vet` and `go test` for Shop C, and a job in the repository's CircleCI configuration that runs them.
   2. `pnpm verify` in `a2uiverse-apps`.
9. **The live sitting** of decision 21, item 6, through the tunnel.
10. **The documents** of decision 22.
