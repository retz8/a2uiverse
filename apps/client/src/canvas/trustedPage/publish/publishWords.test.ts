/**
 * What Publish says (task 14.9): a name checked before it is sent with the name it suggests
 * (decision 16), the ahead-of-the-Store notice naming its causes (decision 12), the sample answer
 * file's hint (decision 14), and the plain lead of each outcome and refusal (decisions 9–11, 17,
 * 18).
 */
import {describe, expect, it} from 'vitest';
import type {PublishedCard} from '@a2uiverse/sdk';
import {
  addressProblem,
  aheadSentence,
  changesWho,
  claimProblem,
  filesWords,
  nameProblem,
  previewHint,
  publishRefusedWords,
  publishedWords,
  suggestedName,
  unpublishRefusedWords,
  type Spoken,
} from './publishWords';

const said = (spoken: Spoken) =>
  spoken.map(part => (typeof part === 'string' ? part : part.term)).join(' ');

describe('a typed name', () => {
  it('suggests a name made from what was typed', () => {
    expect(suggestedName('Northlight Cameras')).toBe('northlight-cameras');
    expect(suggestedName('  42 Shop_A!! ')).toBe('shop-a');
    expect(suggestedName('northlight')).toBeUndefined();
    expect(suggestedName('1234')).toBeUndefined();
    expect(suggestedName('Shell')).toBeUndefined();
    expect(suggestedName(`A${'b'.repeat(80)}`)).toHaveLength(63);
  });

  it('says what is wrong with it before it is sent', () => {
    expect(nameProblem('', 'publisher')).toBeUndefined();
    expect(nameProblem('northlight', 'publisher')).toBeUndefined();
    expect(nameProblem('Northlight Cameras', 'publisher')).toBe(
      'Use lowercase letters, numbers and hyphens, starting with a letter: northlight-cameras.',
    );
    expect(nameProblem('123', 'publisher')).toBe(
      'Use lowercase letters, numbers and hyphens, starting with a letter.',
    );
    expect(nameProblem(`a${'b'.repeat(63)}`, 'publisher')).toBe(
      'Keep it to 63 characters or fewer.',
    );
    expect(nameProblem('shell', 'app')).toBe('That name is kept for A2UIVerse. Try another.');
    expect(nameProblem('Linear', 'app')).toBe(
      'Use lowercase letters, numbers and hyphens, starting with a letter: linear.',
    );
  });

  it('says a claim the Store refused under its field', () => {
    expect(claimProblem('taken')).toBe('That name belongs to another publisher. Try another.');
    expect(claimProblem('name')).toMatch(/^Use lowercase letters/);
    expect(claimProblem('unreached')).toBeUndefined();
  });
});

describe('the ahead-of-the-Store notice', () => {
  it('names a look the Store does not have, its ids beside', () => {
    const spoken = aheadSentence({catalogIds: ['https://x/linear/v2/catalog.json']});
    expect(spoken).toContainEqual({term: '(https://x/linear/v2/catalog.json)'});
    expect(said(spoken)).toBe(
      'It now uses a look the Store doesn’t have (https://x/linear/v2/catalog.json) , so no one new can install it until you publish an update.',
    );
  });

  it('names a version the Store does not have', () => {
    expect(said(aheadSentence({catalogIds: [], version: '0.5.0'}))).toBe(
      'It now says it’s version 0.5.0, which the Store doesn’t have , so no one new can install it until you publish an update.',
    );
  });

  it('joins the two causes, looks counted', () => {
    expect(said(aheadSentence({catalogIds: ['a', 'b'], version: '2.0.0'}))).toBe(
      'It now uses looks the Store doesn’t have (a, b) , and it now says it’s version 2.0.0, which the Store doesn’t have , so no one new can install it until you publish an update.',
    );
  });
});

describe('the sample answer file’s hint', () => {
  const card = (more: Partial<PublishedCard> = {}): PublishedCard =>
    ({
      name: 'Linear',
      description: '',
      url: 'http://x',
      version: '1.0.0',
      skills: [],
      ...more,
    }) as PublishedCard;

  it('says it is needed for an app that asks people to sign in', () => {
    const signIn = card({
      securitySchemes: {
        linear: {
          type: 'oauth2',
          flows: {authorizationCode: {authorizationUrl: 'a', tokenUrl: 't', scopes: {}}},
        },
      },
      security: [{linear: []}],
    } as Partial<PublishedCard>);
    expect(previewHint(signIn)).toBe(
      'Needed because Linear asks people to sign in: the Store can’t ask it a question without your account.',
    );
  });

  it('says to leave it out for an app that asks none', () => {
    expect(previewHint(card())).toBe(
      'Linear doesn’t ask people to sign in, so leave this out: the Store asks it its own question.',
    );
  });

  it('says when it is needed for a new app', () => {
    expect(previewHint(undefined)).toBe('Needed only if your app asks people to sign in.');
  });
});

describe('a publish’s outcome', () => {
  const outcome = (summary: string, notes: string[] = []) =>
    ({ok: true, appId: 'linear', version: '0.4.0', summary, notes}) as const;

  it('says a first publish can now be found', () => {
    expect(
      publishedWords(outcome('published linear · card 0.4.0 · basic catalog'), 'Linear'),
    ).toEqual({
      lead: 'Linear 0.4.0 is in the Store.',
      rest: 'People can now find Linear in the Store.',
    });
  });

  it('says an update reaches those who installed it', () => {
    expect(publishedWords(outcome('republished linear · card 0.3.0 → 0.4.0'), 'Linear').rest).toBe(
      'People who have Linear installed see the update in their App Library.',
    );
  });

  it('says an app unpublished before is back', () => {
    expect(
      publishedWords(
        outcome('republished linear · card 0.4.0', ['linear is listed again']),
        'Linear',
      ).rest,
    ).toBe('Linear is back in the Store.');
  });

  it('leads each refusal in plain words', () => {
    expect(publishRefusedWords('checks', ['x'], 'linear', false)).toEqual({
      lead: 'The Store didn’t take this version.',
      rest: 'Your listing hasn’t changed.',
    });
    expect(publishRefusedWords('checks', ['x'], 'linear', true)).toEqual({
      lead: 'The Store didn’t take this app.',
      rest: 'Nothing was published.',
    });
    expect(
      publishRefusedWords('owned', ['app id "linear" belongs to publisher "acme"'], 'linear', true)
        .lead,
    ).toBe('Another publisher already uses the name “linear” in the Store.');
    expect(
      publishRefusedWords('owned', ['catalog "x" belongs to publisher "acme"'], 'linear', false)
        .lead,
    ).toBe('One of this app’s looks belongs to another publisher in the Store.');
    expect(publishRefusedWords('unreached', [], 'linear', false)).toEqual({
      lead: 'The Store didn’t answer, so this version may or may not be in the Store.',
      rest: 'Your apps show what the Store has now.',
    });
    expect(publishRefusedWords('not-accepted', ['x'], 'linear', false)).toEqual({
      lead: 'Nothing was published.',
      rest: 'The Store no longer accepts your publisher secret.',
    });
  });
});

describe('an unpublish refused', () => {
  it('leads in plain words', () => {
    expect(unpublishRefusedWords('not-published', 'Linear').lead).toBe(
      'Linear isn’t in the Store any more.',
    );
    expect(unpublishRefusedWords('another-store', 'Linear')).toEqual({
      lead: 'Linear wasn’t unpublished.',
      rest: 'You’re signed in for a different Store.',
    });
    expect(unpublishRefusedWords('unreached', 'Linear').lead).toBe(
      'The Store didn’t answer, so Linear may or may not still be in the Store.',
    );
  });
});

describe('who is signed in', () => {
  it('has changed under a refusal that says so', () => {
    expect(
      ['held', 'signed-out', 'another-store', 'not-accepted'].every(r => changesWho(r as never)),
    ).toBe(true);
    expect(changesWho('checks')).toBe(false);
    expect(changesWho('unreached')).toBe(false);
  });
});

describe('the app’s address', () => {
  it('is an http or https address, as the browser reads one', () => {
    for (const ok of [
      'http://localhost:12001/.well-known/agent-card.json',
      'https://vnw20xbg-11001.asse.devtunnels.ms/.well-known/agent-card.json',
      'http://127.0.0.1:11003/',
      '  https://shop.example/card.json  ',
      '',
    ]) {
      expect(addressProblem(ok)).toBeUndefined();
    }
    for (const bad of [
      'localhost:12001/card',
      'shop.example/card.json',
      'ftp://shop.example/card',
      'https://',
      'http://shop example/card',
    ]) {
      expect(addressProblem(bad)).toBe(
        'Enter your app’s full address, starting with https:// or http://.',
      );
    }
  });
});

it('counts a folder’s files', () => {
  expect(filesWords(1)).toBe('1 file');
  expect(filesWords(14)).toBe('14 files');
});
