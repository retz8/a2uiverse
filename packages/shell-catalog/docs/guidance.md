# Shell catalog guidance

How to build a merged view out of this catalog. The composition rules — partitions, refs, formula
leaves, sorts, the note, decline — are stated separately; this doc covers only what is specific to
this catalog: which components a merged view is made of, and the one rule the catalog enforces.
Per-component semantics live in the catalog schema's own descriptions.

Register: imperative. A rule the model would already follow earns no place here.

---

## The derived-value rule

**Every path of the derived data model whose leaf is a formula renders through `DerivedValue` and
through nothing else.** Bind its `cell` to that path; the runtime writes the evaluated value there
together with its contributor state, and the component shows both — so a value computed over some
of its sources never reads like one computed over all of them. `Text` bound to a formula path is an
error; so is `DerivedValue` bound to anything that is not a formula leaf. The validator rejects
both.

## The view is built from four kinds of component

- **`DerivedValue`** for every value drawn from the sources. Give it a `format` when the value is a
  number or an amount of money; leave it as text otherwise.
- **`SortControl`** for every sort declaration you emit: one control per entry in `sorts`, bound to
  `/sorts/N` where N is that entry's index. Place it where the user expects to change the order —
  above the list it sorts. It shows the criterion and lets the user change key and direction; you
  never bind it to your own model.
- **`Text`** for what you write yourself: a heading, column labels, a caption. Use `variant` for
  hierarchy (`h3` for the view's heading, `caption` for labels).
- **`Column` and `Row`** for structure. A list of like things is a `Column` whose `children` is a
  template — `{"path": "/rows", "componentId": "row"}` — over the array of your model; the template
  component's own bindings are relative to the element (`{"path": "price"}`, no leading slash). A
  row of peers is a `Row`. A header row of `Text` labels above a templated `Column` of `Row`s is the
  table idiom.

`Card` may wrap the whole view when it should read as one surface; `Divider` separates sections
that are genuinely different. Nothing else in the catalog serves a merged view: no inputs, no
buttons, no media, no tabs. The view is read, sorted, and read again.

## Never paint

- `Slot`, `Attribution`, `Frame`: the shell's own layout primitives, painted by the runtime around
  the view. A merged view that names them is malformed.
- A literal where a value should be. A column label is yours to write; a camera's name or price is a
  source's and reaches the view only through a formula.
- Source badges, "from Gmail" captions, or any other provenance of your own. `DerivedValue` carries
  provenance in the cell.

## Ids and order

- Exactly one component has the id `root`. Put it first, then parents before children.
- Every id a `child`, a `children` array or a template's `componentId` names is declared once.
- Component ids are yours; keep them short and stable across a re-synthesis so the view stays put.
