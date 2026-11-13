/**
 * The text the marketplace's search and the Router embed for a card (task-20.3 decision 21): the
 * same for a card read as for the card as its agent served it, over every tracked card written
 * for A2A 0.3 — the platform sdk's four card fixtures and the seven Store recordings.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {readCard} from '@a2uiverse/card';
import {corpusDoc, type CardForCorpus} from '@a2uiverse/embedder';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SDK_CARDS = join(root, 'packages', 'sdk', 'js', 'test', 'fixtures', 'cards');
const STORE_RECORDINGS = join(root, 'apps', 'client', 'recordings', 'store');

const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const jsonFiles = (dir: string) => readdirSync(dir).filter(name => name.endsWith('.json'));

const tracked: [name: string, card: unknown][] = [
  ...jsonFiles(SDK_CARDS).map((name): [string, unknown] => [name, json(join(SDK_CARDS, name))]),
  ...jsonFiles(STORE_RECORDINGS).map((name): [string, unknown] => [
    name,
    (json(join(STORE_RECORDINGS, name)) as {entry: {card: unknown}}).entry.card,
  ]),
];

describe('the corpus text of a card', () => {
  test('every tracked card is read', () => {
    expect(tracked).toHaveLength(11);
  });

  test.each(tracked)('%s embeds the same text read as served', (_name, served) => {
    const before = corpusDoc(served as CardForCorpus);
    expect(before).not.toBe('');
    expect(corpusDoc(readCard(served))).toBe(before);
  });
});
