# 19.3 — The client drawing either stamp and speaking v0.9 outbound

The client's inbound filter taking a data part stamped `v0.9` or `v0.9.1`, everything the client writes kept at `v0.9`, and a replay test over a `v0.9.1`-stamped paint. Sub-task 19.3 of Phase 19 (`_dev/docs/spec/phase-19-v09-beside-v091.md`, decisions 5, 9 and 10). Parallel with 19.1, 19.2 and 19.4.

## Scope

- The inbound filter: which versions it accepts, where the list comes from, and what becomes of a paint stamped a version the client does not speak.
- Outbound: the version the client stamps on what it sends, where that version is held, and the capabilities metadata.
- The messages the client builds for itself and never sends.
- The proof: the filter's tests and the replay test over a `v0.9.1`-stamped paint, before 19.6's recording exists.
- The client design record: the words and the placements.
- Out: the orchestrator, the sdk's code, the agent kit (19.4), SPEC §14's rows and the root README (19.7), any recording (19.6). No package version moves.

## Locked decisions

### 1. The filter's accepted versions are the sdk's list

The inbound filter keeps a data part whose version is in the sdk's exported list of the versions the platform speaks, `v0.9` and `v0.9.1` today. The client holds no list of its own.

### 2. A paint stamped a version the client does not speak is dropped silently

A relayed data part stamped a version outside the list is dropped as it is today, nothing reported, its slot left as the answer leaves it. The client record says so as a known limit.

### 3. The capabilities metadata is written through the sdk's helper, under both keys

The client's capabilities ride under each version's key, written by the sdk's capabilities helper. The sdk's two metadata key constants replace the client's local copies. No app sees a difference: the hub replaces the client's key with the app's entitlement.

### 4. The client's own messages stay `v0.9`

The repaint's delete before a repeat create and a restored screen's rebuild messages keep `v0.9`. A copy of a paint carries no version.

### 5. The outbound version is a local literal

The one version string left in the client, `v0.9` on every action, error report, operation and data model, is a local constant whose comment names it the client's choice per phase decision 5. It is not read from the sdk's list.

### 6. The proof: a hand-built `v0.9.1` beat and the filter's tests

One hand-built beat beside the existing synthetic ones carries its paint stamped `v0.9.1` and is replayed through the path a real stream takes: the event extractor, the turn runner, the real processor, the surface placed. Unit tests on the filter cover `v0.9`, `v0.9.1` and a foreign version. No recording is copied or re-stamped; 19.6's fresh GitHub recording joins later.

### 7. The client record says "the message's version"

In `docs/design/client.md` the message's version is called "the message's version" throughout, never "stamp", which the record and its glossary already define as the composition metadata. Three placements, one sentence or one row each: a design-decisions row — the client draws a message stamped `v0.9` or `v0.9.1` and writes `v0.9` for everything of its own; it buys reaching every v0.9 and v0.9.1 agent with one outbound shape; it costs that a fragment's version is never echoed back to its app — a sentence where the record describes what each relayed event carries, and a known-limits line for decision 2.
