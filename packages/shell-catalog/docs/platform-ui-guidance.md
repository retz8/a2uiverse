# Platform UI guidance

How to draw UI about A2UIVerse itself out of this catalog: an answer about the platform, painted
in the shell's own voice. Per-component semantics live in the catalog schema's own descriptions.

Register: imperative. A rule the model would already follow earns no place here.

---

## What a platform answer is

A platform answer says **what A2UIVerse is and what is there**: what the platform can do, which
apps are installed and what each can do, what is on this canvas, what was asked in recent turns.

- Write it from what the platform readers returned and from the platform's own card. Nothing
  else: not memory, not a guess about an app you were not shown.
- Say what is there. How to change it — installing, removing, connecting an account — happens on a
  trusted page; the answer may point there (below), never do it.

## The answer is built from these components

- **`Text`** for the shell's own words: a heading, a sentence, a caption. Use `variant` for
  hierarchy (`h3` for the answer's heading, `body` for prose, `caption` for a quiet line).
- **`DataList`** for the facts of one thing — one app, the canvas as it stands. Each child is a
  **`DataListItem`**: a `label` you write beside its one `child`, a `Text` bound to the value.
- **`Table`** for a list of like things with several facts each — the installed apps with their
  skills. `columns` are the headings you write; `children` is a template over the array whose
  component is a **`TableRow`**, and that row's `children` are the cells, one `Text` per column,
  in column order.
- A **`Column`** whose `children` is a template, with a **`Card`** per element, for things too
  unlike each other for one table.
- **`Card`** to hold the whole answer as one surface; **`Divider`** between sections that are
  genuinely different.

## The data model holds literals

- Put a list in the data model as plain values — `{"apps": [{"name": "Gmail", "skills": "…"}]}`
  — and template over it: `{"path": "/apps", "componentId": "app-row"}`, each element's bindings
  relative to it (`{"path": "name"}`, no leading slash).
- **Every value is a literal**: a string, a number, a boolean, an array, an object. Never a
  formula, never a ref.
- A value you only say once may be written straight into `Text`; a value in a list belongs in the
  data model.

## Pointing to a trusted page

Two actions exist, and no other. Each is a **`Button`** whose `child` is a `Text` label and whose
`action` is a `functionCall`:

- **`openStore`** — when the answer leads the user to look for an app. Pass `query` when the user
  named what to look for, in their words.
- **`openAppLibrary`** — when the answer leads the user to manage the apps they have.

```json
{"functionCall": {"call": "openStore", "args": {"query": "flight booking"}}}
{"functionCall": {"call": "openAppLibrary", "args": {}}}
```

Add a button only when the answer leads to that page. An answer that only describes needs none.

## Never paint

- A vendor's data. You are never shown it; do not restate it.
- A Store listing, an app you were not shown as installed, or anything else from the marketplace.
- Controls that install, uninstall, grant consent or connect an account. Those are the trusted
  pages' own.
- An input for a password, a card number or a one-time code.

## Ids and order

- Exactly one component has the id `root`. Put it first, then parents before children.
- Every id a `child`, a `children` array or a template's `componentId` names is declared once.
