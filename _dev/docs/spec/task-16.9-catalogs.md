# 16.9 — The catalogs

The seven catalogs of the apps repo and the scaffolder's two catalog templates brought onto the upstream releases Phase 16 pins, re-packed against the new host-module interface and republished. Sub-task 16.9 of Phase 16 (`_dev/docs/spec/phase-16-upstream-upgrade.md`), `[apps]`, worked on `main` of `a2uiverse-apps`; 16.6 and 16.7 merge to `main` after it (`_dev/docs/spec/task-16.7-client.md`, decision 4).

## Scope

- The five vendor catalogs and the two mock stores' catalogs on `@a2ui/react` and `@a2ui/web_core` `0.14.0` exactly, peers included, through Stellify's ref `91bbe21dd1ee40db673468de875218d6bc80e782`, and what the move changes in each.
- The scaffolder's two catalog templates, the basic and the custom, pinned the same way.
- The themed basic catalogs — Shop A's, Shop B's and the basic template's — on upstream's basic catalog as web_core now ships it.
- The markup and the style rules that `@a2ui/react` 0.14.0's element around every component breaks.
- Each catalog re-packed and republished.
- Out: the registry snapshot's re-point, 16.7's; the agents, unchanged; the e2e suites and the recorded beats, 16.10's; the live acceptance, 16.11's; the READMEs and the design records, 16.12's.

## Locked decisions

### 1. The themed basic catalogs keep their look through tokens alone

Shop A, Shop B and the basic template sit on upstream's basic catalog, whose components style themselves. Each keeps its tokens, on upstream's names where they differ, and its theme sheet goes. Each store's accent is carried through upstream's primary and secondary colours — a default button's text in the accent, its hover a tint of it — so the two stores side by side in a merged view still read as two sources; the basic template carries its accent the same way. Where upstream draws a button or a hover differently from today, upstream's stands.

### 2. The lists draw their own `<li>`

Gmail's, Calendar's and Linear's lists wrap each child they build in an `<li>` of their own. The list items draw a row instead of an `<li>`, and Linear's list group a container holding its own nested list, so a list's markup is a `<ul>` of `<li>` elements, each holding the element its child renders in.

### 3. The look holds; markup is fixed where it changes what the person gets

Every style rule the element around each component breaks is fixed until each catalog looks as it does today: the catalogs' own rules reaching into a child component, and Primer's own rules in GitHub's scoped sheet relating a parent to its children or siblings to each other. Where Primer draws a nesting the element breaks — an item's `<li>` inside its list's `<ul>`, an option inside a select — the nesting stays as Primer and the renderer make it, except where a person loses something by it, such as a select whose options a browser does not list, which is fixed.

### 4. Each catalog takes a minor version

Each of the seven catalog packages moves to its next minor version: GitHub's, CircleCI's, Linear's and the two stores' to 0.2.0, Gmail's and Calendar's from 0.3.0 to 0.4.0. The scaffolder's two templates keep writing 0.1.0.

### 5. What proves it

- The apps repo's `pnpm verify` green, and the scaffolder's template tests.
- Through the tunnel, a side-by-side look check: every app's recorded answers in deterministic mode drawn by today's `main` and by 16.7's branch with 16.9's builds installed by the launcher, compared screen by screen, in light and in dark. Among them: the two stores side by side in a merged view, told apart by their accents; Gmail's, Calendar's and Linear's lists a `<ul>` of `<li>` elements, their dividers and their selection drawn as before; a GitHub select listing its options.

### 6. What it finds is recorded at 16.6's and 16.7's merge

What 16.9 finds about the element around each component — the style rules that see each child alone, the lists drawing their own `<li>`, Primer's nesting kept, and a select a browser does not list if one is found — goes into the findings entry 16.6's done commit first writes, at 16.6's and 16.7's merge. 16.9's own tick on `main` touches no findings.
