# @a2uiverse/registry-snapshot

The registry snapshot: the catalog table and the packed catalog artifacts of the seven catalog packages — the five apps' and the two mock stores' — laid out as the orchestrator serves its registry under `/registry` — `catalogs.json`, and each artifact's files under `artifacts/<id>/`. The client's tests load it through the real loader, and e2e and offline replays from the preview server.

```bash
pnpm --filter @a2uiverse/registry-snapshot build   # packs the seven into dist/registry
```

`appsCheckout` in `package.json` pins one commit of [`a2uiverse-apps`](https://github.com/retz8/a2uiverse-apps) and names each of the seven catalog packages' folders in it. The build fetches that commit into `.checkout/<commit>` and installs it once, by the apps repo's own lockfile, which builds the seven; later builds reuse it. It packs each with [Stellify](../stellify/) where the checkout holds it, names each artifact by its id, and writes the snapshot into `dist/registry`. Both folders are git-ignored and never committed. The table lists the client's own two catalogs first, the basic catalog and the shell catalog, as the orchestrator's does.

Packed in an apps checkout, each artifact is the one its publisher packs there, hash for hash.

Beside them it packs a second build of Shop A's catalog: the same package with its accent changed in light and dark, filed under its id but never in the table. `second-build.json` names the catalog and both builds (`{catalogId, first, second}`), for the replay suite's per-paint builds test to move a canvas onto.

`REGISTRY_SNAPSHOT_DIR` is the snapshot's root, `SECOND_BUILD_FILE` the second build's file.

To move the snapshot to a newer commit of the apps repo, change `appsCheckout.commit`, and a folder in `appsCheckout.catalogs` if a catalog moved. The next build fetches the new commit; an old commit's folder under `.checkout/` can be deleted.

## The fixed world

Beside the snapshot ships the world the trusted page reads on the preview server — the Store, the App Library and Publish: the seven apps listed under their publisher with their samples, six installed in six different update states and Linear left to install, Gmail on two accounts, Shop B on a key, the publisher signed in with Shop A's listing ahead of the Store.

- `storeWorld({recordings, table})` builds it from the client's recorded Store captures (`apps/client/recordings/store`) and the snapshot's `catalogs.json`: each card and sample recorded, each build the snapshot's, each state written in `world.js`. It throws when the two have moved apart — record the Store again (`record:store`, in the client's README) when the pin moves.
- `searchWorld(world, words)` is the Store's search over it: the apps whose card carries every word of three letters or more.

The client's preview server serves it with the snapshot; each e2e test answers its own writes.

How the client loads what this holds is in [`docs/design/app-install.md`](../../docs/design/app-install.md).
