/**
 * Record the Store's samples for the replay suite's fixed world (task-14.10 decision 15).
 *
 *   pnpm --filter @a2uiverse/client record:store [-- --marketplace http://localhost:10002]
 *       [--out recordings/store]
 *
 * Run against a marketplace the launcher published the deterministic roster to under `--publish`,
 * both tiers: each published app's index entry — its card as published — and its captured preview,
 * one file per app. The world the preview server serves takes the card and the sample from here and
 * every build from the registry snapshot, so a recording is taken again when the snapshot's pin on
 * the apps repo moves. Fake accounts only: the deterministic agents hold no account data.
 */
import {mkdir, readdir, rm, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {parseArgs} from 'node:util';
import type {IndexEntry, PreviewDocument} from '@a2uiverse/sdk';

/** One app as recorded: its entry and its sample, as the marketplace served them. */
export interface RecordedStoreApp {
  entry: IndexEntry;
  preview: PreviewDocument;
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {signal: AbortSignal.timeout(10_000)});
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return (await response.json()) as T;
}

async function main() {
  const {values} = parseArgs({
    options: {
      marketplace: {type: 'string', default: 'http://localhost:10002'},
      out: {type: 'string', default: 'recordings/store'},
    },
  });
  const marketplace = values.marketplace.replace(/\/$/, '');
  const outDir = resolve(values.out);

  const index = await readJson<IndexEntry[]>(`${marketplace}/index.json`);
  if (index.length === 0) throw new Error(`${marketplace} lists no app: publish the roster first`);

  await mkdir(outDir, {recursive: true});
  for (const name of await readdir(outDir)) {
    if (name.endsWith('.json')) await rm(join(outDir, name));
  }
  for (const entry of index) {
    const preview = await readJson<PreviewDocument>(
      `${marketplace}/apps/${encodeURIComponent(entry.appId)}/preview.json`,
    );
    const recorded: RecordedStoreApp = {entry, preview};
    await writeFile(join(outDir, `${entry.appId}.json`), `${JSON.stringify(recorded, null, 2)}\n`);
    console.log(`  ${entry.appId} · card ${entry.card.version} · sample by ${preview.capturedBy}`);
  }
  console.log(`recorded ${index.length} apps into ${values.out}`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
