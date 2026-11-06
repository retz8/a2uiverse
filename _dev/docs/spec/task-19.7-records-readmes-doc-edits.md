# Task 19.7 — Design records, READMEs and doc edits closing Phase 19

The writing that closes Phase 19 (`_dev/docs/spec/phase-19-v09-beside-v091.md`, decisions 11–13, and the TODO's 19.7 line): SPEC §14's row amended and the new row; finding 27; the root README's sentence; the Backlog line from 18.3 closed; the records the phase changed, in both repos, checked against the code; beat 35 named in the client README and the recorder's header. The last open sub-task of the phase.

## Scope

- SPEC §14: the capabilities-key row amended and the new local-convention row, as phase decision 11 has them.
- Finding 27 in `_dev/a2ui-findings.md`, as phase decision 13 has it.
- The root README: the one sentence of phase decision 12, and two phrases on the page the phase makes stale.
- The Backlog's line from 18.3 on the card read under the v0.9.1 URI alone.
- The records and READMEs Phase 19 changed, in this repo and `../a2uiverse-apps/`, read against the code as it stands after 19.8 and 19.9; the two excerpts the TODO names following the republished cards.
- From 19.6: beat 35 in the client README's beat table, its re-record line and its running-apps sentence, and in the recorder's header.
- Out: any record or README beyond what the check finds stale; `client.md`'s beat table; CLAUDE.md's Authority Rule; any code, recording or fixture.

## Locked decisions

### 1. The README changes in three places, phase decision 12 amended

Beside the one sentence, two phrases on the page the phase makes stale are corrected: "Built on" says the platform speaks the A2UI protocol at v0.9 and v0.9.1, not at v0.9.1 alone; the v1.0 bullet under "Where it's headed" loses its "before it, agents on v0.9 welcome beside the v0.9.1 ones" clause, the promise now kept. Phase decision 12's "nothing else on the page changes" is amended for these two, as a dated amendment in the phase spec. Phase 20 rewrites both lines again.

### 2. The sentence sits in the opening paragraph, prose, no link

The sentence is the second of the opening paragraph of "Your A2UI agent, unchanged", right after the Node finder's install from its card's address: an agent on A2UI v0.9 or v0.9.1 joins the same way, upstream's Python restaurant finder — whose card declares v0.8 beside v0.9 — installed from its address too, its v0.9 entry read and its v0.8 one passed over. It names the finder as the Python one, to tell it from the Node one the existing sentence means. It links nowhere: the 19.6 run kept no sitting log and no images by its own decision, and a TODO line is not a page to send a reader to.

### 3. The new §14 row follows the amended one and names finding 27

The capabilities-key row is amended as phase decision 11 says, its bug-report tag kept. The new row goes directly after it, not at the table's end, the two reading as the two halves of one story — which key, which URI. Its tag column is "local convention" with a dash clause giving the reason, in the shape the other local-convention rows use: the extension specification names one URI per version and nothing of a card carrying several, pointing at `_dev/a2ui-findings.md` 27.

### 4. Finding 27 carries a Reported line saying it is not filed

Finding 27 takes the file's shape — Component, Severity, Issue, Reproduction, Fix, Prior art. Its **Reported:** line, the field the four filed findings use, reads that it is not filed and is a candidate for the community proposal, beside finding 12. No phase number: the file is written for upstream and names no phases.

### 5. Finding 27 cites `upstream/main` at its current hash

The three sites — the extension specification's one-URI line, the ADK sample's two-entry declaration, a2ui-a2a's activation helper — are cited at `upstream/main` as it stands when the finding is written, `551bd0f48`, once checked that each reads the same there as at `9e8a9bac5`, the commit the 19.6 run installed the finders from; a site that moved between the two is said so and cited at both. Reproduction names the live install at `9e8a9bac5`.

### 6. The records' check: the phase's sections, every version sentence, the two excerpts and §3's illustration

The check reads, against the code as it stands today, the sections Phase 19 touched in the five records it edited — app-install, agent-kit, marketplace, client, orchestrator — and the five READMEs — the sdk's, Stellify's, the client's, the apps repo's roster and the kit's — plus every sentence in either repo's records and READMEs that names an A2UI version or extension URI, wherever it sits. Not the ten files cover to cover, and not the changed hunks alone. The app-install record's GitHub card excerpt follows GitHub's card to `0.2.0`, the entry's params keyed under `v0.9.1`; the marketplace record's Shop A entry excerpt follows Shop A's entry to card `0.2.0`, one flat v0.9 entry, versions `0.1.0` and `0.2.0`, its catalog at the build the republish moved it to; and the marketplace record's "Versions, at two levels" illustration follows the same entry, its story of a publisher packing again now being what happened.

### 7. Beat 35 gets its own row, saying what it is for

Beat 35 has a row of its own in the client README's beat table, saying it is GitHub's PR list again with every message stamped `v0.9.1`, the recorded v0.9.1 paint the replay tests hold — what it is for, since on screen it looks like beat 1. The re-record line for the beats run against the daily orchestrator names it, as does the sentence on which beats run against the apps you have running. The recorder's header gains a paragraph for it, as every beat group has one. `client.md`'s "Trying it without a model" table is untouched: it lists beats worth looking at, and beat 35 shows nothing beat 1 does not. The hand-built v0.9.1 beat from 19.3 needs nothing: the README names the hand-built files, not beats.

### 8. The Backlog line is removed

The Backlog's line from 18.3 on the card read under the v0.9.1 extension's URI alone is removed, the convention for an answered line; the Phase 19 heading already carries the correction of its claim. The two lines beside it from 18.3 stay, not being Phase 19's. The lines 19.3 and 19.4 said they added are there already; nothing is added.

## Invariants

- Worked directly on `main` in this repo, as 19.1–19.9 were; an edit in `../a2uiverse-apps/` lands directly on that repo's `main`.
- `pnpm verify` green in each repo touched.
- CLAUDE.md's Authority Rule — v0.9.1 the primary authority — stays as it is.
- The TODO's done line records what the check found.

## Amendments of 2026-11-06

### Where the sentence lands

The README's opening paragraph opens on the who-is-it-for page's question, so the sentence right after the Node finder's install is the paragraph's third by count, not its second. Amends decision 2.

### What moves with the two excerpts

An excerpt beside text still on its earlier version reads as a state the platform refuses: a preview at another version than the card is a refusal at publish. So the check moves what stands on the same card.

- **The app-install record.** The walk that installs GitHub's card, its install line, its record and the sentence quoting the line, at card `0.2.0`. The catalog's build stays `sha256-o0lcA0wt…` at its fifteen sites: the record's descriptor excerpt is one pack, and no sentence says it is the Store's current one. The "Install summary" section's lines show the line's shape and stay.
- **The marketplace record.** Beside the entry and §3's illustration, §4's preview at `0.2.0` with its capture time, §5's install line and record, and the state directory's artifact folder, on the Store's `sha256-EwxaM_GV…`; the descriptor's package version `0.2.2`. The record's `installedAt` is elided: the real registry holds no Shop A today. "One app, publish to install" stays Shop A's first publish, at card `0.1.0` and that day's build, a first publish being what it walks; one sentence at its head says so.

Amends decision 6.

### What else the check found

- **The sdk README.** `a2ui-spec/` names v0.9's server capabilities, pinned beside v0.9.1's since 19.1.
- **Two catalog READMEs and a template.** Gmail's "targets A2UI v0.9.1" follows its app to v0.9; Calendar's and the scaffolder's custom catalog template name both. GitHub's stands. The `catalogs/v0.9.1/` paths are catalog ids and stay.

Everything else the check read holds against the code: the sections Phase 19 touched in the app-install, agent-kit, marketplace, client and orchestrator records, the Stellify, client, apps roster and kit READMEs, and every other version sentence.

### What finding 27 adds to its three sites

The finding also cites the conformance suite's `test_select_newest` and the Python agent guide's "Multiple Version Support": the agent's half has its rule written there, and the gap is the client's half and the specification. Its helper snippet was run at `9e8a9bac5` against the sample's own card. Amends decision 5.
