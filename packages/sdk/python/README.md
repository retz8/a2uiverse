# a2uiverse-sdk (Python)

The agent-facing projection of the A2UIVerse app contract: the composition extension a vendor agent reads (SPEC §13, §14). The normative definition is [`../contracts/composition.v0.1.json`](../contracts/composition.v0.1.json); `tests/test_composition_contract.py` asserts this projection against it.

Exports: `COMPOSITION_EXTENSION_URI`, `SLOT_ARCHETYPES`, `SlotRequest` (+ `to_metadata`), `read_slot_request`.

The platform-facing half (composition stamp, surface-id namespacing) lives in the TypeScript projection, [`../js`](../js) (npm `@a2uiverse/sdk`).

## Commands

uv-managed; the `package.json` shim wires these into the turbo gate.

```
uv run pytest   # tests (contract test included)
uv build        # sdist + wheel to dist/
```
