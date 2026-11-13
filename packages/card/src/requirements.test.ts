/** What a read card asks of a caller (SPEC §8). */
import type {AgentCard} from '@a2a-js/sdk';
import {describe, expect, test} from 'vitest';
import {readCard} from './readCard.js';
import {asksSignIn, signInAlternatives} from './requirements.js';
import {fixture} from './trackedCards.js';

const asking = (...securityRequirements: AgentCard['securityRequirements']): AgentCard => ({
  ...readCard(fixture('javascript-1.0.json')),
  securityRequirements,
});

describe('signInAlternatives', () => {
  test('each alternative as a scheme’s name to the scopes asked of it, in the card’s order', () => {
    const card = asking(
      {schemes: {signIn: {list: ['read', 'write']}}},
      {schemes: {key: {list: []}, other: {list: ['x']}}},
    );
    expect(signInAlternatives(card)).toEqual([
      {signIn: ['read', 'write']},
      {key: [], other: ['x']},
    ]);
  });

  test('a card asking nothing has none', () => {
    expect(signInAlternatives(asking())).toEqual([]);
  });
});

describe('asksSignIn', () => {
  test('a card with no requirement asks nothing', () => {
    expect(asksSignIn(asking())).toBe(false);
  });

  test('a card whose every alternative names a scheme asks for sign-in', () => {
    expect(asksSignIn(asking({schemes: {key: {list: []}}}))).toBe(true);
  });

  test('an empty alternative means nothing is needed', () => {
    expect(asksSignIn(asking({schemes: {key: {list: []}}}, {schemes: {}}))).toBe(false);
  });

  test('a card written for A2A 0.3 asks what its `security` asks', () => {
    expect(asksSignIn(readCard(fixture('python-as-0.3.json')))).toBe(true);
  });
});
