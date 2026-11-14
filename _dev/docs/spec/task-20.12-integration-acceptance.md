# 20.12 — Integration and acceptance

Sub-task 20.12 of [Phase 20](phase-20-a2a-1-0.md) in [`_dev/TODO.md`](../../TODO.md). The live acceptance of Phase 20 through the tunnel, driven by Claude in Chrome, in five passes and a closing: the ecosystem run's loop for six new apps, one on each path; the three merges asked again with the agents in `stub`; the registry as it was installed before the phase, on the real state; upstream's two restaurant finders; and the seven kit agents as they stood before the phase. It works under decision 12 of the phase spec (what proves the phase): acceptance is the loop of the ecosystem run in section 12 (Milestones) of [`SPEC.md`](../../../SPEC.md) in a live sitting over every path, and every agent that composes today composes after the move, upstream's sample agents among them. It takes up what the [20.11 task spec](task-20.11-the-fleet.md) left to it: a press, a sign-in in the browser, a request for more access and the merges on the spread fleet (its decision 15), and whether Shop C is published to the real marketplace (its scope). After 20.6, 20.7, 20.8, 20.10 and 20.11; before 20.13.

These words are used throughout.

1. A path is one binding at one A2A version. There are six: JSON-RPC, HTTP+JSON and gRPC, each on A2A 1.0 and on A2A 0.3. An agent's first path is the one its card lists first, which the platform's dial takes.
2. The loop is the ecosystem run's loop of section 12 of SPEC: publish a new app, discover it, install it, compose it with an existing one, act inside it.
3. The kit is `a2ui-agent-kit`, in `agent-kit/` of `a2uiverse-apps`. A kit agent is an agent built on it.
4. The launcher is the set of scripts in `scripts/` of `a2uiverse` that starts the apps. Its roster is GitHub, Gmail, Calendar, CircleCI and Linear in the default tier, and the two mock camera stores, Shop A and Shop B, in the mocks tier.
5. The spread fleet is the roster's seven kit agents as 20.11 left them, at `34feeca` of `a2uiverse-apps`, each listing its own first path first (decision 2 of the 20.11 task spec).
6. The old fleet is the same seven agents as they stood before Phase 20, at `987f12f` of `a2uiverse-apps`: on the kit before 20.9, over `a2ui-a2a` and `a2a-sdk` 0.3, answering JSON-RPC at A2A 0.3 alone.
7. Shop C is the hand-written A2A 1.0 agent of 20.10, a third mock camera store written in Go. It lists gRPC at A2A 1.0 first, signs its card, signs in by device code and serves each member a card of their own. It is no kit agent and is outside the launcher's roster.
8. The finders are upstream's Node and Python ADK restaurant finders, run from `../a2ui-upstream/`, a worktree of the A2UI fork.
9. The temporal merge composes Gmail, Calendar and GitHub. The entity join composes Linear, GitHub and CircleCI. The shops' merge composes Shop A and Shop B.
10. The real state is what the marketplace and the orchestrator keep on the development machine between sittings, in each process's own `.state/`: the real marketplace, the real registry and the real vault. Scratch state is a state directory made for this sitting.
11. The journal is the orchestrator's intent journal. For each dispatch it records the A2A version and the binding of the interface used, and each interface passed over (decisions 2 and 6 of the [20.5 task spec](task-20.5-the-bindings.md)).
12. A kit agent runs in one of three modes (section 9.4 of SPEC): `deterministic`, with no model; `stub`, the model over canned tool data; `live`, the model over the vendor's MCP server.
13. A beat is a session recorded through the orchestrator and kept as the stream it arrived as, in `apps/client/recordings/beats/`, which the client's tests replay.
14. Stellify is the platform's pack and publish tool.
15. A pass is one part of the sitting, run on one launch of the agents.

The sources these decisions rest on:

1. The [phase spec](phase-20-a2a-1-0.md): decision 2 (the credential, and an agent's signal that it needs sign-in, are stated for every binding and not for HTTP alone), decision 4 (a card is kept verbatim and read one way, and cards already stored stay valid as they are), decision 5 (a change of A2A version or bindings alone is not an update: the person sees nothing, dispatch follows the live card, and the stored copies keep their older shape until the app is next published or installed over), decision 7 (device-code sign-in, signed cards verified, the extended card read for a signed-in account), decision 9 (where an A2A SDK contradicts a decision or refuses an agent that composes today, the platform carries a patch or reads around the SDK, with a finding in `_dev/a2a-findings.md` and a Backlog line to drop the patch), decision 12 (fake agents in the platform's test suites cover each of the six paths and each capability of decision 7, and the hand-written agent is the real agent for those capabilities), invariant 2 (no agent that composes today is lost by this phase) and invariant 3 (nothing drawn names a binding, a protocol version or the SDK).
2. [`SPEC.md`](../../../SPEC.md): section 8 (Authority), where an agent signals what its card cannot predict either by a refusal for sign-in at dispatch or by its task moving to the auth-required state; section 9.3 (Marketplace and Store), where the trusted page's Publish sends the same publish body through the same gate as the command line; section 10 (Orchestrator components), where a newer build of a held catalog installs itself only for apps installed from the marketplace, and the client reads the marketplace through the orchestrator; and the row of the protocol delta register in section 14 on the auth-required request, read as `securityRequirements` in A2A 1.0's requirement shape or as `security` in A2A 0.3's.
3. The [20.11 task spec](task-20.11-the-fleet.md): decision 2 (the assignment of first paths), decision 11 (an agent whose first path does not answer the dial is a defect, and 20.11 is not done while any of the seven falls back to a later interface), decision 13 (the spread holds in every mode, and 20.11 ran `deterministic` alone) and decision 15.
4. The [20.10 task spec](task-20.10-the-hand-written-a2a-1-0-agent.md): decision 18 (Shop C stays out of the launcher's roster). The Backlog line "The launcher taking an agent that is not a kit agent" in `_dev/TODO.md`: Shop C is started, installed, previewed and published by hand.
5. The [19.6 task spec](task-19.6-mixed-fleet-acceptance.md), the acceptance of Phase 19: decision 1 (its before side rebuilt from a worktree of `a2uiverse-apps` at the pre-phase commit), decision 7 (one fresh beat recorded with one test, the privacy gate run over the file before it is committed), decision 8 (a break is fixed on the spot, on `main`, each fix its own commit with its test, and the case runs again from where it broke; a fix that needs a decision the phase spec does not settle is grilled in chat first and lands as a dated amendment to the task spec), decision 9 (the recorder runs before the finders so the fleet's launch is not interrupted between two of its reads), its invariant that the update path runs in the real registry, the one the orchestrator keeps in daily use, and its amendments of 2026-11-05 (the vault copied aside before the first sign-in and restored byte for byte at the closing; Shop B's key connected from the Mac, not typed on the key page through the tunnel).
6. The [Phase 18 spec](phase-18-ecosystem-run.md), the ecosystem run: decision 4 (the new app is discovered through the gap, the slot taking the offer, and the Store page is not browsed by hand for the discovery), decision 9 (a sitting log in `_dev/docs/` carries the evidence) and decision 14 (one sitting means one platform state moving forward, not one unbroken take).
7. The lines of 20.3 and 20.5 to 20.10 in `_dev/TODO.md`: each browser sitting ran `deterministic` on scratch state; 20.3 and 20.5 ran both finders from `../a2ui-upstream/` at `9e8a9bac5`, and in 20.5 each was published by its card URL with Stellify under a publisher claimed for the sitting, installed by id, asked side by side, and Book Now pressed in each; 20.6 to 20.10 served the client as a production build, the dev server's module requests having stalled in the tunnel; each refusal was staged in its own sub-task's sitting, in 20.3, 20.5, 20.6, 20.7 and 20.8.
8. The [tunnel environment](../tunnel-environment.md): the tunnel forwards at most eight ports, listed as the client, the orchestrator, the marketplace and the five vendor agents, and in 20.10 Shop C's sign-in page reached the browser through a proxy on port 11005.
9. The [launcher's README](../../../scripts/README.md): the publish path, which can publish apps and leave them uninstalled, in the Store for a slot to offer; and the secret sweep, which searches the journal, the marketplace's state and every captured output file for the secrets a sitting created.
10. What was found on 2026-11-14, listed next.

Found on 2026-11-14, by reading `a2uiverse` at `ff8280b`, `a2uiverse-apps` at `34feeca`, `../a2ui-upstream/` and the state on disk. Nothing was run.

1. The real registry holds the five default-tier apps, each installed from a local copy, each card at `0.2.0` in A2A 0.3's shape, listing JSON-RPC alone.
2. The real marketplace holds seven entries at card `0.2.0`, each listing the six paths with its app's own first path first, under one publisher, `a2uiverse-apps`. Its catalogs are at the builds 20.11's republish packed.
3. `../a2ui-upstream/` is at `0888f88b2` (2026-11-13), a commit another project in the workspace, Spectra, pins. `9e8a9bac5` is dated 2026-11-02. 227 upstream commits lie between the two, among them the change that emits A2UI v1.0's `@`-prefixed component envelope keys across the specification and the SDKs (upstream pull request 4044) and the release of `a2ui-a2a` 0.3.0. At `0888f88b2` both finders depend on A2A 0.3 SDKs.
4. In `a2uiverse-apps` no commit touched the agent kit or any app's agent between the end of Phase 19 and `ef19f4d`, 20.9's change. `987f12f` is the commit before it.
5. The kit has two executors, one for `deterministic` and one for `stub` and `live` (`executor_deterministic.py` and `executor_llm.py`).
6. Each of the five apps that sign in with OAuth declares a press that needs more access: GitHub's submitting and approving of a review, Gmail's opening of a thread, Calendar's confirming of an event and its RSVP, CircleCI's confirming of a rerun, Linear's confirming of a change. Shop B's API key carries no scopes.
7. No browser sitting of Phase 20 has had a kit agent answer a dispatch on gRPC at A2A 1.0, on HTTP+JSON at either A2A version, or on JSON-RPC at A2A 0.3 from the kit after 20.9. Shop C answered on all three bindings at A2A 1.0 in 20.10's sitting, and Shop B on gRPC at A2A 0.3 in 20.9's.
8. The trusted page's Publish takes artifact folders and a preview file through the browser's file picker ([`PublishForm.tsx`](../../../apps/client/src/canvas/trustedPage/publish/PublishForm.tsx)). In the tunnel environment the browser is not on the machine that holds the packed files.
9. The client is configured with the orchestrator's address alone and reads the marketplace only under the orchestrator's relay ([`orchestratorApi.ts`](../../../apps/client/src/orchestratorApi.ts)). The tunnel environment's sentence that the browser needs the marketplace's tunnel address dates from Phase 13.
10. No file under `apps/client/recordings/` changed during Phase 20. The newest beat is beat 35, from 19.6.
11. A newer build of a held catalog reads "A small update is ready" in the App Library and carries Update ([`marketplace.ts`](../../../packages/sdk/js/src/marketplace.ts) of the platform sdk).

## Scope

1. The loop for six new apps on scratch state, with the sign-ins, the presses, the requests for more access and Shop C's three capabilities inside it.
2. One fresh beat for the client's replay tests.
3. The three merges with the spread fleet in `stub`.
4. The registry installed before Phase 20, on the real state.
5. The finders and the old fleet.
6. The tunnel's ports, what a break becomes, the order, the sessions, the closing and the record.
7. Out: `live` mode; any refusal case and the walk past an unreachable interface; Shop C on the real marketplace or in the launcher's roster; whether a sign-in survives a vendor's move to the new kit; SPEC, the design records and the READMEs (20.13).

## Locked decisions

### 1. The loop runs for six new apps, one on each path

| Path | New app |
| --- | --- |
| gRPC at A2A 1.0 | Shop C |
| HTTP+JSON at A2A 1.0 | Gmail |
| JSON-RPC at A2A 1.0 | CircleCI |
| JSON-RPC at A2A 0.3 | Calendar |
| HTTP+JSON at A2A 0.3 | Linear |
| gRPC at A2A 0.3 | Shop B |

GitHub and Shop A are the apps already installed when the loop starts. Each new app is published, offered in a slot, installed from the offer, signed in, composed with apps already installed and pressed. Shop B and Shop C are offered from questions of the shops' merge, Gmail and Calendar from questions of the temporal merge, CircleCI and Linear from questions of the entity join.

### 2. The loop runs on scratch state

The marketplace and the orchestrator each run on a scratch state directory. The six apps have never been published to that marketplace and never installed in that registry. The loop touches nothing in the real state.

### 3. The loop's publishes are the launcher's and Stellify's

The five kit apps are published by the launcher's publish path and left uninstalled. Shop C is published by hand with Stellify. No publish of the loop goes through the trusted page's Publish.

### 4. A new app is discovered through the offer

Each new app is discovered through the offer in a slot, from a question asked while the app is not installed. The Store page is not browsed by hand for the discovery.

### 5. A path counts on the app's first path alone

A path counts as proven when the journal shows the dispatch and the press on the app's first path with no interface passed over. An agent that falls back to a later interface has not passed.

### 6. The request for more access is watched on five paths

In the loop's pass, one press that needs more access is taken in each of GitHub (gRPC at A2A 1.0), Gmail (HTTP+JSON at A2A 1.0), CircleCI (JSON-RPC at A2A 1.0), Calendar (JSON-RPC at A2A 0.3) and Linear (HTTP+JSON at A2A 0.3), each followed by Allow and the press sent again. gRPC at A2A 0.3 is left to the fake agents of the platform's test suites, and the record says so.

### 7. Shop C carries the passing cases of the three capabilities

Inside the loop, Shop C's install journals its card's signature as passed, its sign-in runs by device code through the code page, and one question is dispatched to the trade member's account through her own card. No refusal is staged again: an unreachable agent at each door, the walk past an unreachable interface, a device code refused or expired, a signed card that does not pass and an account's card listing no interface the platform speaks stand from the sittings of 20.3, 20.5, 20.6, 20.7 and 20.8 and from the test suites.

### 8. Shop B's key is given from the Mac

Shop B's key is connected from the Mac and is not typed in the browser.

### 9. Shop C is not published to the real marketplace

Shop C is published to the sitting's scratch marketplace alone. The real marketplace keeps its seven entries.

### 10. The agents run in `deterministic`, with one `stub` pass

Every other pass runs the kit agents in `deterministic`. One pass runs the spread fleet in `stub`, on the loop's scratch state: the three merges are asked once each, and each fragment painting from the model's executor on its app's first path is read in the journal. The merges' content is not judged. No pass runs `live`.

### 11. Beat 36 is the temporal merge on the spread fleet

The temporal merge's question, beat 5's, is recorded as beat 36 through the sitting's orchestrator, on the spread fleet in `deterministic`. The privacy gate runs over the file before it is committed. The file joins the client's replay tests, with one test on what the phase changed on that stream. The 35 existing beats are untouched.

### 12. The registry installed before the phase gets a pass on the real state

The real orchestrator boots on the real registry and the real marketplace, beside the spread fleet's default tier. The registry and the vault are copied aside before the boot. The temporal merge and the entity join are asked with the five apps as installed, and the journal is read for each dispatch going out on its app's new first path, with no update tile and no consent card for it. Then the newer builds are taken through the App Library's Update on each of the five. After the updates one question is asked again, so the five are seen composing in the newer builds. The pass leaves the real registry on the real marketplace's entries.

### 13. The finders run from the worktree as it stands

Both finders run from `../a2ui-upstream/` at `0888f88b2`, and the worktree is not moved. Each enters as in 20.5's sitting, into the loop's scratch marketplace and registry: published by its card URL, installed by id, asked side by side once, Book Now pressed in each. A finder that fails for a cause that is A2UI's and not A2A's is recorded on the Phase 21 line of `_dev/TODO.md` and in `_dev/a2ui-findings.md`, and runs again from a temporary worktree at `9e8a9bac5`, removed after.

### 14. The old fleet runs from a worktree, on a scratch state of its own

The old fleet runs from a sibling worktree of `a2uiverse-apps` at `987f12f`, over both tiers, installed from local into a scratch orchestrator of its own. The three merges are asked, with the sign-ins, Gmail's request for more access and one press inside each fragment. Every dispatch is read in the journal on JSON-RPC at A2A 0.3.

### 15. The tunnel's eight ports

The eight forwarded ports are the client, the orchestrator, the five vendor agents and Shop C on port 12003. The marketplace's port is not forwarded. All eight apps run at once, and Shop C serves its own sign-in page with no proxy. The tunnel environment's list of ports and its paragraph on Shop C are corrected to match. If a page of the Store fails without the marketplace's forward, that is a finding, and the loop runs in two launches by tier: the mocks tier with Shop C behind the proxy on port 11005, then the default tier.

### 16. A break is fixed on the spot, and a platform fix brings a confirming round

A break is fixed on the spot, on `main`: each fix its own commit with its test, and the case runs again from where it broke. A fix that needs a decision the phase spec does not settle is grilled in chat first and lands as a dated amendment to this spec. Where an A2A SDK is the cause, decision 9 of the phase spec holds: a patch or a reading around the SDK, a finding, a Backlog line. The old fleet and the finders are never changed, so a break there is fixed in the platform or recorded.

If any platform code changed during the sitting, the closing asks the three merges once more on the spread fleet at the final commit, and the six paths are read in the journal.

### 17. The order

1. The loop.
2. Beat 36, on the loop's launch.
3. The `stub` pass.
4. The registry installed before the phase.
5. The finders.
6. The old fleet.
7. The closing.

### 18. The sitting may span sessions

Each pass is whole within one session. The scratch state directories live in a git-ignored folder inside the repository until the closing removes them. The pass on the real state copies the real vault aside and restores it byte for byte within its own session, and the closing checks that it was restored.

### 19. How the sitting is driven

Claude in Chrome drives the sitting through the tunnel. The client is served as a production build. The Planner and the Synthesizer run on their defaults.

### 20. The closing

The gates, at the final commit:

1. `pnpm verify` green in `a2uiverse` and in `a2uiverse-apps`.
2. The client's two Playwright suites: the one over the recordings, beat 36 among them, and the live one.
3. The secret sweep over every state directory the sitting used, the real one among them, before the scratch ones are removed.

The state the sitting leaves:

1. The real registry holds the five default-tier apps on the real marketplace's entries at the newer builds, each installed from the marketplace. The copy set aside is dropped once its pass has passed.
2. The real vault is as the sitting found it.
3. The real marketplace is untouched.
4. Both scratch state directories are removed, with the publishers claimed in them.
5. The worktree of `a2uiverse-apps` at `987f12f` is removed, and the temporary worktree at `9e8a9bac5` if one was made.
6. No process is left running, and no finder is installed.

### 21. The record

A sitting log in `_dev/docs/` holds the evidence: the day and the commit of each pass, in both repositories and upstream; the settings; one table of the six paths against the loop's stages, with each reading from the journal; a section for each pass; every fix with its commit; every finding. The line of 20.12 in `_dev/TODO.md` names each pass's outcome and points at the log. Decisions taken on the spot are dated amendments to this spec. Findings go to `_dev/a2a-findings.md` or `_dev/a2ui-findings.md`. There are no images.

## Invariants

1. The old fleet and the finders are never changed.
2. No roster app's config is edited for the sitting.
3. The real marketplace is not changed by the sitting, and the real state changes only in the registry's move of decision 12.
4. `../a2ui-upstream/` stays at `0888f88b2`.
5. The 35 existing beats are not re-recorded.
6. Nothing drawn names a binding, a protocol version or the SDK (invariant 3 of the phase spec), read on every tile and notice the sitting meets.

## Open items

Left to the plan:

1. The questions' wording, and how many there are.
2. Which press each app takes.
3. The fields read in the journal.
4. The publishers the loop's apps and the finders are published under.
5. The environment the old fleet runs in.
6. What beat 36's test asserts.
7. Where the git-ignored folder for the scratch state sits.

## Amendments of 2026-11-14

### The request for more access on GitHub, Calendar and Linear

In `deterministic`, GitHub, Calendar and Linear paint no press that needs more access: GitHub's Submit and Approve, Calendar's confirming of an event and its RSVP, and Linear's confirming of a change appear in no answer a person can reach from the canvas. Their request for more access is taken in the `stub` pass, on the loop's scratch state: a question to each app whose answer paints the press, then the press, Allow and the press sent again, read in the journal on the app's first path. Gmail's and CircleCI's stand from the loop's pass. Amends decisions 6 and 10.

### GitHub's request for more access is left to the test suites

The agent kit reads a press's scopes in `deterministic` alone; in `stub` and `live` a request for more access comes from a write tool the model calls. GitHub's canned tools only read, so its request for more access does not arise in `stub`. GitHub's request, on gRPC at A2A 1.0, is left to the fake agents of the platform's test suites, as gRPC at A2A 0.3's is, and the record says so; a Backlog line gives GitHub's canned tools a write. Amends decision 6 and the amendment above.
