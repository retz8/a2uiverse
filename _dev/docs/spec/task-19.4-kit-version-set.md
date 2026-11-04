# 19.4 — The agent kit's per-app version set

The agent kit's per-app setting naming the A2UI versions the app speaks, and what it drives — the card's entries and params shape, the stamp at send, the actions accepted, the per-request choice through a2ui-a2a's activation helper — with the scaffolder's default of both written out, tests over the three sets, and the kit's README and design record. Sub-task 19.4 of Phase 19 (`_dev/docs/spec/phase-19-v09-beside-v091.md`, decisions 6, 8, 9 and 10). An `[apps]` sub-task: the code lands on `../a2uiverse-apps/` `main`; the design record is this repo's. Parallel with 19.1–19.3; before 19.5.

## Scope

- The setting: its shape, what the kit accepts in it, and its default.
- The per-request choice of a version, for every app, and what goes back on the wire with it.
- The card's entries for each set, and how the kit builds them.
- The stamp on every outbound A2UI message, and the part's MIME type.
- The actions the kit accepts for a request, and what becomes of one it does not.
- The entitlement read under the hub's per-version keys.
- The kit's single-version constants, the version fixtures are written in, and the recorder's filter.
- The scaffolder's generated config and its generated tests.
- The proof: the kit's and the scaffolder's tests over the three sets, the gates.
- The kit README and the kit's design record.
- Out: the seven apps' sets and the GitHub app's own files carrying a literal version (19.5); the kit's `a2ui-core` pin (the Backlog's line); SPEC §14's rows and the root README (19.7); any recording (19.6); the version a catalog is read at.

## Locked decisions

### 1. The setting is an ordered list of the protocol's version strings

The per-app setting is a list of the protocol's own version strings — `v0.9`, `v0.9.1`, or both — checked when the app's config is built against the kit's one table of the versions it speaks and their extension URIs. A version the kit does not know, or an empty list, is a startup error naming it. The field omitted means both. The list's order carries no meaning: the newest of a set is by version number.

### 2. One choice path for every set

Every app runs the per-request choice from its list on every request. A single-version app's list is one long, so its choice is always that version, whatever the request names.

### 3. The choice is upstream's activation helper, as is

The choice is a2ui-a2a's activation helper, called once per request in both executors with the app's card: the newest version the request names that the card advertises, registered as activated — so the A2A activation header goes back on the response — and `None` when the request names nothing the app speaks, which falls to the app's newest.

### 4. Actions are admitted by the chosen version's schema

One extractor, replacing the two copies, takes an action whose stamp the chosen version's schema admits: `v0.9` admits `v0.9`; `v0.9.1` admits `v0.9` and `v0.9.1`. A stamp outside that set is not an action and falls through as it does today — the "Unhandled event" paint in deterministic mode, the apology with no model call in LLM mode.

### 5. The stamp is written at the part boundary, overwriting

One stamping function at the boundary where a message dict becomes an A2A part writes the request's chosen version over whatever the message carried — a fixture's literal, the model's own writing, the kit's own messages alike — on every site: the deterministic send, the LLM stream's parts, its end-of-turn flush, the teardown delete and the fallback. The chosen version is handed to upstream's part helper, so the part's MIME type follows upstream's own mapping. `paintMeta` parts are untouched.

### 6. The entitlement read prefers the chosen version's key

The kit reads the hub's advertised catalog ids under the chosen version's key first, then the other version's key, then the flat shape.

### 7. The card: upstream's helper once per version, the keyed case nested by the kit

Each entry is built by upstream's card helper, once per version in the app's list, in the list's canonical order — the v0.9 entry before the v0.9.1 one on a both card — with the app's catalog ids. A v0.9.1-only app's params are the helper's flat params nested under the `v0.9.1` key by the kit; a v0.9-only app's and a both app's stay flat.

### 8. The card tests assert against copies of the sdk's three fixtures

The kit's card tests hold verbatim copies of the extension entries of the sdk's three kit-shape fixtures — the v0.9-only, v0.9.1-only and both cards — each with the sdk's fixture path noted beside it, and assert the built card's extensions list deep-equals the copy for its set.

### 9. The single-version constants go; the versions become data

The kit's constant for the wire version and its constant for the extension the card advertises are removed. The kit exports the versions it speaks as data — the ordered list and the extension URI per version — beside the per-app set. The kit's own outbound messages carry no version until the stamp writes one. Fixtures stay written in `v0.9`: one constant names the version fixtures and recorded messages are written in, used by the corpus's synthesized messages, the inbound test helpers and the two mocks' in-code message builders, whose import sites move in this sub-task. The version a catalog is read at is untouched.

### 10. The recorder keeps any version the kit speaks, as sent

The recorder keeps a data part stamped any version in the kit's list, writing the message as it went out.

### 11. The scaffolder writes the field out as both; no flag

The generated config carries the field set to both, with a one-line comment naming the three choices. The generated-app tests assert the both-shape card, and the scaffolder's snapshots follow. No scaffold prompt or flag is added. The kit pin stays what it is — the checkout's HEAD at scaffold time — so nothing is moved for a scaffold to see the field.

### 12. The kit's version stays `0.1.0`

### 13. The docs

The kit README: the quick start's abridged config gains the field's line, and one short section says the three values and, one line each, what the set does to the card, the stamp, the actions accepted and the per-request choice, pointing at the design record for the why. The kit's design record: the config excerpt gains the line; the server section says the card's entries follow the set, the three shapes; one new subsection walks the request path — the choice, the stamp, the admitted actions, the entitlement key — over one example with the hub and one with an upstream v0.9 client; one design-decisions row; the code-map line for the versions module reworded; a glossary entry for the version set.

### 14. The proof

Kit tests, one suite parameterized over the three sets where a row says "each set": the config — omitted, each explicit set, an unknown version and an empty list; the card — each set against its copied fixture; the choice — each set against a request naming both URIs, `v0.9` alone, `v0.9.1` alone, or none, asserting the version landed on and the activation header; the stamp — each set, a fixture written `v0.9` out under the chosen version with the MIME following, and the LLM path's streamed parts, flush, teardown delete and fallback stamped alike; the actions — in both executors, chosen `v0.9` admitting `v0.9` and letting `v0.9.1` fall through, chosen `v0.9.1` admitting both; the entitlement — the chosen key first, then the other, then flat; the recorder — a `v0.9.1` part kept as sent. The scaffolder: the config snapshots and the generated-app tests on the both-shape card. The mocks' suites green after the import move. Gates: the kit's and the scaffolder's own test commands per their READMEs, and `pnpm verify` in the apps repo — which does not run the Python suites, and whose format check was already red on Linear's parity test before this phase.
