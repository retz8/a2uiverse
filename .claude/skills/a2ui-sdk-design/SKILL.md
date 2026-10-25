---
name: a2ui-sdk-design
description: Provides guidelines and design principles for implementing, expanding, or modifying A2UI client libraries, catalogs (schema + implementation), renderers, and backend integrations across different protocol versions.
---

# A2UI SDK & Catalog Design Skill

This skill provides architectural guidance for developing or modifying A2UI catalogs, renderers, state layers, and communication infrastructure across all protocol versions.

## Vocabulary

- **Catalog** — the package pairing a `catalog.json` with its framework implementation; named `<vendor>-catalog` (the shell's own is `shell-catalog`).
- **Catalog schema** — the `catalog.json`. **Catalog implementation** — the framework code (React components) that renders it. Upstream's terms.
- **Adapter** — upstream's word for the framework layer only (`@a2ui/react` is the React adapter). Never used for a catalog package here.

## Specifications Navigation

This project is a downstream consumer of the A2UI protocol; it does not vendor the spec. The authoritative specification lives in the sibling fork at `../A2UI`, which tracks `a2ui-project/a2ui` via its `upstream` remote.

**Read the spec from the `upstream/main` ref, not the working tree.** The sibling fork is usually checked out on a feature branch with local changes, so the on-disk files can be stale or diverged. The `upstream/main` ref is the canonical, freshly-fetched source.

- **Refresh first:** Include the phrase **"sync spec"** in your prompt to trigger the `UserPromptSubmit` hook, which runs a non-destructive `git fetch upstream` to update the `upstream/main` ref before you rely on it.
- **List a tree:** `git -C ../A2UI ls-tree -r --name-only upstream/main specification/`
- **Read a file in full:** `git -C ../A2UI show upstream/main:specification/v0_9_1/json/server_to_client.json`
- **Search across the spec:** `git -C ../A2UI grep <pattern> upstream/main -- specification/`
- **Authority Rule:** Default to version **v0.9.1** as the primary authority when working on a catalog, a renderer, or SDK integrations, unless the user specifies otherwise.

### Critical Sources of Truth

For the targeted version, analyze these core files to inform your design, typically reading each file _in full_:

1. **JSON Schemas (`json/*.json`)**: Absolute authority for message format compliance. Check `server_to_client.json` for stream envelopes, `client_to_server.json` for action events, and `common_types.json` for dynamic binding primitives and other schema `$defs`.
2. **Component & Function Catalogs (`catalogs/<catalog-name>/catalog.json`)**: Authoritative definitions of supported visual components and registered evaluation/validation functions. Use the basic catalog as the structural reference when authoring a catalog.
3. **Protocol Semantics (`docs/a2ui_protocol.md`)**: Semantic foundation covering message stream structures, pointer scopes, and two-way binding agreements.
4. **SDK architecture (`docs/sdks_spec.md`)**: The unified SDK architecture — the core SDK (surface state, message processing, validation), the inference SDK, and the framework adapters — and what each library is responsible for. The reference for how the client and the catalogs sit on upstream's core and its React adapter.
5. **Basic catalog implementation (`docs/basic_catalog_implementation_guide.md`)**: How each basic catalog component renders and behaves. Read beside the basic catalog's `catalog.json` when a catalog builds on it or mirrors one of its components.
6. **Custom functions (`docs/a2ui_custom_functions.md`)**: How a catalog defines its own functions, makes them available, and how they are validated.
7. **Conformance suite (`test/`)**: The test cases the version's schemas are validated against; the sdk's validator is measured against them.

## Catalog Authoring Conventions

### Descriptions target the agent, not the renderer

`catalog.json` `description` fields are read by the **generating agent** (the LLM that emits A2UI) to choose components and set props. Describe **semantics** — what the component does and what each prop controls — and **never name the implementing design system or renderer library** in a description. Write "Font size.", not "Primer font size."; "Displays a run of text.", not "Primer Text." The rendering library is a client-side implementation detail the agent has no use for, and naming it risks leaking the brand into user-facing copy or implying knowledge the agent doesn't need.

This governs the description prose only. The **prop surface and enum values stay a faithful 1:1 of the design-system component's real API** — that fidelity is the contract; the de-branding applies purely to the agent/human-facing text.

### Bound runtime state uses `Dynamic*`; fixed configuration stays plain

A value/scalar prop's type is decided by whether data or interaction drives it at render time:

- **Bound runtime state** — composes the matching `CommonSchemas.Dynamic*` wrapper (`literal | {path} | {call}`) so an agent can data-bind it. A `disabled` tracking form validity, a `loading` tracking an async op, a displayed `value`/`label`/`count`.
- **Fixed authoring-time configuration** — set once, never data-driven — stays a plain `z.boolean()`/`z.string()`/`z.number()`. A layout `block`/`labelWrap`, a `validationRegexp`, a `min`/`max`.

Enums are always plain `z.enum` — there is no `DynamicEnum` common type.

The basic catalog is the reference for the split: `CheckBox.value` / `TextField.value` / `Slider.value` / `label` are `Dynamic*`; `Slider.min` / `Slider.max` / `TextField.validationRegexp` are plain.

### A themed basic catalog's look goes through upstream's tokens

A catalog built on upstream's basic catalog carries its look through the basic catalog's `--a2ui-*` tokens. A scoped sheet under the catalog's scope class holds only what no token reaches.

### No style rule spans two components

Upstream's React adapter hosts every component in an element of its own, styled `display: contents`. A rule relating a parent to its children (`>`) or siblings to each other (`+`, `:first-child`, `:nth-child`) misses, and markup that ties a parent to its child — a `<ul>` and its `<li>`, a `<tbody>` and its `<tr>` — cannot span two components. A component styles its own element, and a parent that needs such markup draws the wrapping element around each child itself.
