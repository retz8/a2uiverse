# TypeScript & Web Progressive Discovery Router

> Copied from a2ui-project/a2ui `.agents/skills/coding-principles/subskills/typescript/INDEX.md` at `7345db7` (2026-11-09). The Closure-compiler and Yarn-tooling entries are left out and the public-API inspection reference points at GitHub; an entry for A2UIVerse's own catalog conventions is added. Refresh by re-copying from upstream.

Use this router whenever a pull request or local change modifies TypeScript, JavaScript, CSS, or HTML files across `typescript/`, `samples/client/{lit,angular,react}/`, or `tools/`.

---

## Evaluate TypeScript & Web Subskill Triggers

Inspect the TypeScript and web files in `git diff main --stat` and read only the subskill documents below whose activation criteria match your changes:

### 1. Component Lifecycle, Reactive Purity & Performance

- **Document**: [`reactive-lifecycle-performance.md`](reactive-lifecycle-performance.md)
- **Activate if**:
  - Reactive state is used: Angular signals (`signal()`, `computed()`, `effect()`, `input()`, `input.required()`, `Signal<T>`), React hooks (`useState`, `useRef`, `useEffect`), or Lit reactive properties.
  - Component lifecycle methods (`connectedCallback`, `ngOnInit`, `componentDidMount`) are modified.
  - Template loops or repetition directives (`repeat`, `@for`, `*ngFor`, `.map()`) are used.

### 2. CSS Theming, Custom Properties & Styling Architecture

- **Document**: [`css-theming-styling.md`](css-theming-styling.md)
- **Activate if**:
  - CSS styles, style blocks, or `--a2ui-*` CSS custom properties are added or edited.
  - Component JSDoc blocks documenting `@cssprop` are touched.
  - Layout dimensions, display modes, or gap properties are modified.

### 3. Accessibility (a11y) & Semantic HTML

- **Document**: [`accessibility-semantics.md`](accessibility-semantics.md)
- **Activate if**:
  - HTML templates or JSX elements are added or modified.
  - Interactive controls (buttons, inputs, dialogs, dropdowns, choice pickers) are touched.
  - Accessibility attributes (`aria-*`, `role`, `tabindex`, `alt`) are added or edited.

### 4. Testing Rigor & DOM Test Environment Isolation

- **Document**: [`testing-isolation.md`](testing-isolation.md)
- **Activate if**:
  - Any unit test (`*.test.ts`, `*.spec.ts`), integration test, mock setup, or test fixture is added or modified.
  - Catalog component implementations are modified (verify adjacent unit tests exist and cover all component primitives).

### 5. TypeScript Public API AST Inspection (`ts-morph`)

- **Document**: [`references/inspecting-typescript-public-api.md`](https://github.com/a2ui-project/a2ui/blob/main/.agents/skills/coding-principles/subskills/typescript/references/inspecting-typescript-public-api.md)
- **Activate if**:
  - Any `index.ts`, `public-api.ts`, `package.json` (`exports`), or `ng-package.json` is modified in `@a2ui/web_core`, `@a2ui/angular`, `@a2ui/lit`, `@a2ui/react`, or `@a2ui/a2ui_agent`.
  - Exported symbols or re-export barrels are added, renamed, or removed and require AST-level verification between base and head.

### 6. A2UIVerse Catalog Conventions

- **Document**: [`a2uiverse-catalog-conventions.md`](a2uiverse-catalog-conventions.md) — A2UIVerse's own, not from upstream.
- **Activate if**:
  - A `catalog.json` description, a catalog component's prop schema, or a catalog's styles are added or modified.
