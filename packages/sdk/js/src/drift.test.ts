import {describe, expect, test} from 'vitest';
import {BASIC_CATALOG_ID} from './catalog';
import {aheadOfStore} from './drift';

const A2UI = 'https://a2ui.org/a2a-extension/a2ui/v0.9.1';
const card = (version: string, ids: string[]) => ({
  version,
  capabilities: {extensions: [{uri: A2UI, params: {supportedCatalogIds: ids}}]},
});
const entry = {catalogs: {'cat/v1': 'sha-1'}, versions: ['1.0.0', '1.1.0']};

describe('aheadOfStore', () => {
  test('a live card the entry covers at a version the index knows is not ahead', () => {
    expect(aheadOfStore(entry, card('1.1.0', ['cat/v1']))).toEqual({ok: true, value: undefined});
  });

  test('a live card at an earlier published version is behind, not ahead', () => {
    expect(aheadOfStore(entry, card('1.0.0', ['cat/v1']))).toEqual({ok: true, value: undefined});
  });

  test('a catalog id the entry has no artifact for is one the Store lacks', () => {
    expect(aheadOfStore(entry, card('1.1.0', ['cat/v1', 'cat/v2']))).toEqual({
      ok: true,
      value: {catalogIds: ['cat/v2']},
    });
  });

  test('a public catalog is never lacked', () => {
    expect(aheadOfStore(entry, card('1.1.0', ['cat/v1', BASIC_CATALOG_ID]))).toEqual({
      ok: true,
      value: undefined,
    });
  });

  test('a version the index does not know is drift, with the ids it lacks beside it', () => {
    expect(aheadOfStore(entry, card('2.0.0', ['cat/v2']))).toEqual({
      ok: true,
      value: {catalogIds: ['cat/v2'], version: '2.0.0'},
    });
    expect(aheadOfStore(entry, card('2.0.0', ['cat/v1']))).toEqual({
      ok: true,
      value: {catalogIds: [], version: '2.0.0'},
    });
  });

  test('a card declaring no catalogs is covered by the basic catalog', () => {
    expect(aheadOfStore(entry, {version: '1.1.0'})).toEqual({ok: true, value: undefined});
  });

  test('a malformed declaration is a finding, not drift', () => {
    const result = aheadOfStore(entry, {
      version: '1.1.0',
      capabilities: {extensions: [{uri: A2UI, params: {supportedCatalogIds: 'cat/v1'}}]},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/supportedCatalogIds/);
  });
});
