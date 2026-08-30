# Handoff — 2.6 Gmail app

## Where it stands

**Code complete, corpus blocked.** The catalog and the agent are built, the credential is
verified end to end, and a live run against real Gmail MCP produced all four beats. The
artifacts from that run are **withheld**: a scan found a real address in them.

Worktrees, per the parallel-session constraint:

- `a2uiverse` — `.claude/worktrees/phase-2-6-gmail-app` on `phase-2/6-gmail-app`, branched off
  **local** `main` (`origin/main` was missing two doc commits). Carries code *and* `_dev/` docs.
- `a2uiverse-apps` — branch `phase-2/6-gmail-app`, two commits, **unpushed**.

## Landed

**`gmail/gmail-catalog`** (`0b96834`) — upstream's basic catalog, four identity fields
rewritten, nothing appended; `basicCatalog` reused verbatim; a Provider writing 26 Material 3
tokens on its own wrapper, light and dark. 9 tests.

**`gmail/agent`** (`142b9d2`) — forked from `github/agent`, port 11002. Read-write with the
eleven destructive tools withheld by `tool_filter`. ADC credential, no token in `.env`. Four
hand-authored examples, both knowledge docs, the AgentCard as a retrieval document. 187 tests
pass, 25 skip on the missing corpus.

Two fork bugs the basic catalog exposed, both fixed and both silent failures rather than loud
ones:

- `_strip_framework_ids` — Primer does not model `id`, so the GitHub agent strips it before
  schema conformance. `ComponentCommon` **requires** it, so stripping failed every component
  of every surface, including upstream's own example.
- `_component_prop_schemas` read a flat `properties` map. The basic catalog composes through
  `allOf`, so the enum/literal pre-pass found nothing and was dead code — the model would have
  got the raw schema error instead of the message naming the valid move.

## The blocker

Decision 8 places pseudonymization at the source, in the `after_tool_callback`, so that no
real string can reach the model, the stream, or an artifact. The live run disproved the seam,
not the decision:

- All eight tool calls were captured, and every captured payload was clean
  (`sara.moreau@example.com`, length-matched filler subjects).
- The **painted stream carried a real sender** — thread `1a0353d9bbf7b963` was captured as
  `priya.nakamura@example.com` and painted as the real address.

So the substitution ran on a copy the model never read. ADK's contract is right — a returned
dict does replace the response — so the fault is narrower: some response shapes do not reach
the callback intact (one capture is a degenerate `{}`, which points at a part shape the
callback does not handle). **The mechanism is not fully pinned.**

What was done about it:

- The contaminated beats and deterministic fixtures were purged, and the agent commit was
  **rewritten** so the leak never exists in history. Verified absent from all branch history.
- `tests/test_corpus_is_publishable.py` fails the build on any tracked address outside the
  RFC 2606 reserved domains — checked over the files that would be pushed, rather than trusted
  to the code meant to maintain it. Verified to catch the exact address that got through.
- `.recordings/` and `*.dump.jsonl` are now gitignored in `a2uiverse-apps`; they were not.

The stub fixtures (`llm_agent/fixtures/`) are derived from the captured payloads and **are**
clean, so they are tracked.

## Next

1. **Move the substitution seam below the callback** — wrap the toolset so every response is
   pseudonymized before it can be returned at all, rather than intercepted after. Then re-run
   the four beats and re-derive the corpus.
2. `pnpm verify` is green in `a2uiverse-apps` and `uv run pytest` passes; **nothing is pushed**.
   The client's git dependency on `gmail-catalog` needs a push, so stage E of the plan
   (client catalog map, registry verification, beat fixtures in `apps/client/recordings/`) has
   not started.
3. Decision 11's derivation script is not committed — it lives in the session scratchpad. It
   should land in `agent/scripts/` when the corpus is re-recorded.

## Notes

- A test draft sits in the mailbox from the credential check, subject
  `[a2uiverse 2.6] credential check — safe to delete`. There is no delete tool; remove it in
  Gmail.
- The derived `list-labels` fixture carries real mailbox counts (inbox thread and unread
  totals). Aggregate, not content, but it would be published — worth a decision before the
  corpus is re-recorded.
- Recording mode changes agent behaviour in a way worth knowing: with senders pseudonymized,
  the model cannot filter on real domains and invents plausible ones instead, so a recorded
  beat is not a faithful trace of a live turn.
