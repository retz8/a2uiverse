# @a2uiverse/registry-snapshot

The registry snapshot: the catalog table and the packed catalog artifacts of the seven catalog packages — the five apps' and the two mock stores' — laid out as the orchestrator serves its registry under `/registry` — `catalogs.json`, and each artifact's files under `artifacts/<id>/`. The client's tests load it through the real loader, and e2e and offline replays from the preview server.

```bash
pnpm --filter @a2uiverse/registry-snapshot build   # packs the seven into dist/registry
```

The seven catalog packages are this package's dependencies, all pinned to one commit of [`a2uiverse-apps`](https://github.com/retz8/a2uiverse-apps). The build packs each with [Stellify](../stellify/) where pnpm installed it, names each artifact by its id, and writes the snapshot into `dist/registry`, which is git-ignored and never committed. The table lists the client's own two catalogs first, the basic catalog and the shell catalog, as the orchestrator's does.

An artifact packed here can differ from the one its publisher packs in the apps checkout, in `index.js` alone: esbuild writes each bundled module's path into the entry, and a dependency installed here sits at another path. GitHub's and Linear's differ this way; the other five are the same artifact, hash for hash.

`REGISTRY_SNAPSHOT_DIR` is the snapshot's root.

To move the snapshot to a newer commit of the apps repo, re-point every dependency to that commit, and each catalog's `allowBuilds` line in `pnpm-workspace.yaml` with it: pnpm builds each catalog on install and allows it by the tarball it resolved. Delete any line pnpm appends there with the value `set this to true or false`: it's pnpm asking about a tarball no entry allows yet, and one left behind for the old commit allows nothing.

## The fixed world

Beside the snapshot ships the world the trusted page reads on the preview server — the Store, the App Library and Publish: the seven apps listed under their publisher with their samples, six installed in six different update states and Linear left to install, Gmail on two accounts, Shop B on a key, the publisher signed in with Shop A's listing ahead of the Store.

- `storeWorld({recordings, table})` builds it from the client's recorded Store captures (`apps/client/recordings/store`) and the snapshot's `catalogs.json`: each card and sample recorded, each build the snapshot's, each state written in `world.js`. It throws when the two have moved apart — record the Store again (`record:store`, in the client's README) when the pin moves.
- `searchWorld(world, words)` is the Store's search over it: the apps whose card carries every word of three letters or more.

The client's preview server serves it with the snapshot; each e2e test answers its own writes.

How the client loads what this holds is in [`docs/design/app-install.md`](../../docs/design/app-install.md).
