/**
 * The Store's search against the real model (task-14.11 decisions 27 and 30): the labelled searches in
 * `fixtures/store-searches.json` over the seven cards the Store recordings hold. Each search's
 * expected apps are the ones whose card says they do what it asks; `allowed` ones are neither
 * expected nor counted against it; `modelMisses` are the expected apps the model ranks out. Gated
 * so `pnpm verify` and CI never fetch the model:
 *
 *   A2UIVERSE_EMBEDDER_LIVE=1 pnpm --filter @a2uiverse/marketplace test search.live
 */
import {mkdtempSync, readdirSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {corpusDoc, rank, TransformersEmbedder} from '@a2uiverse/embedder';
import type {IndexEntry} from '@a2uiverse/sdk';
import {afterAll, describe, expect, test} from 'vitest';
import {searchMatches} from '../src/marketplace.js';

interface LabelledSearch {
  words: string;
  expected: string[];
  allowed?: string[];
  modelMisses?: string[];
}

/** The unexpected apps the cut shows across the whole set when it was fitted. */
const UNEXPECTED_AT_FIT = 16;

const live = process.env.A2UIVERSE_EMBEDDER_LIVE === '1';
const cacheDir = mkdtempSync(join(tmpdir(), 'a2uiverse-search-'));
afterAll(() => rmSync(cacheDir, {recursive: true, force: true}));

const recordings = join(import.meta.dirname, '..', '..', 'client', 'recordings', 'store');
const entries = readdirSync(recordings)
  .filter(file => file.endsWith('.json'))
  .map(
    file => (JSON.parse(readFileSync(join(recordings, file), 'utf8')) as {entry: IndexEntry}).entry,
  );
const searches = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures', 'store-searches.json'), 'utf8'),
) as LabelledSearch[];

describe.runIf(live)('the Store’s search cut (live model)', () => {
  test(
    'finds every expected app but the model’s known misses, and few it should not',
    {timeout: 180_000},
    async () => {
      const embedder = new TransformersEmbedder({cacheDir});
      const vectors = await embedder.embed(entries.map(entry => corpusDoc(entry.card)));
      const candidates = entries.map((entry, i) => ({
        appId: entry.appId,
        name: entry.card.name,
        vector: vectors[i],
      }));
      const queries = await embedder.embed(searches.map(search => search.words));
      let unexpected = 0;
      for (const [i, search] of searches.entries()) {
        const shown = new Set(
          searchMatches(search.words, rank(queries[i], candidates)).map(match => match.appId),
        );
        const missed = search.expected.filter(appId => !shown.has(appId));
        expect(missed, search.words).toEqual(search.modelMisses ?? []);
        const ok = new Set([...search.expected, ...(search.allowed ?? [])]);
        unexpected += [...shown].filter(appId => !ok.has(appId)).length;
      }
      expect(unexpected).toBeLessThanOrEqual(UNEXPECTED_AT_FIT);
    },
  );
});
