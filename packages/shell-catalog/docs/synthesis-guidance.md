# Shell catalog guidance

How to build a merged view out of this catalog. The composition rules — partitions, refs, formula
leaves, sorts, the note, decline — are stated separately; this doc covers only what is specific to
this catalog: which components a merged view is made of, and the one rule the catalog enforces.
Per-component semantics live in the catalog schema's own descriptions.

Register: imperative. A rule the model would already follow earns no place here.

---

## The derived-value rule

**Every path of the derived data model whose leaf is a formula, outside `match`, renders through
`DerivedValue` and through nothing else.** Bind its `cell` to that path; the runtime writes the
evaluated value there together with its contributor state, and the component shows both — so a
value computed over some of its sources never reads like one computed over all of them. `Text` bound to a formula path is an
error; so is `DerivedValue` bound to anything that is not a formula leaf. The validator rejects
both.

## The view is built from these components

- **`DerivedValue`** for every value drawn from the sources. Give it a `format` when the value is a
  number, an amount of money, or a date-and-time — `datetime` renders every source's time in one
  form, whatever each painted; leave it as text otherwise. A `prefix` on the format is written
  before the value: a number with `"prefix": "#"` reads `#8`. Which source an entry
  came from is a value too: a `DerivedValue` over the `source` operator, never a label of yours.
- **`danger`** on a `DerivedValue` names the values of that column a reader must act on — a failure,
  an error, a rejection — in the words the source uses: `"danger": ["Failed"]`. The
  runtime draws a matching value in the danger tone and leaves every other value plain. Name only
  what asks for action; a value that is merely not yet done is not a danger. The list is never
  shown, so it is not a copied value.
- **`Table`** for a list of like entries with several values each — the merged list. `columns` are
  the headings you write; `children` is a template over the array of your model whose component is
  a **`TableRow`**, and that row's `children` are the cells, one `DerivedValue` per column, in
  column order. The columns align by construction. Do not build a list as a heading `Row` over a
  `Column` of `Row`s: a `Row` sizes its children by content and the columns never line up.
  `columnSources` names, per column, the one source whose values it shows, or null for a value
  computed across sources; start from the plan's. Keep the column for a source that brought no
  data — it failed, or has not answered — and write the empty cell in it, a `Text` dash `—`, one
  cell per column as always: the runtime draws that column reserved from the source's state, and a
  later synthesis fills it in place.
- **`DataList`** for the labelled values of one thing — an entry's fields, a summary, a detail.
  Each child is a **`DataListItem`**: a `label` you write beside its one `child`, a `DerivedValue`
  when the value comes from a source. `orientation` stacks label over value when the values are
  long.
- **`SortControl`** for every sort declaration you emit: one control per entry in `sorts`, bound to
  `/sorts/N` where N is that entry's index. Place it where the user expects to change the order —
  above the table it sorts. It shows the criterion and lets the user change key and direction; you
  never bind it to your own model.
- **`Text`** for what you write yourself: the view's label, a caption. The user's question already
  heads the screen, so the view's title is a label, not a heading: `h5`, on one `Row` with the
  view's `SortControl` — `{"component": "Row", "justify": "spaceBetween", "align": "center"}` —
  over the table. A second group carries an `h5` label of its own.
- **`Column` and `Row`** for structure around those: the label row over the table; a second group
  under the first. A `Column` whose `children` is a template —
  `{"path": "/rows", "componentId": "row"}` — templates any component over an array of your model,
  each element's bindings relative to it (`{"path": "price"}`, no leading slash); a `Card` per
  element is the shape for entries too unlike each other for one table.

`Card` may wrap the whole view when it should read as one surface; `Divider` separates sections
that are genuinely different. The view is read, sorted, and read again.

## The join

When the entries an object brings together from different apps are, in your judgment, one thing —
the same product, the same event, the same person — write the evidence under the object's
`match` key. Nothing requires one; write it where you judge a join.

- Each key names what matched, the way the user would say it: `"same reference number"`,
  `"title in the subject"`. The name is shown beside the values.
- Each value is a relation over two refs in two different apps. Use `equal` or `contains` whenever a
  fact links the two — an identifier, a reference number, a title quoted in a subject. Use `judged` only when
  nothing but understanding does.
- Relations compare word by word: case and punctuation do not count, so `spring-sale` equals
  `Spring sale`. Numbers and date-and-times compare by value, whatever their spelling. `contains` reads
  "the second is inside the first": words inside a text, or a value among a list's members.
- Write every fact that links two apps, not only the first you find: a value tied in by more than
  one fact stays confirmed when one of them changes.
- The join shows on the values themselves — every `DerivedValue` of the object discloses it. There
  is nothing to place for it, and the tree binds no path under `match`.

## Never paint

- A literal where a value should be. A column label is yours to write; a product's name or price is a
  source's and reaches the view only through a formula.
- Source badges, "from Gmail" captions, or any other provenance of your own. `DerivedValue` carries
  provenance in the cell.

## Ids and order

- Exactly one component has the id `root`. Put it first, then parents before children.
- Every id a `child`, a `children` array or a template's `componentId` names is declared once.
- Component ids are yours; keep them short and stable across a re-synthesis so the view stays put.
