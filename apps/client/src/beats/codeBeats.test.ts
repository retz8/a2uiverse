/**
 * Every beat written by code, in v1.0's forms (task-21.14 decision 13): each surface it paints,
 * from each create on, through the sdk's validator — the release's verdicts — and the schema-form
 * check, against the catalog document the surface is in. A piece invalid on purpose — a paint a
 * beat sends so the client can fail it — is named in `ON_PURPOSE`, and must still fail. A surface
 * painted in an app catalog waits for the registry snapshot (decision 14).
 */
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe, expect, it} from 'vitest';
import {
  BASIC_CATALOG_ID,
  BASIC_CATALOG_SCHEMA,
  createA2uiValidator,
  createSchemaFormCheck,
  type A2uiCatalogSchema,
  type A2uiFinding,
} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import type {AgentToRendererMessage} from '@a2ui/web_core/v1_0';
import type {BeatFixture} from './beatFixtures';
import {DURABLE_BEATS, DURABLE_RESTING} from './durableBeats';
import {LATE_FAILURE_BEATS, LATE_FAILURE_RESTING} from './lateFailureBeats';
import {storeLoopBeat} from './storeLoopBeats';
import {syntheticBeat} from './syntheticBeats';

const SHELL_DOCUMENT = JSON.parse(
  readFileSync(
    createRequire(import.meta.url).resolve('@a2uiverse/shell-catalog/catalog.json'),
    'utf8',
  ),
) as A2uiCatalogSchema;

/** The catalog documents a code-written beat may paint in with no registry: the client's own. */
const DOCUMENTS = new Map<string, A2uiCatalogSchema>([
  [SHELL_CATALOG_ID, SHELL_DOCUMENT],
  [BASIC_CATALOG_ID, BASIC_CATALOG_SCHEMA],
]);

/** The names `?beat=` replays a beat written by code under. */
const SYNTHETIC = [
  'plain',
  'plain-2',
  'validation',
  'question',
  'composed',
  'composed-solo',
  'composed-question',
  'synthesis',
  'navigation',
  'join',
  'platform-answer',
  'gap',
  'account-choice',
  'long-question',
  'merging',
  'long-merging',
  'trail',
];
const STORE_LOOP = [
  'gap-unreached',
  'update-needed',
  'update-waiting',
  'update-asks-more',
  'update-uninstalled',
];

const BEATS: BeatFixture[] = [
  ...SYNTHETIC.map(name => syntheticBeat(name)!),
  ...STORE_LOOP.flatMap(name => storeLoopBeat(name) ?? []),
  ...LATE_FAILURE_BEATS,
  ...LATE_FAILURE_RESTING,
  ...DURABLE_BEATS,
  ...DURABLE_RESTING,
];

/**
 * The pieces a beat paints invalid on purpose, by beat and surface: what the client must fail to
 * draw and report.
 */
const ON_PURPOSE: ReadonlySet<string> = new Set([
  // Fieldstone's tree with `children: 42`, the paint the client reports at the turn's end.
  'synthetic-invalid-paint shop-c:list',
]);

/** One surface's paint as a beat streams it: from a create on, every message for it. */
interface Painted {
  beat: string;
  surfaceId: string;
  catalogId: string | undefined;
  messages: AgentToRendererMessage[];
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The surface a message is for, and whether it creates it. */
function surfaceOf(message: AgentToRendererMessage) {
  for (const key of ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface']) {
    const body = (message as Record<string, unknown>)[key];
    if (isObject(body) && typeof body.surfaceId === 'string') {
      return {
        surfaceId: body.surfaceId,
        creates: key === 'createSurface',
        catalogId: typeof body.catalogId === 'string' ? body.catalogId : undefined,
        deletes: key === 'deleteSurface',
      };
    }
  }
  return undefined;
}

/** Every paint each beat streams, a surface painted again a paint of its own. */
function paintsOf(beat: BeatFixture): Painted[] {
  const paints: Painted[] = [];
  const open = new Map<string, Painted>();
  for (const turn of beat.turns) {
    for (const batch of turn.batches) {
      for (const message of batch.messages) {
        // The A2UIVerse extension's paintMeta rides recorded batches beside the A2UI messages.
        if ('paintMeta' in message) continue;
        const target = surfaceOf(message);
        if (!target) continue;
        if (target.creates) {
          const paint: Painted = {
            beat: beat.name,
            surfaceId: target.surfaceId,
            catalogId: target.catalogId,
            messages: [],
          };
          paints.push(paint);
          open.set(target.surfaceId, paint);
        }
        const paint = open.get(target.surfaceId);
        if (!paint || target.deletes) {
          open.delete(target.surfaceId);
          continue;
        }
        paint.messages.push(message);
      }
    }
  }
  return paints;
}

const PAINTS = BEATS.flatMap(paintsOf);
const OWN = PAINTS.filter(paint => paint.catalogId && DOCUMENTS.has(paint.catalogId));

/** Every finding over a paint: the release's verdicts, then the schema form's. */
function findingsOf(paint: Painted): A2uiFinding[] {
  const document = DOCUMENTS.get(paint.catalogId!)!;
  const others = [...DOCUMENTS.values()].filter(d => d !== document);
  const validator = createA2uiValidator({catalogs: [document, ...others]});
  const check = createSchemaFormCheck({catalog: document});
  return [...validator.validate(paint.messages), ...check.agentToRenderer(paint.messages)];
}

describe('every beat written by code, in v1.0’s forms', () => {
  it('paints in the client’s own catalogs, and every piece invalid on purpose is one it paints', () => {
    expect(OWN.length).toBeGreaterThan(20);
    const painted = new Set(OWN.map(paint => `${paint.beat} ${paint.surfaceId}`));
    expect([...ON_PURPOSE].filter(piece => !painted.has(piece))).toEqual([]);
  });

  it.each(OWN.map(paint => [`${paint.beat} ${paint.surfaceId}`, paint] as const))(
    '%s',
    (piece, paint) => {
      const findings = findingsOf(paint);
      if (ON_PURPOSE.has(piece)) expect(findings).not.toEqual([]);
      else expect(findings).toEqual([]);
    },
  );
});
