# Subskill: A2UIVerse Catalog Conventions

A2UIVerse's own conventions for the shell catalog and the vendor catalogs, not from upstream.

## Activation Criteria

- A `catalog.json` description is written or edited.
- A catalog component's prop schema is added or changed.
- A catalog's styles, scoped sheet or theme tokens are touched.

## Principles


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
