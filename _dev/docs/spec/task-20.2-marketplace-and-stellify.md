# 20.2 — Marketplace and Stellify

Sub-task 20.2 of [Phase 20](phase-20-a2a-1-0.md) in [`_dev/TODO.md`](../../TODO.md). The marketplace and Stellify (the platform's pack and publish tool) move to `@a2a-js/sdk` 1.x, and publish and the preview capture work as before for agents on A2A 0.3. The Stellify pin in `a2uiverse-apps` moves as its tail. It works under two decisions of the phase spec: decision 1 (the platform is on `@a2a-js/sdk` 1.x, and an agent composes on A2A 0.3 or 1.0) and decision 9 (the decisions and the agents win over the SDK). It starts from four decisions of the [20.1 task spec](task-20.1-private-wire-and-dispatch.md), which decision 11 of that spec makes the platform's. Parallel with 20.1.

Two packages carry similar names here. The A2A SDK is `@a2a-js/sdk`. The platform sdk is `@a2uiverse/sdk`.

## Scope

1. The marketplace and Stellify on the A2A SDK 1.x.
2. The smoke request (the one A2A request of the hello-fragment smoke test in section 9.3 of [`SPEC.md`](../../../SPEC.md)) and the fetch of the live card: where they live, and how a card is typed.
3. What a publisher reads: which findings change their words.
4. How a fix to the A2A SDK reaches Stellify at a vendor's install.
5. Versions, and the Stellify pin in `a2uiverse-apps`.
6. What proves the sub-task.
7. The documents it changes.
8. Out: an agent on A2A 1.0 and a card written in A2A 1.0's shape; the card's one reading, and what a publisher is told about a card the A2A SDK cannot read (20.3); how A2UI parts are marked on A2A 1.0 (20.4); the bindings other than JSON-RPC (20.5); the orchestrator's dispatch (20.1); SPEC's A2A vocabulary beyond the one register row of decision 12 (20.13).

## Locked decisions

### 1. What 20.2 takes from the 20.1 task spec

Four decisions of the 20.1 task spec hold for the marketplace and Stellify as they hold for the orchestrator:

1. Decision 2: an answer has ended when the stream's body ends after a message event, or with the task's last state terminal (completed, failed, canceled, rejected) or interrupted (input-required, auth-required). `final` is not read.
2. Decision 3: a 0.3 agent in tests is the server of `@a2a-js/sdk` 0.3.14, kept as a dev dependency under an alias.
3. Decision 4: no patch is carried for what the 1.x A2A SDK's 0.3 translators refuse until a real agent is refused.
4. Decision 8: the A2A SDK is pinned at exactly `1.3.0`. For the marketplace a fix to it is a pnpm patch under `patches/`. For Stellify, decision 2 below applies.

20.2 claims agents on A2A 0.3 only.

### 2. Stellify keeps the A2A SDK external until the first patch that alters how an agent is reached

Stellify's committed build keeps the A2A SDK external, pinned at exactly `1.3.0` and resolved from npm at a vendor's install. A pnpm patch is registered in this repository's [`pnpm-workspace.yaml`](../../../pnpm-workspace.yaml) and reaches installs of this workspace alone. When a patch to the A2A SDK first alters how an agent is reached, the A2A SDK moves into Stellify's committed build in the same change, so the build a vendor installs carries the patch.

### 3. One smoke transport, in a workspace package of its own

The transport of the smoke request lives once, in a small workspace package of its own: one runner, which takes an optional credential header. The marketplace depends on the package. Stellify's committed build inlines it as it inlines the platform sdk, with the A2A SDK external as decision 2 has it. The judgement over what the transport saw stays in the marketplace and in Stellify, each with its own words. The orchestrator's dispatch is not part of the package.

*Amended by task 20.5 decision 11.* The package also holds the dial, which the orchestrator's dispatch and the smoke runner both use: the walk over a card's interfaces, the time limit on opening a connection, the reading of a gRPC address, the credential on each binding and the refusal for sign-in on each. The orchestrator depends on the package; the dispatch's resend after a refresh, its relay and its journal stay in the orchestrator.

### 4. The package also holds the fetch of the live card

The same package holds the fetch of the live card: the card fetched under its timeout and kept as its agent served it. The marketplace uses it at publish, at its refresh at boot and on a report. Stellify uses it for `preview`. Where the card's one reading lives stays with 20.3.

*Amended by task 20.3 decision 3.* The fetch of the live card is in the card package, the workspace package 20.3 adds for the card's one reading, and the smoke-transport package holds the smoke request's transport alone. The orchestrator uses the same fetch, beside the marketplace and Stellify.

### 5. Until 20.3 a card is the platform sdk's `PublishedCard`

The marketplace and Stellify hold a card as the platform sdk's [`PublishedCard`](../../../packages/sdk/js/src/marketplace.ts), the structural type the index entry stores it as, from the fetch through to the index entry. No new card type is written. The runner hands the card to the A2A SDK, whose 0.3 layer translates it, as the orchestrator's dispatch does.

Two things hold until 20.3:

1. A card written in A2A 1.0's shape is refused at publish and at `preview` as today, by the fetch's guard, in today's words: "not an agent card: no url or name".
2. A 0.3 card the A2A SDK's translators refuse fails the smoke request, where 0.3.14 let it through: a card with no `capabilities`, `defaultInputModes`, `defaultOutputModes` or `skills`, a skill with no `tags`, or a sign-in scheme of an unknown `type` ([A2A SDK notes](../phase-20-a2a-js-sdk-1.3.0-notes.md), section 1). The publisher reads "the smoke request failed:" followed by the A2A SDK's own message. What a publisher is told about such a card is 20.3's, as decision 4 of the 20.1 task spec has it.

### 6. A finding spells a task state in lowercase, and "never finished" names the last state seen

A finding spells a task state in lowercase, as today, for an agent on either A2A version: "the agent ended the task as failed". The platform sdk's check of a sign-in agent's answer is unchanged.

One finding changes its words, since `final` is no longer read. Where the marketplace and Stellify say "the agent never finished: the stream ended without a final event", they say one of two things:

1. "the agent never finished: the stream ended with its task still working", naming the last state the stream carried.
2. "the agent never finished: the stream ended before any answer", when the stream carried nothing.

Ending by state changes two cases at publish and at `preview`:

1. A status update marked `final` while its task is still working no longer ends an answer. A stream that closes after it never finished.
2. A stream that closes on `auth-required`, set by an update not marked `final`, has ended asking to sign in.

### 7. A stream held open is left to the timeout

An agent that holds its stream open after its last event runs into the smoke request's timeout, as today. That includes the third case decision 9 of the phase spec names: a server built on the 1.x A2A SDK leaves a stream open when a task asks for sign-in. No agent in the roster does it, and it is handled on evidence.

*Amended by task 20.4 decision 10.* The smoke runner stops reading once the task's state is auth-required and leaves the stream. An agent that holds its stream open after any other last event still runs into the timeout.

### 8. Versions

1. Stellify is 0.5.0.
2. The platform sdk is 0.8.0. Its `a2uiMessagesOf` and its `PartLike` type, which read a part by `kind`, are removed with their last callers. The shared runner reads the 1.x A2A SDK's parts through the platform sdk's `a2uiMessagesIn`.

### 9. The marketplace, Stellify and the shared package land in one merge

### 10. The `[apps]` tail: the Stellify pin

The pin moves after 20.2's code is on `main` of `a2uiverse` and pushed. It names the commit on `main` that carries Stellify's rebuilt `dist/`, in the nine `package.json` files of `a2uiverse-apps` that carry the pin (the seven catalogs and the scaffolder's two templates) and in that repository's lockfile, committed on its `main`. 20.2's line in `_dev/TODO.md` is ticked after the tail.

What proves the tail:

1. The install in `a2uiverse-apps` resolves the A2A SDK at `1.3.0` for Stellify.
2. `pnpm verify` is green there.
3. One `stellify preview` runs with the pinned build from Shop B's catalog folder, against its running agent on its demo key. Nothing else runs the git-installed build against an agent: the launcher and the live suite run the workspace's Stellify, and `pnpm verify` in `a2uiverse-apps` runs `stellify check` alone.

### 11. What proves 20.2 on the platform

1. `pnpm verify` is green.
2. The shared package's tests run against the 0.3.14 A2A SDK's server, the two cases of decision 6 among them.
3. The client's live Playwright suite passes. Its publish story captures Shop B's sample through Stellify and publishes Shop B from the Publish page. The suite over the recordings runs neither the marketplace nor Stellify and is not part of the proof.
4. One live sitting, from scratch state, covers three things:
   1. The seven kit apps go through the launcher's publish path ([tunnel environment](../tunnel-environment.md)) in deterministic mode, each published and then installed from the marketplace.
   2. Upstream's Node and Python ADK restaurant finders, from `a2ui-upstream` at `9e8a9bac5`, are published by their card URLs.
   3. The nine samples are seen painting in the Store, through the tunnel in the browser.
5. If the Python finder's publish is refused, the same publish is tried against the marketplace on `main` at `5108293` before the refusal is counted against 20.2. The [Phase 18 sitting log](../phase-18-sitting-log.md) records a publish of the Node finder alone.

### 12. The documents 20.2 changes

1. The marketplace's [design record](../../../docs/design/marketplace.md): the transport's paragraph and where its code is, the row on when an answer has ended, and the "never finished" finding's words.
2. The marketplace's [README](../../../apps/marketplace/README.md): its sentence on how a stream ends.
3. Stellify's [README](../../../packages/stellify/README.md): the paragraph on the committed build, and the row naming where the transport and the card fetch are.
4. The platform sdk's [README](../../../packages/sdk/README.md): `a2uiMessagesOf` out of the smoke test's row.
5. A README for the shared package. It gets no design record of its own: the marketplace's design record is where the smoke test is explained.
6. Two older task decisions, amended in place under an "Amended by task 20.2" line: decision 4 of the [13.4 task spec](task-13.4-stellify-verbs.md) (Stellify's transport is the marketplace's with a credential header added) and decision 1 of the [16.5 task spec](task-16.5-stellify.md) (the build inlines the platform sdk alone).
7. `_dev/TODO.md`: 20.5's line (the bindings) gains the rule of decision 2.
8. The protocol delta register in section 14 of SPEC gains a row for an answer ending by state with `final` unread, tagged local convention, covering the orchestrator's dispatch and the smoke request. It is written once the A2A 0.3 specification's wording on `final` is read and cited.

The rest of SPEC's A2A vocabulary waits for 20.13.

## Invariants

1. No credential reaches the marketplace (section 9.3 of SPEC). The shared runner can carry a credential header, and the marketplace passes none.
2. Cards already stored in the marketplace's index stay as they are (decision 4 of the phase spec).

## Open items

Left to the plan:

1. The shared package's name and layout.
2. Where the tests' fake agents live. The marketplace's suite and Stellify's each hold one today.
3. The word a finding uses for a task state with no lowercase name.
4. What Stellify's entry point still exports.

Facts left for the plan to check by running:

1. Whether a git install of Stellify at the new pin brings the A2A SDK at `1.3.0` and not the aliased 0.3.14.
2. Whether the inlined package keeps the A2A SDK external, and the gate over Stellify's committed `dist/` stays deterministic.
3. Whether the Python finder publishes on `main` today.
4. What the A2A 0.3 specification says `final` means.
