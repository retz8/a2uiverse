# Phase 20 sitting log: integration and acceptance

The sitting of 2026-11-14 for sub-task 20.12, from 19:09 to 20:40, driven by Claude in Chrome through the dev tunnel, the browser on its far side. It ran the six parts of the [20.12 task spec](spec/task-20.12-integration-acceptance.md) in its order: the ecosystem run's loop for six new apps, one on each path; beat 36 on the loop's launch; the three merges with the agents in `stub`; the registry as it was installed before Phase 20, on the real state; upstream's two restaurant finders; and the seven kit agents as they stood before Phase 20. Every instant is Korea Standard Time, the journal's UTC plus nine hours, read from the intent journal of the orchestrator that ran the pass. A path is one binding at one A2A version.

---

## 1. Commits and settings

| Part | `a2uiverse` | `a2uiverse-apps` | `../a2ui-upstream/` |
| --- | --- | --- | --- |
| The loop, beat 36 | `c5c9dcb` | `34feeca` | |
| The `stub` pass | `c5c9dcb` | `34feeca`, its GitHub agent restarted at 20:05 with the change of section 10 loaded | |
| The registry installed before the phase | `c5c9dcb` | `34feeca` | |
| The finders | `c5c9dcb` | | `0888f88b2` |
| The old fleet | `c5c9dcb` | a worktree at `987f12f` | |

No platform code changed during the sitting: the change to `a2uiverse` is beat 36, its entry in the recorder's list of beats and its test. The closing's confirming round of decision 16 did not run.

The settings:

1. The Planner on `claude-sonnet-5-5` at effort `low`, the Synthesizer on `gemini-3.8-flash`, their defaults.
2. The kit agents in `deterministic`, and in `stub` on `gemini-3.8-flash`, their agents' default.
3. The finders on `gemini-3.6-flash`, their default.
4. The client served as a production build of `c5c9dcb`, `vite preview` on port 5173, the browser's viewport 1568 by 736.
5. The tunnel forwarding the client (5173), the orchestrator (10001), the five vendor agents (11001 to 11005) and Shop C (12003), each Public. The marketplace's port, 10002, was not forwarded. 12003 was forwarded at 19:22, after Shop C's first launch; until then the tunnel forwarded the marketplace in its place.

---

## 2. The six paths through the loop

Each reading is the journal's: the A2A version and binding of the interface a dispatch used, from the dispatch record of the answer or press named. No dispatch of the loop recorded an interface passed over.

| Path | New app | Published | Offered and installed | Signed in | Composed | Pressed | More access |
| --- | --- | --- | --- | --- | --- | --- | --- |
| gRPC at A2A 1.0 | Shop C | by hand with Stellify, its card's signature passed | offered at 19:25:37, installed at 19:25:55, the card's signature journaled as passed | by device code, at 19:27:58 | 19:27:59, gRPC at 1.0, through the trade member's own card | 19:28:30 sort, 19:28:42 trade prices, gRPC at 1.0, through her card | none on Shop C's card |
| HTTP+JSON at A2A 1.0 | Gmail | by the launcher | offered at 19:29:21, installed at 19:31:32 | 19:32:11 | 19:32:12, HTTP+JSON at 1.0 | 19:33:24 open a thread | 19:33:24 auth-required, Allow, 19:33:50 sent again, HTTP+JSON at 1.0 |
| JSON-RPC at A2A 1.0 | CircleCI | by the launcher | offered at 19:36:05, installed at 19:38:16 | 19:38:56 | 19:38:57, JSON-RPC at 1.0 | 19:39:35 open a run, 19:40:26 rerun | 19:41:01 auth-required, Allow, 19:41:33 sent again, JSON-RPC at 1.0 |
| JSON-RPC at A2A 0.3 | Calendar | by the launcher | offered at 19:29:21, installed at 19:31:46 | 19:32:36 | 19:32:46, JSON-RPC at 0.3 | 19:34:32 open an event | in the `stub` pass: 19:59:23 auth-required, Allow, 19:59:53 sent again, JSON-RPC at 0.3 |
| HTTP+JSON at A2A 0.3 | Linear | by the launcher | offered at 19:36:05, installed at 19:36:36 | 19:37:12 | 19:37:13, HTTP+JSON at 0.3 | 19:42:03 open an issue | in the `stub` pass: 20:00:58 auth-required, Allow, 20:01:38 sent again, HTTP+JSON at 0.3 |
| gRPC at A2A 0.3 | Shop B | by the launcher | offered at 19:23:45, installed at 19:24:26 | its key connected from the Mac, at 19:24:49 | 19:24:51, gRPC at 0.3 | 19:25:15 sort, gRPC at 0.3 | left to the fake agents of the platform's test suites (decision 6) |

GitHub and Shop A were installed before the loop. GitHub answered every dispatch and its press on gRPC at A2A 1.0, its first path, and Shop A on JSON-RPC at A2A 1.0, the first of the kit's default list. GitHub's request for more access is left to the fake agents of the platform's test suites (the amendment of 2026-11-14, "GitHub's request for more access is left to the test suites").

---

## 3. The loop

The scratch state lived in `.state/sitting-20.12/loop/`: the marketplace and the orchestrator each on a state directory of its own, the embedding model copied into each, the agents' sign-in stores, the publishers and the captured output.

1. 19:10 to 19:11: the launcher, `pnpm dev:agents --tier default,mocks --mode deterministic --publish --leave-uninstalled gmail,calendar,circleci,linear,shop-b`, its publisher kept in the scratch folder, published the seven kit apps as `a2uiverse-apps` at card `0.2.0`, installed GitHub and Shop A from the marketplace and left the other five uninstalled.
2. 19:10: Shop C started by hand with its sign-in page on 12003's tunnel address. `halide-supply` claimed with Stellify; the preview taken as Mara Okafor, the trade member, noted the card's signature passed (key `v_mneG_5hbmrPxta`, ES256), the card the agent serves her account read and its signature passed; Shop C published at card `0.1.0` in the basic catalog.
3. 19:23:45: "Compare camera prices at Shop A, Shop B and Shop C." Shop A answered; the offer drew Shop B by `a2uiverse-apps` and Shop C by `halide-supply`, beside "Only Shop A answered, so there's nothing to combine." Install on Shop B passed the consent card ("The first time you use it, Shop B will ask you to connect with a key."); its slot read "Connect Shop B to show it here." Its demo key was connected from the Mac, and Connect pressed on the canvas brought the slot's answer; the merge joined Shop A and Shop B.
4. 19:25:37: the same question again, from the canvas, offered Shop C alone. Install passed the consent card ("See Halide Supply's stock and your member prices"); the slot read "Sign in to Shop C to show it here." The code page showed "Your code" with Copy; Shop C's own page showed the same code with Mara Okafor chosen, and Approve ended on "You're signed in". The merge joined the three stores.
5. 19:28:42: "What are my trade prices at Halide Supply?" went to Shop C's one account alone, through Mara's own card, and painted a Trade price column.
6. 19:29:21: "What needs my attention today across my inbox, my calendar and GitHub?" GitHub asked for sign-in; Gmail and Google Calendar were offered in two slots. After the three sign-ins the merge joined Gmail, Google Calendar and GitHub. A press on a thread in Gmail asked for more access on Gmail's attribution row ("Gmail needs more access to finish this. It will also be able to: Read your email"), and Allow sent the press again.
7. 19:36:05: "What's the status of what I'm working on: my Linear issues, their GitHub pull requests and their CircleCI runs?" Linear and CircleCI were offered in two slots. The merge joined Linear, GitHub and CircleCI. CircleCI's rerun asked for more access ("Rerun and cancel your workflows"), and Allow sent it again.

The sign-in apps signed in as their fake accounts on their own sign-in pages, through the tunnel. Shop C's install, sign-in and three dispatches are its three capabilities' passing cases: its card's signature passed at install; the device-code sign-in ran through the code page; the trade question went through the member's own card. No refusal was staged.

---

## 4. Beat 36

Shop C was uninstalled from the scratch registry at 19:44, its part of the loop done: the recorder signs every installed app in as a fake account, and Shop C signs in by device code.

1. `record:beats --model deterministic --beats 36` through the loop's orchestrator, every account held already, recorded "What needs my attention today?" at 19:44:44: 15 batches in 32.3 s, the layout at 5.3 s, the first fragment at 6.4 s.
2. The question gathered Linear beside Gmail, Google Calendar and GitHub, SPEC section 7's fan-out over the installed apps that hold part of the answer. The four dispatches: GitHub on gRPC at A2A 1.0, Gmail on HTTP+JSON at A2A 1.0, Calendar on JSON-RPC at A2A 0.3, Linear on HTTP+JSON at A2A 0.3.
3. The privacy gate, given the account address and the name a fixture must not carry, passed the file. Run over every recording, it fails on `beat-24-step-unseen.json`, recorded in Phase 9, which holds the name as the assignee in Linear's deterministic `open-issue.json` fixture of `a2uiverse-apps`. The 35 existing beats are untouched.
4. The file is `apps/client/recordings/beats/beat-36-temporal-merge-spread.json`. Its test in `apps/client/src/canvas/messageVersion.test.ts` checks that each of the four fragments carries a `paintMeta` naming the surface it creates, Linear's having crossed HTTP+JSON at A2A 0.3 where a part's metadata does not reach the hub, keeps its app's own message version, and lands in its slot drawn in its catalog.

---

## 5. The `stub` pass

The seven kit agents restarted at 19:49 in `stub` with `--no-install`, on the loop's scratch state.

1. 19:50:21, the temporal merge's question: Calendar on JSON-RPC at A2A 0.3, Linear on HTTP+JSON at A2A 0.3, GitHub on gRPC at A2A 1.0, Gmail on HTTP+JSON at A2A 1.0. GitHub asked which repository to check and arrived after the merge, with Include offered.
2. 19:51:17, the entity join's question: Linear on HTTP+JSON at A2A 0.3, CircleCI on JSON-RPC at A2A 1.0, GitHub on gRPC at A2A 1.0.
3. 19:52:54, "Compare camera prices at Shop A and Shop B.": Shop B on gRPC at A2A 0.3, Shop A on JSON-RPC at A2A 1.0.

Each fragment was painted by the kit's model executor, its log reading "surface valid". The merges' content was not judged.

The amended requests for more access:

1. Calendar, 19:58:41: "Propose a 30-minute design sync with Mei Silva on my calendar tomorrow at 10:00." painted a proposed event; Create event asked for more access ("Add events and answer invitations on your calendar"), and Allow sent it again.
2. Linear, 20:00:23: "Move Linear issue A2U-7 to In Review." painted the change; Move to In Review asked for more access ("Create, change and comment on your issues"), and Allow sent it again.
3. GitHub: a review form's Submit Review (`submit-pr-review`, 19:55:05) and a pull request's Approve (`approve-pull-request`, 19:57:58) went to the agent on gRPC at A2A 1.0 and asked for nothing, the agent answering in words that it cannot submit a review. The agent kit reads a press's scopes in `deterministic` alone; in `stub` a request for more access comes from a write tool the model calls, and GitHub's canned tools only read.

In all 21 dispatches of the pass, no interface was passed over.

---

## 6. The registry installed before the phase

The real marketplace and the real orchestrator, each on its own state, beside the spread fleet's default tier in `deterministic` with `--no-install`, on the agents' own sign-in stores.

1. The registry and the vault copied aside, 129 files, with their checksums, and the marketplace's state checksummed, 150 files.
2. The orchestrator's boot line named each of the five routable on its new first path, read from its live card: GitHub at its gRPC address, Gmail under `/rest`.
3. 20:12:10, the temporal merge's question: five "sign-in has run out" tiles for the person's own accounts, two of them Gmail's; each signed in again as a fake account; GitHub on gRPC at A2A 1.0, both Gmail accounts on HTTP+JSON at A2A 1.0, Calendar on JSON-RPC at A2A 0.3, Linear on HTTP+JSON at A2A 0.3, though each stored card lists JSON-RPC at A2A 0.3 alone. No update tile and no consent card.
4. 20:15:40, the entity join's question: GitHub on gRPC at A2A 1.0, Linear on HTTP+JSON at A2A 0.3, CircleCI signed in again and on JSON-RPC at A2A 1.0.
5. The Store, opened with the marketplace's port unforwarded, listed the seven; each of the five read "A small update is ready" with Update. No page of the Store failed.
6. In the App Library each of the five read "A small update is ready"; Update on each, from 20:17:18 to 20:18:14, went straight through, "… is updated to the newest version.", the journal writing an install-over from the marketplace; then each read Up to date.
7. 20:18:34, the temporal merge's question again: the six sources on their first paths, the merge over them.

The registry on disk then held the five from the marketplace at card `0.2.0`, each stored card listing the six paths with its app's own first path first, each catalog at the build 20.11 published: Calendar `sha256-f7RrwSoC…`, CircleCI `sha256-ACGhw85o…`, GitHub `sha256-_8sP4dsa…`, Gmail `sha256-JelTSVff…`, Linear `sha256-b2Dyp9NH…`. The secret sweep over the real state found no secret in 154 files. The vault was restored from its copy and its checksum read the same; the marketplace's checksums read the same. The registry's copy was dropped. In all 14 dispatches of the pass, no interface was passed over.

---

## 7. The finders

From `../a2ui-upstream/` at `0888f88b2`, unchanged, into the loop's scratch marketplace and registry.

1. The Node finder, `yarn workspace @a2ui/agent-restaurant-node run start` on port 11006, and the Python ADK finder, `uv run . --port 11007`, each serving an A2A 0.3.0 card. The Python finder's card names the A2UI extension at v0.8 and v0.9; the Node finder's names none.
2. `a2ui-samples-mirror` claimed with Stellify. The Node finder published in 33 s. The Python finder's first publish was refused, "the smoke request failed: the agent did not answer within 60 s": its first attempt failed its own A2UI check, "Surface default already exists", and its retry was still running. Its second publish was accepted in 50 s, again on its retry.
3. Both installed by id.
4. 20:25:04, "Find me Italian restaurants in New York from both restaurant agents, side by side.": both answered side by side on JSON-RPC at A2A 0.3.0, each ending on input-required.
5. Book Now in the Python finder at 20:26:23 and in the Node finder at 20:26:53, each on JSON-RPC at A2A 0.3.0, each painting its booking form.

The temporary worktree at `9e8a9bac5` was not needed. The worktree's `git status`, ignored files included, read the same before and after the pass.

---

## 8. The old fleet

A worktree of `a2uiverse-apps` at `987f12f`, its dependencies installed from the local store, launched over both tiers in `deterministic` and installed from local into an orchestrator of its own on `.state/sitting-20.12/oldfleet/`. Each of the seven cards was A2A 0.3.0 over JSON-RPC alone, and no agent listened on a gRPC port.

1. 20:29:26, the temporal merge's question: four sign-ins; the merge joined Gmail, Google Calendar and GitHub, Linear among them. A press on a thread in Gmail asked for more access at 20:31:52, and Allow sent it again. One press each in Calendar, Linear and GitHub.
2. 20:36:47, the entity join's question: CircleCI signed in; the merge joined Linear, GitHub and CircleCI. One press in CircleCI.
3. 20:38:30, the shops' merge: Shop B's key connected from the Mac; the merge joined Shop A and Shop B. One press in each.

All 17 dispatches that called an agent went out on JSON-RPC at A2A 0.3.0, none passing over an interface.

---

## 9. The closing

1. `pnpm verify` green in `a2uiverse` and in `a2uiverse-apps`.
2. The client's two Playwright suites: the one over the recordings, beat 36 among them, 134 of 134; the live one, 7 of 7.
3. The secret sweep: the loop's state, its three publishers, its captured output and the recordings, no secret in 212 files; the old fleet's state, no secret in 153 files; the real state, no secret in 154 files.
4. The state left: the real registry on the real marketplace's entries at the newer builds; the real vault restored; the real marketplace untouched; both scratch state directories removed; the worktree at `987f12f` removed; no process running.
5. The [tunnel environment](tunnel-environment.md)'s list of ports and its paragraph on Shop C corrected: the eight forwarded ports the client, the orchestrator, the five vendor agents and Shop C, the marketplace's port not forwarded, Shop C serving its own sign-in page with no proxy.

---

## 10. Fixes

None landed. A change to GitHub's sign-in in `a2uiverse-apps`, `f03defe`, named `submit-pr-review` among the presses that need more access; it changed nothing in `stub`, where the agent kit does not read a press's scopes, and was removed before it was pushed.

---

## 11. What the sitting found

No finding for upstream.

1. GitHub's canned tools only read, so its request for more access does not arise in `stub`; a Backlog line gives them a write.
2. The recorder signs every installed app in as a fake account, and stops on an app that signs in by device code, which has none.
3. Beat 24 holds the name the privacy gate guards, from Linear's deterministic fixture in `a2uiverse-apps`, and the gate run over every recording fails on it; a Backlog line.
4. The first sign-in window opened from a tile stayed blank five times, the request never reaching the orchestrator and the client's poll timing out; "Open the sign-in again" opened the sign-in each time. One install request from the offer never reached the orchestrator; after 60 s the slot read "That didn't go through, so nothing was installed.", and Try again installed the app. Both are the tunnel's.
5. Several presses did not go out on the first click: CircleCI's Rerun and Rerun failed jobs while its last press was still running, GitHub's Approve while its answer was still streaming, a Book Now while its list was still streaming, and two in the old fleet while the layout moved under the click. Each went out when pressed again.
6. An orchestrator started before the agents boots from the stored cards and would dial each app on JSON-RPC at A2A 0.3; on the real state it was stopped and started again after the agents.
