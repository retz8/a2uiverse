# sdk

The A2UIVerse app contract (SPEC §13): one normative definition, two language projections.

```
contracts/   normative JSON — the arbiter both projections are tested against
js/          @a2uiverse/sdk (npm name) — the platform- and catalog-facing projection
python/      a2uiverse-sdk (PyPI name) — the agent-facing projection
```

## What each projection is for

- **`js/` — the TypeScript projection.** Built against by the platform (orchestrator: stamping relayed events, surface-id namespacing, slot requests; client: reading stamps into the placement map; marketplace: publish gate) and by the **catalog half** of a vendor app. Carries the full contract: extension URI, composition stamp, slot request, namespacing helpers.
- **`python/` — the Python projection.** Built against by the **agent half** of a vendor app — the A2A server process, which is Python. Carries only what an agent reads: the extension URI, the slot archetypes, and `SlotRequest`. The stamp and namespacing are platform-internal and deliberately absent here.

Each projection carries a contract test asserting its constants and field names against `contracts/` — drift between the projections is a red build, not a runtime surprise.

## Consuming

Both projections are consumed as **git dependencies** for now — no registry publishes yet, same channel as `github-catalog`:

- TS: a git-tarball dependency on this repo, `#path:packages/sdk/js`
- Python: `a2uiverse-sdk @ git+https://github.com/retz8/a2uiverse#subdirectory=packages/sdk/python`

In-workspace consumers use `workspace:*`.

Current content: the composition extension (`contracts/composition.v0.1.json`, SPEC §14). The app manifest schema lands with Phase 9.
