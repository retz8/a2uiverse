# Phase 19 — v0.9 beside v0.9.1

An agent on A2UI v0.9 installs and paints beside the v0.9.1 ones, and every A2UIVerse app is joinable by a client on either version (SPEC §9.1, §14). Closes the Backlog line from 18.3 — the platform reading a card's catalogs only under the v0.9.1 extension's URI while the hub asks agents for v0.9.1 or v0.9 alike. Before Phase 20.

## Scope

- The claim: any agent on A2UI v0.9 or v0.9.1 joins A2UIVerse as it is, and every A2UIVerse app is joinable by a client speaking either. Realized as a mixed fleet, not every app declaring both.
- The platform's reading of a card's A2UI declaration across its v0.9 and v0.9.1 entries; the hub's advertising and paint check per version; the client drawing a paint stamped either way.
- The agent kit's per-app version set and what it drives — the card, the stamp, the inbound check, the per-request choice; the seven apps spread across the three shapes; the scaffolder's default.
- The proof: tests over every card shape, the gates in both repos, the live run on the mixed fleet through the tunnel, upstream's two restaurant finders installed from their URLs alone.
- The writing: the delta register, one sentence in the root README, a finding for upstream, the Backlog line closed, the design records in both repos.
- Out: v0.8 and v1.0 (Phase 20); the client stamping anything but `v0.9` outbound; re-recording existing fixtures; a version axis anywhere but the hub's advertising and its paint check.

## Locked decisions

### 1. The claim is both directions, realized as a mixed fleet

"A2UIVerse supports v0.9 and v0.9.1 completely" is a claim about the ecosystem, the apps included. Inbound, every way a v0.9 or v0.9.1 agent can differ is handled: the card's entry under either URI, both or neither; its params flat or keyed under either version; the entitlement read under either key; the paint stamped either way. Outbound, the A2UIVerse apps are joinable by a client that speaks only v0.9. The proof is a fleet where each shape has a live app behind it, not a fleet where every app declares both.

### 2. Which card entries count, and how their params are read

Entries whose URI is the v0.9 or the v0.9.1 extension URI count. An entry for a version the platform does not speak — v0.8, v1.0 — is passed over, not an error; so the ADK restaurant finder's v0.8 entry and its v0.8 catalog id never reach coverage. A card with no counted entry declares nothing, the basic-catalog fallback as today. Inside a counted entry the params are read flat, as upstream's guide writes them, or keyed under `v0.9` or `v0.9.1`; a keyed object with neither key is an error, as a malformed declaration is today. Each keyed object is validated against the schema's version part; the pinned root schema's requirement of a `v0.9` key is not applied, being the bug finding 12 reports.

### 3. Entitlement per version, with the fill rule

A card's declaration is a map from version to catalog ids, and the platform keeps it one. Each counted entry's ids are that version's set; a version with no entry of its own takes the other's set — so a card with one entry is advertised and checked as today, under both keys, whatever its paints are stamped. Only a card whose two entries name different sets keeps a version axis: the hub advertises each version's set under its own key and checks a paint against the set of the paint's stamp, a paint in a catalog its card declares for the other version refused through the existing path — the live card read again, the update tile when it changed, the failure tile otherwise. Everywhere else — coverage, the artifacts held, the update check, the App Library, the Planner's reader — the app's catalog ids are the union. The version axis lives in the advertising and the paint check and nowhere else; the registry already keeps the card verbatim, and the flat record stays what it is.

### 4. The hub's request header stays; the orchestrator's own card declares both

The hub keeps naming both extension URIs in the request header for every agent, as A2A has an agent ignore a requested extension it lacks and a both app chooses the newest it speaks; the marketplace's smoke test and Stellify's transport follow through the one sdk helper, and no caller needs the card to build the header. The orchestrator's own card declares the v0.9 URI beside the v0.9.1 one: its shell paints are stamped `v0.9` already, and the claim's own card says both.

### 5. The client draws either stamp and speaks `v0.9` outbound

The client's inbound filter takes a data part stamped `v0.9` or `v0.9.1`; web_core's adapter factory already routes both to one adapter and the sdk's validator runs on the pinned v0.9.1 schemas, whose version is the enum of both. Outbound — actions, error reports, the operations, the data model — stays stamped `v0.9` everywhere, by choice: v0.9.1's own schemas admit it and a v0.9 agent requires it, so no agent is reached by echoing a fragment's version that is not reached without it.

### 6. The kit's per-app version set drives the card, the stamp, the inbound check and the per-request choice

The agent kit gains a per-app setting naming the A2UI versions the app speaks: v0.9 only, v0.9.1 only, or both. A v0.9.1-only app declares the v0.9.1 entry with its params keyed `v0.9.1` — the whole-object shape — stamps `v0.9.1` on every paint and accepts actions stamped either way, as v0.9.1's schema allows. A v0.9-only app declares the v0.9 entry with flat params, as upstream's card helper writes them, stamps `v0.9` and accepts `v0.9` alone, as v0.9's schema requires. A both app declares one entry per version, flat, and chooses per request through a2ui-a2a's activation helper — the newest version the request names that it speaks, its newest when none is named — stamping and keying that version: with the hub it answers in v0.9.1, with an upstream v0.9 client in v0.9. Nothing else in the kit changes; it already reads the entitlement under either key.

### 7. The fleet

v0.9 only: Gmail, Linear, Shop A. v0.9.1 only: GitHub, Shop B. Both: Calendar, CircleCI. Each merge the project proves then holds all three shapes — the temporal merge over Calendar, Gmail and GitHub; the entity join over Linear, GitHub and CircleCI — the two shops are a pair of different shapes, and Calendar, the app in the published ecosystem recording, answers the hub in v0.9.1 as it does today. The fleet carries flat, keyed and two-entry cards live; keyed `v0.9` keeps its tests only.

### 8. The scaffolder's default is both, written out

The version set defaults to both, and the scaffolder's templates write the field explicitly, so a new vendor sees the choice and can narrow it. Nothing fails for leaving it out.

### 9. What proves the phase

Tests: the sdk reader over every card shape, the ADK finder's real card and the kit's three shapes among the fixtures; the hub's per-version advertising and paint check; the client's filter over a recorded `v0.9.1` paint; the smoke test and Stellify's transport; the kit's card, stamp, inbound check and per-request choice for each version set. Gates: `pnpm verify` green in both repos. Live, through the tunnel by Claude in Chrome: the fleet republished on its new cards and taken through the update path in the registry; the temporal merge, the entity join and the shops' merge once each on the mixed fleet, each answer checked against its earlier recording; the ADK restaurant finder from `../a2ui-upstream/` installed from its URL alone — the Backlog line's own case, its v0.8 entry passed over, its v0.9 entry read; the Node restaurant finder installed again, the no-extension card, so 18.3's run still holds.

### 10. Every existing recording and fixture kept, the new shape beside them

No recording or fixture in either repo is re-recorded: they are the before side of the comparison and the regression net for what must not change. The kit stamps at send from the app's version set, so a v0.9.1-only app's deterministic replies go out stamped `v0.9.1` from fixtures that say `v0.9`. One client beat is recorded fresh from GitHub, so the client's replay tests hold a `v0.9.1` paint. The Store previews are re-captured by the republish, since publish runs the smoke test and keeps its paint.

### 11. The delta register: one row amended, one added

The existing row in SPEC §14 on the capabilities key — the v0.9.1 schemas keying their entry `v0.9` while the guide, web_core and the Python core write `v0.9.1` — keeps its bug-report tag and now says the platform reads a card under either key and writes both. One new row, tagged local convention: a card's A2UI declaration read per version across its v0.9 and v0.9.1 entries, an entry for a version the platform does not speak passed over, a version with no entry of its own taking the other's set, the hub advertising each version's set under its key and checking a paint against the set of its stamp, and the client speaking `v0.9` outbound by choice. The kit's per-request choice is upstream's own helper and needs no row.

### 12. One sentence in the root README

The README's section for an outside agent says that an A2UI agent on v0.9 or v0.9.1 joins as it is, pointing at the ADK finder's install from decision 9 — the v0.8 entry beside the v0.9 one on a real upstream card — as its proof. Nothing else on the page changes; Phase 20 rewrites the sentence for v1.0.

*Amended by task 19.7 decisions 1 and 2, on 2026-11-06.* Beside the one sentence, two phrases the phase makes stale are corrected: "Built on" says the platform speaks the A2UI protocol at v0.9 and v0.9.1, and the v1.0 bullet under "Where it's headed" loses its clause on agents on v0.9. The sentence names the finder's install in prose and links nowhere.

### 13. Finding 27, unreported

Recorded in `_dev/a2ui-findings.md`: the A2UI extension specification names one URI per version and says nothing of a card carrying several entries or of how a client chooses among them, while upstream's own ADK sample declares two and a2ui-a2a's activation helper assumes several and picks the newest the client requested; the platform's reading rule from decision 3 is what A2UIVerse does about it. Marked a candidate for the community proposal in Phase 22 and not filed as an issue now: a specification gap with a working de-facto rule, not a bug that blocks anyone. It reads beside finding 12, the sibling gap on the capabilities key.
