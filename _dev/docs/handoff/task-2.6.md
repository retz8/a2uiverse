# Handoff — 2.6 Gmail app

## Where it stands

**Complete and green.** The catalog and the agent are built, the credential is verified end to end, and the four beats are recorded over live Gmail MCP with the corpus derived from them. 217 tests pass with nothing skipped. **Nothing is pushed.**

Worktrees, per the parallel-session constraint:

- `a2uiverse` — `.claude/worktrees/phase-2-6-gmail-app` on `phase-2/6-gmail-app`, branched off
  **local** `main` (`origin/main` was missing two doc commits). Carries code *and* `_dev/` docs.
- `a2uiverse-apps` — branch `phase-2/6-gmail-app`, four commits, **unpushed**.

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

## The leak, and why the first fix was in the wrong place

Decision 8 puts pseudonymization at the source so no real string can reach the model, the
stream, or an artifact. The first implementation used ADK's `after_tool_callback` and leaked.

The cause is specific: MCP's `CallToolResult` carries **both** `content` (text parts) and
`structuredContent` (the same payload, already parsed). The callback rewrote only the text
parts, so the model read the structured one — which is why the captured corpus was clean
while the painted stream carried a real address. Thread `1a0353d9bbf7b963` was captured as
`priya.nakamura@example.com` and painted as the real sender.

A wider callback would have been the wrong fix, because it keeps the shape that allows a
second copy. `RecordingMcpToolset` (`llm_agent/recording_toolset.py`) overrides
`McpTool._run_async_impl`, where the result dict is built, so the pseudonymized dict is the
only one that exists downstream. It walks every branch of the result rather than the branches
known in advance, and substitutes addresses in non-JSON prose too. ADK tools are re-wrapped
rather than reimplemented, so auth, filtering, retries and session management stay stock.

The callback keeps its projection notes and no longer substitutes: doing both would
re-substitute already-fake values and leave the corpus and the stream disagreeing about names
that are both fake.

Guards that came out of it, all still in place:

- `tests/test_corpus_is_publishable.py` fails the build on any tracked address outside the
  RFC 2606 reserved domains — checked over the files that would be pushed, rather than trusted
  to the code meant to maintain it. It caught the original leak; a test pins the
  `structuredContent` shape that caused it.
- The contaminated first-run artifacts were purged and that commit **rewritten**, so the leak
  never exists in history.
- `.recordings/` and `*.dump.jsonl` are gitignored in `a2uiverse-apps`; they were not.

## Next

1. **Push `a2uiverse-apps`.** Everything below it is blocked: the client consumes
   `gmail-catalog` as a git dependency, so stage E of the plan — the client catalog map and
   `TABLE` entry, the git dep and `allowBuilds` line, `GMAIL_CATALOG_ID` verification in
   `registry/entries.ts`, the four Gmail specs in `apps/client/scripts/lib/beats.ts`, and the
   `shell-catalog` parity-message change — cannot start until the catalog resolves.
2. **Amend the phase spec.** Task decision 14 lists the amendments 2.6 requires and none are
   applied yet: the Phase 2 acceptance list needs a write-round-trip item, item 8's two
   clauses need separating, and 2.8 needs the GitHub AgentCard retrofit.
3. The `_dev/TODO.md` beat-split lines are already amended; 2.6 stays `[WIP]` until it merges.

## Notes

- A test draft sits in the mailbox from the credential check, subject
  `[a2uiverse 2.6] credential check — safe to delete`. There is no delete tool; remove it in
  Gmail.
- The label counts (inbox/unread totals) are blanked in the derivation. Scale is not content,
  but the stub does not need it — the label set is what carries the mapping.
- Recording mode changes agent behaviour in a way worth knowing: with senders pseudonymized,
  the model cannot filter on real domains and invents plausible ones instead, so a recorded
  beat is not a faithful trace of a live turn.
