# scripts

The launcher, which starts the apps from an [`a2uiverse-apps`](https://github.com/retz8/a2uiverse-apps) checkout and installs them into the orchestrator, and the secret sweep, run after a sitting.

## Quick start

```bash
git clone https://github.com/retz8/a2uiverse-apps ../a2uiverse-apps
pnpm install
pnpm agents:list    # what a launch would run, and what would stop it
pnpm dev:all        # the five apps and the platform, each app installed as it comes up
```

## Commands

```bash
pnpm dev:all [flags]          # the apps and the platform, the apps installed
pnpm dev:agents [flags]       # the apps only, installed into an orchestrator you started yourself
pnpm agents:list [--tier <tiers>] [--publish]   # what a launch would run; exits non-zero on what would stop one
pnpm sweep:secrets [flags]    # after a sitting: every token and key searched for in what it left, counts only
pnpm test:scripts             # the scripts' own tests
```

| Flag of `dev:all` and `dev:agents` | What it does                                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `--tier <tiers>`                   | `default`, the five apps; `mocks`, the two mock stores; or several joined by commas, `default,mocks` |
| `--only <ids>`                     | Only these roster apps, by id, joined by commas                                                      |
| `--mode deterministic\|stub\|live` | The agents' mode, `deterministic` by default                                                         |
| `--agents-dir <path>`              | Another `a2uiverse-apps` checkout than `../a2uiverse-apps`                                           |
| `--no-install`                     | Starts the agents only, for installing by hand with the orchestrator's `registry` command            |
| `--publish`                        | Takes every app through the marketplace instead, each installed from it by id                        |
| `--leave-uninstalled <ids>`        | With `--publish`: publishes these apps and leaves them uninstalled, in the Store for a slot to offer |
| `--publisher-file <path>`          | Keeps the dev publisher in this file instead of `scripts/.state/stellify/publisher.json`             |
| `--agent-state <dir>`              | Keeps each agent's sign-in store in `<dir>/<app id>` instead of its own `.state/`                    |

| Flag of `sweep:secrets`     | What it searches                                                          |
| --------------------------- | ------------------------------------------------------------------------- |
| `--state-dir <dir>`         | The orchestrator's state directory: its journal, its vault, its publisher |
| `--agents-dir <dir>`        | The apps checkout, for each agent's sign-in store                         |
| `--marketplace-state <dir>` | The marketplace's state, all of it but the embedding model                |
| `--dev-publisher <file>`    | The launcher's dev publisher, when not at its own place                   |
| `--publisher <file>`        | Another publisher's file, a person's own; repeatable                      |
| `--logs <dir>`              | A folder of captured process output; repeatable                           |

| Variable                                | What it does                                                                                                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `A2UIVERSE_AGENTS_DIR`                  | The apps checkout, as `--agents-dir`                                                                                                                              |
| `A2UIVERSE_PUBLIC_URL`                  | A pattern with a `{port}` slot, such as `https://<tunnel-id>-{port}.asse.devtunnels.ms`: each agent's `--public-url`, where the browser reaches its sign-in pages |
| `MARKETPLACE_URL`                       | The marketplace `--publish` publishes to, the one the orchestrator installs from; `http://localhost:10002` by default                                             |
| `STELLIFY_HOME=scripts/.state/stellify` | Gives Stellify's command line the dev publisher by hand                                                                                                           |

## Ports

The client `5173`, the orchestrator `10001`, the marketplace `10002`. The orchestrator reaches the apps, and the browser only their sign-in pages. The roster, `dev-roster.mjs`, gives each app its folder in the checkout, its tier and the port its agent was scaffolded on:

| App        | Folder         | Tier    | Port  |
| ---------- | -------------- | ------- | ----- |
| `github`   | `github`       | default | 11001 |
| `gmail`    | `gmail`        | default | 11002 |
| `calendar` | `calendar`     | default | 11003 |
| `circleci` | `circleci`     | default | 11004 |
| `linear`   | `linear`       | default | 11005 |
| `shop-a`   | `mocks/shop-a` | mocks   | 12001 |
| `shop-b`   | `mocks/shop-b` | mocks   | 12002 |

A new app joins the roster with the port its agent was scaffolded on.

## The launcher

- **A launch runs one tier, or several** joined by commas. The default tier is the five apps; the two mock stores, for testing the merged view, run in place of them under `--tier mocks`, or beside them under `--tier default,mocks`.
- **It installs what it runs.** It starts the agents and the platform together, builds each app's catalog package in the checkout, packs it with Stellify and, once the orchestrator answers, installs each app as its agent comes up. Then it uninstalls every roster app it did not install; an app you installed by hand that the roster doesn't name is left alone. `dev:agents` does the same against an orchestrator you started yourself; `--no-install` starts the agents only.
- **`--publish` takes every app through the marketplace instead**, so each counts as installed from it. It publishes as the dev publisher `a2uiverse-apps`, claimed on the first launch, its token kept in `scripts/.state/stellify/publisher.json` or the file `--publisher-file` names, never in your own Stellify publisher file; a marketplace whose state was wiped no longer knows the token, and the launcher claims the name again. Each app, once up: an app whose card requires sign-in is previewed first, signed in as the fake account its roster entry names, or with Shop B's demo key; then published; then installed by its id alone. Under `--mode live` the preview comes from a second copy of the agent in deterministic mode on a free port, stopped once it's taken, and the app is published with the live agent's card.
- **When the marketplace can't take the launch**, nothing is installed and the line says what to do: it never answers, it holds the name under a token the launcher no longer has, or the publisher file names another marketplace. The launcher never unpublishes; the notices for the dev publisher's apps that are ahead of the Store and weren't published this launch print at the end.
- **Publish with the same `A2UIVERSE_PUBLIC_URL` every time** against one marketplace state: an app's card carries its addresses, and the marketplace refuses a changed card at a version it has already published. Switching means wiping the marketplace's state, or moving the `version` in the agent's `app/config.py`.
- **`--publish` is refused beside `--no-install`**; with it, `agents:list` also names the marketplace, the publisher file's state and each preview's account. `--leave-uninstalled` needs `--publish`, and an install of an app an earlier launch left uninstalled is taken out: `pnpm dev:all --tier mocks --publish --leave-uninstalled shop-b`.
- **Agents' addresses and state.** Each agent starts with `--host localhost` and its roster port. The launcher hands no credential to an agent — each reads its own `agent/.env` — and under `--publish` holds only the dev publisher's token and each preview's credential, for that one preview.
- **Failures are named, never papered over.** An app that doesn't build, pack or come up, or is refused at preview, publish or install, is named with its reason and left out, uninstalled if an earlier launch installed it; the rest run. A roster app missing from the checkout is skipped. An unknown tier, an unknown `--only` id, or two apps of a tier on one port stop the launch. Stopping the launcher uninstalls nothing: the next launch sets the registry right.

## The secret sweep

`sweep:secrets` collects every secret a sitting created — the vault's tokens and keys, each agent's sign-in store, each publisher's token — and searches the journal, the marketplace's state and every captured output file for them. It prints how many secrets each file holds, never a secret, and exits non-zero when any file holds one. What reached the browser is not searched.

Why the launcher works this way: the launcher sections of the [app install](../docs/design/app-install.md#dev-harness-the-launcher-and-the-snapshot) and [marketplace](../docs/design/marketplace.md#dev-harness-the-launcher-under---publish) design records.
