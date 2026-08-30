# Task 2.6 — Gmail app

The Gmail vendor app in `../a2uiverse-apps/gmail/`: a three-mode agent on port 11002 against live Gmail MCP, and a `gmail-catalog` package. Parent: `_dev/TODO.md` 2.6, under `_dev/docs/spec/phase-2-layout-composition.md`.

## Scope

- `gmail/agent/` — the three-mode A2A agent (`deterministic` / `llm`+MCP / `llm`+stub), its knowledge docs, examples, fixtures, and beat driver.
- `gmail/gmail-catalog/` — the catalog package: schema, the basic catalog's implementations, and a Provider carrying the Gmail product token theme.
- `gmail/manifest.json`, structurally parallel to `github/manifest.json`.
- The app's four beats, recorded over live Gmail MCP and finalized as tracked fixtures.
- Not in scope: the `dev:agents` launcher, the composed fan-out beat, and the client's catalog-map growth — 2.9, 2.9, and 2.5 respectively.

## Locked decisions

### 1. Agent provenance: fork and rename

`github/agent/` is copied to `gmail/agent/` and renamed. `server.py`, `executor.py`, `catalog.py`, `responder.py`, `recorder.py`, `paint_meta.py`, and `catalog_common/` stay as near-verbatim as renaming allows. Six things are authored fresh: `mcp.py`, `tools.py` with its fixtures, `tool_shaping.py`, `knowledge/`, `prompt.py`'s brand slots, and `deterministic_agent/responses.py` with its fixtures. The literal duplication between the two agents is Phase 3's extraction input, per phase decision 2.

### 2. `gmail-catalog` is the basic catalog plus a product token theme

The package ships no component mapping of its own. Its runtime catalog re-uses the basic catalog's implementations and functions as-is; its Provider scopes Gmail's product tokens to its own wrapper, following `shell-catalog`'s shape and phase decision 4.

The theme writes the base tier — colors, shape, type, spacing — plus a deliberate short list of per-component tokens carrying the Material 3 Expressive signature: pill button radius, the card radius and elevation, textfield radius, and chip radius. Everything else falls through to the library's defaults. The target is that the fragment reads as Gmail, not a full port of Material 3.

### 3. `catalog.json` provenance and drift

`gmail-catalog/catalogs/v0.9.1/catalog.json` is upstream's basic catalog with its four identity fields — `$id`, `catalogId`, `title`, `description` — rewritten, and nothing appended. The catalog's existing parity test is the upstream-drift detector: it asserts the static schema's component set against the runtime catalog built from the pinned `@a2ui/react`, so a basic-catalog change turns the build red. Its failure message is extended to name that cause, in `shell-catalog`'s copy as well.

### 4. Credential: ADC, no token in the environment

The agent obtains its access token through Application Default Credentials, read at startup and refreshed by the credential library. `agent/.env` carries no token — only the project id, sent as the `X-Goog-User-Project` header. The consent flow remains a one-time developer setup outside the agent, which never sees a client secret and never runs a browser flow. A missing or insufficiently-scoped credential fails fast at startup rather than degrading to canned data, matching the GitHub agent's treatment of its missing PAT.

The credential is issued by a Desktop client inside `a2uiverse-506907`, so the `X-Goog-User-Project` header is explicit rather than load-bearing. It carries `gmail.readonly`, `gmail.compose`, and `gmail.modify`. `gmail.modify` is what the toggling tier of decision 5 requires, and it is the coarsest of the three: no narrower scope grants labeling.

### 5. The agent is read-write; writes are compose-in-paint, mutate-on-confirm

A2UIVerse agents are read-write by design. The GitHub agent's layered read-only posture is a GitHub-specific legacy, revisited later; it is not a platform invariant and is not reproduced here.

Writes are authorized in two tiers. A **creating** write — composing a draft — is performed by the model in the painting turn and painted as an editable proposal; the mutation fires only on the user's confirm action from inside the fragment. A **toggling** write — labeling and unlabeling — fires directly on its action, without a confirm step.

The server exposes twenty-three tools, including destructive ones: trashing, spam marking, and sensitive-label application. These are excluded from the agent's tool inventory by a client-side filter; the inventory is the reads plus draft creation, labeling, unlabeling, and label creation. Admitting destructive operations is deferred, and belongs with a real authority surface (M8) rather than with a scope grant.

The exclusion is a **single** layer. Gmail offers no scope granting the toggling tier without also authorizing trashing and spam marking, so the credential permits what the filter withholds — unlike the GitHub agent's two independent layers, this one has no second barrier behind it.

### 6. The AgentCard is authored as the Router's retrieval document

Phase decisions 10 and 11 make the AgentCard the Router's retrieval corpus. Gmail's card is authored accordingly: several skills named by capability in the user's vocabulary, each with a real description and several examples drawn from the beats and their plausible paraphrases. The card describes what the agent can be asked for, not how it is built.

Every card in the phase needs examples in the cross-cutting "what needs my attention" space, or the fan-out utterance reaches only the agent whose own vocabulary it happens to match.

### 7. Data source: the real Workspace mailbox

Gmail MCP requires a business account, so the agent reads the real Workspace mailbox. There is no seeded demo account.

### 8. Pseudonymization at the MCP boundary, record mode only

Mailbox content is generalized at the source, not at the sink: in record mode, every Gmail MCP response passes through a deterministic, length-preserving pseudonymizer on a fixed seed before the model sees it, through the existing `after_tool_callback` seam. No real string enters the model's context, the painted stream, or any artifact. The live, non-recording path is untouched and fully real.

The fixed seed is what lets a re-recorded beat reproduce the same substituted values and so still match its committed snapshot.

### 9. Four beats

`inbox-digest`, `thread-detail`, `reply-compose` (chained onto `thread-detail`), and `label-toggle`. One per kind of surface — list, detail, creating write, toggling write — with both write tiers of decision 5 exercised.

`inbox-digest` answers the phase's fan-out utterance. 2.6 proposes that utterance's wording; 2.9 owns it, since all three agents must answer the same words.

### 10. Two knowledge docs, the brand doc inverted

The GitHub agent's split is kept: an imperative brand doc and a declarative domain doc, neither stating what a given screen should contain.

The brand doc's job inverts. GitHub's chooses among a large component library; Gmail's states which of the eighteen basic primitives plays which Material 3 role, and carries a negative rule against composing extra structure to fake a shape the tokens already provide. It carries GitHub's rule on decomposing markdown into components rather than emitting it as one `Text`. The domain doc carries the fact that a reply body is its top segment, and that the quoted chain and signature below it are not new content.

### 11. Deterministic mode is the composition harness; one corpus feeds three modes

The deterministic agent's purpose changes from the GitHub agent's per-component action round-trip to serving composition: its text-response path answers the fan-out utterance with a canned Gmail digest, and its action map covers only what the beats need. The whole three-agent fan-out demo therefore runs with no LLM calls and no Google MCP quota.

All canned content is derived from the pseudonymized recorded runs, not hand-authored: the pseudonymized MCP payloads become the stub backend's fixtures, and the pseudonymized painted streams become the deterministic agent's fixtures and the tracked beats. Phase decision 1's "derived from real MCP payloads, not invented" holds by construction across all three modes.

### 12. Examples are hand-authored, one per beat

`knowledge/examples/` holds four hand-authored intent-and-message-sequence examples, one per beat, demonstrating the brand doc's rules in practice. They are not promoted from recorded output. Authoring them by hand establishes that the brand doc's rules are expressible in the basic catalog before the model is asked to apply them.

Because the examples exist before any recording, 2.6 has a single recording pass with the examples already in the prompt.

### 13. Beat recording splits by arity

A beat is recorded by the sub-task whose agents exist. 2.6 records its own four beats; 2.9 records only the composed fan-out beat, which needs all three agents. This puts the Workspace MCP unknowns — preview enrollment, OAuth, scopes, quota — inside 2.6 rather than on the phase's integration path.

### 14. Amendments this task requires

- `_dev/TODO.md`: the 2.6, 2.7, and 2.9 lines, for decision 13's split of beat recording.
- Phase 2 acceptance: a new item for a write round-trip completing from inside a fragment and repainting only that fragment; and item 8's two clauses separated, so live-MCP evidence rests on the tunnel verification and determinism rests on the fixtures.
- 2.8 takes the GitHub AgentCard retrofit, so the three cards are comparable retrieval documents.

## Invariants

- No real mailbox content in any tracked artifact.
- The fan-out utterance is a phase-level artifact; no single sub-task finalizes it.
- Duplication with the GitHub agent is intended, not a defect to resolve here.

## Open items

- The fan-out utterance's exact wording, pending 2.9.
