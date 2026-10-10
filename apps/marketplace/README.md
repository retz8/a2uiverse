# @a2uiverse/marketplace

Where A2UIVerse apps are published and found. The marketplace keeps the index of every published app's agent card, with the card's skills embedded so words can find an app the person hasn't installed yet; hosts each app's catalog artifacts in the same static layout the orchestrator's registry serves, so an install fetches only the files it lacks; and runs the publish step, which tries a new app by asking it to paint its first screen before it is listed. The Store page in the client will browse it; the orchestrator installs from it by app id alone.

A **publisher** is a name plus a secret: claimed once, the token kept in the publisher's own home directory by Stellify, never in a checkout. An app id and a catalog id belong to the publisher who first published them, and only that token may publish over them — unpublishing the app does not release them. Who a publisher is is not verified.

Everything runs locally. Port **10002**.

## Commands

```bash
pnpm dev:marketplace                                            # from the repo root
pnpm --filter @a2uiverse/marketplace build | typecheck | test | lint
pnpm --filter @a2uiverse/marketplace marketplace search <words...>   # the search route, by hand
```

## Configuration

| Variable                          | Default                  | What it does                                                                                         |
| --------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `PORT`                            | `10002`                  | The port the routes are served on, at its root                                                       |
| `STATE_DIR`                       | `.state` in this package | The state directory: the served subtree, the publishers, the embedding model's cache                 |
| `A2UIVERSE_CARD_TIMEOUT_SECONDS`  | `10`                     | How long a live-card fetch may take — at publish, at the refresh at boot, and on a report            |
| `A2UIVERSE_SMOKE_TIMEOUT_SECONDS` | `60`                     | How long the smoke request may take: the agent's answer to its first request, a model's in live mode |
| `MARKETPLACE_URL`                 | `http://localhost:$PORT` | Where the `marketplace` command reaches the running process                                          |

`dev` reads a `.env` in this package when one exists. The first boot downloads the embedding model (about 23 MB) into `STATE_DIR/models`; the orchestrator keeps its own copy.

## Routes

At the root of the port, no prefix. The reads take no token and are shaped like static files, so a directory of the same layout — `STATE_DIR/public/` — answers them with no marketplace running.

| Route                           | Method | Token  | Answers                                                                                                                                                                                                                                       |
| ------------------------------- | ------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.json`                    | GET    | —      | Every entry, as a list; `no-cache`                                                                                                                                                                                                            |
| `apps/<appId>/entry.json`       | GET    | —      | One entry: the card as published, each catalog id at its build, every version published, the lines retired, the ahead-of-the-Store flag; `404` when not published                                                                             |
| `apps/<appId>/preview.json`     | GET    | —      | The app's preview: the smoke test's paint as A2UI messages, with the words it was asked; `404` when not published                                                                                                                             |
| `artifacts/<artifactId>/<path>` | GET    | —      | An artifact's files, exactly as the registry serves them; immutable                                                                                                                                                                           |
| `search?q=<words>`              | GET    | —      | `{results: [{entry, score}]}` in rank order, every entry with its score; `400` with no words                                                                                                                                                  |
| `claim`                         | POST   | —      | `{publisher}` in; `201` with `{publisher, token}` once; `409` for a taken name; `422` for one the grammar refuses                                                                                                                             |
| `publish`                       | POST   | bearer | The registry's install body with a captured preview beside it — `{appId, cardUrl, catalogs: [{files}], preview?}`; `200` with `{ok, appId, version, summary, notes}`; `401`, `403` for another publisher's names, `422` listing every finding |
| `unpublish`                     | POST   | bearer | `{appId}`; `200` with `{ok, appId}`; `401`, `403` for another's app, `404` when not published                                                                                                                                                 |
| `report`                        | POST   | —      | `{appId}`, a nudge that the app may be ahead of the Store; `202` at once, the live card refetched after                                                                                                                                       |

Every refusal body is `{ok: false, findings: [...]}`. The shapes, the readers and the route constants are the sdk's (`@a2uiverse/sdk`, `marketplace.ts`).

## The state directory

```
STATE_DIR/
  public/                        the served subtree, the truth the process boots from
    index.json                   every entry, regenerated after each write
    apps/<appId>/entry.json      one entry per published app
    apps/<appId>/preview.json    its preview
    artifacts/<artifactId>/...   each catalog artifact's files, content-addressed
  publishers.json                owner-only: each publisher's name, token hash, claim time, and the app ids and catalog ids they own
  models/                        the embedding model's cache
```

A fresh directory is a valid, empty marketplace. At boot every entry and preview is read through the sdk's validators and every artifact re-hashed; a damaged file stops the boot, naming its path. Every write is a temporary file renamed into place, and writes run one at a time. The skill embeddings are not persisted: every card is embedded at boot and on each publish. The token is stored as its SHA-256 only and returned once at the claim; a lost token is a lost name.

## The publish step

In order, by the publisher the token names. The app id is checked against its grammar; one owned by another publisher answers `403` alone, before anything is fetched. The live card is fetched from the card URL given. The catalog ids it declares are read; one owned by another publisher answers `403`, whether or not an artifact was handed for it. From there every finding is collected and answered together, as install answers:

- the static gate over each artifact — the descriptor, every file at its hash and nothing unlisted, the host interface, the schema compiling under its own id — the same gate the registry runs, from the sdk;
- no two artifacts for one id, and none for the basic or the shell catalog;
- coverage both ways: every declared id handed now, public, or already held by the marketplace for this publisher — so a publish that changes the card alone hands nothing — and every artifact handed for a declared id;
- a build moving a held row is an additive evolution of the held schema: nothing removed, no type changed, no constraint tightened; a breaking change is a new catalog id;
- the version rule: at the published version the card must be unchanged, builds free to move; a version published before and moved past is refused; a version never published is a card change, and the ids the old card named and the new one does not are recorded as retired;
- the preview rule: an app whose card requires sign-in hands the preview `stellify preview` captured at this version; an app whose card does not hands none.

Then the **smoke test**: one A2A request, advertising exactly the entitlement the app will have when installed — its declared catalog ids plus the basic catalog — with the card's own words, its first skill's first example, else "Hello! Show me what you can do." An app that needs no sign-in must answer and end its task — a stream with no final event, or a task ended as failed, canceled or rejected, is a finding — and its paint must create a surface, paint only in its entitlement, validate against each catalog's schema and carry no credential input. That paint becomes the preview. An app whose card requires sign-in is sent the request with no credential and passes by answering HTTP 401, or by ending the task as `auth-required` naming a scheme its card declares; its preview is the one handed, checked exactly as a live paint is. No credential ever reaches the marketplace.

On success the artifacts are written, the row for each handed id moves to the new build — every app of the publisher naming the id following, named in the notes — the entry, the preview and the ledger are written, the card embedded, `index.json` regenerated, and every row nothing names any more let go. The summary reads as install's does: `published shop · card 0.1.0 · catalog sha256-xxxxxxxx…`.

## Ahead of the Store

The live card is the only copy of the card that says what the agent does now. At boot, after the routes are up, every published app's card is refetched; a report from a registry is the same check on request, one fetch in flight per app id. A live card naming a catalog id the index has no artifact for, or carrying a version the index does not know, sets the entry's `aheadOfStore` — the ids, the version, when seen; a card back in line clears it; a card that cannot be fetched, or whose declaration is malformed, leaves the flag as it was. The listing waits for the publisher, who is told at their next Stellify contact.

## Trying it by hand

With an agent running at `http://localhost:11001`:

```bash
# claim a name once; keep the token
curl -s -X POST localhost:10002/claim -H 'content-type: application/json' -d '{"publisher":"acme"}'

# publish: the card URL, each packed artifact directory's files as base64 (Stellify does this for you)
curl -s -X POST localhost:10002/publish -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"appId":"github","cardUrl":"http://localhost:11001/.well-known/agent-card.json","catalogs":[{"files":{...}}]}'

curl -s localhost:10002/apps/github/entry.json
pnpm --filter @a2uiverse/marketplace marketplace search "pull requests waiting on me"
```

The tests stand up a scripted A2A agent in-process and drive every route and every refusal through it; `pnpm --filter @a2uiverse/marketplace test`.

## Further reading

- [`docs/design/marketplace.md`](../../docs/design/marketplace.md) — the design record over one running example, publish to install (written with the phase's last task).
- [`docs/design/app-install.md`](../../docs/design/app-install.md) — the registry's install, whose gate and static layout this process shares.
- [`packages/sdk/README.md`](../../packages/sdk/README.md) — the contracts: the entry, the preview, the bodies, the checks both sides run.
