# 21.12 — The shell catalog on v1.0

The shell catalog moved to A2UI v1.0 alone: a new catalog id, its document in v1.0's layout and held to its models, its two faces on the v1.0 entry points of the pinned release, headings read from Markdown, its two guidance documents in v1.0's shapes, and its map for the converter. Sub-task 21.12 of Phase 21 (`_dev/docs/spec/phase-21-v1-0-migration.md`), on the flip branch.

The upstream check (phase decision 17) read `upstream/main` at `36725eee0` of 2026-11-25 and found no event: `@a2ui/web_core` and `@a2ui/react` are at 0.16.1 on npm, `a2ui-core` at 0.7.1 and `a2ui-agent-sdk` at 0.12.1 on PyPI, and upstream pull requests 4171, 4170, 3930 and 4347 are open.

## Scope

- The platform repo's flip branch.
- The catalog id, the catalog document and where it sits in the package.
- The catalog's two faces on `@a2ui/react`, `@a2ui/web_core/v1_0` and `@a2ui/web_core/catalogs/basic/v1`.
- `Text`'s reading of a heading, and the three properties v1's basic catalog adds.
- The two guidance documents, `platform-ui-guidance.md` and `synthesis-guidance.md`.
- The package's tests, its render sweep and its design-check page.
- The shell catalog's map for the converter.
- The package's version, its README and the shell catalog's design record.
- Notes on other sub-tasks' lines in `_dev/TODO.md`.
- Out: the orchestrator's prompts, examples and painter — the orchestrator sub-task 21.13; converting any recording — the client sub-task 21.14; each app catalog's id and document — the catalogs sub-task 21.18; SPEC — the records sub-task 21.22.

## Locked decisions

### 1. The catalog id is the document's repo path, its version segment `v1.0`

The shell catalog's id is `https://github.com/retz8/a2uiverse/blob/main/packages/shell-catalog/catalogs/v1.0/catalog.json`, and its document sits at `catalogs/v1.0/catalog.json` in the package. The nine app catalogs spell their new ids by the same rule in the catalogs sub-task 21.18. The v0.9.1 document is deleted from the flip branch; the converter reads it from git, as task 21.11's decision 12 has it.

### 2. The document is written by hand and held to the models by a shape test

The catalog document stays written by hand, in v1.0's layout, and holds the descriptions the Planner and the Synthesizer read. A shape test holds each entry to its model: its property names at every depth, its required sets, its types and its enum values equal what the release's `Catalog.toJson()` computes from the model, descriptions aside. The eighteen basic entries equal upstream's published v1 entries, `TextField`'s `variant` apart.

### 3. The document follows the `Slot` model

The v1.0 document declares what the `Slot` model accepts and the orchestrator paints: `join.home` a string or null, `join.entity`, and `collapse.failed`, each with a description. The `shell:main` surface of beat 31, which the verdict list (`scripts/recorded-verdicts.json`) holds refused for these three, is accepted on v1.0. It is the one named exception to the verdict parity of task 21.11's decision 9.

### 4. `Text` reads a one-line heading itself

A `Text` whose `variant` is `body` or absent, and whose text is one line of one to five `#`, a space and words, is drawn as the element `main` draws for the matching heading variant: Radix `Heading` at the same size for one to four markers, the merged view's label for five. It is drawn in the first frame, its words plain, with or without a Markdown renderer installed. Every other text goes through the host's Markdown renderer as body text does today.

### 5. A heading inside a longer text is the renderer's, and a caption is literal

A heading inside a longer text is drawn by the host's Markdown renderer, and the scoped sheet gains no heading styles. A `caption` is drawn literally whatever its text starts with.

### 6. The implementations draw v1's three new basic properties

`Video.posterUrl`, `TextField.placeholder` and `Slider.steps` are drawn by the shell's Radix implementations, each with a test and a place in the render sweep.

### 7. The document takes none of v1.0's catalog additions

The document carries no `instructions`. The shell's own functions declare no `requiresUserActivation` and no `allowedCallers`. No component declares `allowedParents` or `allowedChildren`.

### 8. The two guidance documents take six rewrites, one sentence and a test

In `synthesis-guidance.md`: the view's label, written `h5` today, is a `Text` of its own whose text starts with `#####`; an element's binding is written `@path`; a `ChildList` template keeps its plain `path`. In `platform-ui-guidance.md`: the answer's heading, written `h3` today, is a `Text` of its own whose text starts with `###`, and `variant` is left for `caption`; an element's binding is written `@path`, the template unchanged; the four action examples write `@call`, the action object bare. Each heading is one `Text` of its own. Each document gains one sentence saying that a template's `path` is plain where every binding is `@path`. The test on the two documents requires `@call` and `@path` and refuses a `call` key and a heading variant.

### 9. Every tree the package renders is held to v1.0's schema form

The test helper every component test renders through holds each tree to the sdk's schema-form check (task 21.10's decision 10) against the v1.0 document. One test walks the trees of the design-check page the same way. The render sweep and the design-check page carry the five heading levels as `Text` samples written with their markers.

### 10. The shell catalog's map for the converter

The map lands in `packages/converter/maps/` on the flip branch: the old and the new catalog id with each document's path, and `Text` as the component whose `variant` follows the heading rule. It renames no component and no property.

### 11. The package is 0.2.0

`@a2uiverse/shell-catalog` becomes 0.2.0.

### 12. The work lands on the flip branch, its documents with it

21.12 is worked in a worktree off `phase-21/flip`, merged back into it, and the flip branch is pushed, as task 21.10's decision 22 has step 2. The package's README and the shell catalog's design record (`docs/design/shell-catalog.md`) change with the code. SPEC waits for the records sub-task 21.22.

### 13. Notes from 21.12 go on other sub-tasks' lines

1. The orchestrator sub-task 21.13: the new catalog id; each heading one `Text` of its own written with its marker, in the prompts, the examples and the painter's own headings; the document declaring what the painter paints on `Slot`.
2. The client sub-task 21.14: beat 31's exception to verdict parity; the shell's map in place for its eight beats that paint in the shell catalog alone.
3. The catalogs sub-task 21.18: decision 1's rule for a catalog id.
4. The records sub-task 21.22: what SPEC and the design records owe to this sub-task.

### 14. No finding

21.12 records no upstream finding. The shell's own models declare no property that is a union of a component id and another string, so finding 36 changes nothing here.

### 15. What proves it

1. The shell catalog's build, typecheck, tests and lint green on the flip branch, with ESLint and Prettier on what changed.
2. The v1.0 document passing the sdk's catalog gate (task 21.10's decision 14): it declares `protocolVersion: "1.0"`, loads through the release at `1.0`, each component compiles against the pinned v1.0 common types, and it validates against the vendored `catalog_definition.json`.
3. Decision 2's shape test green.
4. A `Slot` painted with `join: {home: null, entity, nouns}` and a `collapse` carrying `failed` passing the sdk's validator against the v1.0 document.
5. For each of the five heading levels, a one-line `Text` with its marker drawing the element, the Radix size and, for five markers, the label's style that `main` draws for the variant, in the first frame and with no renderer installed; a longer text and a `caption` going where decision 5 puts them.
6. A test for each of decision 6's three properties.
7. The converter's dry run with the shell's map over the client's eight recorded beats that paint in the shell catalog alone, nothing written: every surface validates against the v1.0 document and keeps its verdict from the list.
8. A search of the package for `v0.9`, `v0_9` and `v0.9.1` returning only listed exceptions.
9. The design-check page opened through the tunnel beside `main`'s, in light, in dark and with no host theme, and any difference traced.
10. A pixel comparison of the design-check page's `Text` samples and its merged-view example between `main` and the branch, run once and not kept as a suite.

## Invariants

- Nothing the person sees on a shell surface changes.
- The heading levels the two guidance documents ask for are the ones they ask for today.
