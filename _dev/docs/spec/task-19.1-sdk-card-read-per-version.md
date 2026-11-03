# 19.1 — The sdk's card read per version

The sdk reading a card's A2UI declaration across its v0.9 and v0.9.1 entries, the map by version beside the flat ids, the capabilities helper writing each version's set under its key, and the contract tests over every card shape. Sub-task 19.1 of Phase 19 (`_dev/docs/spec/phase-19-v09-beside-v091.md`, decisions 2, 3, 4, 6 and 9). Parallel with 19.3 and 19.4; before 19.2.

## Scope

- The per-version read of a card: which entries count, how each entry's params are read, the map by version with the fill rule, the union beside it.
- The sdk's exports for the versions the platform speaks, the capabilities helper, and the removal of the single-version constants with their import sites moved.
- The pinned schemas the read validates against.
- The normative contract file and its contract test.
- The fixtures: the ADK finder's real card and the kit's three shapes; the contract tests over every card shape.
- The sdk README and the app-install record's paragraph on reading the card; the sdk's version.
- Out: the hub's per-version advertising and paint check (19.2); the client's inbound filter (19.3); the kit (19.4); SPEC §14's rows and finding 27 (19.7).

## Locked decisions

### 1. The union reader stays; a per-version reader goes beside it

The existing reader keeps its name and its flat result, the union of every counted entry's ids. A second reader returns the map by version. The union reader delegates to the per-version one. The six production callers of the union reader are untouched.

### 2. The map comes out filled

The per-version reader applies phase decision 3's fill rule itself: once any entry counts, both versions are present in the map, a version with no entry of its own carrying the other's set. No consumer fills.

### 3. An entry naming no ids is no entry for the fill rule

An entry under a counted URI whose params are absent or name no catalog ids says nothing about catalogs: for the fill rule its version has no entry of its own and takes the other's set. Only when no counted entry names ids does the card declare nothing.

### 4. The entry's URI decides the version

Inside a counted entry, params flat or keyed under `v0.9` or `v0.9.1` are that entry's set; a key never retargets the version. An object carrying both keys unions their ids into the entry's set, each object validated against the schema's version part. A third version key beside a counted one is passed over, as a URI for another version is. An object keyed with neither of the two keys is an error. A params object is read as the keyed shape whenever any version key is present.

### 5. Two entries under one URI merge

A card carrying the same counted URI twice has that version's set as the union of both entries' ids, each entry validated on its own.

### 6. One malformed entry fails the whole read

A malformed entry fails the read of the whole card, as a malformed declaration does today; nothing of it is read as declared. Every error names the entry it came from by its version.

### 7. One capabilities helper, two input forms

The capabilities helper takes either a single list of ids, written under both version keys, or a map by version, written key by key under each version's own key.

### 8. The versions as data; the single-version constants removed

The sdk exports the versions the platform speaks as data: the ordered version strings, and the map from version to extension URI; the capabilities keys are the version strings. The constant naming the one v0.9.1 extension URI and the constant naming the one `v0.9` capabilities key are removed. Their import sites move onto the data in this sub-task: the marketplace's smoke test, Stellify's transport, the sdk's contract test, and the three test fixtures that build cards from the URI. Stellify's dist is rebuilt and committed. The request header is written from the map by its callers; no header function is added.

### 9. v0.9's schema pinned; one version part validates

v0.9's `server_capabilities.json` is pinned beside v0.9.1's. A test asserts the two schemas' version parts deep-equal. The reader validates every flat or keyed object against one compiled version part.

### 10. The contract file carries the versions and the reading rule

The normative catalog contract carries the versions the platform speaks with their extension URIs and capabilities keys as data, and the card-reading rule as a rule string: which entries count, the pass-over of other versions, flat or keyed under either key with the URI ruling, bare entries and duplicate entries, the fill rule, the union everywhere but the hub's advertising and paint check. The contract test asserts the data against the sdk's exports.

### 11. The fixtures

The kit's three card shapes are hand-written in this sub-task to phase decision 6's letter: a v0.9.1-only app's one entry keyed `v0.9.1`; a v0.9-only app's one flat entry under the v0.9 URI; a both app's two flat entries. The ADK restaurant finder's card is captured live from `../a2ui-upstream/` at its pinned commit, over HTTP, and committed verbatim with the commit noted beside it.

### 12. The shapes the contract tests cover

No extension; a bare entry; another version's URI alone; v0.9 flat; v0.9.1 flat; each counted URI keyed under each of the two keys; a bare entry beside a declaring one; two entries naming one set; two entries naming different sets; the finder's v0.8 entry beside its v0.9 one; two entries under one URI; an object keyed with neither key; malformed ids, the error naming the entry.

### 13. The docs this sub-task updates

The sdk README's quick start and exports table, and the app-install record's paragraph on reading the card's catalogs. 19.7 checks them against the code with the rest of the phase's records.

### 14. The sdk's version

The sdk goes to 0.6.0.
