/**
 * Live embedder test — downloads the real model (~23 MB on first run) into a
 * temp cache dir. Gated so `pnpm verify` and CI never fetch it:
 *
 *   A2UIVERSE_EMBEDDER_LIVE=1 pnpm --filter @a2uiverse/orchestrator test embedder.live
 */
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterAll, describe, expect, test} from 'vitest';
import {cosine} from '../src/embedder/similarity.js';
import {TransformersEmbedder} from '../src/embedder/transformersEmbedder.js';

const live = process.env.A2UIVERSE_EMBEDDER_LIVE === '1';
const cacheDir = mkdtempSync(join(tmpdir(), 'a2uiverse-embedder-'));

afterAll(() => rmSync(cacheDir, {recursive: true, force: true}));

describe.runIf(live)('TransformersEmbedder (live model)', () => {
  test('embeds to 384-dim unit vectors ordered by relatedness', {timeout: 120_000}, async () => {
    const embedder = new TransformersEmbedder({cacheDir});
    const [query, mail, code] = await embedder.embed([
      'unread messages in my inbox',
      'email client: read, label, and archive mail',
      'source code repository hosting and pull requests',
    ]);
    expect(query).toHaveLength(384);
    const norm = Math.sqrt(query.reduce((sum, x) => sum + x * x, 0));
    expect(norm).toBeCloseTo(1, 3);
    expect(cosine(query, mail)).toBeGreaterThan(cosine(query, code));
  });
});
