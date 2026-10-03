# @a2uiverse/registry-snapshot

The registry snapshot: the catalog table and the packed catalog artifacts of the seven catalog packages — the five apps' and the two mock stores' — laid out as the orchestrator serves its registry under `/registry` — `catalogs.json`, and each artifact's files under `artifacts/<id>/`. The client's tests load it through the real loader, and e2e and offline replays from the preview server.

```bash
pnpm --filter @a2uiverse/registry-snapshot build   # packs the seven into dist/registry
```

The seven catalog packages are this package's dependencies, all pinned to one commit of [`a2uiverse-apps`](https://github.com/retz8/a2uiverse-apps). The build packs each with [Stellify](../stellify/) where pnpm installed it, names each artifact by its id, and writes the snapshot into `dist/registry`, which is git-ignored and never committed. The table lists the client's own two catalogs first, the basic catalog and the shell catalog, as the orchestrator's does. It stands in for the routes the client reads, so it has no `apps.json`.

An artifact packed here can differ from the one its publisher packs in the apps checkout, in `index.js` alone: esbuild writes each bundled module's path into the entry, and a dependency installed here sits at another path. GitHub's and Linear's differ this way; the other five are the same artifact, hash for hash.

`REGISTRY_SNAPSHOT_DIR`, the package's one export, is the snapshot's root.

To move the snapshot to a newer commit of the apps repo, re-point every dependency to that commit, and each catalog's `allowBuilds` line in `pnpm-workspace.yaml` with it: pnpm builds each catalog on install and allows it by the tarball it resolved.

How the client loads what this holds is in [`docs/design/app-install.md`](../../docs/design/app-install.md).
