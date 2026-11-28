/**
 * Upstream's example pairs as the converter's answer key (task-21.11 decision 14): each of the 43
 * basic catalog examples upstream keeps as a v0.9, a v0.9.1 and a v1 copy, its two older copies
 * converted with the basic catalog's map. Every output passes the sdk's v1.0 validator and the
 * schema-form check against upstream's v1 basic catalog, and equals upstream's v1 copy as a JSON
 * value, but for the pairs below, each with its reason: a change upstream made by hand that the
 * evolution guide does not name. Any other difference fails.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {BASIC_CATALOG_SCHEMA, type A2uiCatalogSchema} from '@a2uiverse/sdk';
import {loadCatalogMaps} from './catalogMap.js';
import {convertRecorded} from './convert.js';
import {readCatalogShape} from './positions.js';
import {judgeConverted} from './validate.js';

const UPSTREAM = new URL('../test/fixtures/upstream/basic/', import.meta.url);
const V1 = new URL('../../sdk/a2ui-spec/catalogs/basic/v1/examples/', import.meta.url);
const read = (url: URL): unknown => JSON.parse(readFileSync(url, 'utf8'));

/**
 * The guide writes a heading over text from the data model as a `formatString` call carrying the
 * markers (its migration step for `Text.variant`); upstream's v1 copy drops the heading instead.
 */
const DROPPED =
  'a heading over text from the data model or a function: upstream drops the heading, where the guide carries the markers in a formatString call';

const EXCEPTIONS: Readonly<Record<string, string>> = {
  'account-balance.json': DROPPED,
  'advanced-form-validator.json': DROPPED,
  'calendar-day.json': DROPPED,
  'chat-message.json': DROPPED,
  'coffee-order.json': DROPPED,
  'contact-card.json': DROPPED,
  'countdown-timer.json': DROPPED,
  'credit-card.json': DROPPED,
  'event-detail.json': DROPPED,
  'flight-status.json': DROPPED,
  'live-invitation-builder.json':
    'a text already beginning with "# " under variant h1: upstream keeps one marker, where the guide puts the markers at the start of the text',
  'movie-card.json': DROPPED,
  'music-player.json': DROPPED,
  'notification-permission.json': DROPPED,
  'podcast-episode.json': DROPPED,
  'product-card.json': DROPPED,
  'purchase-complete.json': DROPPED,
  'recipe-card.json': DROPPED,
  'restaurant-card.json': DROPPED,
  'software-purchase.json': DROPPED,
  'sports-player.json': DROPPED,
  'stats-card.json': DROPPED,
  'step-counter.json': DROPPED,
  'task-card.json': DROPPED,
  'track-list.json': DROPPED,
  'user-profile.json': DROPPED,
  'weather-current.json': DROPPED,
  'workout-summary.json': DROPPED,
};

/** Every place two JSON values differ, by its pointer. */
function differences(a: unknown, b: unknown, at = ''): string[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  const both = (v: unknown) => typeof v === 'object' && v !== null;
  if (both(a) && both(b) && Array.isArray(a) === Array.isArray(b)) {
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    return [...keys].flatMap(key =>
      differences(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
        `${at}/${key}`,
      ),
    );
  }
  return [at];
}

/** The `text` of a component, and anything under it: where a heading's difference sits. */
const AT_TEXT = /^\/messages\/\d+\/updateComponents\/components\/\d+\/text(\/|$)/;

const map = loadCatalogMaps().get(
  'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json',
)!;
const examples = readdirSync(V1)
  .filter(name => name.endsWith('.json'))
  .sort();

describe.each(['v0_9', 'v0_9_1'])('upstream %s examples', version => {
  const shape = readCatalogShape(
    read(new URL(`${version}/catalog.json`, UPSTREAM)) as Record<string, unknown>,
  );

  it('are the 43 pairs', () => {
    expect(readdirSync(new URL(`${version}/examples/`, UPSTREAM)).sort()).toEqual(examples);
    expect(examples).toHaveLength(43);
  });

  it.each(examples)('%s', name => {
    const input = read(new URL(`${version}/examples/${name}`, UPSTREAM));
    const conversion = convertRecorded(input, {
      catalogOf: id => (id === map.from.catalogId ? {shape, map} : undefined),
    });
    expect(conversion.stops).toEqual([]);
    expect(conversion.misfits).toEqual([]);

    const judged = judgeConverted(
      conversion.value,
      () => BASIC_CATALOG_SCHEMA as A2uiCatalogSchema,
      undefined,
    );
    for (const paint of judged) {
      expect(paint.findings, paint.surface).toEqual([]);
      expect(paint.form, paint.surface).toEqual([]);
    }

    const differ = differences(conversion.value, read(new URL(name, V1)));
    if (EXCEPTIONS[name]) {
      expect(differ.length, 'a listed pair that no longer differs').toBeGreaterThan(0);
      expect(differ.filter(at => !AT_TEXT.test(at))).toEqual([]);
    } else {
      expect(differ).toEqual([]);
    }
  });
});
