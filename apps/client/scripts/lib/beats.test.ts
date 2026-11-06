/**
 * What the recorder reads of a take's layout to flag it (task-19.9): the account choice, which a
 * command draws for an app holding two accounts in place of that app's fragment.
 */
import {expect, test} from 'vitest';
import type {BeatBatch} from '../../src/beats/beatFixtures';
import {accountChoicesIn} from './beats';

/** A layout as the hub streams it: the shell's surface, the components so far. */
const layout = (...components: Array<Record<string, unknown>>) =>
  ({
    offsetMs: 0,
    texts: [],
    stamp: {source: 'shell', role: 'shell'},
    messages: [
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'shell:main',
          components: [{id: 'root', component: 'Column', children: ['slot']}, ...components],
        },
      },
    ],
  }) as unknown as BeatBatch;

const choice = {
  id: 'slot',
  component: 'Slot',
  chooseAccount: 'github',
  label: 'GitHub',
  accounts: [
    {source: 'github.3', label: 'someone@example.com'},
    {source: 'github.4', label: 'retz8'},
  ],
};

test('a layout carrying the account choice names its app once, however many times it streams', () => {
  expect(accountChoicesIn([layout(choice), layout(choice)])).toEqual(['github']);
});

test('a layout whose slots hold sources carries no account choice', () => {
  expect(
    accountChoicesIn([
      layout({id: 'slot', component: 'Slot', source: 'github.4', label: 'GitHub'}),
    ]),
  ).toEqual([]);
});

test('a take with no layout carries no account choice', () => {
  expect(accountChoicesIn([])).toEqual([]);
});
