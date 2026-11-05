# 19.6 — Integration and acceptance on the mixed fleet

The live acceptance of Phase 19 through the tunnel, driven by Claude in Chrome: the seven apps taken through the update path in the real registry, the three merges run on the mixed fleet against their earlier recordings, the seven stamps read as sent, upstream's two restaurant finders installed from their card URLs alone, one fresh GitHub beat recorded for the client's replay gate, and the gates green in both repos. Sub-task 19.6 of Phase 19 (`_dev/docs/spec/phase-19-v09-beside-v091.md`, decisions 9 and 10). After 19.3 and 19.5; before 19.7.

## Scope

- The before side of the update path, rebuilt, and the update of all seven apps from the Store through the App Library.
- The Store page, every listing's sample painted.
- The temporal merge, the entity join and the shops' merge on the mixed fleet, and what each is compared against.
- Where each app's stamp is read in the live run.
- The ADK restaurant finder and the Node restaurant finder, installed and asked once each.
- The fresh GitHub beat, its test, and the privacy gate over it.
- What a break on the day becomes; the sitting's order; the state it leaves; the record.
- Out: the design records, SPEC §14, the root README and the findings file's entry (19.7); the 19.4 and 19.5 specs' text; any press inside a finder; images; any existing recording or fixture.

## Locked decisions

### 1. The before side is rebuilt from a worktree at the pre-phase commit

The registry no longer holds the five at card `0.1.0`: a local install-over rewrote it at `0.2.0` during 19.5's session and again before this sitting. The before side is rebuilt from a sibling worktree of `../a2uiverse-apps/` at `c626d84`, the last commit before 19.4, where every card is `0.1.0` with one flat v0.9.1 entry. The launcher runs from that worktree over both tiers in deterministic mode and installs the seven from local into the real registry, so it holds the fleet as a person who installed before the phase holds it; its agents are stopped once the registry holds them. The worktree is removed at the end of the sitting.

### 2. The fleet runs in stub mode on the real state

The current checkout's agents start over both tiers in `stub`, installing nothing, their sign-in pages on the tunnel pattern; the orchestrator runs on its real state directory with its tunnel base URL, the real marketplace as 19.5 left it beside it. The Planner and the Synthesizer run on their defaults. The eight forwarded ports are the client, the orchestrator, the marketplace and the five vendor agents' sign-in pages; port 11006 stays unforwarded. A case that a key or the model breaks falls back to `deterministic` for that case, named in the record. The finders run on their own default model with the project's Gemini key, as 18.3 ran them.

### 3. The update stage, with the Store pass inside it

The App Library reads "A new version is available" for each of the seven. Before any press, the Store is opened: the seven listings at `0.2.0`, the installed ones showing the update waiting in place of Install, each listing opened once and its sample painted from the preview 19.5 re-captured. Update is pressed seven times from the App Library, straight through. After, the App Library reads Up to date, the Store shows ✓ Installed on each, and the registry's seven records are read on disk at `0.2.0`, source `marketplace`, each card in the shape its set means.

### 4. Each merge is compared on the canvas and in the journal, on fixed points

The temporal merge, the entity join and the shops' merge are asked once each on the canvas by Claude in Chrome, the apps signed in as their fake accounts from their tiles and Shop B's key connected. Each is checked against its earlier recording two ways: on the canvas, beside the recording replayed on the client's own beat page; in the journal, the plan's layout and the merge it reserves, the dispatch records with their outcomes and first paints, and the synthesis's landing. The points compared, and nothing finer: the merge reserved over the same apps; each app's slot painted in its own catalog, no update tile and no refusal; a merged view of the same kind landed, the timeline, the join with its match claims, the comparison; the fragments' reading presses working as in 16.11. Content is not compared.

### 5. The seven stamps are read from the recorder's scratch run

On the fleet every card's entries name the same catalog ids per version, so the hub's per-version check can refuse nothing on the seven, and a landed paint says only that its stamp was accepted. Which version each app answered in is read from the beat recorder run for beats 5, 9 and 31 into a scratch directory after the canvas runs, through the daily orchestrator, beat 31 through the recorder's own as the store-loop beats run, Shop A from the registry and Shop B offered from the Store. The three files are read for each fragment's version against the fleet's sets: Gmail, Linear and Shop A in `v0.9`; GitHub and Shop B in `v0.9.1`; Calendar and CircleCI in `v0.9.1`, the newest the hub names. Nothing from this run is committed, and the scratch directory is removed.

### 6. The finders: installed from the card URL alone, asked once, no press

Both finders run from `../a2ui-upstream/` at `9e8a9bac5` on port 11006, one at a time, the ADK finder first, each installed through the registry command from its card URL alone into the real registry and uninstalled after. The ADK finder's install prints no basic-only note, its v0.8 entry passed over and its v0.9 entry read; the finder's own log shows the extension URIs the hub requested and the version it activated, `v0.9`. The Node finder's install prints the basic-only note as before, its card declaring no extension. Each is asked "Find me an Italian restaurant" once through the hub, routed to it alone, its list landing in its slot. No press.

### 7. Beat 35, `pr-list-v091`, with a test on its stamp

The fresh GitHub beat is beat 35, slug `pr-list-v091`, on beat 1's prompt, recorded in the same stub launch through the daily orchestrator with the kit's default model named. The privacy gate runs over the file before it is committed. The file joins the canvas-beats gate through the recordings' glob like every other, and `messageVersion.test.ts` gains one test that replays the recorded beat through the same path as the hand-built one and asserts every message of its fragment is stamped `v0.9.1`.

### 8. A break is fixed on the spot, on `main`

Each fix is its own commit with its test, and the case runs again from where it broke. A fix that needs a decision the phase spec does not settle is grilled in chat first and lands as a dated amendment to this spec; the records stay 19.7's. A sample finding goes to `_dev/a2ui-findings.md`, an a2a-sdk finding to `_dev/a2a-findings.md`, and what does not bear on the phase's claim to the Backlog.

### 9. The sitting's order

The before side; the fleet's launch; the update stage with the Store pass; the three merges; the recorder, the scratch run then beat 35; the finders; the closing. The recorder runs before the finders so the fleet's launch is not interrupted between two of its reads.

### 10. The closing and the state the sitting leaves

`pnpm verify` green in both repos; the secret sweep over the state the sitting left; the worktree and the scratch directory removed. The sitting leaves the registry holding the seven from the Store at `0.2.0`, the Store untouched, and no finder installed or running.

### 11. The record

The TODO line, when ticked, carries the run's facts as 18.3's does, the upstream commit the finders ran from and each merge's outcome among them. On-the-spot decisions are dated amendments to this spec. No sitting log, no images.

## Invariants

- No existing recording or fixture in either repo is re-recorded (phase decision 10).
- The samples are never changed.
- The Store's state is not changed by the sitting.
- The update path runs in the real registry, the one the orchestrator keeps in daily use.

## Amendments of 2026-11-05

### The vault around the sitting

The vault is copied aside before the first sign-in. The canvas's sign-ins rebind its expired accounts to the fake accounts. The recorder signs in `<app>.1`, which the sign-in start route refuses once a vault's next number has moved past it, so the daily orchestrator restarts on an empty vault for the recorder's runs. The copy is restored byte for byte at the closing. Amends decisions 4, 5, 7 and 10.

### Shop B's key

Connected from the Mac on `localhost:10001` through the recorder's `signInSource` and the demo key in `DEMO_KEYS`, under the bare app id, not typed on the key page through the tunnel. Amends decision 4.

### The version the ADK finder activates

The finder's log prints the extension URIs the hub requested and that the extension is active, not the version. The version is read from upstream's `try_activate_a2ui_extension`, run on the finder's card and those URIs. Amends decision 6.

### Calendar's reading press

A Calendar fragment holding no event has nothing to press, so its reading press runs on a canvas of its own. Amends decision 4.
