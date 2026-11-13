/**
 * The cards this package's tests read (task-20.3 decision 21): the A2A 1.0 fixtures captured
 * here, and every tracked card written for A2A 0.3 — the platform sdk's four card fixtures and
 * the seven Store recordings.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(here, '..', 'test', 'fixtures');
const SDK_CARDS = join(here, '..', '..', 'sdk', 'js', 'test', 'fixtures', 'cards');
const STORE_RECORDINGS = join(here, '..', '..', '..', 'apps', 'client', 'recordings', 'store');

const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const jsonFiles = (dir: string): string[] =>
  readdirSync(dir)
    .filter(name => name.endsWith('.json'))
    .sort();

/** An A2A 1.0 fixture of this package, as served. */
export const fixture = (name: string): unknown => json(join(FIXTURES, name));

/** Every tracked card written for A2A 0.3, as served, by a name saying where it is tracked. */
export function trackedLegacyCards(): [name: string, card: unknown][] {
  return [
    ...jsonFiles(SDK_CARDS).map((name): [string, unknown] => [
      `the sdk's ${name}`,
      json(join(SDK_CARDS, name)),
    ]),
    ...jsonFiles(STORE_RECORDINGS).map((name): [string, unknown] => [
      `the Store recording ${name}`,
      (json(join(STORE_RECORDINGS, name)) as {entry: {card: unknown}}).entry.card,
    ]),
  ];
}
