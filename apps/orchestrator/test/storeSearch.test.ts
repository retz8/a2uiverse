/**
 * The marketplace's tool set (task-15.4 decisions 1, 2, 3): its one search, installed apps left
 * out, each app projected as the installed-apps reader projects one with its publisher, and the
 * plan's searches read back from its tool calls.
 */
import type {IndexEntry} from '@a2uiverse/sdk';
import {describe, expect, test} from 'vitest';
import type {SearchLookup} from '../src/registry/marketplace.js';
import {SEARCH_TOOL, searchesOf, storeSearch} from '../src/planner/storeSearch.js';

const entry = (appId: string, name: string): IndexEntry => ({
  appId,
  publisher: 'northlight',
  cardUrl: `http://localhost/${appId}/card.json`,
  card: {
    name,
    description: `${name}, a camera shop.`,
    url: `http://localhost/${appId}`,
    version: '0.1.0',
    skills: [
      {id: 'stock', name: 'Stock', description: 'Cameras in stock.', examples: ['Any Z6?']},
      {id: 'quiet', name: 'Quiet', description: 'Says nothing.'},
    ],
  },
  catalogs: {},
  versions: ['0.1.0'],
  publishedAt: '2026-10-01T00:00:00.000Z',
  retired: [],
});

const answered = (...entries: IndexEntry[]): SearchLookup => ({
  kind: 'results',
  results: entries.map((e, i) => ({entry: e, score: 1 - i / 10})),
  dropped: [],
});

describe('storeSearch', () => {
  test('answers the apps found in the marketplace’s order, installed ones left out, each with its publisher (decisions 1, 2)', async () => {
    const asked: string[] = [];
    const search = storeSearch({
      search: async words => {
        asked.push(words);
        return answered(
          entry('shop-b', 'Shop B'),
          entry('shop-a', 'Shop A'),
          entry('shop-c', 'Shop C'),
        );
      },
      installed: () => ['shop-a'],
    });
    expect(await search.search('camera shop')).toEqual({
      apps: [
        {
          appId: 'shop-b',
          name: 'Shop B',
          publisher: 'northlight',
          description: 'Shop B, a camera shop.',
          skills: [
            {name: 'Stock', description: 'Cameras in stock.', examples: ['Any Z6?']},
            {name: 'Quiet', description: 'Says nothing.', examples: []},
          ],
        },
        expect.objectContaining({appId: 'shop-c'}),
      ],
    });
    expect(asked).toEqual(['camera shop']);
  });

  test('a marketplace not reached, or answering what is not a search, is unreached with its cause', async () => {
    const unreached = storeSearch({
      search: async () => ({kind: 'unreached', reason: 'fetch failed'}),
      installed: () => [],
    });
    expect(await unreached.search('x')).toEqual({unreached: 'fetch failed'});
    const malformed = storeSearch({
      search: async () => ({kind: 'malformed', errors: ['no list']}),
      installed: () => [],
    });
    expect(await malformed.search('x')).toEqual({
      unreached: "the Store's answer was not a search: no list",
    });
  });
});

describe('searchesOf', () => {
  test('reads the plan’s searches back from its tool calls, in order, the readers’ calls passed over (decisions 3, 15)', () => {
    const app = {appId: 'shop-b', name: 'Shop B', publisher: 'p', description: 'd', skills: []};
    expect(
      searchesOf([
        {name: 'installed_apps', args: {}, result: []},
        {name: SEARCH_TOOL, args: {words: 'camera shop'}, result: {apps: [app]}},
        {name: SEARCH_TOOL, args: {words: 'camera rental'}, result: {unreached: 'fetch failed'}},
        {name: SEARCH_TOOL, args: {}, result: {apps: []}},
      ]),
    ).toEqual([
      {words: 'camera shop', reached: true, apps: [app]},
      {words: 'camera rental', reached: false, apps: []},
    ]);
  });
});
