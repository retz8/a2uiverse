/**
 * What the App Library says (task 14.8): each state in plain words with its press, the notes
 * under an app's head, and the words of sign-out and uninstall.
 */
import {describe, expect, it} from 'vitest';
import {LOCAL_COPY_WORDS, NOT_CHECKED_WORDS, type UpdateState} from '@a2uiverse/sdk';
import type {InstalledApp} from '../../../orchestratorApi';
import {
  appStateView,
  sentence,
  signedOutLine,
  stateNote,
  uninstallNote,
  uninstallQuestion,
  uninstalledLine,
  UNREACHED_WORDS,
} from './libraryWords';

const app = (more: Partial<InstalledApp> = {}): InstalledApp => ({
  id: 'gmail',
  card: {
    name: 'Gmail',
    description: '',
    url: 'http://127.0.0.1:11002',
    version: '1.0.0',
    skills: [],
  },
  source: 'marketplace',
  reachable: true,
  ...more,
});

const base = {appId: 'gmail', installedVersion: '1.0.0'};

describe('an app’s state as the App Library shows it', () => {
  it('is a placeholder while the check runs', () => {
    expect(appStateView(app(), undefined, true)).toEqual({kind: 'checking'});
  });

  it('says an app not reached in place of its update state, with no press (decision 2)', () => {
    const update: UpdateState = {
      ...base,
      state: 'major-update',
      publishedVersion: '2.0.0',
      newCatalogIds: [],
      builds: [],
    };
    expect(appStateView(app({reachable: false}), update, false)).toEqual({
      kind: 'state',
      words: UNREACHED_WORDS,
      tone: 'bad',
      press: {kind: 'none'},
    });
  });

  it('carries Update for a waiting update, through the card only for one that asks for more', () => {
    const card: UpdateState = {
      ...base,
      state: 'card-update',
      publishedVersion: '1.1.0',
      newScopes: [{scheme: 'google', scopes: ['write']}],
      builds: [],
    };
    const nothingNew: UpdateState = {...card, newScopes: []};
    const required: UpdateState = {
      ...base,
      state: 'update-required',
      publishedVersion: '2.0.0',
      retired: [],
    };
    expect(appStateView(app(), card, false)).toMatchObject({
      words: 'An update that asks for more',
      tone: 'new',
      press: {kind: 'update', consent: true, primary: false},
    });
    expect(appStateView(app(), nothingNew, false)).toMatchObject({
      words: 'A new version is available',
      tone: 'new',
      press: {kind: 'update', consent: false, primary: false},
    });
    expect(appStateView(app(), required, false)).toMatchObject({
      words: 'Needs an update to keep working',
      tone: 'warn',
      press: {kind: 'update', consent: false, primary: true},
    });
  });

  it('carries Check again when the check could not reach the Store', () => {
    expect(appStateView(app(), {...base, state: 'unknown'}, false)).toMatchObject({
      words: 'Couldn’t check for updates',
      press: {kind: 'check'},
    });
  });

  it('reads an app from a local copy the Store does not list as installed from your computer', () => {
    expect(
      appStateView(app({source: 'local'}), {...base, state: 'not-published'}, false),
    ).toMatchObject({
      words: LOCAL_COPY_WORDS,
      tone: 'local',
      press: {kind: 'none'},
    });
    expect(appStateView(app(), {...base, state: 'not-published'}, false)).toMatchObject({
      words: 'No longer in the Store',
    });
  });

  it('reads an app the check did not answer for as not checked', () => {
    expect(appStateView(app(), undefined, false)).toMatchObject({words: NOT_CHECKED_WORDS});
  });
});

describe('the notes under an app’s head', () => {
  it('says what each state means for the app, in its name', () => {
    expect(
      stateNote('Linear', app(), {
        ...base,
        state: 'update-required',
        publishedVersion: '2.0.0',
        retired: [],
      }),
    ).toEqual({
      tone: 'warn',
      text: 'Linear no longer answers in the look you have. Update it to keep seeing its answers.',
    });
    expect(
      stateNote('Shop B', app({source: 'local'}), {...base, state: 'not-published'}),
    ).toBeUndefined();
    expect(
      stateNote('Gmail', app({reachable: false}), {...base, state: 'unknown'}),
    ).toBeUndefined();
  });
});

describe('uninstall’s words', () => {
  it('names the accounts it signs out, and says nothing of accounts when there are none (decision 7)', () => {
    expect(uninstallNote([])).toBeUndefined();
    expect(uninstallNote(['me@example.com'])).toBe('Also signs out its account');
    expect(uninstallNote(['me@example.com', 'work@example.com'])).toBe(
      'Also signs out both accounts',
    );
    expect(uninstallQuestion(['me@example.com', 'work@example.com'])).toBe(
      'This also signs out its two accounts, me@example.com and work@example.com. Answers already on your canvases stay as they are.',
    );
    expect(uninstallQuestion([])).toBe('Answers already on your canvases stay as they are.');
  });

  it('adds a sentence for each account whose access could not be cancelled (decision 9)', () => {
    const done = uninstalledLine('Gmail', [
      {label: 'me@example.com', revocation: 'revoked'},
      {label: 'work@example.com', revocation: 'failed'},
    ]);
    expect(done.lead).toBe('Gmail is uninstalled and its accounts are signed out.');
    expect(done.rest).toEqual([
      'Gmail couldn’t be reached to cancel the access of work@example.com. You can remove that access from your Gmail account’s settings.',
    ]);
    expect(uninstalledLine('Shop A', []).lead).toBe('Shop A is uninstalled.');
  });
});

describe('sign-out’s words', () => {
  it('reads cancelled and nowhere to cancel the same, and adds where to remove it when cancelling failed', () => {
    expect(signedOutLine('Gmail', 'work@example.com', 'revoked')).toBe(
      'Signed out of work@example.com.',
    );
    expect(signedOutLine('Gmail', 'work@example.com', 'nowhere')).toBe(
      'Signed out of work@example.com.',
    );
    expect(signedOutLine('Gmail', 'work@example.com', 'failed')).toBe(
      'Signed out of work@example.com here, but Gmail couldn’t be reached to cancel its access. You can remove that access from your Gmail account’s settings.',
    );
  });
});

describe('a refusal’s reason as a sentence', () => {
  it('starts with a capital and ends with a full stop', () => {
    expect(sentence('a name cannot be empty')).toBe('A name cannot be empty.');
    expect(sentence('another Gmail account already has that name')).toBe(
      'Another Gmail account already has that name.',
    );
  });
});
