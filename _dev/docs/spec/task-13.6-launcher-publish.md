# Task 13.6 — Dev harness: the launcher publishes the roster and installs from the marketplace

Sub-task 13.6 of Phase 13 (`_dev/docs/spec/phase-13-marketplace-publish.md`, decision 17): the launcher's flag beside `--no-install` that claims a dev publisher name, publishes each roster app to the marketplace after starting its agent, and installs each from the marketplace by app id alone. Over Stellify's programmatic API from task 13.4 and the orchestrator's install by id from task 13.5. Amends phase decision 17.

## Scope

- The flag, its name, and the combinations it refuses.
- The dev publisher: its name, its file, and the claim against a marketplace whose state can be wiped.
- The marketplace the launch publishes to.
- Each sign-in app's preview credential, and where the launcher keeps what it needs to obtain one.
- The order of a launch under the flag, its failures whole and per app, the reconcile.
- The ahead-of-the-Store notices, the closing summary, `--list` under the flag.
- Tests, one real launch by hand, and the documents of this session.
- Out: Stellify's pin moved on every catalog package, `preview` run on each app, and whether the kit mints a credential for its own publisher in live mode (13.7); the acceptance by hand over every update state (13.8); `docs/design/app-install.md` and `docs/design/marketplace.md` (13.9).

## Locked decisions

### 1. The flag

`--publish`. Under it the launcher establishes the dev publisher, publishes each launched roster app to the marketplace, and installs each from the marketplace by id through the install route, the body carrying the app id alone, so every app it installs counts as installed from the marketplace. Without it the launcher is unchanged and a launch needs no running marketplace. Beside `--no-install` it is a usage error, as it is beside `--mode live` (decision 8). It passes through `dev:all` with no package script of its own.

### 2. The marketplace

Resolved exactly as the orchestrator resolves its own: `MARKETPLACE_URL` over the orchestrator's `.env`, the shell's environment winning, else `http://localhost:10002` — as the launcher already finds the orchestrator's address and state directory. The launcher publishes to the marketplace the orchestrator installs from.

### 3. The dev publisher's name

One fixed name in the launcher, `a2uiverse-apps`, with no override.

### 4. The publisher file

The launcher keeps its dev publisher in a file of its own in the shape of Stellify's publisher file — the marketplace's address, the name and the token — at `scripts/.state/stellify/publisher.json`, gitignored, so `STELLIFY_HOME` pointed at its directory gives Stellify's command line the dev publisher by hand. The person's home-directory publisher file is never read or written. The launcher calls Stellify's API with the address and the token explicit.

### 5. The claim, and the file disagreeing with the marketplace

With no file, the launcher claims the name and writes the file. When the marketplace answers 401 to the file's token, its state wiped, the launcher claims the same name again and rewrites the file. A claim answered 409 — the name held under a token the launcher no longer has — stops the marketplace path, in words naming the marketplace's state to wipe. A file naming another marketplace than the one resolved stops the marketplace path, in words naming both addresses and the file to move or delete. The launcher overwrites a token only once the marketplace has disowned it.

### 6. When the marketplace path cannot run

A marketplace that does not answer within the launcher's wait, bounded as the orchestrator's is, or a publisher that cannot be established (decision 5), is treated as an orchestrator that does not answer: the apps run, nothing is installed, no reconcile runs, and one line says why.

### 7. The order of a launch

Once the marketplace answers, the publisher is established once, before any publish. Each app, once its card answers: the preview when its card requires sign-in, then publish, then install by id; the apps in parallel, as today. The preview is held in memory and handed to publish, never written to a file. Under `--mode stub` every launch spends one model call per app — the preview for a sign-in app, the marketplace's smoke test for one with no sign-in.

### 8. The preview's credential

For an app on the kit's sign-in, the launcher signs in straight at the agent through the kit's non-interactive entry, as one fake account per app, for the scopes the card's first `security` alternative asks, as the client's transparency check does; Shop B is given its demo key. Each credential is used for its one preview and never written, printed, or sent to the marketplace. The account each app previews as and Shop B's demo key are on the app's roster entry; the launcher carries its own direct sign-in. The non-interactive entry is refused in live mode, so `--publish` beside `--mode live` is a usage error whose words say so. Each launch leaves one registered client and one issued token in each sign-in agent's own sign-in store, unrevoked, as the transparency check does.

### 9. A failure of one app

A preview that fails, a publish the marketplace refuses — a card changed at a version already published among them — or an install by id the orchestrator refuses leaves that app out, named, with the marketplace's or the orchestrator's findings unchanged; the steps after the failed one are not attempted for it, and the reconcile uninstalls any install of it an earlier launch left. No app falls back to the install from the checkout.

### 10. The reconcile

The registry's alone, as today. The launcher never unpublishes: the marketplace keeps what the dev publisher has published, an app whose agent is not running staying listed.

### 11. The notices

The ahead-of-the-Store notices the API returns are printed once, at the end beside the summary, for the dev publisher's apps this launch did not publish successfully; the notices of the apps it published are dropped.

### 12. The summary

The launch's closing line names the apps published beside those installed, left out and uninstalled.

### 13. `--list` under the flag

The listing adds the marketplace address the launch would publish to, the publisher name, the publisher file's state — none, held for this address, or naming another marketplace — and, on each sign-in app's row, the account its preview signs in as. It contacts nothing, and its exit code ignores the publisher's state.

### 14. Proof

In `pnpm verify`, the launcher's pure tests under `node --test`: the flag refused beside `--no-install` and beside `--mode live`; the marketplace address resolved as the orchestrator's; the publisher file's lifecycle as a decision over the file's state and the marketplace's answers; the install-by-id body; the notices kept; the listing's lines. Before the task is done, one real launch under the flag by hand — the deterministic default tier, a fresh marketplace, the claim, every app published and installed by id — which also shows whether each deterministic agent paints for its card's first skill's first example. The acceptance over every update state stays 13.8's.

### 15. Documents

In this session: the launcher's header comment, which no longer says the launcher handles no credentials; the root README's flags line and its launcher section; the tunnel document's launcher paragraph. The phase spec's decision 17 amended: the flag is refused in live mode. `_dev/TODO.md`: the 13.7 line gaining that its live-mode credential decision is what could lift the launcher's live refusal; the 13.8 line gaining that `pnpm dev:all --publish` is the publish and the install by id. `docs/design/app-install.md`'s dev-harness section and code table stay 13.9's.

## Invariants

- No credential reaches the marketplace: a preview's credential goes to its agent alone.
- The dev publisher's token lives in the launcher's file alone and is never printed.
- Without the flag, a launch is unchanged.

## Open items

- Whether `--publish` beside `--mode live` is allowed, on 13.7's decision whether the kit mints a credential for its own publisher in live mode.
