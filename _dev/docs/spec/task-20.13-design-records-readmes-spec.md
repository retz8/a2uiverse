# 20.13 — Design records, READMEs and SPEC

Sub-task 20.13 of [Phase 20](phase-20-a2a-1-0.md) in [`_dev/TODO.md`](../../TODO.md), the last open sub-task of the phase. It is the writing that closes Phase 20: SPEC, the design records and the READMEs in A2A 1.0's vocabulary and checked against the code as it stands, the phase's decisions traced into SPEC, each finding marked with whether it is filed, and the Backlog's lines for the workarounds. It works under four decisions of the phase spec: decision 8 (where upstream A2UI is silent on A2A 1.0, the platform's reading goes in the register and upstream's silence in the A2UI findings), decision 9 (each case where the A2A SDK contradicts a decision is recorded as a finding and given a Backlog line), decision 10 (SPEC is written in A2A 1.0's vocabulary) and decision 13 (a Backlog line returns the agent kit to `a2ui-a2a`). It takes up what two earlier sub-tasks left to it: from [20.11](task-20.11-the-fleet.md) (the fleet), two worked examples that no longer read true of the apps, and from [20.12](task-20.12-integration-acceptance.md) (integration and acceptance), beat 36 missing from the client README. After 20.12.

These words are used throughout.

1. SPEC is [`SPEC.md`](../../../SPEC.md). The register is the protocol delta register in its section 14 (Protocol stance), the table of every deviation from A2UI and A2A.
2. A record is a design record under `docs/design/`. There are 12.
3. The A2A findings are [`_dev/a2a-findings.md`](../../a2a-findings.md), 28 findings written for the A2A project and its SDKs. The A2UI findings are [`_dev/a2ui-findings.md`](../../a2ui-findings.md), written for the A2UI project.
4. A workaround is a local patch, or a reading around the A2A SDK, that decision 9 of the phase spec has the platform carry.
5. The private wire is the A2A connection between the canvas shell and the orchestrator (decision 3 of the phase spec).
6. A path is one binding at one A2A version. There are six: JSON-RPC, HTTP+JSON and gRPC, each on A2A 1.0 and on A2A 0.3. An app's first path is the one its card lists first.
7. The kit apps are the seven apps built on the agent kit (`a2ui-agent-kit` in `a2uiverse-apps`): GitHub, Gmail, Google Calendar, CircleCI, Linear, Shop A and Shop B. The real marketplace is the marketplace's own state directory on the development machine, where the kit apps are published.
8. Both repositories are `a2uiverse` and `a2uiverse-apps`.

## Scope

1. SPEC: A2A 1.0's names at every site that still carries A2A 0.3's (decisions 2 and 3), the phase's decisions traced into it, and the private wire written in (decision 5).
2. The 12 records and the READMEs of both repositories: the vocabulary (decision 4), the check against the code (decision 6), and the excerpts and worked examples (decision 7).
3. The root README (decision 8).
4. Beat 36 in the client README and the recorder's header (decision 9).
5. `_dev/TODO.md`: the Backlog's lines for the workarounds and two lines Phase 20 made stale (decision 10).
6. The A2A findings: a Reported line on each of the 27 findings that has none (decision 11).
7. The phase spec: the amendment under its decision 9 (decision 1).
8. Out: filing any finding upstream; any code beyond the recorder's header comment; any recording or fixture; `CLAUDE.md`; a new record; the body of any finding; the twelve older A2UI findings (5, 9 and 17 to 26); the register's heading, its closing sentence and its older citations (decision 12); section 17 (Out of scope) of SPEC; the package list in section 13 (Repositories) of SPEC; the four Phase 20 notes files under `_dev/docs/`; the Phase 20 heading paragraph in `_dev/TODO.md`.

## Locked decisions

### 1. No finding is filed upstream in 20.13

Decision 9 of the phase spec has each case "reported upstream where nobody has". 20.13 files nothing. Filing happens after the phase, one finding at a time, through the `contribute-oss-finding` skill. The phase spec takes this as an amendment: an italic line under its decision 9, "Amended by task 20.13 decision 1.", in the form of the amendment that [20.7](task-20.7-signed-cards-verified.md) (signed cards verified) left under decision 7.

One Backlog line names the seven A2A findings that a workaround waits on as the first to take upstream:

1. Finding 3: inside one binding, the client of `@a2a-js/sdk` takes an A2A 1.0 interface over a 0.3 one, whatever the card's order.
2. Finding 9: toward an agent on A2A 0.3 over HTTP+JSON and gRPC, the client drops every part's metadata.
3. Finding 13: a card written for A2A 0.3 whose OAuth scheme names only the device-code flow does not read.
4. Finding 20: the client hands back an extended card it has read, never the answer as served.
5. Finding 21: the two SDKs write an extended card over A2A 0.3 on HTTP+JSON in different JSON forms.
6. Finding 27: `a2a-go` writes an OAuth flow as JSON only by value and converts it for gRPC only by pointer.
7. Finding 28: `a2a-go` and `@a2a-js/sdk` each refuse the other's signature on a card holding an empty value.

### 2. How SPEC spells an A2A 1.0 name

SPEC spells an A2A 1.0 name in the three ways the sentences of 20.4 (A2UI on A2A 1.0) and 20.8 (the extended card) already do.

1. A card field is written by its JSON name in code font: `supportedInterfaces`, `capabilities.extendedAgentCard`, `securityRequirements`.
2. A task state is written as the string on the A2A 1.0 wire, `TASK_STATE_AUTH_REQUIRED`, with A2A 0.3's name beside it only where an agent on 0.3 differs on the wire.
3. An operation is written by the specification's name in plain words, "A2A's Get Extended Agent Card", with no method string and no A2A 0.3 name beside it.

Applied to the sites that carry A2A 0.3's names when this spec is written:

1. Section 8 (Authority) says `securityRequirements` where it says the card's `security`, with "`security` on a card written for A2A 0.3" beside it once.
2. The register's row on a fragment's step and the canvas's close says "A2A's Cancel Task" where it says "A2A's `tasks/cancel`".
3. The register's row on relaying a vendor's events says `TASK_STATE_WORKING` where it says `working`, with no A2A 0.3 name beside it: that row is the private wire, which speaks A2A 1.0 alone.
4. The register's row on an answer ending by state takes the `TASK_STATE_*` names, A2A 0.3's lowercase names beside them once: that row reads agents on both versions.
5. Section 9.3 (Marketplace and Store) says `TASK_STATE_AUTH_REQUIRED` where its publish step says "answering `auth-required`", with A2A 0.3's name beside it.

The platform's own plain words stay as they are: "an auth-required response" in section 8, which names two signals at once, and "auth-required" in milestone M8's line of section 12 (Milestones).

### 3. A2A 1.0's names come from tag `v1.0.0` of the A2A repository

A name and a section number of A2A 1.0 are written from the specification at tag `v1.0.0` of `a2aproject/A2A`, read from the clone at `../A2A`. It is the version decision 2 of the phase spec links. A name of A2A 0.3 is written from tag `v0.3.0`. A sentence that relies on something only a later text has names that text.

The specification at `v1.0.0` names the operations in its sections 3.1.1 to 3.1.11: Cancel Task is 3.1.5, Subscribe to Task 3.1.6, Get Extended Agent Card 3.1.11. The nine sections the register cites stand under the same numbers at `v1.0.0`, at `v1.0.1` and on `main` at `9fff3e08` (2026-11-05). On `main` alone, section 7.6.4 (In-Task Authorization Scope) says the protocol "does not define the scope, representation, validity, or revocation semantics" of an in-task authorization.

### 4. The vocabulary reaches every record and README in both repositories

Decision 10 of the phase spec names SPEC. 20.13 holds every record and every README of both repositories to the same rule.

1. A name in code font is the string the wire or the code carries, in A2A 1.0's spelling, with A2A 0.3's beside it only where an agent on 0.3 differs.
2. A sentence may say the thing in plain words with no code font: "a working status update".
3. A sentence about A2A 0.3 itself, or about an agent on it, keeps A2A 0.3's names.

### 5. The phase's decisions are traced into SPEC

1. Each of the phase spec's 14 locked decisions, and its one amendment (a signed card written for A2A 0.3 is taken as an unsigned card is), is traced to a sentence of SPEC.
2. Each of the 12 task specs of Phase 20 lists the SPEC sentences and the register rows it writes. Each listed sentence and row is checked as present.
3. Anything missing is written.

Decision 3 of the phase spec, the private wire, is missing from SPEC when this spec is written. It goes in as one sentence in section 10 (Orchestrator components), beside "The client talks only to the orchestrator", and the A2A line of section 14 says the wire between the client and the orchestrator is A2A 1.0 over JSON-RPC alone.

### 6. What the check reads

Beyond names, the check reads against the code as it stands, in both repositories:

1. The sections Phase 20 touched in the records and READMEs it edited.
2. Every sentence, wherever it sits in a record or a README, that names an A2A version, a binding, a card field, an operation, a task state or the A2A SDK.
3. Every excerpt of a card or of a Store entry.

It does not read the records and READMEs cover to cover.

### 7. Every example is true today and keeps its lesson

1. An excerpt of a card is cut from the card as the real marketplace stores it on the day, trimmed.
2. A walk-through names an app for which each of its steps holds on the day.
3. Where a lesson needs A2A 0.3, it moves to an agent that is on it: upstream's restaurant finder for a card in A2A 0.3's shape alone, and Calendar, whose first path is JSON-RPC at A2A 0.3, for the wire in step 5 of the [A2UI-on-A2A record](../../../docs/design/a2ui-on-a2a.md).
4. Shop B's walk in "One card, end to end" of the [card record](../../../docs/design/card.md) has the six interfaces its card lists.

Four examples are known to be stale when this spec is written: the card record's opening, which shows Shop B's card in A2A 0.3's shape; its "One card, end to end"; step 5 of the A2UI-on-A2A record, which has Gmail on JSON-RPC at A2A 0.3; and the [authority record](../../../docs/design/authority.md)'s excerpt of Gmail's card. The real marketplace stores each of the seven kit apps' cards in A2A 1.0's shape with six interfaces, each also carrying A2A 0.3's fields: `url`, `preferredTransport`, `additionalInterfaces`, and `security` where the app asks sign-in.

### 8. The root README names A2A in two places

In the [root README](../../../README.md):

1. "Built on" says the platform speaks A2A 0.3 and 1.0. Its table drops `a2ui-a2a` and gains `@a2a-js/sdk` and `a2a-sdk`.
2. "Your A2UI agent, unchanged" gains one sentence: an agent on A2A 0.3 or 1.0, over JSON-RPC, HTTP+JSON or gRPC, joins the same way, by whichever its card lists first. The sentence links the [Phase 20 sitting log](../phase-20-sitting-log.md).

The wording and the table's rows are the task's to write.

### 9. Beat 36 is named where beat 35 is

Beat 36, `temporal-merge-spread`, is treated as decision 7 of the [19.7 task spec](task-19.7-records-readmes-doc-edits.md) (the documents closing Phase 19) treated beat 35.

1. It has a row of its own in the [client README](../../../apps/client/README.md)'s table of beats, saying it is beat 5's question on the kit apps spread over the six paths and what the replay test holds from it.
2. The command that records the beats again, and the sentence under it on which beats run against the apps that are running, name it.
3. The recorder's header comment, in [`record-beats.ts`](../../../apps/client/scripts/record-beats.ts), gains a paragraph for it.
4. The "Trying it without a model" table of the [client record](../../../docs/design/client.md) is untouched.

### 10. The amendments to `_dev/TODO.md`

1. The Backlog gains the line of decision 1.
2. Each workaround a Phase 20 task spec decided is checked for its Backlog line, and a missing line is added. The Backlog is searched for A2A's terms, not read whole.
3. The line returning the agent kit to `a2ui-a2a` is corrected: `a2ui-a2a` is at 0.3.0 on 2026-11-14 and still requires `a2a-sdk` below 0.4.0.
4. The line on re-attaching a stream that broke is corrected: the operation is A2A's Subscribe to Task and the orchestrator is on `@a2a-js/sdk` 1.3.0. Its claim about what the SDK implements is read again on 1.3.0, or marked as read on 0.3.14 alone.
5. The Phase 20 heading paragraph stays as written.

### 11. The Reported line on the A2A findings

Each of the 27 A2A findings with no `**Reported:**` line, finding 1 and findings 3 to 28, gains one, after Severity, where finding 2 has its own. The line names no phase. It takes one of three forms:

1. Not filed, where nothing upstream reports the finding.
2. Not filed, naming the upstream issue that reports the same thing.
3. Not filed, naming the upstream issue or pull request that covers part of it.

### 12. The register's frame is untouched

20.13 changes the register's rows alone. Its heading, "Protocol delta register (seed)", its closing sentence naming two tags, and the citations in its older rows that name the A2UI findings with no number stay as they are.

### 13. What shows the pass is complete

After the edits, SPEC, the 12 records and the READMEs of both repositories are searched for A2A 0.3's names in code font. Every hit that remains is a sentence about A2A 0.3 or about an agent on it. The done line of 20.13 in `_dev/TODO.md` gives the count before and after for each file, and says what the trace of decision 5 and the check of the excerpts in decision 7 found.

## Invariants

1. 20.13 is worked directly on `main` in both repositories, with no worktree.
2. A commit that touches only documents passes `prettier --check` on the files it changes. The commit that carries the recorder's header passes `pnpm verify`. A commit in `a2uiverse-apps` follows that repository's own rule for a commit of documents.
