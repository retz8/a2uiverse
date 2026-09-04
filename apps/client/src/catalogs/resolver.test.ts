/**
 * The catalog projection and its runtime table are two lists that must move together: a record in
 * `orchestratorApi` with no `TABLE` entry is a boot failure, and the shell catalog's id must be the
 * one the orchestrator paints `shell:main` with or every slot silently fails to resolve.
 */
import {describe, it, expect} from 'vitest';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {CATALOG_ID as GITHUB_CATALOG_ID} from 'github-catalog';
import {CATALOG_ID as SHOP_A_CATALOG_ID} from 'shop-a-catalog';
import {CATALOG_ID as SHOP_B_CATALOG_ID} from 'shop-b-catalog';
import {listCatalogs} from '../orchestratorApi';
import {resolveCatalogs} from './resolver';

describe('catalog projection', () => {
  it('resolves every projected record — the two lists move together', async () => {
    const records = await listCatalogs();
    expect(() => resolveCatalogs(records)).not.toThrow();
    expect(resolveCatalogs(records)).toHaveLength(records.length);
  });

  it('registers the shell catalog under the id the orchestrator paints with', async () => {
    const ids = resolveCatalogs(await listCatalogs()).map(c => c.id);
    expect(ids).toContain(SHELL_CATALOG_ID);
    expect(ids).toContain(GITHUB_CATALOG_ID);
  });

  it('always carries the two mock-tier catalogs — the client is profile-agnostic (task 4.7)', async () => {
    const records = await listCatalogs();
    expect(records.map(r => r.appId)).toEqual([
      'shell',
      'github',
      'gmail',
      'calendar',
      'shop-a',
      'shop-b',
    ]);
    const ids = resolveCatalogs(records).map(c => c.id);
    expect(ids).toContain(SHOP_A_CATALOG_ID);
    expect(ids).toContain(SHOP_B_CATALOG_ID);
  });

  it('gives every resolved catalog its own provider', async () => {
    for (const resolved of resolveCatalogs(await listCatalogs())) {
      expect(resolved.Provider).toBeTypeOf('function');
      expect(resolved.catalog.id).toBe(resolved.id);
    }
  });

  it('rejects a record with no catalog package', () => {
    expect(() =>
      resolveCatalogs([{appId: 'gmail', catalogId: 'urn:not-installed', package: 'gmail-catalog'}]),
    ).toThrow(/urn:not-installed/);
  });
});
