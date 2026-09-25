# Task 9.11 — README sweep: plan

Every README in `a2uiverse` and `a2uiverse-apps`, drafted from what Phase 9 left, pushed to `main` on its repo and reviewed on GitHub. READMEs are for human developers: easy to read, easy to understand, concise; details are for documents. GIFs or images may be added to demonstrate the features.

An app's, agent's or catalog's README does not open on A2UIVerse; it ends in a small section on how to connect it to A2UIVerse. No em dashes in any README.

## Order

Specific first, the roots last.

### `a2uiverse-apps`

1. Batch — each vendor app, its README (new), agent, then catalog:
   - `github/README.md` · `github/agent/README.md` · `github/github-catalog/README.md`
   - `gmail/README.md` · `gmail/agent/README.md` · `gmail/gmail-catalog/README.md`
   - `calendar/README.md` · `calendar/agent/README.md` · `calendar/calendar-catalog/README.md`
   - `circleci/README.md` · `circleci/agent/README.md` · `circleci/circleci-catalog/README.md`
   - `linear/README.md` · `linear/agent/README.md` · `linear/linear-catalog/README.md`
2. Batch — the mocks, the same way:
   - `mocks/shop-a/README.md` (new) · `mocks/shop-a/agent/README.md` · `mocks/shop-a/shop-a-catalog/README.md`
   - `mocks/shop-b/README.md` (new) · `mocks/shop-b/agent/README.md` · `mocks/shop-b/shop-b-catalog/README.md`
3. The scaffold templates, one stop: `create-a2ui-agent/templates/agent/README.md` · `templates/catalog/basic/README.md` · `templates/catalog/custom/README.md` · `templates/catalog/custom/src/functions/README.md`
4. `create-a2ui-agent/README.md`
5. `agent-kit/README.md` — new; the kit has none.

### `a2uiverse`

6. `apps/marketplace/README.md`
7. `packages/sdk/js/README.md`
8. `packages/sdk/README.md`
9. `packages/shell-catalog/README.md`
10. `apps/orchestrator/README.md`
11. `apps/client/src/canvas/README.md`
12. `apps/client/README.md`

### Roots

13. `a2uiverse-apps/README.md` — carries `paintMeta`, the one thing an agent needs to be rendered on the canvas.
14. `a2uiverse/README.md`

### Design records

The five in `docs/design/`, rewritten as a really friendly guide for a junior frontend engineer: the new concepts explained clearly, diagrams where they help, and the engineering decisions, algorithms, data structures and engineering structures behind them.

15. `docs/design/synthesis.md` first; its review settles how a design record is written.
16. `client.md`, `orchestrator.md`, `shell-catalog.md`, `agent-kit.md`, the same way.
