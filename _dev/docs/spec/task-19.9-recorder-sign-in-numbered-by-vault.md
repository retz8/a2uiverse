# 19.9 — The recorder signs in on a vault whose account numbers have moved

The beat recorder signs every app in through the orchestrator you run daily without guessing the account's number, so recording no longer needs an empty vault. Sub-task 19.9 of Phase 19 (`_dev/docs/spec/phase-19-v09-beside-v091.md`), found in 19.6: the recorder names each app's accounts from `.1`, and the sign-in start route refuses `<app>.1` once a vault's next number has moved past it, against the recorder's header and the client README saying an account already held is left as it is. Parallel with 19.7 and 19.8; before Phase 20.

## Scope

- How the recorder's sign-in library picks the account it signs in on the orchestrator it records through, and what it prints about the vault it found.
- The transparency check, the library's second caller: how its direct side pairs a hub slot with the fake account to sign in as.
- A beat naming its own accounts; the one replay test that hardcodes a recorded account number.
- The proof: the library's tests, the check's, the replay test, and one live run of each caller on the daily orchestrator's real vault.
- The words: the recorder's header, the client README's sign-in sentence, the transparency check's header, the beat spec's account comment.
- Out: the orchestrator — the start route and the vault's numbering stay as 14.3 decided them, a retired number restored only from a slot holding it; the fault and session beats, which run on an orchestrator of the recorder's own on an empty state directory; every recording, which Phase 19 re-records nothing of; the 19.6 spec's dated amendment, which stands as history.

## Locked decisions

### 1. The recorder signs in by the bare app id; the orchestrator numbers the account

The recorder sends the bare app id as the source for each account it signs in, the add-account path, and stops counting from 1. On an empty vault the vault hands out number 1, as today. On a vault whose numbers have moved it adds the next number, or lands on the held account when the fake identity is already there, refreshing it if it had lapsed — the vault's own rule that the same account signed in twice stays one, keyed by identity rather than by a number the recorder cannot know. The recorder reports the source the vault answered with. "An account the orchestrator already holds is left as it is" becomes true on every vault, not only one whose held account is number 1.

### 2. The transparency check pairs its direct side from the hub's sign-in result

The check's direct side no longer picks the fake account by the hub slot's number. It pairs each hub slot's source with the fake account the hub was signed in as for that source: the i-th source the hub reported for an app pairs with the i-th fake account named for that app. With one fake account per app today that is the source the hub answered; no number is assumed anywhere.

### 3. A beat's named accounts stay, their words corrected

The beat spec's field naming an app's accounts stays. Its words say the accounts are signed in in the order named and numbered by the orchestrator, no longer that the first is `<app>.1`. Two named accounts go out as two bare-id sign-ins in that order; on a second run both land on their held accounts.

### 4. The replay test over beat 35 reads its source from the fixture

The test over beat 35 in `messageVersion.test.ts` filters the recording's batches and waits for its placement on the fragment's source read from the fixture — the one non-shell source its batches carry — in place of the hardcoded `github.1`. The committed recording stays as it is; the change is for the first re-recording through a moved vault.

### 5. The sign-in line says what the vault answered and what it holds besides

Each account signed in is printed as the source the vault answered, the fake account, its label, and whether it was held already or added now. The line also names every held account the run did not sign in, with lapsed where it is, since the Planner plans a slot for every account an app holds and a lapsed one's slot paints a sign-in tile into the recording. Such accounts are left as they are: the recorder cannot sign them in, not knowing the identity behind them, and the person signs them in or out from the App Library first if they want them out of the recording.

### 6. What proves the sub-task

The sign-in library's tests over its fake orchestrator: the bare id sent as the source, the vault's source reported, a held account reported as held, two named accounts going out twice, the line naming a held account the run did not sign in. The transparency check's pairing. Beat 35's test on its read source. `pnpm verify` green. Then one live run of each caller on the daily orchestrator with its real state, whose vault today has every app's number 1 retired — GitHub holding 3, Gmail 2 and 3, Calendar 2 and Linear 2, all lapsed, CircleCI 2, Shop B none with next at 2 — the five apps from the current checkout in `deterministic`, the Planner on its real key: the recorder for one beat into a scratch directory, nothing committed, its sign-in line read; the transparency check once on the same stack, its direct side signed in from the pairing. No browser is involved. The vault is copied aside before the first sign-in and restored byte for byte after, as 19.6 and 19.8 did.

### 7. The words

The recorder's header and the client README's sign-in sentence say the orchestrator numbers the accounts and the vault need not be empty; the transparency check's header says how its direct side pairs; the beat spec's account comment per decision 3. No design record describes the recorder's sign-in, so none changes.

## Amendments of 2026-11-06

### A slot on an account the run did not sign in

A slot on an account the vault holds beside the run's has no fake account to pair with. The transparency check prints that slot as not compared and goes on. A source of an app that asks no sign-in has no pair either, and is sent with no credential. Amends decision 2.

### The account choice in a recording

On the daily vault beat 35's question, a command naming no account for an app holding two, planned the account choice over `github.3` and `github.4`: a recording of the choice with no fragment. The recorder flags a plain beat's take whose layout carries an account choice, naming the app, and exits non-zero, the file still written as a flagged take's is. A lapsed account's sign-in tile beside fragments stays the sign-in line's to say. The recorder's header and the client README say so, and name signing out from the App Library as the way to keep such accounts out of a recording, since signing a lapsed one in takes away its tile and leaves the choice. Amends decisions 5 and 7.

### The transparency check's question on the daily vault

The live run of the check asks "What needs my attention today?" through `--prompt`, a question about state, which gathers from every account. The check's default prompt is the same command as beat 35's, so on this vault it plans the account choice and sends nothing to compare. The client README says so. Amends decisions 6 and 7.

### A re-recording through the moved vault

Beside the recorder's one beat on the vault as it stands, one more take: the accounts the run did not sign in dropped from the vault's file with every next number kept, as signing them out leaves it with no revocation sent, the orchestrator restarted, beat 35 recorded into the scratch directory. Its fragment is `github.4`, every message `v0.9.1`, and beat 35's test passes with that file in the committed recording's place, the committed recording then restored. Amends decision 6.
